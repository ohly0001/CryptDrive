import mongoose from 'mongoose';

const FileSchema = new mongoose.Schema({
    account: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Account", 
        required: true 
    },
    path: {
        type: String,
        required: true,
        trim: true
    },
    searchTags: {
        type: [String]
    }
}, { timestamps: true });

const File = mongoose.model('File', FileSchema);
export default File;