import deleteWarehouseMovementService from '../../services/warehouse/deleteWarehouseMovementService.js';

const deleteWarehouseMovementController = async (req, res, next) => {
    try {
        await deleteWarehouseMovementService(req.params.movementId);

        res.send({
            status: 'ok',
            message: 'Movimiento de almacen eliminado',
        });
    } catch (error) {
        next(error);
    }
};

export default deleteWarehouseMovementController;
