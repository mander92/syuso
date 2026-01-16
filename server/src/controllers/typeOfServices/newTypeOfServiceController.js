import Joi from 'joi';

import { savePictureUtil } from '../../utils/photoUtil.js';
import insertTypeOfServiceService from '../../services/typeOfServices/insertTypeOfServiceService.js';
//import generateErrorUtil from '../../utils/generateErrorUtil.js';

const newTypeOfServiceController = async (req, res, next) => {
    try {
        /*const schema = Joi.object().keys({
            type: Joi.string().max(30).required(),
            description: Joi.string().max(250).required(),
            city: Joi.string().max(30).required(),
        });

        const validation = schema.validate(req.body);

        if (validation.error) generateErrorUtil(validation.error.message, 401);*/

        const { type, description, city } = req.body;
        let imageName;

        if (req.files) {
            imageName = await savePictureUtil(req.files.image, 640, 480);
        }


        await insertTypeOfServiceService(
            type,
            description,
            city,
            imageName
        );

        res.send({
            status: 'ok',
            message: 'Servicio creado correctamente',
        });
    } catch (error) {
        next(error);
    }
};

export default newTypeOfServiceController;
