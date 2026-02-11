import Password from '../models/password.js';
import Account from '../models/account.js';
import { decrypt, encrypt } from '../utilities/encryption.js';

const pull = async (req, res, next) => {
    try {
        if (!req.isAuthenticated?.() || !req.user) {
            return res.status(401).redirect('/auth/login');
        }

        const { limit, offset } = req.body;
        const limitNum = Math.max(parseInt(limit) || 10, 1);
        const offsetNum = Math.max(parseInt(offset) || 0, 0);

        const passwords = await Password.find({ account: req.user._id })
            .skip(offsetNum)
            .limit(limitNum)
            .select('-__v -password -username');

        const total = await Password.countDocuments({ account: req.user._id });
        const partialPasswords = passwords.map(p => p.toJSON());

        res.json({ partialPasswords, total });
    } catch (err) {
        next(err);
    }
};

const copy = async (req, res, next) => {
    try {
        if (!req.isAuthenticated?.() || !req.user) {
            return res.status(401).redirect('/auth/login');
        }

        if (!req.session?.kek) {
            return res.status(401).send('Vault locked');
        }

        const { id, category } = req.body;

        const allowed = ['username','password','notes'];
        if (!allowed.includes(category)) {
            return res.status(400).send('Invalid field');
        }

        const pwd = await Password.findById(id);
        if (!pwd || !pwd.account.equals(req.user._id)) {
            return res.status(404).send('Password not found.');
        }

        const secretKey = decrypt(req.user.secretKey, req.session.kek);
        const decryptedValue = decrypt(pwd[category], secretKey);

        res.json({ decryptedValue });

    } catch (err) {
        next(err);
    }
};

const viewEdit = async (req, res, next) => {
    try {
        if (!req.isAuthenticated?.() || !req.user) {
            return res.status(401).redirect('/auth/login');
        }

        if (!req.session?.kek) {
            return res.status(401).send('Vault locked');
        }

        const id = req.params.id;

        const password = await Password.findOne({
            _id: id,
            account: req.user._id
        });

        if (!password) {
            return res.status(404).send('Password not found');
        }

        const secretKey = decrypt(req.user.secretKey, req.session.kek);

        const decrypted = {
            _id: password._id,
            url: password.url,
            searchTags: password.searchTags,
            username: decrypt(password.username, secretKey),
            password: decrypt(password.password, secretKey),
            notes: decrypt(password.notes, secretKey)
        };

        res.render('editPassword', {
            password: decrypted,
            account: req.user
        });

    } catch (err) {
        next(err);
    }
};

const edit = async (req, res, next) => {
    try {
        if (!req.isAuthenticated?.() || !req.user) {
            return res.status(401).redirect('/auth/login');
        }

        if (!req.session?.kek) {
            return res.status(401).send('Vault locked');
        }

        const id = req.params.id;
        const { url, searchTags, username, password, notes } = req.body;

        const passwordObj = await Password.findOne({
            _id: id,
            account: req.user._id
        });

        if (!passwordObj) {
            return res.status(404).send('Password not found');
        }

        const secretKey = decrypt(req.user.secretKey, req.session.kek);

        passwordObj.url = url;
        passwordObj.searchTags = searchTags;
        passwordObj.username = encrypt(username, secretKey);
        passwordObj.password = encrypt(password, secretKey);
        passwordObj.notes = encrypt(notes, secretKey);

        await passwordObj.save();

        res.json({ redirect: '/home/passwordVault' });

    } catch (err) {
        next(err);
    }
};

const viewAdd = async (req, res, next) => {
    res.render('addPassword');
}

const add = async (req, res, next) => {
    
}

export default {
    pull,
    copy,
    viewEdit,
    edit,
    viewAdd,
    add
};