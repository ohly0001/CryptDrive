import mongoose from 'mongoose';
import crypto from 'crypto';

const CodeSchema = new mongoose.Schema({
    account: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
    hashedCode: { type: String, required: true }, // Store the hash, not the 123456
    type: { type: String, default: "account_activation" },
    createdAt: { type: Date, default: Date.now, expires: 900 } // Auto-delete after 15 mins
});

CodeSchema.methods.compareCode = function(candidateCode) {
    // 1. Hash the user's input the same way
    const candidateHash = crypto.createHash('sha256').update(candidateCode).digest();
    // 2. Convert stored hex string back to a buffer
    const storedHash = Buffer.from(this.hashedCode, 'hex');
    // 3. Timing-safe compare (SHA-256 is always 32 bytes)
    return crypto.timingSafeEqual(candidateHash, storedHash);
};

const Code = mongoose.models.Code || mongoose.model('Code', CodeSchema);
export default Code;