import Password from '../models/password.js';
import Account from '../models/account.js';
import { decrypt } from '../utilities/encryption.js';

const pull = async (req, res, next) => {
    try {
        if (!req.isAuthenticated?.() || !req.user) {
            return res.status(401).send('Not authenticated.');
        }
        const { limit, offset } = req.body;

        const limitNum = Math.max(parseInt(limit) || 10, 1);
        const offsetNum = Math.max(parseInt(offset) || 0, 0);

        // Fetch encrypted password documents, skipping and limiting as requested
        const passwords = await Password.find({ account: req.user._id })
            .skip(offsetNum)
            .limit(limitNum)
            .select('-__v -password -username');

        // current number of passwords (divide by limitNum to get totalPages)
        const total = await Password.countDocuments({ account: req.user._id });

        // serialize (username and password automatically excluded)
        const partialPasswords = passwords.map(p => p.toJSON());

        // Return the documents as-is, (only perform decryption during clipboard copy ops)
        res.json({ partialPasswords, total });
    } catch (err) {
        next(err);
    }
};

const copyUsername = async (req, res, next) => {
    try {
        if (!req.isAuthenticated?.() || !req.user) {
            return res.status(401).send('Not authenticated.');
        }

        const { passwordId } = req.body;

        const pwd = await Password.findById(passwordId);
        if (!pwd || !pwd.account.equals(req.user._id)) {
            return res.status(404).send('Password not found.');
        }

        const secretKey = decrypt(req.user.secretKey, req.session.kek);
        const decryptedUsername = decrypt(pwd.username, secretKey);

        res.json({ username: decryptedUsername });
    } catch (err) {
        next(err);
    }
};

export default {
    pull, 
    copyUsername
};
