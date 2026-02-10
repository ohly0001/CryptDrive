import mongoose from 'mongoose';
import Account from './account.js';
import { encrypt, decrypt } from '../utilities/encryption.js';

const EncryptedFieldSchema = new mongoose.Schema({
    encryptedData: { type: String, required: true },
    iv: { type: String, required: true },
    authTag: { type: String, required: true }
}, { _id: false }); // No separate _id for subdocs

const PasswordSchema = new mongoose.Schema({
    account: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Account", 
        required: true 
    },
    url: { type: String, required: true, trim: true, index: true },
    htmlId: { type: String },
    username: { type: EncryptedFieldSchema, required: true },
    password: { type: EncryptedFieldSchema, required: true },
    searchTags: { type: [String], index: true }
}, { timestamps: true });

// Encrypt before save
PasswordSchema.pre('save', async function () {
    let accountDoc = null;

    const getSecretKey = async () => {
        if (!accountDoc) accountDoc = await Account.findById(this.account);
        if (!accountDoc) throw new Error('Account not found for encryption');
        return accountDoc.decodeSecretKey();
    };

    if (this.isNew || this.isModified('username')) {
        const key = await getSecretKey();
        this.username = encrypt(this.username, key);
    }
    if (this.isNew || this.isModified('password')) {
        const key = await getSecretKey();
        this.password = encrypt(this.password, key);
    }
});



PasswordSchema.set('toJSON', {
    transform: (doc, ret) => {
        delete ret.password;
        delete ret.username;
        return ret;
    }
});

const Password = mongoose.model('Password', PasswordSchema);
export default Password;