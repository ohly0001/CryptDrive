import passport from "passport";
import Account from "../models/account.js";

const update = async (req, res) => {
    passport.authenticate('local', async (err, account, info) => {
        if (err) return next(err);
        if (!account) return res.status(401).json({ message: info?.message || 'Updated failed.' });

        await Account.updateOne({ email: req.body.email });
        return res.status(200).json({ message: 'Account updated!' });
    })(req, res, next);
};

const view = async (req, res) => {
    res.render('/accountManagement', {});
}

export default {
    update,
    view
};