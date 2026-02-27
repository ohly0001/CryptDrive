import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import Account from '../models/account.js';

function configurePassport() {
    const authenticateAccount = async (identification, password, done) => {
        try {
            // allow either username or email matching
            // username is case sensitive, email is not
            const account = await Account.findOne({ $or: [{ username: identification }, { email: identification.toLowerCase() }] });

            if (!account) {
                return done(null, false, { message: 'Invalid login credentials' });
            }

            if (!account.isActive) {
                return done(null, false, { message: 'Account is inactive' });
            }

            const isMatch = await account.comparePassword(password);
            if (!isMatch) {
                return done(null, false, { message: 'Invalid login credentials' });
            }

            return done(null, account);
        } catch (error) {
            return done(error);
        }
    };

    passport.use(new LocalStrategy({ usernameField: 'email' }, authenticateAccount));

    passport.serializeUser((account, done) => done(null, account.id));

    passport.deserializeUser(async (id, done) => {
        try {
            const account = await Account.findById(id)
                .select('-password') // remove irrelevant sensitive info
                .lean(); // return plain JS object
            done(null, account || false);
        } catch (err) {
            done(err);
        }
    });
}

export default configurePassport;