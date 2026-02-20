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
    await seedDemoPasswords();
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
            isActive: true
        });
        const kek = await derivekek(ROOT_ACCOUNT_PASSWORD, rootAccount.kekSalt);
        await rootAccount.secure(kek);
        await rootAccount.save();

        return rootAccount;

        console.log('[Setup] Root account created successfully.');
    } catch (err) {
        console.error('[Setup] Error seeding root account:', err);
        process.exit(1);
    }
};

async function seedDemoPasswords() {
    try {
        const { ROOT_ACCOUNT_EMAIL, ROOT_ACCOUNT_PASSWORD } = process.env;

        const rootAccount = await Account.findOne({ email: ROOT_ACCOUNT_EMAIL });
        if (!rootAccount) {
            throw new Error(`Root account with email ${ROOT_ACCOUNT_EMAIL} not found.`);
        }

        const kek = await derivekek(ROOT_ACCOUNT_PASSWORD, rootAccount.kekSalt);
        const secretKey = decrypt(rootAccount.secretKey, kek);

        const passwordsToInsert = demo_passwords.map((json) => ({
            account: rootAccount._id,
            title: json.title,
            url: encrypt(json.url, secretKey), 
            searchTags: json.searchTags.map(t => t.toLowerCase()), 
            username: encrypt(json.username, secretKey),
            password: encrypt(json.password, secretKey),
            note: encrypt(json.note, secretKey),
            isFavourite: json.isFavourite
        }));

        await Password.insertMany(passwordsToInsert);

        console.log(`[Setup] Successfully seeded ${passwordsToInsert.length} demo passwords.`);
    } catch (err) {
        console.error('[Setup] Error seeding demo passwords:', err);
        process.exit(1);
    }
}

export { connectDB, initializeDB };
