import Joi from 'joi';

import sendInvoiceToClientService from '../../services/billing/sendInvoiceToClientService.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';

const sendInvoiceToClientController = async (req, res, next) => {
    try {
        const schema = Joi.object({
            emails: Joi.string().required(),
            ccEmails: Joi.string().allow('', null),
            message: Joi.string().max(1000).allow('', null),
        });

        const { error, value } = schema.validate(req.body);
        if (error) generateErrorUtil(error.message, 400);

        const data = await sendInvoiceToClientService({
            billingRecordId: req.params.billingRecordId,
            ...value,
            invoiceFile: req.files?.invoiceFile,
            sentBy: req.userLogged.id,
        });

        res.send({
            status: 'ok',
            message: data.failed.length
                ? 'Factura registrada, pero algun correo no se pudo enviar'
                : 'Factura enviada correctamente',
            data,
        });
    } catch (error) {
        next(error);
    }
};

export default sendInvoiceToClientController;
