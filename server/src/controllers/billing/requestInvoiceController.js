import Joi from 'joi';

import requestInvoiceService from '../../services/billing/requestInvoiceService.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';

const requestInvoiceController = async (req, res, next) => {
    try {
        const schema = Joi.object({
            serviceId: Joi.string().guid({ version: 'uuidv4' }).allow('', null),
            serviceIds: Joi.array()
                .items(Joi.string().guid({ version: 'uuidv4' }))
                .min(1),
            periodStart: Joi.date().iso().required(),
            periodEnd: Joi.date().iso().required(),
            emails: Joi.string().required(),
            ccEmails: Joi.string().allow('', null),
            notes: Joi.string().max(1000).allow('', null),
            concept: Joi.string().max(255).allow('', null),
            concepts: Joi.object().pattern(
                Joi.string().guid({ version: 'uuidv4' }),
                Joi.string().max(255).allow('', null)
            ),
            manualItems: Joi.array().items(
                Joi.object({
                    clientName: Joi.string().max(255).required(),
                    taxId: Joi.string().max(50).allow('', null),
                    address: Joi.string().max(255).allow('', null),
                    hourlyRate: Joi.number().min(0).required(),
                    totalHours: Joi.number().min(0).required(),
                    concept: Joi.string().max(255).required(),
                    vatPercent: Joi.number().min(0).max(100).allow('', null),
                    contactEmail: Joi.string().max(255).allow('', null),
                    delegation: Joi.string().max(100).allow('', null),
                })
            ),
            vatPercent: Joi.number().min(0).max(100).allow('', null),
        }).custom((value, helpers) => {
            if (value.serviceId || value.serviceIds?.length || value.manualItems?.length) {
                return value;
            }
            return helpers.error('any.custom', {
                message: 'Debes seleccionar al menos un servicio o agregar una factura manual',
            });
        });

        const { error, value } = schema.validate(req.body);
        if (error) {
            generateErrorUtil(error.details?.[0]?.context?.message || error.message, 400);
        }

        const data = await requestInvoiceService({
            ...value,
            requestedBy: req.userLogged.id,
        });

        res.send({
            status: 'ok',
            message: data.failed.length
                ? 'Solicitud registrada, pero algun correo no se pudo enviar'
                : 'Solicitud enviada correctamente',
            data,
        });
    } catch (error) {
        next(error);
    }
};

export default requestInvoiceController;
