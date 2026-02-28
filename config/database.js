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
        const { ROOT_ACCOUNT_USERNAME, ROOT_ACCOUNT_EMAIL, ROOT_ACCOUNT_PASSWORD } = process.env;

        if (!ROOT_ACCOUNT_USERNAME || !ROOT_ACCOUNT_EMAIL || !ROOT_ACCOUNT_PASSWORD) {
            console.error('[Setup] Missing ROOT_ACCOUNT_* environment variables.');
            process.exit(1);
        }

        const rootExists = await Account.findOne({ username: ROOT_ACCOUNT_USERNAME });

        if (rootExists) {
            console.log('[Setup] The root account already exists.');
            return;
        }

        const rootAccount = new Account({
            username: ROOT_ACCOUNT_USERNAME,
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
        const { DEMO_ACCOUNT_USERNAME, DEMO_ACCOUNT_EMAIL, DEMO_ACCOUNT_PASSWORD } = process.env;

        if (!DEMO_ACCOUNT_USERNAME || !DEMO_ACCOUNT_EMAIL || !DEMO_ACCOUNT_PASSWORD) {
            console.error('[Setup] Missing DEMO_ACCOUNT_* environment variables.');
            process.exit(1);
        }

        let demoAccount = await Account.findOne({ username: DEMO_ACCOUNT_USERNAME });
        const isNew = !demoAccount;

        if (isNew) {
            demoAccount = new Account({
                username: DEMO_ACCOUNT_USERNAME,
                email: DEMO_ACCOUNT_EMAIL,
                password: DEMO_ACCOUNT_PASSWORD,
                type: "demo",
                isActive: true
            });
        } else {
            demoAccount.username = DEMO_ACCOUNT_USERNAME;
            demoAccount.email = DEMO_ACCOUNT_EMAIL;
            demoAccount.password = DEMO_ACCOUNT_PASSWORD;
            demoAccount.type = "demo";
            demoAccount.isActive = true;
        }

        // TODO only recalculate password if it change
        const kek = await derivekek(DEMO_ACCOUNT_PASSWORD, demoAccount.kekSalt);

        if (isNew) {
            await demoAccount.secure(kek);
            await demoAccount.save();
            console.log('[Setup] Created new demo account.');
        } else {
            // TEST if this breaks when the .env changes
            await demoAccount.resecure(kek, DEMO_ACCOUNT_PASSWORD);
            console.log('[Setup] Reset existing demo account.');
        }
        console.log('[Setup] Demo account synchronized successfully.');
    } catch (err) {
        console.error('[Setup] Error synchronizing demo account:', err);
        process.exit(1);
    }
}

async function resetDemoPasswords() {
    try {
        const { DEMO_ACCOUNT_USERNAME, DEMO_ACCOUNT_PASSWORD } = process.env;

        const demoAccount = await Account.findOne(
            { username: DEMO_ACCOUNT_USERNAME },
            { _id: 1, kekSalt: 1, secretKey: 1 }
        ).lean();

        if (!demoAccount) {
            throw new Error(`Demo account '${DEMO_ACCOUNT_USERNAME}' not found.`);
        }

        const accountId = demoAccount._id;

        const allowedTitles = demo_passwords.map(p => p.title);

        await Password.deleteMany({
            account: accountId,
            title: { $nin: allowedTitles }
        });

        // Derive + decrypt once
        const kek = await derivekek(DEMO_ACCOUNT_PASSWORD, demoAccount.kekSalt);
        const secretKey = decrypt(demoAccount.secretKey, kek);

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