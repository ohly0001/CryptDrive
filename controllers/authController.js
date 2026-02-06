import passport from "passport";
import satConfig from '../config/cryptDriveConfig.json' with { type: 'json' };
import Account from '../models/account.js';

const register = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).send('Missing required fields.');
        }

        const existingAccount = await Account.findOne({ email });

        if (existingAccount) {
            return res.status(409).send('Username or email already exists.');
        }

        const newAccount = new Account({ email, password });
        await newAccount.save();

        res.redirect(302, "/auth/completed");
    } catch (error) {
        console.error(error);
        res.status(500).send('An internal server error occurred.');
    }
};

const login = async (req, res, next) => {
    passport.authenticate('local', (err, account, info) => {
        if (err) return next(err);

        if (!account) {
            return res.status(401).json({
                message: info?.message || 'Authentication failed.'
            });
        }

        req.login(account, (err) => {
            if (err) return next(err);
            res.redirect(302, "/auth/completed");
        });
    })(req, res, next);
};

const deregister = async (req, res, next) => {
    if (!req.isAuthenticated?.() || !req.user) {
        return res.status(401).send('Not authenticated.');
    }

    try {
        await Account.deleteOne({ _id: req.user._id });
        req.logout(err => {
            if (err) return next(err);
            res.redirect(302, "/");
        });
    } catch (err) {
        next(err);
    }
};

const logout = async (req, res, next) => {
    req.logout(err => {
        if (err) return next(err);
        res.redirect(302, '/');
    });
};

const completed = async (req, res, next) => {
    res.redirect(302, 'http://127.0.0.1:8000/dashPage.html');
};

export default {
    register,
    login,
    deregister,
    logout,
    completed
};