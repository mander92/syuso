import Joi from 'joi';

import upsertEmployeeDocumentationEmailSettingsService from '../../services/employeeDocumentation/upsertEmployeeDocumentationEmailSettingsService.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';

const schema = Joi.object({
    emails: Joi.string().max(1000).allow('', null),
    ccEmails: Joi.string().max(1000).allow('', null),
});

const updateEmployeeDocumentationEmailSettingsController = async (
    req,
    res,
    next
) => {
    try {
        const { error, value } = schema.validate(req.body || {}, {
            abortEarly: true,
            stripUnknown: true,
        });
        if (error) generateErrorUtil(error.message, 400);

        const data = await upsertEmployeeDocumentationEmailSettingsService({
            emails: value.emails,
            ccEmails: value.ccEmails,
            modifiedBy: req.userLogged.id,
        });

        res.send({
            status: 'ok',
            data,
        });
    } catch (error) {
        next(error);
    }
};

export default updateEmployeeDocumentationEmailSettingsController;
