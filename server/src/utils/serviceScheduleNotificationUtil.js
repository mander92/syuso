import getPool from '../db/getPool.js';
import { getIO } from '../sockets/io.js';
import { sendPushNotificationToUsersService } from '../services/push/sendPushNotificationService.js';

const selectServiceScheduleRecipientUserIds = async (serviceId) => {
    try {
        const pool = await getPool();
        const [rows] = await pool.query(
            `
            SELECT DISTINCT userId
            FROM (
                SELECT employeeId AS userId
                FROM personsAssigned
                WHERE serviceId = ?
                  AND employeeId IS NOT NULL
                UNION
                SELECT employeeId AS userId
                FROM serviceScheduleShifts
                WHERE serviceId = ?
                  AND employeeId IS NOT NULL
                  AND deletedAt IS NULL
            ) recipients
            WHERE userId IS NOT NULL
            `,
            [serviceId, serviceId]
        );

        return rows.map((row) => row.userId).filter(Boolean);
    } catch (error) {
        console.error('[schedule-notification] recipient lookup failed', {
            serviceId,
            message: error.message,
        });
        return [];
    }
};

export const emitServiceScheduleChanged = (serviceId, options = {}) => {
    if (!serviceId) return;

    const io = getIO();
    if (!io) return;

    const payload = {
        serviceId,
        notificationId:
            options.notificationId ||
            `schedule-${serviceId}-${Date.now()}-${Math.random()
                .toString(36)
                .slice(2, 8)}`,
        changedAt: new Date().toISOString(),
        changedBy: options.changedBy || null,
        reason: options.reason || 'schedule',
        message: options.message || 'Cuadrante actualizado',
    };

    void (async () => {
        const recipientUserIds =
            await selectServiceScheduleRecipientUserIds(serviceId);
        const optionUserIds = options.userIds || options.recipientUserIds || [];
        const rooms = [
            `service:${serviceId}`,
            'admins',
            ...[...recipientUserIds, ...optionUserIds]
                .filter(Boolean)
                .map((userId) => `user:${userId}`),
        ];

        io.to([...new Set(rooms)]).emit('serviceSchedule:changed', payload);

        const pushRecipientUserIds = [...recipientUserIds, ...optionUserIds]
            .filter(Boolean)
            .filter((userId) => userId !== options.changedBy);

        if (pushRecipientUserIds.length) {
            try {
                await sendPushNotificationToUsersService(pushRecipientUserIds, {
                    title: 'Cambio de horario',
                    body: payload.message || 'Tu cuadrante ha sido actualizado.',
                    url: '/account',
                    tag: `schedule-${serviceId}`,
                });
            } catch (error) {
                console.error('[push] schedule notification failed', {
                    serviceId,
                    message: error.message,
                });
            }
        }
    })().catch((error) => {
        console.error('[schedule-notification] emit failed', {
            serviceId,
            message: error.message,
        });
        io.to([`service:${serviceId}`, 'admins']).emit(
            'serviceSchedule:changed',
            payload
        );
    });
};

export const emitServiceSchedulesChanged = (serviceIds, options = {}) => {
    const uniqueServiceIds = [...new Set((serviceIds || []).filter(Boolean))];

    uniqueServiceIds.forEach((serviceId) => {
        emitServiceScheduleChanged(serviceId, options);
    });
};
