import mongoose from 'mongoose';

const NoteSchema = new mongoose.Schema({
    account: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Account", 
        required: true 
    },
    title: { type: String, required: true, trim: true },
    note: { type: String },
    searchTags: { type: [String], index: true },
    isFavourite: { type: Boolean, default: false }
}, { timestamps: true });

const Note = mongoose.models.Note || mongoose.model('Note', NoteSchema);
export default Note;