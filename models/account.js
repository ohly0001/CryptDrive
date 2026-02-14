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
    isActive: { type: Boolean, default: false },
    expireAt: { type: Date, default: null }
}, { timestamps: true });

AccountSchema.index( { "expireAt": 1 }, { expireAfterSeconds: 0 } )

AccountSchema.methods.secure = async function(kek) {
    if (!this.isNew) return;
    
    this.secretKey = encrypt(generateAESKey(), kek);
    this.password = await bcrypt.hash(this.password, cryptDriveConfig.passwordSaltRounds);
};

AccountSchema.methods.resecure = async function(kek, oldPassword) {
    if (!this.isModified('password')) return; 
    if (this.password.startsWith('$2b$')) 
        throw new Error('Password appears already hashed. Refusing to re-hash.'); 

    // old password must be in plaintext for rekek
    const oldAccount = await Account.findById(this._id);
    if (!oldAccount) throw new Error('Account not found.');

    const oldKek = await derivekek(oldPassword, oldAccount.kekSalt);
    let secretKey = decrypt(oldAccount.secretKey, oldKek);

    secretKey = encrypt(secretKey, kek);

    const passwordHash = await bcrypt.hash(this.password, cryptDriveConfig.passwordSaltRounds);

    await Account.updateOne(
        { _id: this._id },
        { password: passwordHash, secretKey: secretKey }
    );
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
        //delete ret.secretKey; Breaking req.user.secretKey
        return ret;
    }
});

AccountSchema.pre('deleteOne', { document: true, query: false }, async function() {
    await Promise.all([
        mongoose.model('Code').deleteMany({ account: this._id }),
        mongoose.model('Password').deleteMany({ account: this._id }),
        mongoose.model('File').deleteMany({ account: this._id })
    ]);
});

const Account = mongoose.model('Account', AccountSchema);
export default Account;