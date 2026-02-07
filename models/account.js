import cryptDriveConfig from '../config/cryptDriveConfig.json' with { type: 'json' };
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { encrypt, decrypt, derivekek, generateAESKey, saltShaker } from '../utilities/encryption.js';

const EncryptedFieldSchema = new mongoose.Schema({
    encryptedData: { type: String, required: true },
    iv: { type: String, required: true },
    authTag: { type: String, required: true }
}, { _id: false });

const AccountSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true }, // bcrypt hash
    secretKey: { type: EncryptedFieldSchema }, // store as AES object
    kekSalt: { type: String, default: () => saltShaker() },
    isActive: { type: Boolean, default: false }
}, { timestamps: true });

AccountSchema.methods.secure = async function(kek) {
    if (!this.isNew) return;
    
    const session = await mongoose.startSession();
    try {
        session.startTransaction();

        const secretKey = encrypt(generateAESKey(), kek);
        const passwordHash = await bcrypt.hash(this.password, cryptDriveConfig.passwordSaltRounds);

        await Account.updateOne(
            { _id: this._id },
            { password: passwordHash, secretKey: secretKey },
            { session }
        );

        await session.commitTransaction();
        session.endSession();
    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        throw err;
    }  finally {
        session.endSession();
    }
};

AccountSchema.methods.resecure = async function(kek, oldPassword) {
    if (!this.isModified('password')) return; 
    if (this.password.startsWith('$2b$')) 
        throw new Error('Password appears already hashed. Refusing to re-hash.'); 

    // old password must be in plaintext for rekek
    const session = await mongoose.startSession();
    try {
        session.startTransaction();

        const oldAccount = await Account.findById(this._id).session(session);
        if (!oldAccount) throw new Error('Account not found.');

        const oldKek = await derivekek(oldPassword, oldAccount.kekSalt);
        let secretKey = decrypt(oldAccount.secretKey, oldKek);

        secretKey = encrypt(secretKey, kek);

        const passwordHash = await bcrypt.hash(this.password, cryptDriveConfig.passwordSaltRounds);

        await Account.updateOne(
            { _id: this._id },
            { password: passwordHash, secretKey: secretKey },
            { session }
        );

        await session.commitTransaction();
        session.endSession();
    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        throw err;
    }  finally {
        session.endSession();
    }
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