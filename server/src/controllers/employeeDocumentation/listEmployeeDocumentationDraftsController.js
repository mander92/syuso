import listEmployeeDocumentationDraftsService from '../../services/employeeDocumentation/listEmployeeDocumentationDraftsService.js';

const listEmployeeDocumentationDraftsController = async (req, res, next) => {
    try {
        const data = await listEmployeeDocumentationDraftsService();
        res.send({ status: 'ok', data });
    } catch (error) {
        next(error);
    }
};

export default listEmployeeDocumentationDraftsController;

