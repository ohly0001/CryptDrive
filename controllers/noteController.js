import Note from '../models/note.js';
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
        const total = await Note.countDocuments(query);

        // =========================
        // Fetch data with pagination & sorting
        // =========================
        const notes = await Note.find(query)
            .skip(offsetNum)
            .limit(limitNum)
            .sort({ isFavourite: -1, title: 1 }) // favourites first, then title
            .select('-__v -note'); // minimal fields

        // =========================
        // Return JSON
        // =========================
        res.json({
            partialNotes: notes.map(p => p.toJSON()),
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

        const allowed = ['note'];
        if (!allowed.includes(category)) {
            return res.status(400).send('Invalid field');
        }

        const pwd = await Note.findById(id);
        if (!pwd || !pwd.account.equals(req.user._id)) {
            return res.status(404).send('Note not found.');
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

        const note = await Note.findOne({
            _id: id,
            account: req.user._id
        });

        if (!note) {
            return res.status(404).send('Note not found');
        }

        const secretKey = decrypt(req.user.secretKey, req.session.kek);

        const decrypted = {
            _id: note._id,
            title: note.title,
            searchTags: note.searchTags,
            note: decrypt(note.note, secretKey),
            isFavourite: note.isFavourite,
            createdAt: note.createdAt,
            updatedAt: note.updatedAt
        };

        res.render('editNote', {
            note: decrypted,
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
        const { title, searchTags, note, isFavourite } = req.body;

        const noteObj = await Note.findOne({
            _id: id,
            account: req.user._id
        });

        if (!noteObj) {
            return res.status(404).send('Note not found');
        }

        const secretKey = decrypt(req.user.secretKey, req.session.kek);

        noteObj.title = title;
        noteObj.searchTags = (searchTags || []).map(t => t.toLowerCase());
        noteObj.note = encrypt(note, secretKey);
        noteObj.isFavourite = isFavourite;

        await noteObj.save();

        res.json({ redirect: '/noteKeeper' });

    } catch (err) {
        next(err);
    }
};

const viewAdd = async (req, res, next) => {
    res.render('addNote');
}

const add = async (req, res, next) => {
    try {
        //if (!req.session?.kek) return res.status(401).json({message: 'Vault locked'});

        const { title, searchTags, note, isFavourite } = req.body;

        const secretKey = decrypt(req.user.secretKey, req.session.kek);

        const noteObj = new Note({
            account: req.user._id,
            title,
            searchTags: (searchTags || []).map(t => t.toLowerCase()), 
            note: encrypt(note || "", secretKey),
            isFavourite: isFavourite || false
        });
        await noteObj.save();

        res.json({ redirect: '/noteKeeper' });
    } catch (err) {
        res.json({ message: 'Something went wrong when adding your note' });
        next(err);
    }
}

const deleteOne = async (req, res, next) => {
    try {
        await Note.findByIdAndDelete(req.body.id);
        
    } catch (err) {
        res.json({ message: 'Something went wrong when deleting your note' });
        next(err);
    }
}

const deleteMany = async (req, res, next) => {
    try {
        await Note.deleteMany({ _id: { $in: req.body.ids }})
        
    } catch (err) {
        res.json({ message: 'Something went wrong when deleting your notes' });
        next(err);
    }
}

const favouriteMany = async (req, res, next) => {
    try {
        const { ids, state } = req.body;
        await Note.updateMany(
            { _id: { $in: ids } },
            { $set: { isFavourite: state } } 
        );
    } catch (err) {
        res.json({ message: 'Something went wrong when favouriting/unfavouriting your notes' });
        next(err);
    }
}

const toggleFavourite = async (req, res, next) => {
    try {
        await Note.findByIdAndUpdate(req.body.id, { $set: { isFavourite: req.body.state } })
    } catch (err) {
        res.json({ message: 'Something went wrong when favouriting/unfavouriting your Note' });
        next(err);
    }
}

const view = async (req, res, next) => {
    res.render('noteKeeper', {});
};

export default {
    view,
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