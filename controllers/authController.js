import passport from "passport";
import Account from '../models/account.js';
import Code from '../models/codes.js';
import nodemailer from 'nodemailer';
import { randomInt, timingSafeEqual } from 'crypto';
import { derivekek } from "../utilities/encryption.js";

const sendConfirmationEmail = async (email, code) => {
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD,
        },
    });
    const mailOptions = {
        from: `"CryptDrive No Reply" <${process.env.GMAIL_USER}>`,
        to: email,
        subject: 'CryptDrive Registration Code',
        html: `
            <p>Your activation code is: <strong>${code.code}</strong></p><br>
            <em>We will never send clickable verification links or ask for your password over email or SMS.<em>
        `,
        text: `Your activation code is: ${code.code}\n\nWe will never send clickable verification links or ask for your password over email or SMS.`
    };
    return transporter.sendMail(mailOptions);
};

const resend = async (req, res) => {
    
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

        const newAccount = new Account({email, password});
        const kek = await derivekek(req.body.password, newAccount.kekSalt);
        await newAccount.secure(kek);
        req.session.kek = kek;

        req.session.save(err => {
            if (err) return next(err);
        });

        const activationCode = new Code({
            account: newAccount._id,
            code: randomInt(0, 1000000).toString().padStart(6, '0'),
            type: "account_activation"
        });
        await activationCode.save();

        // Send activation email
        try {
            await sendConfirmationEmail(email, activationCode);
            console.log(`Confirmation email sent to ${email}`);
        } catch (err) {
            console.error('Error sending activation email:', err);
            return res.status(500).send('Failed to send activation email.');
        }

        res.render('activationCode', { email }); // Render page to enter activation code

    } catch (error) {
        console.error(error);
        res.status(500).send('An internal server error occurred.');
    }
};

async function testCode(codeObj, candidateCode) {
    //codeObj: Code.js
    //candidateCode: String
    if (!codeObj || !candidateCode) return false;
    return await codeObj.compareCode(candidateCode);
}

const activate = async (req, res, next) => {
    try {
        const { activationCode } = req.body;

        const codeObj = await Code.findOne({ code: activationCode, type: "account_activation" })
            .sort({ timestamp: -1 });

        const codeMatches = await testCode(codeObj, activationCode);
        if (!codeMatches) {
            return res.status(401).json({ message: 'Invalid or expired activation code.' });
        }

        const account = await Account.findById(codeObj.account);
        if (!account) {
            return res.status(404).json({ message: 'Account not found.' });
        }

        // Mark account as confirmed
        await account.updateOne({ isActive: true });

        await codeObj.deleteOne();

        const kek = req.session.kek; 

        // Log in the user
        req.login(account, (err) => {
        if (err) return next(err);

        // restore KEK after passport rewrites session
        if (kek) req.session.kek = kek;

        req.session.save(err => {
            if (err) return next(err);
            res.redirect('/auth/completed');
        });
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

        req.login(account, async (err) => {
            if (err) return next(err);

            // Derive KEK from the plaintext password used to log in
            const kek = await derivekek(req.body.password, account.kekSalt);
            req.session.kek = kek.toString('base64');

            req.session.save(async err => {
                if (err) return next(err);

                await account.updateOne({ expireAt: null });
                res.redirect('/auth/completed');
            });
        });
    })(req, res, next);
};

const deregister = async (req, res, next) => {
    if (!req.isAuthenticated?.() || !req.user) {
        return res.status(401).send('Not authenticated.');
    }

    try {
        const expireAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
        await Account.updateOne({ _id: req.user._id }, { expireAt });

        req.logout(err => {
            if (err) return next(err);

            req.session.destroy((err) => {
                if (err) return next(err);
                //res.clearCookie('cryptdrive');
                res.redirect('/');
            });
        });

    } catch (err) {
        next(err);
    }
};

const logout = async (req, res, next) => {
    req.logout(err => {
        if (err) return next(err);

        req.session.destroy((err) => {
            if (err) return next(err);
            //res.clearCookie('cryptdrive');
            res.redirect('/');
        });
    });
};

const completed = async (req, res) => {
    res.json({ redirect: '/home' });
};

const status = async (req, res) => {
    const token = req.cookies.remember_token;
    if (token) {
        const user = await validateRememberToken(token);
        if (user) {
            req.login(user, () => {
                return res.redirect("/dash");
            });
            return;
        }
    }

    app.get('/auth/status', (req, res) => {
        res.json({ authenticated: req.isAuthenticated() });
    });
}; 

export default {
    register,
    activate,
    login,
    deregister,
    logout,
    completed,
    status,
    resend
};