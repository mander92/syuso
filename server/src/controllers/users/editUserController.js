// controllers/users/editUserController.js
import Joi from 'joi';

import generateErrorUtil from '../../utils/generateErrorUtil.js';
import updateUserService from '../../services/users/updateUserService.js';
import updateUserAdminService from '../../services/users/updateUserAdminService.js';

const editUserController = async (req, res, next) => {
    try {
        const loggedId = req.userLogged.id;
        const { userId } = req.params;
        const isAdmin =
            req.userLogged.role === 'admin' || req.userLogged.role === 'sudo';
        const isSudo = req.userLogged.role === 'sudo';

        // Solo puede editar:
        //  - su propia cuenta
        //  - o cualquier usuario si es admin
        if (loggedId !== userId && !isAdmin) {
            generateErrorUtil('Acceso denegado, el token no coincide', 409);
        }

        let schema;

        if (isAdmin) {
            // ADMIN: puede enviar campos parciales
            schema = Joi.object({
                firstName: Joi.string().max(25),
                lastName: Joi.string().max(40),
                phone: Joi.string().max(15),
                dni: Joi.string().max(20),
                city: Joi.string().max(50),
                job: Joi.string().max(50),
                role: Joi.string().valid(
                    'sudo',
                    'admin',
                    'client',
                    'employee'
                ),
                active: Joi.number().valid(0, 1),
                deletedAt: Joi.any().valid(null),
                delegationIds: Joi.array().items(Joi.string().length(36)),
            }).min(1);
        } else {
            // USUARIO normal: solo su propio perfil
            schema = Joi.object({
                firstName: Joi.string().max(25).required(),
                lastName: Joi.string().max(40).required(),
                phone: Joi.string().max(15).required(),
            });
        }

        const { error, value } = schema.validate(req.body, {
            abortEarly: true,
            stripUnknown: true,
        });

        if (error) {
            generateErrorUtil(error.message, 400);
        }

        if (isAdmin) {
            if (
                value.role &&
                (value.role === 'admin' || value.role === 'sudo') &&
                !isSudo
            ) {
                generateErrorUtil(
                    'Solo sudo puede asignar roles de administrador',
                    403
                );
            }

            const { delegationIds, ...updatePayload } = value;

            await updateUserAdminService(userId, updatePayload);

            if (Array.isArray(delegationIds)) {
                if (!isSudo) {
                    generateErrorUtil(
                        'Solo sudo puede gestionar delegaciones',
                        403
                    );
                }

                const { default: replaceAdminDelegationsService } = await import(
                    '../../services/delegations/replaceAdminDelegationsService.js'
                );

                await replaceAdminDelegationsService(userId, delegationIds);
            }
        } else {
            const { firstName, lastName, phone } = value;
            await updateUserService(userId, firstName, lastName, phone);
        }

        res.send({
            status: 'ok',
            message: 'Datos actualizados correctamente',
        });
    } catch (error) {
        next(error);
    }
};

export default editUserController;
