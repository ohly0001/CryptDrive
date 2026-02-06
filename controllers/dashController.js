import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const view = async (req, res, next) => {
    res.redirect('/dashPage')
};

export default {
    view
};