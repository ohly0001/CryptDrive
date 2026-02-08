import mongoose from 'mongoose';

const lifeSpan = 10 * 60 * 1000;

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
    }
}, { timestamps: true });

CodeSchema.index({ "createdAt": 1 }, { "expireAfterSeconds":lifeSpan });

CodeSchema.pre('save', async function(next) {
    this.code = await bcrypt.hash(this.code, 12);
});

CodeSchema.methods.hasExpired = function() {
    return this.expiresAt < Date.now();
};

CodeSchema.methods.compareCode = async function(candidateCode) {
    return await bcrypt.compare(candidateCode, this.code);
};

const Code = mongoose.model('Code', CodeSchema);
export default Code;