import selectBillingEmailSettingsService from '../../services/billing/selectBillingEmailSettingsService.js';

const getBillingEmailSettingsController = async (req, res, next) => {
    try {
        const data = await selectBillingEmailSettingsService();

        res.send({
            status: 'ok',
            data,
        });
    } catch (error) {
        next(error);
    }
};

export default getBillingEmailSettingsController;
