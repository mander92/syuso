import Joi from 'joi';

import generateErrorUtil from '../../utils/generateErrorUtil.js';
import {
    getPayrollById,
    updatePayroll,
} from '../../services/payrolls/payrollService.js';
import { createAcknowledgementService } from '../../services/acknowledgements/acknowledgementService.js';
import { sendPushNotificationToUserService } from '../../services/push/sendPushNotificationService.js';

const schema = Joi.object({
    employeeId: Joi.string().length(36).allow('', null),
    payrollMonth: Joi.string()
        .pattern(/^20\d{2}-(0[1-9]|1[0-2])$/)
        .allow('', null),
    status: Joi.string().valid('unmatched', 'matched', 'published', 'rejected'),
}).min(1);

const updatePayrollController = async (req, res, next) => {
    try {
        const { payrollId } = req.params;
        const payroll = await getPayrollById(payrollId);
        if (!payroll) generateErrorUtil('Nomina no encontrada', 404);

        const { error, value } = schema.validate(req.body || {}, {
            abortEarly: true,
            stripUnknown: true,
        });
        if (error) generateErrorUtil(error.message, 400);

        const nextEmployeeId =
            value.employeeId !== undefined ? value.employeeId : payroll.employeeId;
        const nextMonth =
            value.payrollMonth !== undefined
                ? value.payrollMonth
                : payroll.payrollMonth;
        const nextStatus = value.status || payroll.status;

        if (nextStatus === 'published' && (!nextEmployeeId || !nextMonth)) {
            generateErrorUtil(
                'Para publicar una nomina debes asignar trabajador y mes',
                400
            );
        }

        await updatePayroll(payrollId, value);
        const data = await getPayrollById(payrollId);
        const wasPublished = payroll.status === 'published';
        const isPublished = data.status === 'published';
        if (!wasPublished && isPublished && data.employeeId) {
            await createAcknowledgementService({
                subjectType: 'payroll',
                subjectId: data.id,
                title: 'Nomina disponible',
                message: `Ya puedes consultar tu nomina${data.payrollMonth ? ` de ${data.payrollMonth}` : ''}.`,
                url: '/account',
                recipientUserIds: [data.employeeId],
                createdBy: req.userLogged.id,
                push: false,
            });
            void sendPushNotificationToUserService(data.employeeId, {
                title: 'Nomina disponible',
                body: `Ya puedes consultar tu nomina${data.payrollMonth ? ` de ${data.payrollMonth}` : ''}.`,
                url: '/account',
                tag: `payroll-${data.id}`,
            }).catch((error) => {
                console.error('[push] payroll notification failed', {
                    payrollId: data.id,
                    message: error.message,
                });
            });
        }

        res.send({ status: 'ok', data });
    } catch (error) {
        next(error);
    }
};

export default updatePayrollController;
