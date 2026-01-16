// controllers/users/registerUserAdminController.js
import Joi from 'joi';

import insertAdminService from '../../services/users/insertUserAdminService.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';
import randomstring from 'randomstring';

const registerUserAdminController = async (req, res, next) => {
    try {
        // ✅ Validamos datos de entrada (sin password, la genera el servidor)
        const schema = Joi.object({
            role: Joi.string()
                .valid('sudo', 'admin', 'client', 'employee')
                .required(),
            email: Joi.string().email().required(),
            firstName: Joi.string().max(25).required(),
            lastName: Joi.string().max(40).required(),
            dni: Joi.string().length(9).required(),
            phone: Joi.string().max(15).required(),
            job: Joi.string().max(25).allow('', null),
            city: Joi.string().max(25).allow('', null),
            delegationIds: Joi.array().items(Joi.string().length(36)).default([]),
        });

        const { error, value } = schema.validate(req.body, {
            abortEarly: true,
            stripUnknown: true,
        });

        if (error) {
            generateErrorUtil(error.message, 400);
        }

        const {
            role,
            email,
            firstName,
            lastName,
            dni,
            phone,
            job,
            city,
            delegationIds,
        } = value;

        // ✅ Generamos una contraseña aleatoria
        const password = randomstring.generate(10);

        // Normalizamos el rol a minúsculas por si acaso
        const normalizedRole = role.toLowerCase();

        const loggedRole = req.userLogged.role;

        if ((normalizedRole === 'admin' || normalizedRole === 'sudo') && loggedRole !== 'sudo') {
            generateErrorUtil('Solo sudo puede crear administradores', 403);
        }

        if (normalizedRole === 'admin' && !delegationIds.length) {
            generateErrorUtil('Debes asignar al menos una delegacion', 400);
        }

        await insertAdminService(
            normalizedRole,
            email,
            password,
            firstName,
            lastName,
            dni,
            phone,
            job,
            city,
            delegationIds
        );

        res.send({
            status: 'ok',
            message:
                'Usuario registrado correctamente. Se ha enviado un email con sus credenciales.',
        });
    } catch (error) {
        next(error);
    }
};

export default registerUserAdminController;
