import mongoose from 'mongoose'; 
import Account from '../models/account.js';

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
};

const seedRootAccount = async () => {
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
            active: true
        });

        await rootAccount.save();
        console.log('[Setup] Root account created successfully.');
    } catch (err) {
        console.error('[Setup] Error seeding root account:', err);
        process.exit(1);
    }
};

export { connectDB, initializeDB };
