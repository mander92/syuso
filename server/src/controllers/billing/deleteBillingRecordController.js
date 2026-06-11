import deleteBillingRecordService from '../../services/billing/deleteBillingRecordService.js';

const deleteBillingRecordController = async (req, res, next) => {
    try {
        const data = await deleteBillingRecordService({
            billingRecordId: req.params.billingRecordId,
            user: req.userLogged,
        });

        res.send({
            status: 'ok',
            message: 'Registro de facturacion borrado',
            data,
        });
    } catch (error) {
        next(error);
    }
};

export default deleteBillingRecordController;
