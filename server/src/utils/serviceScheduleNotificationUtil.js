import getPool from '../db/getPool.js';
import { getIO } from '../sockets/io.js';
import { sendPushNotificationToUsersService } from '../services/push/sendPushNotificationService.js';

export const selectServiceScheduleRecipientUserIds = async (
    serviceId,
    { month = '' } = {}
) => {
    try {
        const pool = await getPool();
        const values = month ? [serviceId, month] : [serviceId, serviceId];
        const assignedSource = month
            ? ''
            : `
                SELECT employeeId AS userId
                FROM personsAssigned
                WHERE serviceId = ?
                  AND employeeId IS NOT NULL
                UNION
            `;
        const scheduleMonthFilter = month
            ? 'AND DATE_FORMAT(scheduleDate, "%Y-%m") = ?'
            : '';
        const [rows] = await pool.query(
            `
            SELECT DISTINCT userId
            FROM (
                ${assignedSource}
                SELECT employeeId AS userId
                FROM serviceScheduleShifts
                WHERE serviceId = ?
                  AND employeeId IS NOT NULL
                  AND deletedAt IS NULL
                  ${scheduleMonthFilter}
            ) recipients
            WHERE userId IS NOT NULL
            `,
            values
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
        month: options.month || null,
        notify: Boolean(options.push),
    };

    void (async () => {
        const recipientUserIds =
            await selectServiceScheduleRecipientUserIds(serviceId, {
                month: options.month || '',
            });
        const optionUserIds = options.userIds || options.recipientUserIds || [];
        const rooms = [
            `service:${serviceId}`,
            'admins',
            ...[...recipientUserIds, ...optionUserIds]
                .filter(Boolean)
                .map((userId) => `user:${userId}`),
        ];

        io.to([...new Set(rooms)]).emit('serviceSchedule:changed', payload);

        if (!options.push) return;

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
