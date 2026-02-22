import mongoose from 'mongoose';

const FileSchema = new mongoose.Schema({
    account: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Account", 
        required: true 
    },
    name: { type: String, trim: true, required: true },
    mime: { type: String, trim: true },
    size: { type: Number, default: 0 }, 
    shared: { 
        type: [mongoose.Schema.Types.ObjectId], 
        ref: "Account", 
    },
    path: { type: String, required: true, trim: true },
    searchTags: { type: [String], index: true },
    iv: { type: String, required: true },
    authTag: { type: String, required: true }
}, { timestamps: true });

const File = mongoose.models.File || mongoose.model('File', FileSchema);
export default File;