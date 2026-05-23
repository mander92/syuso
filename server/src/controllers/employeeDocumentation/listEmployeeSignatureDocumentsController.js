import listEmployeeSignatureDocumentsService from '../../services/employeeDocumentation/listEmployeeSignatureDocumentsService.js';

const listEmployeeSignatureDocumentsController = async (req, res, next) => {
    try {
        const data = await listEmployeeSignatureDocumentsService({
            viewerId: req.userLogged.id,
            viewerRole: req.userLogged.role,
            employeeId: req.query.employeeId,
        });

        res.send({ status: 'ok', data });
    } catch (error) {
        next(error);
    }
};

export default listEmployeeSignatureDocumentsController;
