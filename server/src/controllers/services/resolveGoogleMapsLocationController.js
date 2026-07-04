import Joi from 'joi';

import generateErrorUtil from '../../utils/generateErrorUtil.js';
import resolveGoogleMapsLocation from '../../utils/googleMapsLocationUtil.js';

const schema = Joi.object({
    locationLink: Joi.string().uri({ scheme: ['https'] }).max(2048).required(),
});

const resolveGoogleMapsLocationController = async (req, res, next) => {
    try {
        const { error, value } = schema.validate(req.query, {
            abortEarly: true,
            stripUnknown: true,
        });
        if (error) generateErrorUtil(error.message, 400);

        const coordinates = await resolveGoogleMapsLocation(value.locationLink);
        res.send({ status: 'ok', data: coordinates });
    } catch (error) {
        next(error);
    }
};

export default resolveGoogleMapsLocationController;
