import Joi from 'joi';
import { v4 as uuid } from 'uuid';

import getPool from '../../db/getPool.js';
import ensureServiceDelegationAccessService from '../../services/delegations/ensureServiceDelegationAccessService.js';
import createWorkReportService from '../../services/workReports/createWorkReportService.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';

const schema = Joi.object({
    reportType: Joi.string().valid('work', 'inspection').default('work'),
    employeeId: Joi.string().length(36).required(),
    serviceId: Joi.string().length(36).required(),
    folio: Joi.string().allow('', null),
    reportDate: Joi.string().allow('', null),
    incidentStart: Joi.string().required(),
    incidentEnd: Joi.string().required(),
    location: Joi.string().allow('', null),
    guardFullName: Joi.string().allow('', null),
    guardEmployeeNumber: Joi.string().allow('', null),
    securityCompany: Joi.string().allow('', null),
    description: Joi.when('reportType', {
        is: 'inspection',
        then: Joi.string().allow('', null),
        otherwise: Joi.string().required(),
    }),
    inspectionData: Joi.object().unknown(true).default({}),
    reportEmail: Joi.string().allow('', null),
    signature: Joi.string()
        .pattern(/^data:image\/png;base64,/)
        .min(100)
        .required(),
    clientSignature: Joi.string()
        .pattern(/^data:image\/png;base64,/)
        .min(100)
        .allow('', null),
    guardSignature: Joi.when('reportType', {
        is: 'inspection',
        then: Joi.string()
            .pattern(/^data:image\/png;base64,/)
            .min(100)
            .required(),
        otherwise: Joi.string().allow('', null),
    }),
});

const normalizeDateTime = (value) => {
    if (!value) return value;
    const text = String(value);
    if (!text.includes('T')) return text;
    const [datePart, timePart = ''] = text.split('T');
    const cleanTime = timePart.length === 5 ? `${timePart}:00` : timePart;
    return `${datePart}T${cleanTime}`;
};

const parseInspectionData = (value) => {
    if (!value) return {};
    if (typeof value === 'object') return value;
    try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        generateErrorUtil('Datos de inspeccion invalidos', 400);
    }
};

const createAdminWorkReportController = async (req, res, next) => {
    try {
        const body = {
            ...(req.body || {}),
            inspectionData: parseInspectionData(req.body?.inspectionData),
        };

        const { error, value } = schema.validate(body, {
            abortEarly: false,
            stripUnknown: true,
        });
        if (error) generateErrorUtil(error.message, 400);

        await ensureServiceDelegationAccessService(
            value.serviceId,
            req.userLogged.id,
            req.userLogged.role
        );

        const pool = await getPool();

        const [[employee]] = await pool.query(
            `
            SELECT firstName, lastName
            FROM users
            WHERE id = ?
            `,
            [value.employeeId]
        );
        if (!employee) generateErrorUtil('Trabajador no encontrado', 404);

        const [[service]] = await pool.query(
            `
            SELECT s.name, s.reportEmail, a.address, a.city
            FROM services s
            INNER JOIN addresses a ON a.id = s.addressId
            WHERE s.id = ?
            `,
            [value.serviceId]
        );
        if (!service) generateErrorUtil('Servicio no encontrado', 404);

        const shiftRecordId = uuid();
        await pool.query(
            `
            INSERT INTO shiftRecords (id, employeeId, serviceId)
            VALUES (?, ?, ?)
            `,
            [shiftRecordId, value.employeeId, value.serviceId]
        );

        const guardFullName =
            value.guardFullName ||
            `${employee.firstName || ''} ${employee.lastName || ''}`.trim() ||
            'Trabajador';
        const location =
            value.location ||
            `${service.address || ''}${service.city ? `, ${service.city}` : ''}`.trim() ||
            'Servicio';
        const incidentStart = normalizeDateTime(value.incidentStart);
        const incidentEnd = normalizeDateTime(value.incidentEnd);
        const isInspection = value.reportType === 'inspection';
        const inspectionData = value.inspectionData || {};
        const inspectionDescription =
            [
                inspectionData.observations,
                inspectionData.workerInformationReceived,
                inspectionData.otherData,
            ]
                .filter(Boolean)
                .join('\n\n') || 'Parte de inspeccion';

        const data = await createWorkReportService({
            shiftRecordId,
            serviceId: value.serviceId,
            employeeId: value.employeeId,
            reportEmail: value.reportEmail || service.reportEmail || null,
            locationCoords: null,
            incidents: [],
            incidentFiles: {},
            inspectionFiles: isInspection ? req.files || {} : {},
            reportData: {
                folio:
                    value.folio ||
                    `ADM-${shiftRecordId.slice(0, 8).toUpperCase()}`,
                reportDate:
                    value.reportDate ||
                    String(incidentStart || new Date().toISOString()).slice(
                        0,
                        10
                    ),
                incidentStart,
                incidentEnd,
                location,
                guardFullName,
                guardEmployeeNumber: value.guardEmployeeNumber || 'Admin',
                guardShift: service.name || 'Turno',
                securityCompany: value.securityCompany || 'Syuso',
                incidentType: isInspection
                    ? 'Parte de inspeccion'
                    : 'Parte de trabajo',
                severity: 'leve',
                description: isInspection
                    ? inspectionDescription
                    : value.description,
                detection: isInspection
                    ? 'Inspeccion de servicio creada desde administracion'
                    : 'Creado manualmente desde administracion',
                actionsTaken: 'No aplica',
                outcome: 'controlado',
                signature: value.signature,
                clientSignature: isInspection
                    ? null
                    : value.clientSignature || null,
                guardSignature: value.guardSignature || null,
                reportType: value.reportType,
                inspectionData,
            },
        });

        res.send({
            status: 'ok',
            message: isInspection
                ? 'Parte de inspeccion creado'
                : 'Parte de trabajo creado',
            data,
        });
    } catch (error) {
        next(error);
    }
};

export default createAdminWorkReportController;
