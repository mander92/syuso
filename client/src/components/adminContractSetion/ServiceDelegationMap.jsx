import { useEffect, useMemo, useState } from 'react';
import L from 'leaflet';
import {
    MapContainer,
    Marker,
    Popup,
    TileLayer,
    useMap,
} from 'react-leaflet';
import { fetchGoogleMapsCoordinates } from '../../services/serviceService.js';
import 'leaflet/dist/leaflet.css';

const DEFAULT_CENTER = [37.3891, -5.9845];
const GEOCODE_CACHE_KEY = 'syuso_service_geocoding_v1';
const GEOCODE_DELAY_MS = 1100;

const delay = (milliseconds) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds));

const normalizeCoordinate = (value) => {
    const coordinate = Number.parseFloat(value);
    return Number.isFinite(coordinate) ? coordinate : null;
};

const coordinatesFromLocationLink = (locationLink) => {
    const value = String(locationLink || '');
    const patterns = [
        /@(-?\d{1,2}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)/,
        /[?&](?:q|query|ll)=(-?\d{1,2}(?:\.\d+)?),\s*(-?\d{1,3}(?:\.\d+)?)/,
        /\/(-?\d{1,2}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)(?:\?|$)/,
    ];

    for (const pattern of patterns) {
        const match = value.match(pattern);
        if (!match) continue;
        const latitude = normalizeCoordinate(match[1]);
        const longitude = normalizeCoordinate(match[2]);
        if (latitude !== null && longitude !== null) {
            return [latitude, longitude];
        }
    }

    return null;
};

const buildAddress = (service) =>
    [
        service.address,
        service.postCode,
        service.city,
        service.province,
        'Espana',
    ]
        .filter(Boolean)
        .join(', ');

const readGeocodeCache = () => {
    try {
        return JSON.parse(localStorage.getItem(GEOCODE_CACHE_KEY) || '{}');
    } catch {
        return {};
    }
};

const writeGeocodeCache = (cache) => {
    try {
        localStorage.setItem(GEOCODE_CACHE_KEY, JSON.stringify(cache));
    } catch {
        // The map still works when browser storage is unavailable.
    }
};

const geocodeAddress = async (address) => {
    const params = new URLSearchParams({
        format: 'jsonv2',
        limit: '1',
        countrycodes: 'es',
        q: address,
    });
    const response = await fetch(
        `https://nominatim.openstreetmap.org/search?${params.toString()}`,
        { headers: { Accept: 'application/json' } }
    );
    if (!response.ok) return null;
    const results = await response.json();
    const latitude = normalizeCoordinate(results?.[0]?.lat);
    const longitude = normalizeCoordinate(results?.[0]?.lon);
    return latitude !== null && longitude !== null
        ? [latitude, longitude]
        : null;
};

const parseNextShift = (value) => {
    if (!value) return null;
    if (typeof value === 'object') return value;
    try {
        return JSON.parse(value);
    } catch {
        return null;
    }
};

const formatDate = (value) => {
    const [year, month, day] = String(value || '').split('-');
    return year && month && day ? `${day}/${month}/${year}` : value || '';
};

const getOperationalStatus = (service) => {
    if (service.activeWorkerNames) return 'active';
    if (service.missedShiftWorkerNames) return 'missed';
    return 'inactive';
};

const createPinIcon = (status) =>
    L.divIcon({
        className: 'contracts-map-pin-wrapper',
        html: `<span class="contracts-map-pin contracts-map-pin--${status || 'pending'}" aria-hidden="true"></span>`,
        iconSize: [24, 32],
        iconAnchor: [12, 32],
        popupAnchor: [0, -30],
    });

const FitMapToMarkers = ({ markers }) => {
    const map = useMap();

    useEffect(() => {
        if (!markers.length) {
            map.setView(DEFAULT_CENTER, 6);
            return;
        }
        if (markers.length === 1) {
            map.setView(markers[0].coordinates, 15);
            return;
        }
        map.fitBounds(
            L.latLngBounds(markers.map((marker) => marker.coordinates)),
            { padding: [32, 32], maxZoom: 15 }
        );
    }, [map, markers]);

    return null;
};

const ServiceDelegationMap = ({ services, authToken, onOpenService }) => {
    const [coordinatesByService, setCoordinatesByService] = useState({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let cancelled = false;

        const locateServices = async () => {
            const cache = readGeocodeCache();
            const nextCoordinates = {};
            const pendingByAddress = new Map();
            const pendingGoogleLinks = [];

            services.forEach((service) => {
                const serviceId = service.serviceId || service.id;
                if (!serviceId) return;

                const linkedCoordinates = coordinatesFromLocationLink(
                    service.locationLink
                );
                if (linkedCoordinates) {
                    nextCoordinates[serviceId] = linkedCoordinates;
                    return;
                }

                if (service.locationLink) {
                    const linkCacheKey = `google:${service.locationLink}`;
                    if (Array.isArray(cache[linkCacheKey])) {
                        nextCoordinates[serviceId] = cache[linkCacheKey];
                        return;
                    }
                    if (!Object.prototype.hasOwnProperty.call(cache, linkCacheKey)) {
                        pendingGoogleLinks.push({
                            service,
                            serviceId,
                            cacheKey: linkCacheKey,
                        });
                        return;
                    }
                }

                const address = buildAddress(service);
                if (!address) return;
                const cacheKey = address.toLocaleLowerCase('es');
                if (Array.isArray(cache[cacheKey])) {
                    nextCoordinates[serviceId] = cache[cacheKey];
                    return;
                }
                if (Object.prototype.hasOwnProperty.call(cache, cacheKey)) {
                    return;
                }

                if (!pendingByAddress.has(cacheKey)) {
                    pendingByAddress.set(cacheKey, { address, serviceIds: [] });
                }
                pendingByAddress.get(cacheKey).serviceIds.push(serviceId);
            });

            if (!cancelled) setCoordinatesByService(nextCoordinates);
            if (!pendingGoogleLinks.length && !pendingByAddress.size) return;

            setLoading(true);
            for (const pending of pendingGoogleLinks) {
                if (cancelled) return;
                let coordinates = null;
                try {
                    const resolved = await fetchGoogleMapsCoordinates(
                        authToken,
                        pending.service.locationLink
                    );
                    const latitude = normalizeCoordinate(resolved?.latitude);
                    const longitude = normalizeCoordinate(resolved?.longitude);
                    coordinates =
                        latitude !== null && longitude !== null
                            ? [latitude, longitude]
                            : null;
                } catch {
                    coordinates = null;
                }

                cache[pending.cacheKey] = coordinates || false;
                if (coordinates) {
                    nextCoordinates[pending.serviceId] = coordinates;
                    if (!cancelled) {
                        setCoordinatesByService({ ...nextCoordinates });
                    }
                } else {
                    const address = buildAddress(pending.service);
                    if (address) {
                        const addressCacheKey = address.toLocaleLowerCase('es');
                        if (Array.isArray(cache[addressCacheKey])) {
                            nextCoordinates[pending.serviceId] =
                                cache[addressCacheKey];
                        } else if (
                            !Object.prototype.hasOwnProperty.call(
                                cache,
                                addressCacheKey
                            )
                        ) {
                            if (!pendingByAddress.has(addressCacheKey)) {
                                pendingByAddress.set(addressCacheKey, {
                                    address,
                                    serviceIds: [],
                                });
                            }
                            pendingByAddress
                                .get(addressCacheKey)
                                .serviceIds.push(pending.serviceId);
                        }
                    }
                }
                writeGeocodeCache(cache);
            }
            if (!cancelled) {
                setCoordinatesByService({ ...nextCoordinates });
            }

            let firstRequest = true;
            for (const [cacheKey, pending] of pendingByAddress.entries()) {
                if (cancelled) return;
                if (!firstRequest) await delay(GEOCODE_DELAY_MS);
                firstRequest = false;

                let coordinates = null;
                try {
                    coordinates = await geocodeAddress(pending.address);
                } catch {
                    coordinates = null;
                }
                cache[cacheKey] = coordinates || false;
                if (coordinates) {
                    pending.serviceIds.forEach((serviceId) => {
                        nextCoordinates[serviceId] = coordinates;
                    });
                    if (!cancelled) {
                        setCoordinatesByService({ ...nextCoordinates });
                    }
                }
                writeGeocodeCache(cache);
            }
            if (!cancelled) setLoading(false);
        };

        locateServices();
        return () => {
            cancelled = true;
        };
    }, [authToken, services]);

    const markers = useMemo(
        () =>
            services
                .map((service) => {
                    const serviceId = service.serviceId || service.id;
                    const coordinates = coordinatesByService[serviceId];
                    return coordinates
                        ? { serviceId, service, coordinates }
                        : null;
                })
                .filter(Boolean),
        [coordinatesByService, services]
    );

    const missingServices = useMemo(
        () =>
            services.filter((service) => {
                const serviceId = service.serviceId || service.id;
                return !coordinatesByService[serviceId];
            }),
        [coordinatesByService, services]
    );

    return (
        <div className='contracts-map-block'>
            <div className='contracts-map-summary'>
                <span>{markers.length} servicios ubicados</span>
                <span className='contracts-map-legend'>
                    <small className='contracts-map-legend-item contracts-map-legend-item--active'>
                        Turno abierto
                    </small>
                    <small className='contracts-map-legend-item contracts-map-legend-item--missed'>
                        Sin fichar
                    </small>
                    <small className='contracts-map-legend-item contracts-map-legend-item--inactive'>
                        Sin turno abierto
                    </small>
                </span>
                {loading ? <small>Localizando direcciones...</small> : null}
                {!loading && missingServices.length > 0 ? (
                    <details className='contracts-map-missing'>
                        <summary>
                            {missingServices.length} sin ubicacion reconocida
                        </summary>
                        <ul>
                            {missingServices.map((service) => {
                                const serviceId = service.serviceId || service.id;
                                const address = buildAddress(service);
                                return (
                                    <li key={serviceId}>
                                        <button
                                            type='button'
                                            onClick={() => onOpenService(serviceId)}
                                        >
                                            {service.name ||
                                                service.type ||
                                                'Servicio sin nombre'}
                                        </button>
                                        <small>
                                            {address ||
                                                'Sin direccion ni enlace de Google Maps'}
                                        </small>
                                    </li>
                                );
                            })}
                        </ul>
                    </details>
                ) : null}
            </div>
            <div className='contracts-map'>
                <MapContainer
                    center={DEFAULT_CENTER}
                    zoom={6}
                    scrollWheelZoom
                    className='contracts-map-container'
                >
                    <TileLayer
                        attribution='&copy; OpenStreetMap contributors'
                        url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
                    />
                    <FitMapToMarkers markers={markers} />
                    {markers.map(({ serviceId, service, coordinates }) => (
                        <Marker
                            key={serviceId}
                            position={coordinates}
                            icon={createPinIcon(getOperationalStatus(service))}
                        >
                            <Popup>
                                <div className='contracts-map-popup'>
                                    <strong>
                                        {service.name || service.type || 'Servicio'}
                                    </strong>
                                    <span>{buildAddress(service)}</span>
                                    {service.activeWorkerNames ? (
                                        <span className='contracts-map-popup-status contracts-map-popup-status--active'>
                                            Trabajando ahora:{' '}
                                            {service.activeWorkerNames}
                                        </span>
                                    ) : service.missedShiftWorkerNames ? (
                                        <span className='contracts-map-popup-status contracts-map-popup-status--missed'>
                                            Turno sin fichar:{' '}
                                            {service.missedShiftWorkerNames}
                                        </span>
                                    ) : (() => {
                                        const nextShift = parseNextShift(
                                            service.nextScheduledShift
                                        );
                                        return nextShift ? (
                                            <span className='contracts-map-popup-status'>
                                                Proximo turno:{' '}
                                                {nextShift.employeeName} ·{' '}
                                                {formatDate(nextShift.date)} ·{' '}
                                                {nextShift.startTime}-
                                                {nextShift.endTime}
                                            </span>
                                        ) : (
                                            <span className='contracts-map-popup-status'>
                                                Sin proximos turnos programados
                                            </span>
                                        );
                                    })()}
                                    <button
                                        type='button'
                                        onClick={() => onOpenService(serviceId)}
                                    >
                                        Abrir servicio
                                    </button>
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>
            </div>
        </div>
    );
};

export default ServiceDelegationMap;
