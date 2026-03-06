import mongoose from 'mongoose'; 
import Account from '../models/account.js';
import Directory from '../models/directory.js';
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
    const {
      ROOT_ACCOUNT_USERNAME,
      ROOT_ACCOUNT_EMAIL,
      ROOT_ACCOUNT_PASSWORD
    } = process.env;

    if (!ROOT_ACCOUNT_USERNAME || !ROOT_ACCOUNT_EMAIL || !ROOT_ACCOUNT_PASSWORD) {
      throw new Error('[Setup] Missing ROOT_ACCOUNT_* environment variables.');
    }

    let rootAccount = await Account.findOne({ username: ROOT_ACCOUNT_USERNAME });

    // If root does not exist → create it
    if (!rootAccount) {
      rootAccount = new Account({
        username: ROOT_ACCOUNT_USERNAME,
        email: ROOT_ACCOUNT_EMAIL,
        password: ROOT_ACCOUNT_PASSWORD,
        type: 'root',
        isActive: true
      });

      const kek = await derivekek(ROOT_ACCOUNT_PASSWORD, rootAccount.kekSalt);
      await rootAccount.secure(kek);
      await rootAccount.save();

      console.log('[Setup] Root account created.');
    }

    // Ensure root home directory exists (self-healing invariant)
    const kek = await derivekek(ROOT_ACCOUNT_PASSWORD, rootAccount.kekSalt);
    const secretKey = decrypt(rootAccount.secretKey, kek);

    await Directory.updateOne(
      { account: rootAccount._id, path: '/home' },
      {
        $setOnInsert: {
          basename: 'home',
          searchTags: ['home'],
          note: encrypt('Root account home directory', secretKey)
        }
      },
      { upsert: true }
    );

    console.log('[Setup] Root account verified.');

  } catch (err) {
    console.error('[Setup] Root seeding error:', err);
    process.exit(1);
  }
}

async function resetDemoAccount() {
  try {
    const { DEMO_ACCOUNT_USERNAME, DEMO_ACCOUNT_EMAIL, DEMO_ACCOUNT_PASSWORD } = process.env;

    if (!DEMO_ACCOUNT_USERNAME || !DEMO_ACCOUNT_EMAIL || !DEMO_ACCOUNT_PASSWORD) {
      throw new Error('[Setup] Missing DEMO_ACCOUNT_* environment variables.');
    }

    // Delete existing demo account
    await Account.deleteOne({ username: DEMO_ACCOUNT_USERNAME });

    const demoAccount = new Account({
      username: DEMO_ACCOUNT_USERNAME,
      email: DEMO_ACCOUNT_EMAIL,
      password: DEMO_ACCOUNT_PASSWORD,
      type: 'demo',
      isActive: true
    });

    const kek = await derivekek(DEMO_ACCOUNT_PASSWORD, demoAccount.kekSalt);
    await demoAccount.secure(kek);
    await demoAccount.save();

    const secretKey = decrypt(demoAccount.secretKey, kek);

    // Reconcile home directory
    await Directory.updateOne(
      { account: demoAccount._id, path: '/home' },
      {
        $set: {
          basename: 'home',
          searchTags: ['home'],
          note: encrypt('Demo account home directory', secretKey)
        }
      },
      { upsert: true }
    );

    console.log('[Setup] Demo account recreated successfully.');
  } catch (err) {
    console.error('[Setup] Demo reset error:', err);
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

    if (!demoAccount) throw new Error("Demo account not found");

    const accountId = demoAccount._id;

    const kek = await derivekek(DEMO_ACCOUNT_PASSWORD, demoAccount.kekSalt);
    const secretKey = decrypt(demoAccount.secretKey, kek);

    const allowedIds = [];

    const ops = demo_passwords.map(p => {
      const _id = p._id;
      allowedIds.push(_id);

      return {
        updateOne: {
          filter: { _id },
          update: {
            $set: {
              _id,
              account: accountId,
              title: p.title,
              url: encrypt(p.url, secretKey),
              username: encrypt(p.username, secretKey),
              password: encrypt(p.password, secretKey),
              note: encrypt(p.note, secretKey),
              searchTags: (p.searchTags || []).map(t => t.toLowerCase()),
              isFavourite: p.isFavourite
            }
          },
          upsert: true
        }
      };
    });

    await Password.deleteMany({
      account: accountId,
      _id: { $nin: allowedIds }
    });

    await Password.bulkWrite(ops);

    console.log("[Setup] Demo passwords synchronized.");

  } catch (err) {
    console.error("[Setup] Demo password sync error:", err);
    process.exit(1);
  }
}

export { connectDB, initializeDB };