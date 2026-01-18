import selectActiveServiceShiftsService from '../../services/services/selectActiveServiceShiftsService.js';

const listActiveServiceShiftsController = async (req, res, next) => {
    try {
        const { serviceId } = req.params;

        const rows = await selectActiveServiceShiftsService(serviceId);

        res.send({
            status: 'ok',
            data: rows,
        });
    } catch (error) {
        next(error);
    }
};

export default listActiveServiceShiftsController;
