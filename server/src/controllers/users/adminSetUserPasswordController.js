import Joi from 'joi';
import generateErrorUtil from '../../utils/generateErrorUtil.js';
import updateAdminUserPasswordService from '../../services/users/updateAdminUserPasswordService.js';

const adminSetUserPasswordController = async (req, res, next) => {
    try {
        const { userId } = req.params;

        const schema = Joi.object({
            newPassword: Joi.string().min(8).max(25).required(),
        });

        const validation = schema.validate(req.body);

        if (validation.error) {
            generateErrorUtil(validation.error.message, 400);
        }

        const { newPassword } = req.body;

        await updateAdminUserPasswordService(userId, newPassword);

        res.send({
            status: 'ok',
            message: 'Contraseña actualizada correctamente',
        });
    } catch (error) {
        next(error);
    }
};

export default adminSetUserPasswordController;
