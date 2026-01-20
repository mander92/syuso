import jwt from 'jsonwebtoken';
import generateErrorUtil from '../utils/generateErrorUtil.js';
import selectUserByIdService from '../services/users/selectUserByIdService.js';

import { SECRET } from '../../env.js';

const authUser = async (req, res, next) => {
    try {
        const { authorization } = req.headers;

        if (!authorization)
            generateErrorUtil('Se esperaba un token por encabezado', 401);

        let tokenInfo;

        try {
            tokenInfo = jwt.verify(authorization, SECRET);
        } catch (error) {
            generateErrorUtil('Credenciales invalidas', 401);
        }

        const user = await selectUserByIdService(tokenInfo.id);

        if (!user.active)
            generateErrorUtil('Usuario pendiente de activacion', 403);

        req.userLogged = {
            id: user.id,
            role: user.role,
        };

        next();
    } catch (error) {
        next(error);
    }
};

export default authUser;
