import Account from '../models/account.js';
import Password from '../models/password.js';

const pull = async (req, res, next) => {
    try {
        //TODO replace with passport
        const { accountId, limit, offset } = req.body;

        if (!accountId) return res.status(400).json({ error: 'accountId is required' });

        const account = await Account.findById(accountId);
        if (!account) return res.status(404).json({ error: 'Account not found' });

        const limitNum = parseInt(limit) || 10;
        const offsetNum = parseInt(offset) || 0;

        // Fetch encrypted password documents, skipping and limiting as requested
        const passwords = await Password.find({ account: account._id })
            .skip(offsetNum)
            .limit(limitNum);

        // Return the documents as-is, no decryption
        res.json({ passwords });
    } catch (err) {
        next(err);
    }
};

export default {
    pull
};
