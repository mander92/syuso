import { Server as SocketServer } from 'socket.io';
import jwt from 'jsonwebtoken';

import { CLIENT_URL, SECRET } from '../../env.js';
import ensureServiceChatAccessService from '../services/serviceChat/ensureServiceChatAccessService.js';
import createServiceChatMessageService from '../services/serviceChat/createServiceChatMessageService.js';
import ensureServiceChatNotPausedService from '../services/serviceChat/ensureServiceChatNotPausedService.js';
import updateServiceChatPausedService from '../services/serviceChat/updateServiceChatPausedService.js';
import deleteServiceChatMessageService from '../services/serviceChat/deleteServiceChatMessageService.js';
import deleteServiceChatMessagesByServiceService from '../services/serviceChat/deleteServiceChatMessagesByServiceService.js';
import generateErrorUtil from '../utils/generateErrorUtil.js';

const initSocket = (httpServer) => {
    const io = new SocketServer(httpServer, {
        cors: {
            origin: CLIENT_URL || '*',
            methods: ['GET', 'POST'],
        },
    });

    io.use((socket, next) => {
        try {
            const token = socket.handshake.auth?.token;
            if (!token) {
                return next(new Error('Se esperaba un token'));
            }

            const payload = jwt.verify(token, SECRET);
            socket.user = payload;
            return next();
        } catch (error) {
            return next(new Error('Token invalido'));
        }
    });

    io.on('connection', (socket) => {
        const isAdminUser =
            socket.user?.role === 'admin' || socket.user?.role === 'sudo';

        socket.on('chat:join', async ({ serviceId }, callback) => {
            try {
                await ensureServiceChatAccessService(
                    serviceId,
                    socket.user.id,
                    socket.user.role
                );
                socket.join(`service:${serviceId}`);
                callback?.({ ok: true });
            } catch (error) {
                callback?.({ ok: false, message: error.message });
            }
        });

        socket.on('chat:leave', ({ serviceId }) => {
            socket.leave(`service:${serviceId}`);
        });

        socket.on(
            'chat:message',
            async ({ serviceId, message, imagePath, replyToMessageId }, callback) => {
            try {
                const text = message ? String(message).trim() : '';
                const image = imagePath ? String(imagePath).trim() : '';
                if (!text && !image) {
                    generateErrorUtil('Mensaje vacio', 400);
                }

                await ensureServiceChatAccessService(
                    serviceId,
                    socket.user.id,
                    socket.user.role
                );
                await ensureServiceChatNotPausedService(serviceId);

                const newMessage = await createServiceChatMessageService(
                    serviceId,
                    socket.user.id,
                    text,
                    image || null,
                    replyToMessageId || null
                );

                io.to(`service:${serviceId}`).emit(
                    'chat:message',
                    newMessage
                );

                callback?.({ ok: true, message: newMessage });
            } catch (error) {
                callback?.({ ok: false, message: error.message });
            }
        });

        socket.on(
            'chat:pause',
            async ({ serviceId, paused }, callback) => {
                try {
                    if (!isAdminUser) {
                        generateErrorUtil(
                            'Acceso denegado: Se requiere rol de Administrador',
                            403
                        );
                    }

                    await ensureServiceChatAccessService(
                        serviceId,
                        socket.user.id,
                        socket.user.role
                    );

                    const nextPaused = await updateServiceChatPausedService(
                        serviceId,
                        Boolean(paused)
                    );

                    io.to(`service:${serviceId}`).emit('chat:pause', {
                        serviceId,
                        paused: nextPaused,
                    });

                    callback?.({ ok: true, paused: nextPaused });
                } catch (error) {
                    callback?.({ ok: false, message: error.message });
                }
            }
        );

        socket.on(
            'chat:delete',
            async ({ serviceId, messageId }, callback) => {
                try {
                    if (!isAdminUser) {
                        generateErrorUtil(
                            'Acceso denegado: Se requiere rol de Administrador',
                            403
                        );
                    }

                    await ensureServiceChatAccessService(
                        serviceId,
                        socket.user.id,
                        socket.user.role
                    );

                    await deleteServiceChatMessageService(
                        serviceId,
                        messageId
                    );

                    io.to(`service:${serviceId}`).emit('chat:delete', {
                        serviceId,
                        messageId,
                    });

                    callback?.({ ok: true });
                } catch (error) {
                    callback?.({ ok: false, message: error.message });
                }
            }
        );

        socket.on(
            'chat:clear',
            async ({ serviceId }, callback) => {
                try {
                    if (!isAdminUser) {
                        generateErrorUtil(
                            'Acceso denegado: Se requiere rol de Administrador',
                            403
                        );
                    }

                    await ensureServiceChatAccessService(
                        serviceId,
                        socket.user.id,
                        socket.user.role
                    );

                    await deleteServiceChatMessagesByServiceService(
                        serviceId
                    );

                    io.to(`service:${serviceId}`).emit('chat:clear', {
                        serviceId,
                    });

                    callback?.({ ok: true });
                } catch (error) {
                    callback?.({ ok: false, message: error.message });
                }
            }
        );
    });

    return io;
};

export default initSocket;
