import Joi from 'joi';

import generateErrorUtil from '../../utils/generateErrorUtil.js';
import { calculateSalarySettlements } from '../../services/salarySettlements/salarySettlementService.js';

const schema = Joi.object({
    month: Joi.string()
        .pattern(/^20\d{2}-(0[1-9]|1[0-2])$/)
        .required(),
    employeeId: Joi.string().length(36).allow('', null),
    generateExcel: Joi.boolean().truthy('true').falsy('false').default(false),
});

const listSalarySettlementsController = async (req, res, next) => {
    try {
        const { error, value } = schema.validate(req.query, {
            stripUnknown: true,
        });
        if (error) generateErrorUtil(error.message, 400);

        const data = await calculateSalarySettlements({
            viewerId: req.userLogged.id,
            viewerRole: req.userLogged.role,
            ...value,
        });

        res.send({ status: 'ok', data });
    } catch (error) {
        next(error);
    }
};

export default listSalarySettlementsController;
