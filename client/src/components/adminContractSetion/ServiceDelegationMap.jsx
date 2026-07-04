import { useEffect, useMemo, useState } from 'react';
import L from 'leaflet';
import {
    MapContainer,
    Marker,
    Popup,
    TileLayer,
    useMap,
} from 'react-leaflet';
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

const ServiceDelegationMap = ({ services, onOpenService }) => {
    const [coordinatesByService, setCoordinatesByService] = useState({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let cancelled = false;

        const locateServices = async () => {
            const cache = readGeocodeCache();
            const nextCoordinates = {};
            const pendingByAddress = new Map();

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
            if (!pendingByAddress.size) return;

            setLoading(true);
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
    }, [services]);

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

    const missingCount = services.length - markers.length;

    return (
        <div className='contracts-map-block'>
            <div className='contracts-map-summary'>
                <span>{markers.length} servicios ubicados</span>
                {loading ? <small>Localizando direcciones...</small> : null}
                {!loading && missingCount > 0 ? (
                    <small>{missingCount} sin ubicación reconocida</small>
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
                            icon={createPinIcon(service.status)}
                        >
                            <Popup>
                                <div className='contracts-map-popup'>
                                    <strong>
                                        {service.name || service.type || 'Servicio'}
                                    </strong>
                                    <span>{buildAddress(service)}</span>
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
