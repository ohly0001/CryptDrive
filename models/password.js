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
    title: { type: String, required: true, trim: true, index: true },
    url: { type: EncryptedFieldSchema, required: true },
    username: { type: EncryptedFieldSchema, required: true },
    password: { type: EncryptedFieldSchema, required: true },
    note: { type: EncryptedFieldSchema, required: true },
    searchTags: { type: [String], index: true }
}, { timestamps: true });

PasswordSchema.set('toJSON', {
    transform: (doc, ret) => {
        delete ret.url,
        delete ret.password;
        delete ret.username;
        return ret;
    }
});

const Password = mongoose.model('Password', PasswordSchema);
export default Password;