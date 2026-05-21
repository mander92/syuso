import { getIO } from '../sockets/io.js';

export const emitDocumentationChanged = (options = {}) => {
    const io = getIO();
    if (!io) return;

    const payload = {
        notificationId:
            options.notificationId ||
            `documentation-${options.subjectType || 'item'}-${
                options.subjectId || Date.now()
            }-${Date.now()}`,
        changedAt: new Date().toISOString(),
        changedBy: options.changedBy || null,
        subjectId: options.subjectId || null,
        subjectType: options.subjectType || 'documentation',
        title: options.title || 'Documentacion',
        message: options.message || 'Hay cambios en documentacion.',
        routeLabel: options.routeLabel || 'Mi cuenta > Documentacion',
    };

    const rooms = [
        'admins',
        ...(options.userIds || [])
            .filter(Boolean)
            .map((userId) => `user:${userId}`),
    ];

    io.to([...new Set(rooms)]).emit('documentation:changed', payload);
};
