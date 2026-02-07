import cryptDriveConfig from '../config/cryptDriveConfig.json' with { type: 'json' };
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { encrypt, decrypt, find_kek } from '../utilities/aes.js';
import { randomBytes } from 'crypto';

const EncryptedFieldSchema = new mongoose.Schema({
    encryptedData: { type: String, required: true },
    iv: { type: String, required: true },
    authTag: { type: String, required: true }
}, { _id: false });

const AccountSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true }, // still bcrypt hash
    secretKey: { type: EncryptedFieldSchema } // store as AES object
}, { timestamps: true });

AccountSchema.methods._getKek = function() {
    if (!this._cachedKek) {
        this._cachedKek = find_kek(this.password);
    }
    return this._cachedKek;
};

AccountSchema.methods._hashPass = async function() {
    this.password = await bcrypt.hash(this.password, cryptDriveConfig.passwordSaltRounds);
};

AccountSchema.methods._encryptSecret = function(key) {
    this.secretKey = encrypt(key, this._getKek());
};

AccountSchema.methods._decryptedSecret = function() {
    return decrypt(this.secretKey, this._getKek());
};

AccountSchema.pre('save', async function() {
    if (this.password.length < cryptDriveConfig.minPasswordSize) {
        throw new Error(`Password must be at least ${cryptDriveConfig.minPasswordSize} characters.`);
    }

    if (this.isNew) {
        await this._hashPass();
        this._encryptSecret(randomBytes(32).toString('base64'));
    } else if (this.isModified('password')) {
        const oldAccount = await Account.findById(this._id);
        if (!oldAccount) throw new Error('Account not found for password change.');

        let plainSecretKey;
        try {
            plainSecretKey = oldAccount._decryptedSecret();
        } catch {
            throw new Error('Failed to decrypt secret key with old password. Password change aborted.');
        }

        await this._hashPass();
        this._encryptSecret(plainSecretKey);
    }
});

// Returns decrypted secretKey (sync since AES is sync)
AccountSchema.methods.decodeSecretKey = function () {
    return decrypt(this.secretKey, this._getKek());
};

// Cache decoded key for multiple field decryption
AccountSchema.methods._getCachedKey = function () {
    if (!this._cachedKey) {
        this._cachedKey = this.decodeSecretKey()
    }
    return this._cachedKey;
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
