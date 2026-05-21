import listWarehouseMovementsService from '../../services/warehouse/listWarehouseMovementsService.js';
import listWarehouseEmployeeStockService from '../../services/warehouse/listWarehouseEmployeeStockService.js';
import listWarehouseStockService from '../../services/warehouse/listWarehouseStockService.js';

const listWarehouseController = async (req, res, next) => {
    try {
        const movements = await listWarehouseMovementsService(req.query);
        const stock = await listWarehouseStockService();
        const employeeStock = await listWarehouseEmployeeStockService();

        res.send({
            status: 'ok',
            data: {
                movements,
                stock,
                employeeStock,
            },
        });
    } catch (error) {
        next(error);
    }
};

export default listWarehouseController;
