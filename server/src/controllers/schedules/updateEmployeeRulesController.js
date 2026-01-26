import upsertEmployeeRulesService from '../../services/schedules/upsertEmployeeRulesService.js';

const updateEmployeeRulesController = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const {
            minMonthlyHours,
            maxMonthlyHours,
            minRestHours,
            restWeekendType,
            restWeekendCount,
        } = req.body;

        const data = await upsertEmployeeRulesService(
            userId,
            minMonthlyHours,
            maxMonthlyHours,
            minRestHours,
            restWeekendType,
            restWeekendCount
        );

        res.send({
            status: 'ok',
            data,
        });
    } catch (error) {
        next(error);
    }
};

export default updateEmployeeRulesController;
