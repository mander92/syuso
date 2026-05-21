import Joi from 'joi';

import insertWarehouseMovementService from '../../services/warehouse/insertWarehouseMovementService.js';

const schema = Joi.object({
    movementType: Joi.string().valid('in', 'out').required(),
    itemName: Joi.string().trim().min(1).max(150).required(),
    category: Joi.string().trim().allow('', null).max(80),
    size: Joi.string().trim().allow('', null).max(30),
    quantity: Joi.number().integer().min(1).required(),
    unitPrice: Joi.number().min(0).allow('', null),
    movementDate: Joi.date().iso().required(),
    employeeId: Joi.string().trim().allow('', null).max(36),
    recipientName: Joi.string().trim().allow('', null).max(150),
    notes: Joi.string().trim().allow('', null).max(500),
});

const createWarehouseMovementController = async (req, res, next) => {
    try {
        const value = await schema.validateAsync(req.body, {
            abortEarly: false,
        });

        const id = await insertWarehouseMovementService({
            ...value,
            createdBy: req.userLogged.id,
        });

        res.status(201).send({
            status: 'ok',
            message: 'Movimiento de almacen guardado',
            data: { id },
        });
    } catch (error) {
        next(error);
    }
};

export default createWarehouseMovementController;
