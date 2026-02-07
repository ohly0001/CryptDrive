import cryptDriveConfig from '../config/cryptDriveConfig.json' with { type: 'json' };
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { encrypt, decrypt, generate_kek } from '../utilities/aes.js';
import { randomBytes } from 'crypto';

const EncryptedFieldSchema = new mongoose.Schema({
    encryptedData: { type: String, required: true },
    iv: { type: String, required: true },
    authTag: { type: String, required: true }
}, { _id: false });

const AccountSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true }, // still bcrypt hash
    secretKey: { type: EncryptedFieldSchema }, // store as AES object
    active: { type: Boolean, default: false }
}, { timestamps: true });

AccountSchema.methods._hashPass = async function() {
    this.password = await bcrypt.hash(this.password, cryptDriveConfig.passwordSaltRounds);
};

AccountSchema.methods._encryptSecret = function(key, kek) {
    this.secretKey = encrypt(key, kek);
};

AccountSchema.methods._decryptedSecret = function(kek) {
    return decrypt(this.secretKey, kek);
};

AccountSchema.methods.updatePassword = async function(kek) {
    if (this.password.length < cryptDriveConfig.minPasswordSize || this.password.length > cryptDriveConfig.maxPasswordSize) {
        throw new Error(`Password must be between ${cryptDriveConfig.minPasswordSize} and ${cryptDriveConfig.maxPasswordSize} characters.`);
    }

    if (this.isNew) {
        await this._hashPass();
        this._encryptSecret(randomBytes(32).toString('base64'), kek);
    } else if (this.isModified('password')) {
        const oldAccount = await Account.findById(this._id);
        if (!oldAccount) throw new Error('Account not found for password change.');

        let plainSecretKey;
        try {
            const oldKek = await generate_kek(oldAccount.password);
            plainSecretKey = oldAccount._decryptedSecret(oldKek);
        } catch {
            throw new Error('Failed to decrypt secret key with old password. Password change aborted.');
        }

        await this._hashPass();
        this._encryptSecret(plainSecretKey);
    }
};

// Returns decrypted secretKey (sync since AES is sync)
AccountSchema.methods.decodeSecretKey = function (kek) {
    return decrypt(this.secretKey, kek);
};

// Compare candidate password
AccountSchema.methods.comparePassword = async function (candidatePassword) {
    try {
        return await bcrypt.compare(candidatePassword, this.password);
    } catch {
        return false;
    }
};

// Hide sensitive fields when sending JSON
AccountSchema.set('toJSON', {
    transform: (doc, ret) => {
        delete ret.password;
        delete ret.secretKey;
        return ret;
    }
});

const Account = mongoose.model('Account', AccountSchema);
export default Account;
