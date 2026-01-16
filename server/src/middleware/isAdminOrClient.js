import generateErrorUtil from '../utils/generateErrorUtil.js';

const isAdminOrClient = (req, res, next) => {
    const role = req.userLogged.role;

    if (role !== 'admin' && role !== 'client' && role !== 'sudo') {
        generateErrorUtil(
            'Acceso denegado: Se requiere rol de Administrador o Cliente',
            409
        );
    }

    next();
};

export default isAdminOrClient;
