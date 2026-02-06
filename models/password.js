import cryptDriveConfig from '../config/cryptDriveConfig.json' with { type: 'json' };
import mongoose from 'mongoose';
import crypto from 'crypto';

const secretKey = crypto.randomBytes(32); 
const algorithm = 'aes-256-gcm';

const PasswordSchema = new mongoose.Schema({
    url: {
        type: String,
        required: true,
        trim: true
    },
    username: {
        type: String,
        required: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    }
}, { timestamps: true });

AccountSchema.pre('save', async function() {
    // Always hash if new document OR password modified
    if (this.isNew || this.isModified('password')) {
        try {
            //this.password = await bcrypt.hash(this.password, cryptDriveConfig.passwordSaltRounds);
            //use reversible hashing instead
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