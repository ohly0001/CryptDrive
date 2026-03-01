import mongoose from 'mongoose';

const EncryptedFieldSchema = new mongoose.Schema({
    encryptedData: { type: String, required: true },
    iv: { type: String, required: true },
    authTag: { type: String, required: true }
}, { _id: false });

const FileSchema = new mongoose.Schema({
    account: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Account", 
        required: true 
    },
    shared: { 
        type: [mongoose.Schema.Types.ObjectId], 
        ref: "Account", 
    },
    filename: { type: String, trim: true, required: true },
    mime: { type: String, trim: true },
    size: { type: Number, default: 0 }, 
    path: { type: String, required: true, trim: true },
    searchTags: { type: [String], index: true },
    iv: { type: String, required: true },
    authTag: { type: String, required: true },
    note: { type: EncryptedFieldSchema }
}, { timestamps: true });

FileSchema.methods.checkAccess = async function(account) {
    if (this.account.equals(account._id)) return true;
    return this.shared.some(id => id.equals(account._id));
}

FileSchema.methods.addAccount = async function(account) {
    if (!this.shared.some(id => id.equals(account._id))) this.shared.push(account._id);
}

FileSchema.methods.removeAccount = async function(account) {
    this.shared = this.shared.filter(id => !id.equals(account._id));
}

const File = mongoose.models.File || mongoose.model('File', FileSchema);
export default File;