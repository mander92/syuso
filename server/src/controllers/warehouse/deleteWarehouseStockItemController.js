import Joi from 'joi';

import deleteWarehouseStockItemService from '../../services/warehouse/deleteWarehouseStockItemService.js';

const schema = Joi.object({
    itemName: Joi.string().trim().min(1).max(150).required(),
    category: Joi.string().trim().allow('', null).max(80),
    size: Joi.string().trim().allow('', null).max(30),
});

const deleteWarehouseStockItemController = async (req, res, next) => {
    try {
        const value = await schema.validateAsync(req.body, {
            abortEarly: false,
        });

        const deleted = await deleteWarehouseStockItemService(value);

        res.send({
            status: 'ok',
            message: 'Tipo de prenda borrado',
            data: { deleted },
        });
    } catch (error) {
        next(error);
    }
};

export default deleteWarehouseStockItemController;
