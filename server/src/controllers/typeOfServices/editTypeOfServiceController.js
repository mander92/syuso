//import Joi from 'joi';

//import generateErrorUtil from '../../utils/generateErrorUtil.js';
import getPool from '../../db/getPool.js';
import updateTypeOfServiceService from '../../services/typeOfServices/updateTypeOfServiceService.js';
import { deletePictureUtil, savePictureUtil } from '../../utils/photoUtil.js';

const editTypeOfServiceController = async (req, res, next) => {
    const pool = await getPool()
    try {
        /*const schema = Joi.object().keys({
            description: Joi.string().max(250).required(),
            price: Joi.number().min(1).max(100).required(),
        });

        const validation = schema.validate(req.body);

        if (validation.error) generateErrorUtil(validation.error.message, 401);*/

        const { typeOfServiceId } = req.params;

        const { description, price } = req.body;

        let imgName;

        if (req.files.image) {

            const [imgToDelete] = await pool.query(
                `SELECT image FROM typeOfServices WHERE id = ?`,
                [typeOfServiceId]
            );

            if (imgToDelete[0].image) {
                await deletePictureUtil(imgToDelete[0].image);
            }

            imgName = await savePictureUtil(req.files.image, 320, 240);
        }

        await updateTypeOfServiceService(imgName, typeOfServiceId, description, price);

        res.send({
            staus: 'ok',
            message: 'Servicio actualizado correctamente',
        });
    } catch (error) {
        next(error);
    }
};

export default editTypeOfServiceController;
