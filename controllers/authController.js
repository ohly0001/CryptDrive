import passport from "passport";
import Account from '../models/account.js';
import Code from '../models/codes.js';
import nodemailer from 'nodemailer';
import { randomInt } from 'crypto';
import { deriveKEK } from "../utilities/encryption.js";

const GMAIL_USER = "cryptdrive08@gmail.com";

const sendConfirmationEmail = async (email, code) => {
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD,
        },
    });

    const mailOptions = {
        from: `"CryptDrive No Reply" <${GMAIL_USER}>`,
        to: email,
        subject: 'CryptDrive Registration Code',
        html: `
            <p>Your activation code is: <strong>${code.code}</strong></p>
            <p>Please do not reply to this email.</p>
        `,
        text: `Your activation code is: ${code.code}\nPlease do not reply to this email.`
    };

    return transporter.sendMail(mailOptions);
};

const resendConfirmationEmail = async (email, code) => {
    await code.deleteOne();

    //TODO
};

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

        // Generate activation code
        const activationCode = randomInt(0, 1000000).toString().padStart(6, '0');

        // Create account with activation code
        const newAccount = new Account({
            email,
            password,
            active: false,
        });
        await newAccount.save();

        const registerCode = new Code({
            account: newAccount._id,
            code: activationCode,
            type: "account_activation",
            expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
        });
        await registerCode.save();

        // Send activation email
        try {
            await sendConfirmationEmail(email, activationCode);
            console.log(`Confirmation email sent to ${email}`);
        } catch (err) {
            console.error('Error sending activation email:', err);
            return res.status(500).send('Failed to send activation email.');
        }

        const kek = await deriveKEK(req.body.password);
        req.session.kek = kek.toString('base64');

        res.render('activationCode', { email }); // Render page to enter activation code

    } catch (error) {
        console.error(error);
        res.status(500).send('An internal server error occurred.');
    }
};

const activate = async (req, res, next) => {
    try {
        const { email, activationCode } = req.body;

        const account = await Account.findOne({ email });
        if (!account) {
            return res.status(404).json({ message: 'Account not found.' });
        }

        if (account.active) {
            return res.status(400).json({ message: 'Account already confirmed.' });
        }

        const code = await Code.findOne({account: account._id, type: "account_activation"});

        if (!code || code.expiresAt < Date.now() || activationCode !== code.code) {
            return res.status(401).json({ message: 'Invalid or expired activation code.' });
        }

        // Mark account as confirmed
        account.active = true;
        await account.save();

        await code.deleteOne();

        // Log in the user
        req.login(account, (err) => {
            if (err) return next(err);
            res.redirect('/auth/completed');
        });

    } catch (err) {
        console.error(err);
        res.status(500).send('Internal server error.');
    }
};

const login = async (req, res, next) => {
    passport.authenticate('local', async (err, account, info) => {
        if (err) return next(err);
        if (!account) return res.status(401).json({ message: info?.message || 'Authentication failed.' });

        // Derive KEK from the plaintext password used to log in
        const kek = await deriveKEK(req.body.password);
        req.session.kek = kek.toString('base64'); // store in memory

        req.login(account, (err) => {
            if (err) return next(err);
            res.redirect('/auth/completed');
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
            res.redirect('/');
        });
    } catch (err) {
        next(err);
    }
};

const logout = async (req, res, next) => {
    req.session.kek = null;
    req.logout(err => {
        if (err) return next(err);
        res.redirect('/');
    });
};

const completed = async (req, res) => {
    res.json({ redirect: '/dash' });
};

export default {
    register,
    activate,
    login,
    deregister,
    logout,
    completed
};