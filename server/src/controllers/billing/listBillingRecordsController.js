import listBillingRecordsService from '../../services/billing/listBillingRecordsService.js';

const listBillingRecordsController = async (req, res, next) => {
    try {
        const data = await listBillingRecordsService(req.query);

        res.send({
            status: 'ok',
            data,
        });
    } catch (error) {
        next(error);
    }
};

export default listBillingRecordsController;
