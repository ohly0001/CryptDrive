import cryptDriveConfig from '../config/cryptDriveConfig.json' with { type: 'json' };
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const GroupSchema = new mongoose.Schema({
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "Account", required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "Account", required: true }],
    name: { type: String, required: true, trim: true },
    maxMembers: { type: Number, required: true, default: 10 },
    joinCode: { type: String, default: null }, // bcrypt hashed
    joinCodeExpiration: { type: Date, default: null },
    tags: [{ type: String }],
    favourites: [{ type: mongoose.Schema.Types.ObjectId, ref: "Account" }],
    description: { type: String, default: "" }
}, { timestamps: true });

GroupSchema.index({ owner: 1 });
GroupSchema.index({ members: 1 });

// Correct pre-save hook
GroupSchema.pre('save', { document: true, query: false }, async function() {
    if (this.joinCode) {
        await this.setJoinCode(this.joinCode);
    }
});

// Set hashed join code
GroupSchema.methods.setJoinCode = async function(joinCode) {
    if (joinCode) {
        this.joinCode = await bcrypt.hash(joinCode, cryptDriveConfig.passwordSaltRounds);
        this.joinCodeExpiration = new Date(Date.now() + cryptDriveConfig.joinCodeDuration);
    }
};

// Compare provided join code
GroupSchema.methods.compareCode = async function(joinCode) {
    if (!this.joinCode || Date.now() > this.joinCodeExpiration) return false;
    try {
        return await bcrypt.compare(joinCode, this.joinCode);
    } catch {
        return false;
    }
};

// Add member safely
GroupSchema.methods.addMember = async function(memberId, joinCode) {
    if (!memberId) return false;
    if (this.members.some(id => id.equals(memberId))) return false;

    // Expired or full
    if ((this.joinCode && Date.now() > this.joinCodeExpiration) || this.members.length >= this.maxMembers) {
        this.joinCode = null;
        this.joinCodeExpiration = null;
        await this.save();
        return false;
    }

    const codeMatches = await this.compareCode(joinCode);
    if (!codeMatches) return false;

    this.members.push(memberId);
    await this.save();
    return true;
};

// Remove member
GroupSchema.methods.removeMember = async function(memberId) {
    this.members.pull(memberId);
    await this.save();
    return true;
};

const Group = mongoose.models.Group || mongoose.model('Group', GroupSchema);
export default Group;