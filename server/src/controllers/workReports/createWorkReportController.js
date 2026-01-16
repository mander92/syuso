import Joi from 'joi';
import generateErrorUtil from '../../utils/generateErrorUtil.js';
import createWorkReportService from '../../services/workReports/createWorkReportService.js';

const createWorkReportController = async (req, res, next) => {
    try {
        if (req.body.locationCoords && typeof req.body.locationCoords === 'string') {
            try {
                req.body.locationCoords = JSON.parse(req.body.locationCoords);
            } catch (error) {
                generateErrorUtil('Formato de ubicacion invalido', 400);
            }
        }

        if (req.body.incidents && typeof req.body.incidents === 'string') {
            try {
                req.body.incidents = JSON.parse(req.body.incidents);
            } catch (error) {
                generateErrorUtil('Formato de incidencias invalido', 400);
            }
        }

        const schema = Joi.object().keys({
            serviceId: Joi.string().length(36).required(),
            folio: Joi.string().required(),
            reportDate: Joi.date().required(),
            incidentStart: Joi.date().required(),
            incidentEnd: Joi.date().required(),
            location: Joi.string().required(),
            guardFullName: Joi.string().required(),
            guardEmployeeNumber: Joi.string().required(),
            guardShift: Joi.string().required(),
            securityCompany: Joi.string().required(),
            incidentType: Joi.string().required(),
            severity: Joi.string().valid('leve', 'moderada', 'grave').required(),
            description: Joi.string().required(),
            detection: Joi.string().required(),
            actionsTaken: Joi.string().required(),
            outcome: Joi.string().required(),
            signature: Joi.string().required(),
            reportEmail: Joi.string().allow('', null),
            locationCoords: Joi.array().items(Joi.number()).length(2).required(),
            incidents: Joi.array()
                .items(
                    Joi.object({
                        id: Joi.alternatives().try(Joi.string(), Joi.number()),
                        text: Joi.string().min(1).required(),
                        photoPaths: Joi.array().items(Joi.string()).optional(),
                    })
                )
                .optional(),
        });

        const validation = schema.validate(req.body);

        if (validation.error) generateErrorUtil(validation.error.message, 401);

        const { shiftRecordId } = req.params;

        const data = await createWorkReportService({
            shiftRecordId,
            serviceId: req.body.serviceId,
            employeeId: req.userLogged.id,
            reportEmail: req.body.reportEmail,
            locationCoords: req.body.locationCoords,
            incidents: req.body.incidents || [],
            incidentFiles: req.files || {},
            reportData: {
                folio: req.body.folio,
                reportDate: req.body.reportDate,
                incidentStart: req.body.incidentStart,
                incidentEnd: req.body.incidentEnd,
                location: req.body.location,
                guardFullName: req.body.guardFullName,
                guardEmployeeNumber: req.body.guardEmployeeNumber,
                guardShift: req.body.guardShift,
                securityCompany: req.body.securityCompany,
                incidentType: req.body.incidentType,
                severity: req.body.severity,
                description: req.body.description,
                detection: req.body.detection,
                actionsTaken: req.body.actionsTaken,
                outcome: req.body.outcome,
                signature: req.body.signature,
            },
        });

        res.send({
            status: 'ok',
            message: 'Parte de trabajo generado y turno cerrado',
            data,
        });
    } catch (error) {
        next(error);
    }
};

export default createWorkReportController;
