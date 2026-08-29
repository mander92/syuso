import Joi from 'joi';

import generateErrorUtil from '../../utils/generateErrorUtil.js';
import {
    createAcknowledgementService,
    listAcknowledgementsAuditService,
    listMyAcknowledgementsService,
    markAcknowledgementEventService,
} from '../../services/acknowledgements/acknowledgementService.js';

const createSchema = Joi.object({
    subjectType: Joi.string()
        .valid('communication', 'service_assignment', 'schedule', 'document', 'payroll')
        .default('communication'),
    subjectId: Joi.string().guid({ version: 'uuidv4' }).allow('', null),
    title: Joi.string().max(180).required(),
    message: Joi.string().max(2000).allow('', null),
    url: Joi.string().max(500).allow('', null),
    requiresAcceptance: Joi.boolean().default(true),
    recipientUserIds: Joi.array()
        .items(Joi.string().guid({ version: 'uuidv4' }))
        .min(1)
        .required(),
    push: Joi.boolean().default(true),
});

const auditSchema = Joi.object({
    subjectType: Joi.string()
        .valid('communication', 'service_assignment', 'schedule', 'document', 'payroll')
        .allow('', null),
    status: Joi.string().valid('pending', 'seen', 'accepted').allow('', null),
    employeeId: Joi.string().guid({ version: 'uuidv4' }).allow('', null),
});

const getRequestMeta = (req) => ({
    ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || '',
    userAgent: req.headers['user-agent'] || '',
});

export const createAcknowledgementController = async (req, res, next) => {
    try {
        const { error, value } = createSchema.validate(req.body || {}, {
            abortEarly: true,
            stripUnknown: true,
        });
        if (error) generateErrorUtil(error.message, 400);

        const data = await createAcknowledgementService({
            ...value,
            subjectId: value.subjectId || null,
            url: value.url || '/account',
            createdBy: req.userLogged.id,
        });

        res.send({ status: 'ok', data });
    } catch (error) {
        next(error);
    }
};

export const listAcknowledgementsAuditController = async (req, res, next) => {
    try {
        const { error, value } = auditSchema.validate(req.query || {}, {
            abortEarly: true,
            stripUnknown: true,
        });
        if (error) generateErrorUtil(error.message, 400);

        const data = await listAcknowledgementsAuditService({
            ...value,
            viewerId: req.userLogged.id,
            viewerRole: req.userLogged.role,
        });

        res.send({ status: 'ok', data });
    } catch (error) {
        next(error);
    }
};

export const listMyAcknowledgementsController = async (req, res, next) => {
    try {
        const data = await listMyAcknowledgementsService(req.userLogged.id);
        res.send({ status: 'ok', data });
    } catch (error) {
        next(error);
    }
};

export const markAcknowledgementSeenController = async (req, res, next) => {
    try {
        const data = await markAcknowledgementEventService({
            acknowledgementId: req.params.acknowledgementId,
            userId: req.userLogged.id,
            eventType: 'seen',
            ...getRequestMeta(req),
        });
        res.send({ status: 'ok', data });
    } catch (error) {
        next(error);
    }
};

export const acceptAcknowledgementController = async (req, res, next) => {
    try {
        const data = await markAcknowledgementEventService({
            acknowledgementId: req.params.acknowledgementId,
            userId: req.userLogged.id,
            eventType: 'accepted',
            ...getRequestMeta(req),
        });
        res.send({ status: 'ok', data });
    } catch (error) {
        next(error);
    }
};
