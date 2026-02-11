import Password from '../models/password.js';
import Account from '../models/account.js';
import { decrypt, encrypt } from '../utilities/encryption.js';

const pull = async (req, res, next) => {
    try {
        if (!req.isAuthenticated?.() || !req.user) {
            return res.status(401).json({ redirect: '/auth/login' });
        }

        const { limit, offset } = req.body;
        const limitNum = Math.max(parseInt(limit) || 10, 1);
        const offsetNum = Math.max(parseInt(offset) || 0, 0);

        const passwords = await Password.find({ account: req.user._id })
            .skip(offsetNum)
            .limit(limitNum)
            .select('-__v -url -password -username');

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
            return res.status(401).json({ redirect: '/auth/login' });
        }

        if (!req.session?.kek) {
            return res.status(401).send('Vault locked');
        }

        const { id, category } = req.body;

        const allowed = ['url', 'username','password','note'];
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
            return res.status(401).json({ redirect: '/auth/login' });
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
            title: password.title,
            url: decrypt(password.url, secretKey),
            searchTags: password.searchTags,
            username: decrypt(password.username, secretKey),
            password: decrypt(password.password, secretKey),
            note: decrypt(password.note, secretKey)
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
            return res.status(401).json({ redirect: '/auth/login' });
        }

        if (!req.session?.kek) {
            return res.status(401).send('Vault locked');
        }

        const id = req.params.id;
        const { title, url, searchTags, username, password, note } = req.body;

        const passwordObj = await Password.findOne({
            _id: id,
            account: req.user._id
        });

        if (!passwordObj) {
            return res.status(404).send('Password not found');
        }

        const secretKey = decrypt(req.user.secretKey, req.session.kek);

        passwordObj.title = title;
        passwordObj.url = encrypt(url, secretKey);
        passwordObj.searchTags = searchTags;
        passwordObj.username = encrypt(username, secretKey);
        passwordObj.password = encrypt(password, secretKey);
        passwordObj.note = encrypt(note, secretKey);

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
    try {
        if (!req.isAuthenticated?.() || !req.user) {
            return res.status(401).json({ redirect: '/auth/login' });
        }

        if (!req.session?.kek) {
            return res.status(401).send('Vault locked');
        }

        const { title, url, searchTags, username, password, note } = req.body;

        const secretKey = decrypt(req.user.secretKey, req.session.kek);

        const passwordObj = new Password({
            account: req.user._id,
            title,
            url: encrypt(url, secretKey), 
            searchTags, 
            username: encrypt(username, secretKey),
            password: encrypt(password, secretKey),
            note: encrypt(note, secretKey)
        });
        await passwordObj.save();

        res.json({ redirect: '/home/passwordVault' });
    } catch (err) {
        res.json({ message: 'Something went wrong when adding your password' });
        next(err);
    }
}

export default {
    pull,
    copy,
    viewEdit,
    edit,
    viewAdd,
    add
};