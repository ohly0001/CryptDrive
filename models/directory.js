import mongoose from 'mongoose';
import File from './file.js';

const EncryptedFieldSchema = new mongoose.Schema({
    encryptedData: { type: String, required: true },
    iv: { type: String, required: true },
    authTag: { type: String, required: true }
}, { _id: false });

const DirectorySchema = new mongoose.Schema({
    account: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Account", 
        required: true 
    },
    shared: { 
        type: [mongoose.Schema.Types.ObjectId], 
        ref: "Account", 
        default: []
    },
    parent: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Directory", 
        default: null
    },
    path: { type: String, required: true, trim: true },
    searchTags: { type: [String], index: true },
    basename: { type: String, index: true },
    note: { type: EncryptedFieldSchema }
}, { timestamps: true });

DirectorySchema.methods.getChildCount = async function() {
    let count = await File.countDocuments({ account: this.account, parent: this._id });
    count += await this.constructor.countDocuments({ parent: this._id });
    return count;
}

DirectorySchema.methods.checkAccess = async function(account) {
    if (this.account.equals(account._id)) return true;
    return this.shared.some(id => id.equals(account._id));
}

DirectorySchema.methods.addAccount = async function(account) {
    if (!this.shared.some(id => id.equals(account._id))) this.shared.push(account._id);
}

DirectorySchema.methods.removeAccount = async function(account) {
    this.shared = this.shared.filter(id => !id.equals(account._id));
}

// Recursive directory creation (from base to root)
DirectorySchema.methods.recursiveCreation = async function(account, path) {
    const parts = path.split('/').filter(Boolean);
    let parent = this; // starting directory (can be root)
    for (const part of parts) {
        let dir = await this.constructor.findOne({ account: account._id, parent: parent._id, name: part });
        if (!dir) {
            dir = new this.constructor({
                account: account._id,
                parent: parent._id,
                name: part
            });
            await dir.save();
        }
        parent = dir;
    }
    return parent;
}

const Directory = mongoose.models.Directory || mongoose.model('Directory', DirectorySchema);
export default Directory;