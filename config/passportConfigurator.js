import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import Account from '../models/account.js';

function configurePassport() {
    const authenticateAccount = async (email, password, done) => {

        try {
            const account = await Account.findOne({ email });

            if (!account) {
                return done(null, false, { message: 'Invalid login credentials' });
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
                .select('-passwordHash') // remove sensitive info
                .lean(); // return plain JS object
            done(null, account || false);
        } catch (err) {
            done(err);
        }
    });
}

export default configurePassport;