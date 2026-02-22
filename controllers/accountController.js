// accountController.js
import Account from "../models/account.js";
import { derivekek } from "../utilities/encryption.js";

// Pull current user account details
const pull = async (req, res) => {
    if (!req.isAuthenticated?.() || !req.user) {
        return res.status(401).json({ redirect: '/auth/login' });
    }

    try {
        const account = await Account.findById(req.user._id).lean();
        if (!account) return res.status(404).json({ message: 'Account not found' });

        // Remove sensitive fields
        delete account.password;
        delete account.secretKey;
        delete account.kekSalt;

        res.status(200).json(account);
    } catch (err) {
        res.status(500).json({ message: `Failed to fetch account: ${err}` });
    }
};

// Update current user account details
const update = async (req, res) => {
    if (!req.isAuthenticated?.() || !req.user) {
        return res.status(401).json({ redirect: '/auth/login' });
    }

    const { email, password, oldPassword } = req.body;

    try {
        const account = await Account.findById(req.user._id);
        if (!account) return res.status(404).json({ message: 'Account not found' });

        if (email) account.email = email.trim().toLowerCase();

        if (password) {
            account.password = password.trim();
            const kek = await derivekek(password, account.kekSalt);
            await account.resecure(kek, oldPassword);
        } else {
            await account.save();
        }

        // Reload updated account
        const updatedAccount = await Account.findById(req.user._id).lean();
        delete updatedAccount.password;
        delete updatedAccount.secretKey;
        delete updatedAccount.kekSalt;

        res.status(200).json(updatedAccount);

    } catch (err) {
        res.status(400).json({ message: `Failed to update account: ${err}` });
    }
};

export default { 
    pull, 
    update 
};