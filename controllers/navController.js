const viewHome = async (req, res, next) => {
    res.render('homePage', {});
};
const viewAccountManagement = async (req, res, next) => {
    res.render('accountManagement', {});
};
const viewGroupManagement = async (req, res, next) => {
    res.render('groupManagement', {});
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
const viewNotekeeper = async (req, res, next) => {
    res.render('noteKeeper', {});
};

export default {
    viewHome,
    viewAccountManagement,
    viewGroupManagement,
    viewPasswordVault,
    viewPasswordFactory,
    viewFileRepository,
    viewNotekeeper
};