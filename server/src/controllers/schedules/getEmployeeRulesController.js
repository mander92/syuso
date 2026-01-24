import selectEmployeeRulesService from '../../services/schedules/selectEmployeeRulesService.js';

const getEmployeeRulesController = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const data = await selectEmployeeRulesService(userId);

        res.send({
            status: 'ok',
            data,
        });
    } catch (error) {
        next(error);
    }
};

export default getEmployeeRulesController;
