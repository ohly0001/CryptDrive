import cryptDriveConfig from '../config/cryptDriveConfig.json' with { type: 'json' };
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const GroupSchema = new mongoose.Schema({
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Account",
        required: true
    },
    members: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Account",
        required: true
    }],
    name: { type: String, required: true, trim: true },
    maxMembers: { type: Number, required: true, default: 1 },
    joinCode: { type: String, default: null } // bcrypt hashed
}, { timestamps: true });

GroupSchema.index({ owner: 1 });
GroupSchema.index({ members: 1 });

GroupSchema.methods.secure = async function(kek) {
    if (!this.isNew) return;
    
    this.joinCode = await bcrypt.hash(this.joinCode, cryptDriveConfig.passwordSaltRounds);
};

/**
 * Compare provided join code against stored hash
 */
GroupSchema.methods.compareCode = async function (joinCode) {
    if (!this.joinCode) return false;
    try {
        return await bcrypt.compare(joinCode, this.joinCode);
    } catch {
        return false;
    }
};

/**
 * Add member if:
 * - not already in group
 * - under maxMembers
 * - join code matches
 */
GroupSchema.methods.addMember = async function (memberId, joinCode) {
    if (!memberId) return false;

    // Prevent duplicates (ObjectId-safe check)
    const alreadyMember = this.members.some(id => id.equals(memberId));
    if (alreadyMember) return false;

    if (this.members.length >= this.maxMembers) return false;

    const codeMatches = await this.compareCode(joinCode);
    if (!codeMatches) return false;

    this.members.push(memberId);
    await this.save();
    return true;
};

/**
 * Remove member
 */
GroupSchema.methods.removeMember = async function (memberId) {
    this.members.pull(memberId);
    await this.save();
    return true;
};

const Group = mongoose.model('Group', GroupSchema);
export default Group;