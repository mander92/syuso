import selectEmployeeDocumentationService from '../../services/employeeDocumentation/selectEmployeeDocumentationService.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';

const getEmployeeDocumentationController = async (req, res, next) => {
    try {
        const targetUserId = req.params.userId || req.userLogged.id;
        const isAdmin =
            req.userLogged.role === 'admin' || req.userLogged.role === 'sudo';

        if (!isAdmin && targetUserId !== req.userLogged.id) {
            generateErrorUtil('Acceso denegado', 403);
        }

        const data = await selectEmployeeDocumentationService(targetUserId);
        if (!data) generateErrorUtil('Usuario no encontrado', 404);

        res.send({ status: 'ok', data });
    } catch (error) {
        next(error);
    }
};

export default getEmployeeDocumentationController;

