import cryptDriveConfig from '../config/cryptDriveConfig.json' with { type: 'json' };
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const AccountSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, "Invalid email"]
    },
    password: {
        type: String,
        required: true
    }
}, { timestamps: true });

AccountSchema.pre('save', async function() {
    // Always hash if new document OR password modified
    if (this.isNew || this.isModified('password')) {
        if (this.password.length < cryptDriveConfig.minPasswordSize) {
            throw new Error(`Password must be at least ${cryptDriveConfig.minPasswordSize} characters.`);
        }

        try {
            this.password = await bcrypt.hash(this.password, cryptDriveConfig.passwordSaltRounds);
        } catch (err) {
            throw err;
        }
    }
});

AccountSchema.methods.comparePassword = async function(candidatePassword) {
    try {
        return await bcrypt.compare(candidatePassword, this.password);
    } catch {
        return false;
    }
};

AccountSchema.set('toJSON', {
    transform: (doc, ret) => {
        delete ret.password;
        return ret;
    }
});

const Account = mongoose.model('Account', AccountSchema);
export default Account;