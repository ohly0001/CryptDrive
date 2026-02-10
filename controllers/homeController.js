const viewHome = async (req, res, next) => {
    res.render('homePage', {});
};
const viewAccountManagement = async (req, res, next) => {
    res.render('accountManagement', {});
};
const viewPasswordVault = async (req, res, next) => {
    res.render('passwordVault', {});
};
const viewPasswordFactory = async (req, res, next) => {
    res.render('passwordFactory', {});
};
const viewFileRepository = async (req, res, next) => {
    res.render('fileRepository', {});
};

export default {
    viewHome,
    viewAccountManagement,
    viewPasswordVault,
    viewPasswordFactory,
    viewFileRepository
};