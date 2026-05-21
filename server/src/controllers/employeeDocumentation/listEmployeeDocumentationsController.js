import listEmployeeDocumentationsService from '../../services/employeeDocumentation/listEmployeeDocumentationsService.js';

const listEmployeeDocumentationsController = async (req, res, next) => {
    try {
        const data = await listEmployeeDocumentationsService();
        res.send({ status: 'ok', data });
    } catch (error) {
        next(error);
    }
};

export default listEmployeeDocumentationsController;

