import { getIO } from '../sockets/io.js';

export const emitServiceScheduleChanged = (serviceId, options = {}) => {
    if (!serviceId) return;

    const io = getIO();
    if (!io) return;

    io.to(`service:${serviceId}`).emit('serviceSchedule:changed', {
        serviceId,
        changedAt: new Date().toISOString(),
        changedBy: options.changedBy || null,
        reason: options.reason || 'schedule',
        message: options.message || 'Cuadrante actualizado',
    });
};
