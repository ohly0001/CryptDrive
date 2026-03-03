export const isAuthenticated = (req, res, next) => {
    if (req.session && req.isAuthenticated?.() && req.user) {
        return next();
    }
    res.redirect(`/login.html`);
};