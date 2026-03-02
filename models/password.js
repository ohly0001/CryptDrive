import mongoose from 'mongoose';

const PasswordSchema = new mongoose.Schema({
    account: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Account", 
        required: true 
    },
    title: { type: String, required: true, trim: true, unique: true },
    url: { type: String, index: true },
    username: { type: String, required: true },
    password: { type: String, required: true },
    note: { type: String },
    searchTags: { type: [String], index: true },
    isFavourite: { type: Boolean, default: false }
}, { timestamps: true });

PasswordSchema.set('toJSON', {
    transform: (doc, ret) => {
        delete ret.url,
        delete ret.password;
        delete ret.username;
        delete ret.note;
        return ret;
    }
});

const Password = mongoose.models.Password || mongoose.model('Password', PasswordSchema);
export default Password;