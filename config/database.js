import mongoose from 'mongoose'; 
import Account from '../models/account.js';
import Password from '../models/password.js';
import demo_passwords from "./demo-passwords.json" with { type: 'json' };
import { derivekek, decrypt, encrypt } from '../utilities/encryption.js';

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log('MongoDB connected successfully.');
    } catch (error) {
        console.error('MongoDB connection failed:', error.message);
        process.exit(1);
    }
};

const initializeDB = async () => {
    await seedRootAccount();
    await resetDemoAccount();
    await resetDemoPasswords();
};

async function seedRootAccount() {
    try {
        const { ROOT_ACCOUNT_EMAIL, ROOT_ACCOUNT_PASSWORD } = process.env;

        if (!ROOT_ACCOUNT_EMAIL || !ROOT_ACCOUNT_PASSWORD) {
            console.error('[Setup] Missing ROOT_ACCOUNT_* environment variables.');
            process.exit(1);
        }

        const rootExists = await Account.findOne({ email: ROOT_ACCOUNT_EMAIL });

        if (rootExists) {
            console.log('[Setup] The root account already exists.');
            return;
        }

        const rootAccount = new Account({
            email: ROOT_ACCOUNT_EMAIL,
            password: ROOT_ACCOUNT_PASSWORD,
            type: "root",
            isActive: true
        });
        const kek = await derivekek(ROOT_ACCOUNT_PASSWORD, rootAccount.kekSalt);
        await rootAccount.secure(kek);
        await rootAccount.save();

        console.log('[Setup] Root account created successfully.');
    } catch (err) {
        console.error('[Setup] Error seeding root account:', err);
        process.exit(1);
    }
};

async function resetDemoAccount() {
    try {
        const { DEMO_ACCOUNT_EMAIL, DEMO_ACCOUNT_PASSWORD } = process.env;

        if (!DEMO_ACCOUNT_EMAIL || !DEMO_ACCOUNT_PASSWORD) {
            console.error('[Setup] Missing DEMO_ACCOUNT_* environment variables.');
            process.exit(1);
        }

        const demoAccount = new Account({
            email: DEMO_ACCOUNT_EMAIL,
            password: DEMO_ACCOUNT_PASSWORD,
            type: "demo",
            isActive: true
        });
        const kek = await derivekek(DEMO_ACCOUNT_PASSWORD, rootAccount.kekSalt);
        await demoAccount.secure(kek);
        await demoAccount.save();

        console.log('[Setup] Demo account synchronized successfully.');
    } catch (err) {
        console.error('[Setup] Error synchronizing demo account:', err);
        process.exit(1);
    }
};

async function resetDemoPasswords() {
    try {
        const { DEMO_ACCOUNT_EMAIL, DEMO_ACCOUNT_PASSWORD } = process.env;

        const rootAccount = await Account.findOne(
            { email: DEMO_ACCOUNT_EMAIL },
            { _id: 1, kekSalt: 1, secretKey: 1 }
        ).lean();

        if (!rootAccount) {
            throw new Error(`Demo account with email ${DEMO_ACCOUNT_EMAIL} not found.`);
        }

        const allowedTitles = demo_passwords.map(p => p.title);

        await Password.deleteMany({
            account: accountId,
            title: { $nin: allowedTitles }
        });

        // Derive + decrypt once
        const kek = await derivekek(DEMO_ACCOUNT_PASSWORD, rootAccount.kekSalt);
        const secretKey = decrypt(rootAccount.secretKey, kek);

        const accountId = rootAccount._id;

        const ops = demo_passwords.map(json => {
            const normalizedTags = (json.searchTags || []).map(t => t.toLowerCase());

            const doc = {
                account: accountId,
                title: json.title,
                url: encrypt(json.url, secretKey),
                searchTags: normalizedTags,
                username: encrypt(json.username, secretKey),
                password: encrypt(json.password, secretKey),
                note: encrypt(json.note, secretKey),
                isFavourite: json.isFavourite
            };

            return {
                updateOne: {
                    filter: { account: accountId, title: doc.title },
                    update: { $set: doc },
                    upsert: true
                }
            };
        });

        if (ops.length === 0) return;

        await Password.bulkWrite(ops, {
            ordered: false // continues on duplicates
        });

        console.log(`[Setup] Demo passwords synchronized (skipped existing).`);

    } catch (err) {
        if (err.code === 11000) {
            console.warn('[Setup] Some duplicates were skipped.');
        } else {
            console.error('[Setup] Error seeding:', err);
            process.exit(1);
        }
    }
}

export { connectDB, initializeDB };