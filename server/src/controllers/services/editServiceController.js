import generateErrorUtil from '../../utils/generateErrorUtil.js';
import updateServiceByIdService from '../../services/services/updateServiceByIdService.js';
import Joi from 'joi';
import ensureServiceDelegationAccessService from '../../services/delegations/ensureServiceDelegationAccessService.js';
import { emitServiceScheduleChanged } from '../../utils/serviceScheduleNotificationUtil.js';
import selectServiceByIdService from '../../services/services/selectServiceByIdService.js';

const editServiceController = async (req, res, next) => {
    try {
        /*const schema = Joi.object().keys({
            startDateTime: Joi.date().min('now').required(),
            hours: Joi.number().min(1).max(24).required(),
            comments: Joi.string().max(250).required(),
            address: Joi.string().max(255).required(),
            city: Joi.string().max(40).required(),
            postCode: Joi.string().length(5).required(),
        });

        const validation = schema.validate(req.body);

        if (validation.error) generateErrorUtil(validation.error.message, 401);*/

        const { serviceId } = req.params;
        const { id: userId, role } = req.userLogged;

        const {
            address,
            postCode,
            city,
            comments,
            name,
            status,
            startDateTime,
            endDateTime,
            hours,
            hourlyRate,
            numberOfPeople,
            reportEmail,
            locationLink,
            allowUnscheduledClockIn,
            clockInEarlyMinutes,
            scheduleView,
            clientId,
            typeOfServicesId,
            type,
            description,
            province,
            autonomousCommunity,
            hourRuleType,
            image,
        } = req.body;

        await ensureServiceDelegationAccessService(serviceId, userId, role);

        const scheduleRelevantFields = [
            'scheduleView',
            'hourRuleType',
            'autonomousCommunity',
            'province',
            'city',
            'startDateTime',
            'endDateTime',
            'hours',
            'numberOfPeople',
            'status',
        ];
        const shouldCheckScheduleFields = scheduleRelevantFields.some((field) =>
            Object.prototype.hasOwnProperty.call(req.body, field)
        );
        const previousService = shouldCheckScheduleFields
            ? await selectServiceByIdService(serviceId)
            : null;
        const previousScheduleService = previousService?.[0] || null;

        const data = await updateServiceByIdService(
            serviceId,
            address,
            postCode,
            city,
            comments,
            name,
            status,
            startDateTime,
            endDateTime,
            hours,
            hourlyRate,
            numberOfPeople,
            reportEmail,
            locationLink,
            allowUnscheduledClockIn,
            clockInEarlyMinutes,
            scheduleView,
            clientId,
            typeOfServicesId,
            type,
            description,
            province,
            autonomousCommunity,
            hourRuleType,
            image,
            role
        );

        const normalizeScheduleValue = (value) => {
            if (value instanceof Date) return value.toISOString();
            if (value === undefined || value === null) return '';
            return String(value);
        };
        const hasScheduleRelevantChange =
            previousScheduleService &&
            scheduleRelevantFields.some((field) => {
                if (!Object.prototype.hasOwnProperty.call(req.body, field)) {
                    return false;
                }

                const previousValue =
                    field === 'scheduleView'
                        ? previousScheduleService[field] || 'grid'
                        : previousScheduleService[field];
                const nextValue =
                    field === 'scheduleView'
                        ? scheduleView || 'grid'
                        : req.body[field];

                return (
                    normalizeScheduleValue(previousValue) !==
                    normalizeScheduleValue(nextValue)
                );
            });

        if (hasScheduleRelevantChange) {
            emitServiceScheduleChanged(serviceId, {
                changedBy: userId,
                reason: 'service_schedule_settings_changed',
                message: 'Configuracion del cuadrante actualizada',
            });
        }

        res.send({
            status: 'ok',
            message: 'Servicio actualizado correctamente',
            data,
        });
    } catch (error) {
        next(error);
    }
};

export default editServiceController;
