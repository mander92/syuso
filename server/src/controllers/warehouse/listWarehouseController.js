import listWarehouseMovementsService from '../../services/warehouse/listWarehouseMovementsService.js';
import listWarehouseStockService from '../../services/warehouse/listWarehouseStockService.js';

const listWarehouseController = async (req, res, next) => {
    try {
        const movements = await listWarehouseMovementsService(req.query);
        const stock = await listWarehouseStockService();

        res.send({
            status: 'ok',
            data: {
                movements,
                stock,
            },
        });
    } catch (error) {
        next(error);
    }
};

export default listWarehouseController;
