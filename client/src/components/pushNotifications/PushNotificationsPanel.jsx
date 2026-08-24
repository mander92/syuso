import { useContext, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
    FaCheckCircle,
    FaHome,
    FaPlusSquare,
    FaShareSquare,
} from 'react-icons/fa';

import { AuthContext } from '../../context/AuthContext.jsx';
import {
    deletePushSubscription,
    detectPushEnvironment,
    disablePushSubscription,
    fetchPushConfig,
    fetchPushSubscriptions,
    getCurrentPushSubscriptionJson,
    registerCurrentDeviceForPush,
    sendCurrentDeviceTestPushNotification,
    sendTestPushNotification,
} from '../../services/pushNotificationService.js';
import './PushNotificationsPanel.css';

const statusLabels = {
    active: 'Activadas',
    denied: 'Bloqueadas',
    missing: 'No configuradas',
    unsupported: 'No disponible',
    iosInstall: 'Anadir al movil',
};

const getIosInstallSteps = (browserName = '') => {
    const isChrome = /chrome/i.test(browserName);

    return [
        {
            icon: FaShareSquare,
            title: isChrome ? 'Abre el menu Compartir' : 'Pulsa Compartir',
            text: isChrome
                ? 'Toca el icono de compartir del navegador.'
                : 'Toca el boton Compartir de Safari.',
        },
        {
            icon: FaPlusSquare,
            title: 'Anadir a pantalla de inicio',
            text: 'Busca esa opcion en la lista y seleccionala.',
        },
        {
            icon: FaCheckCircle,
            title: 'Pulsa Anadir',
            text: 'Confirma para crear el icono de SYUSO en tu iPhone.',
        },
        {
            icon: FaHome,
            title: 'Abre desde el icono',
            text: 'Entra desde el nuevo icono para continuar la activacion.',
        },
    ];
};

const getDeviceLabel = (subscription) => {
    const browser = subscription.browserName ? ` - ${subscription.browserName}` : '';
    return `${subscription.deviceName || 'Dispositivo'}${browser}`;
};

const PushNotificationsPanel = ({
    compact = false,
    required = false,
    onReadyChange,
}) => {
    const { authToken } = useContext(AuthContext);
    const [environment, setEnvironment] = useState(detectPushEnvironment);
    const [config, setConfig] = useState({ configured: false, vapidPublicKey: '' });
    const [currentSubscription, setCurrentSubscription] = useState(null);
    const [subscriptions, setSubscriptions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showIosGuide, setShowIosGuide] = useState(required);
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
    const currentBackendSubscription = useMemo(() => {
        const endpoint = currentSubscription?.endpoint;
        if (!endpoint) return null;
        return activeSubscriptions.find((item) => item.endpoint === endpoint) || null;
    }, [activeSubscriptions, currentSubscription]);

    const status = useMemo(() => {
        if (environment.needsInstallation) return 'iosInstall';
        if (environment.permission === 'denied') return 'denied';
        if (currentBackendSubscription) return 'active';
        if (!environment.supportsPush) return 'unsupported';
        return 'missing';
    }, [currentBackendSubscription, environment]);

    const iosInstallSteps = getIosInstallSteps(environment.browserName);
    const isInstalledIosPending =
        environment.isIos && environment.isStandalone && status === 'missing';

    useEffect(() => {
        onReadyChange?.(status === 'active');
    }, [onReadyChange, status]);

    const loadPushState = async ({ silent = false } = {}) => {
        if (!authToken) return;
        try {
            if (!silent) setLoading(true);
            const nextEnvironment = detectPushEnvironment();
            setEnvironment(nextEnvironment);
            const [nextConfig, nextSubscriptions] = await Promise.all([
                fetchPushConfig(authToken),
                fetchPushSubscriptions(authToken),
            ]);
            setConfig(nextConfig);
            setSubscriptions(nextSubscriptions || []);
            if (nextEnvironment.supportsPush) {
                const browserSubscription = await getCurrentPushSubscriptionJson();
                setCurrentSubscription(browserSubscription);
            } else {
                setCurrentSubscription(null);
            }
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
            setCurrentSubscription(await getCurrentPushSubscriptionJson());
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
            const endpoint = currentSubscription?.endpoint;
            const result = endpoint
                ? await sendCurrentDeviceTestPushNotification({
                      authToken,
                      endpoint,
                  })
                : await sendTestPushNotification(authToken);
            if (result.skipped) {
                toast.error('Faltan las claves de notificaciones en el servidor');
            } else if (result.sent > 0) {
                toast.success('Notificacion de prueba enviada');
            } else {
                const detail = result.results?.[0];
                toast.error(
                    detail?.httpStatus
                        ? `No se pudo enviar. HTTP ${detail.httpStatus}`
                        : 'No hay dispositivos activos para enviar la prueba'
                );
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

    const handleRecheckInstalled = () => {
        const nextEnvironment = detectPushEnvironment();
        setEnvironment(nextEnvironment);
        if (nextEnvironment.needsInstallation) {
            toast.error(
                'Abre la aplicacion desde el nuevo icono de tu pantalla de inicio para continuar.'
            );
            return;
        }
        setShowIosGuide(false);
        toast.success('Aplicacion detectada. Ya puedes activar los avisos.');
    };

    if (compact && !required && (dismissed || status === 'active')) return null;

    return (
        <section
            className={`push-notifications ${
                compact ? 'push-notifications--compact' : ''
            } ${required ? 'push-notifications--required' : ''}`}
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
                    <h3>Recibe avisos directamente en tu iPhone</h3>
                    <p>
                        Para recibir avisos de nuevas tareas, cambios de horario y
                        mensajes importantes, primero tienes que anadir esta
                        aplicacion a la pantalla de inicio. Despues podras activar
                        las notificaciones.
                    </p>
                    {required ? (
                        <p className='push-notifications__warning'>
                            Es obligatorio activar las notificaciones para poder
                            seguir usando la app.
                        </p>
                    ) : null}
                    {showIosGuide ? (
                        <div className='push-notifications__steps'>
                            {iosInstallSteps.map((step) => {
                                const Icon = step.icon;
                                return (
                                    <article
                                        key={step.title}
                                        className='push-notifications__step'
                                    >
                                        <span className='push-notifications__step-icon'>
                                            <Icon aria-hidden='true' />
                                        </span>
                                        <div>
                                            <h4>{step.title}</h4>
                                            <p>{step.text}</p>
                                        </div>
                                    </article>
                                );
                            })}
                            <p className='push-notifications__note'>
                                Cuando abras la aplicacion desde el icono,
                                continuaremos automaticamente con la activacion.
                            </p>
                        </div>
                    ) : null}
                    <div className='push-notifications__actions'>
                        <button
                            type='button'
                            className='push-notifications__button'
                            onClick={() => setShowIosGuide(true)}
                        >
                            Como anadir la aplicacion
                        </button>
                        {showIosGuide ? (
                            <button
                                type='button'
                                className='push-notifications__ghost'
                                onClick={handleRecheckInstalled}
                            >
                                Ya la he anadido
                            </button>
                        ) : null}
                        {!required ? (
                            <button
                                type='button'
                                className='push-notifications__ghost'
                                onClick={handleDismiss}
                            >
                                Ahora no
                            </button>
                        ) : null}
                    </div>
                </div>
            ) : status === 'denied' ? (
                <div className='push-notifications__instructions'>
                    <h3>Las notificaciones estan bloqueadas</h3>
                    <p>
                        Las notificaciones estan desactivadas para esta aplicacion.
                        Para volver a recibir avisos tendras que activarlas desde
                        los ajustes del dispositivo.
                    </p>
                    {environment.isIos ? (
                        <div className='push-notifications__steps'>
                            <article className='push-notifications__step'>
                                <span className='push-notifications__step-icon'>
                                    <FaHome aria-hidden='true' />
                                </span>
                                <div>
                                    <h4>Abre Ajustes en tu iPhone</h4>
                                    <p>
                                        Busca SYUSO en la lista de aplicaciones y
                                        permite las notificaciones.
                                    </p>
                                </div>
                            </article>
                        </div>
                    ) : null}
                    {required ? (
                        <p className='push-notifications__warning'>
                            Hasta que vuelvas a permitir los avisos en este
                            dispositivo no podras continuar usando la app.
                        </p>
                    ) : null}
                </div>
            ) : status === 'unsupported' ? (
                <div className='push-notifications__instructions'>
                    <h3>No disponible en este dispositivo</h3>
                    <p>
                        Este navegador no permite recibir avisos en segundo plano
                        o la web no esta abierta con una conexion segura.
                    </p>
                    {required ? (
                        <p className='push-notifications__warning'>
                            Usa un navegador compatible y una conexion segura para
                            poder entrar.
                        </p>
                    ) : null}
                </div>
            ) : status === 'active' ? (
                <div className='push-notifications__body'>
                    <p className='push-notifications__success'>
                        Notificaciones activadas. Ya recibiras avisos importantes
                        directamente en este dispositivo.
                    </p>
                    <div className='push-notifications__actions'>
                        <button
                            type='button'
                            className='push-notifications__ghost'
                            onClick={handleTest}
                            disabled={loading}
                        >
                            Enviar notificacion de prueba
                        </button>
                    </div>
                </div>
            ) : (
                <div className='push-notifications__body'>
                    <h3>
                        {isInstalledIosPending
                            ? 'Activa las notificaciones'
                            : 'Activa los avisos'}
                    </h3>
                    <p>
                        {isInstalledIosPending
                            ? 'Ya has anadido correctamente la aplicacion. Solo queda un ultimo paso para poder recibir avisos directamente en tu iPhone.'
                            : 'Activa las notificaciones para saber al instante cuando tengas una nueva tarea, un cambio de horario o un aviso importante.'}
                    </p>
                    {required ? (
                        <p className='push-notifications__warning'>
                            Para continuar tienes que aceptar el permiso de
                            notificaciones en este dispositivo.
                        </p>
                    ) : null}
                    <div className='push-notifications__actions'>
                        <button
                            type='button'
                            className='push-notifications__button'
                            onClick={handleActivate}
                            disabled={loading || !config.configured}
                        >
                            Activar notificaciones
                        </button>
                        {compact && !required ? (
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
