import mongoose from 'mongoose';

const CodeSchema = new mongoose.Schema({
    account: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Account", 
        required: true 
    },
    code: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        required: true,
        trim: true
    },
    expiresAt: {
        type: Date
    }
}, { timestamps: true });

const Code = mongoose.model('Code', CodeSchema);
export default Code;