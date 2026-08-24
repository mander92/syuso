import { useContext, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import { AuthContext } from '../../context/AuthContext.jsx';
import {
    deletePushSubscription,
    detectPushEnvironment,
    disablePushSubscription,
    fetchPushConfig,
    fetchPushSubscriptions,
    registerCurrentDeviceForPush,
    sendTestPushNotification,
} from '../../services/pushNotificationService.js';
import './PushNotificationsPanel.css';

const statusLabels = {
    active: 'Activadas',
    denied: 'Bloqueadas',
    missing: 'No configuradas',
    unsupported: 'No disponible',
    iosInstall: 'Añadir al movil',
};

const getDeviceLabel = (subscription) => {
    const browser = subscription.browserName ? ` - ${subscription.browserName}` : '';
    return `${subscription.deviceName || 'Dispositivo'}${browser}`;
};

const PushNotificationsPanel = ({ compact = false }) => {
    const { authToken } = useContext(AuthContext);
    const [environment, setEnvironment] = useState(detectPushEnvironment);
    const [config, setConfig] = useState({ configured: false, vapidPublicKey: '' });
    const [subscriptions, setSubscriptions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [dismissed, setDismissed] = useState(() => {
        if (!compact) return false;
        const raw = localStorage.getItem('syusoPushReminderDismissedAt');
        if (!raw) return false;
        const dismissedAt = Number(raw);
        if (!Number.isFinite(dismissedAt)) return false;
        return Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000;
    });

    const activeSubscriptions = useMemo(
        () => subscriptions.filter((item) => item.enabled),
        [subscriptions]
    );

    const status = useMemo(() => {
        if (!environment.supportsPush) return 'unsupported';
        if (environment.isIos && !environment.isStandalone) return 'iosInstall';
        if (environment.permission === 'denied') return 'denied';
        if (activeSubscriptions.length > 0) return 'active';
        return 'missing';
    }, [activeSubscriptions.length, environment]);

    const loadPushState = async ({ silent = false } = {}) => {
        if (!authToken) return;
        try {
            if (!silent) setLoading(true);
            setEnvironment(detectPushEnvironment());
            const [nextConfig, nextSubscriptions] = await Promise.all([
                fetchPushConfig(authToken),
                fetchPushSubscriptions(authToken),
            ]);
            setConfig(nextConfig);
            setSubscriptions(nextSubscriptions || []);
        } catch (error) {
            if (!silent) toast.error(error.message);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    useEffect(() => {
        loadPushState({ silent: true });
    }, [authToken]);

    const handleActivate = async () => {
        try {
            setLoading(true);
            const data = await registerCurrentDeviceForPush({
                authToken,
                vapidPublicKey: config.vapidPublicKey,
            });
            setSubscriptions(data.subscriptions || []);
            setEnvironment(detectPushEnvironment());
            localStorage.removeItem('syusoPushReminderDismissedAt');
            toast.success('Notificaciones activadas');
        } catch (error) {
            setEnvironment(detectPushEnvironment());
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDisable = async (subscriptionId) => {
        try {
            setLoading(true);
            const data = await disablePushSubscription({
                authToken,
                subscriptionId,
            });
            setSubscriptions(data || []);
            toast.success('Notificaciones desactivadas en ese dispositivo');
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (subscriptionId) => {
        try {
            setLoading(true);
            const data = await deletePushSubscription({
                authToken,
                subscriptionId,
            });
            setSubscriptions(data || []);
            toast.success('Dispositivo eliminado');
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleTest = async () => {
        try {
            setLoading(true);
            const result = await sendTestPushNotification(authToken);
            if (result.skipped) {
                toast.error('Faltan las claves de notificaciones en el servidor');
            } else if (result.sent > 0) {
                toast.success('Notificacion de prueba enviada');
            } else {
                toast.error('No hay dispositivos activos para enviar la prueba');
            }
            await loadPushState({ silent: true });
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDismiss = () => {
        localStorage.setItem('syusoPushReminderDismissedAt', String(Date.now()));
        setDismissed(true);
    };

    if (compact && (dismissed || status === 'active')) return null;

    return (
        <section
            className={`push-notifications ${
                compact ? 'push-notifications--compact' : ''
            }`}
        >
            <div className='push-notifications__header'>
                <div>
                    <p className='push-notifications__eyebrow'>
                        Recibir avisos en el movil
                    </p>
                    <h2>Notificaciones</h2>
                </div>
                <span
                    className={`push-notifications__status push-notifications__status--${status}`}
                >
                    {statusLabels[status]}
                </span>
            </div>

            {status === 'iosInstall' ? (
                <div className='push-notifications__instructions'>
                    <h3>Activa los avisos en tu iPhone</h3>
                    <p>
                        Para recibir avisos directamente en tu iPhone, añade esta
                        aplicacion a la pantalla de inicio.
                    </p>
                    <ol>
                        <li>Pulsa el boton Compartir de Safari.</li>
                        <li>Selecciona Añadir a pantalla de inicio.</li>
                        <li>Confirma y abre la aplicacion desde el nuevo icono.</li>
                    </ol>
                    <button
                        type='button'
                        className='push-notifications__ghost'
                        onClick={handleDismiss}
                    >
                        Lo hare mas tarde
                    </button>
                </div>
            ) : status === 'denied' ? (
                <div className='push-notifications__instructions'>
                    <h3>Notificaciones bloqueadas</h3>
                    <p>
                        Las notificaciones estan desactivadas para este
                        dispositivo. Activalas desde los ajustes del navegador o
                        del sistema y vuelve a intentarlo.
                    </p>
                </div>
            ) : status === 'unsupported' ? (
                <div className='push-notifications__instructions'>
                    <h3>No disponible en este dispositivo</h3>
                    <p>
                        Este navegador no permite recibir avisos en segundo plano
                        o la web no esta abierta con una conexion segura.
                    </p>
                </div>
            ) : (
                <div className='push-notifications__body'>
                    <p>
                        Activa las notificaciones para saber al instante cuando
                        tengas una nueva tarea, un cambio de horario o un aviso
                        importante.
                    </p>
                    <div className='push-notifications__actions'>
                        <button
                            type='button'
                            className='push-notifications__button'
                            onClick={handleActivate}
                            disabled={loading || !config.configured}
                        >
                            {activeSubscriptions.length > 0
                                ? 'Volver a registrar este dispositivo'
                                : 'Activar notificaciones'}
                        </button>
                        {activeSubscriptions.length > 0 ? (
                            <button
                                type='button'
                                className='push-notifications__ghost'
                                onClick={handleTest}
                                disabled={loading}
                            >
                                Enviar notificacion de prueba
                            </button>
                        ) : null}
                        {compact ? (
                            <button
                                type='button'
                                className='push-notifications__ghost'
                                onClick={handleDismiss}
                                disabled={loading}
                            >
                                Ahora no
                            </button>
                        ) : null}
                    </div>
                    {!config.configured ? (
                        <p className='push-notifications__warning'>
                            Falta configurar las claves de notificaciones en el
                            servidor.
                        </p>
                    ) : null}
                </div>
            )}

            {!compact && subscriptions.length > 0 ? (
                <div className='push-notifications__devices'>
                    <h3>Dispositivos registrados</h3>
                    {subscriptions.map((subscription) => (
                        <div
                            key={subscription.id}
                            className='push-notifications__device'
                        >
                            <div>
                                <strong>{getDeviceLabel(subscription)}</strong>
                                <span>
                                    {subscription.enabled ? 'Activo' : 'Desactivado'}
                                </span>
                            </div>
                            <div className='push-notifications__device-actions'>
                                {subscription.enabled ? (
                                    <button
                                        type='button'
                                        onClick={() =>
                                            handleDisable(subscription.id)
                                        }
                                        disabled={loading}
                                    >
                                        Desactivar
                                    </button>
                                ) : null}
                                <button
                                    type='button'
                                    onClick={() => handleDelete(subscription.id)}
                                    disabled={loading}
                                >
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : null}
        </section>
    );
};

export default PushNotificationsPanel;
