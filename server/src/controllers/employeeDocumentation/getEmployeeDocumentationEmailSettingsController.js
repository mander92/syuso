import selectEmployeeDocumentationEmailSettingsService from '../../services/employeeDocumentation/selectEmployeeDocumentationEmailSettingsService.js';

const getEmployeeDocumentationEmailSettingsController = async (req, res, next) => {
    try {
        const data = await selectEmployeeDocumentationEmailSettingsService();

        res.send({
            status: 'ok',
            data,
        });
    } catch (error) {
        next(error);
    }
};

export default getEmployeeDocumentationEmailSettingsController;
