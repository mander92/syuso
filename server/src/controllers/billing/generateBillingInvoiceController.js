import Joi from 'joi';

import generateBillingInvoiceService from '../../services/billing/generateBillingInvoiceService.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';

const generateBillingInvoiceController = async (req, res, next) => {
    try {
        const schema = Joi.object({
            invoiceSeries: Joi.string().max(20).allow('', null),
            invoiceDate: Joi.date().iso().allow('', null),
        });

        const { error, value } = schema.validate(req.body || {});
        if (error) generateErrorUtil(error.message, 400);

        const data = await generateBillingInvoiceService({
            billingRecordId: req.params.billingRecordId,
            invoiceSeries: value.invoiceSeries,
            invoiceDate: value.invoiceDate,
        });

        res.send({
            status: 'ok',
            message: `Factura ${data.invoiceNumber} generada`,
            data,
        });
    } catch (error) {
        next(error);
    }
};

export default generateBillingInvoiceController;
