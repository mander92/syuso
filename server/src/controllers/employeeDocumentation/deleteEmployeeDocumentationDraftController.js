import deleteEmployeeDocumentationDraftService from '../../services/employeeDocumentation/deleteEmployeeDocumentationDraftService.js';
import { emitDocumentationChanged } from '../../utils/documentationNotificationUtil.js';

const deleteEmployeeDocumentationDraftController = async (req, res, next) => {
    try {
        const { draftId } = req.params;

        await deleteEmployeeDocumentationDraftService(draftId);

        emitDocumentationChanged({
            changedBy: req.userLogged.id,
            subjectId: draftId,
            subjectType: 'employeeDraft',
            title: 'Alta de trabajador borrada',
            message: 'Se ha borrado una ficha de alta de trabajador',
        });

        res.send({
            status: 'ok',
            message: 'Alta de trabajador borrada',
        });
    } catch (error) {
        next(error);
    }
};

export default deleteEmployeeDocumentationDraftController;
