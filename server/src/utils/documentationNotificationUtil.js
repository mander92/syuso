import { getIO } from '../sockets/io.js';
import { sendPushNotificationToUsersService } from '../services/push/sendPushNotificationService.js';

const getDefaultRouteLabel = (subjectType) =>
    subjectType === 'client' || subjectType === 'clientDraft'
        ? 'Mi cuenta > Clientes'
        : 'Mi cuenta > Documentacion';

export const emitDocumentationChanged = (options = {}) => {
    const io = getIO();
    if (!io) return;
    const subjectType = options.subjectType || 'documentation';

    const payload = {
        notificationId:
            options.notificationId ||
            `documentation-${subjectType || 'item'}-${
                options.subjectId || Date.now()
            }-${Date.now()}`,
        changedAt: new Date().toISOString(),
        changedBy: options.changedBy || null,
        subjectId: options.subjectId || null,
        subjectType,
        employeeId: options.employeeId || null,
        title: options.title || 'Documentacion',
        message: options.message || 'Hay cambios en documentacion.',
        routeLabel: options.routeLabel || getDefaultRouteLabel(subjectType),
    };

    const rooms = [
        'admins',
        ...(options.userIds || [])
            .filter(Boolean)
            .map((userId) => `user:${userId}`),
    ];

    io.to([...new Set(rooms)]).emit('documentation:changed', payload);

    const pushUserIds = [...new Set((options.userIds || []).filter(Boolean))];
    if (!pushUserIds.length || options.push === false) return;

    void sendPushNotificationToUsersService(pushUserIds, {
        title: payload.title,
        body: payload.message,
        url: '/account',
        tag: `documentation-${payload.subjectType}-${payload.subjectId || 'new'}`,
    }).catch((error) => {
        console.error('[push] documentation notification failed', {
            subjectId: payload.subjectId,
            message: error.message,
        });
    });
};
