import Password from '../models/password.js';
import { decrypt, encrypt } from '../utilities/encryption.js';

const search = async (req, res, next) => {
    try {
        const {
            limit,
            offset,
            favouritesOnly,
            searchTerm,
            matchCase,
            matchEntire,
            useRegex,
            searchTags,
            blacklistTags
        } = req.body;

        const limitNum = Math.max(parseInt(limit) || 10, 1);
        const offsetNum = Math.max(parseInt(offset) || 0, 0);

        // =========================
        // Build query conditions
        // =========================
        const conditions = [{ account: req.user._id }];

        // Filter favourites
        if (favouritesOnly) {
            conditions.push({ isFavourite: true });
        }

        // Filter by search term (require all tags to be present, but allows for partial set overlap)
        if (searchTerm) {
            let pattern;
            if (useRegex) {
                pattern = searchTerm;
            } else {
                const escaped = (searchTerm || "").trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                pattern = matchEntire ? `^${escaped}$` : escaped;
            }

            conditions.push({
                $or: [
                    { title: { $regex: pattern, $options: matchCase ? '' : 'i' } },
                    { searchTags: { $regex: pattern, $options: 'i' } } // always case-insensitive for tags
                ]
            });
        }

        // Filter by tags (normalized to lowercase)
        if (Array.isArray(searchTags) && searchTags.length > 0) {
            const normalizedTags = searchTags.map(t => t.toLowerCase());

            if (blacklistTags) {
                // Exclude any document containing ANY of these tags
                conditions.push({ searchTags: { $nin: normalizedTags } });
            } else {
                // Require ALL provided tags to exist in the document
                conditions.push({ searchTags: { $all: normalizedTags } });
            }
        }

        // Combine all conditions
        const query = conditions.length > 1 ? { $and: conditions } : conditions[0];

        // =========================
        // Total count for pagination
        // =========================
        const total = await Password.countDocuments(query);

        // =========================
        // Fetch data with pagination & sorting
        // =========================
        const passwords = await Password.find(query)
            .skip(offsetNum)
            .limit(limitNum)
            .sort({ isFavourite: -1, title: 1 }) // favourites first, then title
            .select('-__v -url -password -username -note'); // minimal fields

        // =========================
        // Return JSON
        // =========================
        res.json({
            partialPasswords: passwords.map(p => p.toJSON()),
            total
        });

    } catch (err) {
        next(err);
    }
};

const copy = async (req, res, next) => {
    try {
        //if (!req.session?.kek) return res.status(401).json({message: 'Vault locked'});

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
        //if (!req.session?.kek) return res.status(401).json({message: 'Vault locked'});

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
            note: decrypt(password.note, secretKey),
            isFavourite: password.isFavourite,
            createdAt: password.createdAt,
            updatedAt: password.updatedAt
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
        //if (!req.session?.kek) return res.status(401).json({message: 'Vault locked'});

        const id = req.params.id;
        const { title, url, searchTags, username, password, note, isFavourite } = req.body;

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
        passwordObj.searchTags = (searchTags || []).map(t => t.toLowerCase());
        passwordObj.username = encrypt(username, secretKey);
        passwordObj.password = encrypt(password, secretKey);
        passwordObj.note = encrypt(note, secretKey);
        passwordObj.isFavourite = isFavourite;

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
        //if (!req.session?.kek) return res.status(401).json({message: 'Vault locked'});

        const { title, url, searchTags, username, password, note, isFavourite } = req.body;

        const secretKey = decrypt(req.user.secretKey, req.session.kek);

        const passwordObj = new Password({
            account: req.user._id,
            title,
            url: encrypt(url || "", secretKey), 
            searchTags: (searchTags || []).map(t => t.toLowerCase()), 
            username: encrypt(username || "", secretKey),
            password: encrypt(password || "", secretKey),
            note: encrypt(note || "", secretKey),
            isFavourite: isFavourite || false
        });
        await passwordObj.save();

        res.json({ redirect: '/home/passwordVault' });
    } catch (err) {
        res.json({ message: 'Something went wrong when adding your password' });
        next(err);
    }
}

const deleteOne = async (req, res, next) => {
    try {
        await Password.findByIdAndDelete(req.body.id);
        
    } catch (err) {
        res.json({ message: 'Something went wrong when deleting your password' });
        next(err);
    }
}

const deleteMany = async (req, res, next) => {
    try {
        await Password.deleteMany({ _id: { $in: req.body.ids }})
        
    } catch (err) {
        res.json({ message: 'Something went wrong when deleting your passwords' });
        next(err);
    }
}

const favouriteMany = async (req, res, next) => {
    try {
        const { ids, state } = req.body;
        await Password.updateMany(
            { _id: { $in: ids } },
            { $set: { isFavourite: state } } 
        );
    } catch (err) {
        res.json({ message: 'Something went wrong when favouriting/unfavouriting your passwords' });
        next(err);
    }
}

const toggleFavourite = async (req, res, next) => {
    try {
        await Password.findByIdAndUpdate(req.body.id, { $set: { isFavourite: req.body.state } })
    } catch (err) {
        res.json({ message: 'Something went wrong when favouriting/unfavouriting your password' });
        next(err);
    }
}

export default {
    search,
    copy,
    viewEdit,
    edit,
    viewAdd,
    add,
    deleteOne,
    deleteMany,
    favouriteMany,
    toggleFavourite
};