import Joi from 'joi';

import { VAPID_PUBLIC_KEY } from '../../../env.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';
import {
    deletePushSubscriptionService,
    disablePushSubscriptionService,
    listPushAdminSummaryService,
    listPushSubscriptionsByUserService,
    upsertPushSubscriptionService,
} from '../../services/push/pushSubscriptionService.js';
import { sendPushNotificationToUserService } from '../../services/push/sendPushNotificationService.js';

const subscriptionSchema = Joi.object({
    endpoint: Joi.string().uri().max(2000).required(),
    expirationTime: Joi.any().allow(null),
    keys: Joi.object({
        p256dh: Joi.string().max(255).required(),
        auth: Joi.string().max(255).required(),
    }).required(),
}).required();

const deviceSchema = Joi.object({
    deviceName: Joi.string().max(120).allow('', null),
    deviceType: Joi.string()
        .valid('ios', 'android', 'desktop', 'unknown')
        .default('unknown'),
    browserName: Joi.string().max(80).allow('', null),
    userAgent: Joi.string().max(1000).allow('', null),
}).default({});

const registerSchema = Joi.object({
    subscription: subscriptionSchema,
    device: deviceSchema,
});

export const getPushConfigController = async (req, res, next) => {
    try {
        res.send({
            status: 'ok',
            data: {
                vapidPublicKey: VAPID_PUBLIC_KEY || '',
                configured: Boolean(VAPID_PUBLIC_KEY),
            },
        });
    } catch (error) {
        next(error);
    }
};

export const listMyPushSubscriptionsController = async (req, res, next) => {
    try {
        const subscriptions = await listPushSubscriptionsByUserService(
            req.userLogged.id
        );
        res.send({ status: 'ok', data: subscriptions });
    } catch (error) {
        next(error);
    }
};

export const registerPushSubscriptionController = async (req, res, next) => {
    try {
        const { error, value } = registerSchema.validate(req.body || {}, {
            abortEarly: true,
            stripUnknown: true,
        });
        if (error) generateErrorUtil(error.message, 400);

        const id = await upsertPushSubscriptionService({
            userId: req.userLogged.id,
            subscription: value.subscription,
            device: value.device,
        });
        const subscriptions = await listPushSubscriptionsByUserService(
            req.userLogged.id
        );

        res.send({
            status: 'ok',
            data: {
                id,
                subscriptions,
            },
        });
    } catch (error) {
        next(error);
    }
};

export const disablePushSubscriptionController = async (req, res, next) => {
    try {
        const updated = await disablePushSubscriptionService({
            userId: req.userLogged.id,
            id: req.params.subscriptionId,
        });
        if (!updated) generateErrorUtil('Dispositivo no encontrado', 404);
        const subscriptions = await listPushSubscriptionsByUserService(
            req.userLogged.id
        );
        res.send({ status: 'ok', data: subscriptions });
    } catch (error) {
        next(error);
    }
};

export const deletePushSubscriptionController = async (req, res, next) => {
    try {
        const updated = await deletePushSubscriptionService({
            userId: req.userLogged.id,
            id: req.params.subscriptionId,
        });
        if (!updated) generateErrorUtil('Dispositivo no encontrado', 404);
        const subscriptions = await listPushSubscriptionsByUserService(
            req.userLogged.id
        );
        res.send({ status: 'ok', data: subscriptions });
    } catch (error) {
        next(error);
    }
};

export const sendTestPushController = async (req, res, next) => {
    try {
        const result = await sendPushNotificationToUserService(req.userLogged.id, {
            title: 'Todo preparado',
            body: 'Las notificaciones funcionan correctamente.',
            url: '/account',
            tag: 'push-test',
        });
        res.send({ status: 'ok', data: result });
    } catch (error) {
        next(error);
    }
};

export const listPushAdminSummaryController = async (req, res, next) => {
    try {
        const data = await listPushAdminSummaryService();
        res.send({ status: 'ok', data });
    } catch (error) {
        next(error);
    }
};
