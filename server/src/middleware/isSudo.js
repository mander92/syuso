import generateErrorUtil from '../utils/generateErrorUtil.js';

const isSudo = (req, res, next) => {
    const role = req.userLogged.role;

    if (role !== 'sudo') {
        generateErrorUtil(
            'Acceso denegado: Se requiere rol de Superusuario',
            409
        );
    }

    next();
};

export default isSudo;
