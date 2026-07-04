import generateErrorUtil from './generateErrorUtil.js';

const ALLOWED_HOSTS = [
    'google.com',
    'maps.google.com',
    'maps.app.goo.gl',
    'goo.gl',
];

const isAllowedHost = (hostname) =>
    ALLOWED_HOSTS.some(
        (host) => hostname === host || hostname.endsWith(`.${host}`)
    );

const validCoordinates = (latitude, longitude) =>
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180;

const extractCoordinates = (value) => {
    const rawValue = String(value || '');
    let source = rawValue;
    try {
        source = decodeURIComponent(rawValue);
    } catch {
        source = rawValue;
    }
    const patterns = [
        /@(-?\d{1,2}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)/,
        /[?&](?:q|query|ll|center)=(-?\d{1,2}(?:\.\d+)?),\s*(-?\d{1,3}(?:\.\d+)?)/,
        /\[null,null,(-?\d{1,2}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)\]/,
    ];

    for (const pattern of patterns) {
        const match = source.match(pattern);
        if (!match) continue;
        const latitude = Number.parseFloat(match[1]);
        const longitude = Number.parseFloat(match[2]);
        if (validCoordinates(latitude, longitude)) {
            return { latitude, longitude };
        }
    }

    return null;
};

const resolveGoogleMapsLocation = async (locationLink) => {
    let url;
    try {
        url = new URL(locationLink);
    } catch {
        generateErrorUtil('El enlace de Google Maps no es valido', 400);
    }

    if (url.protocol !== 'https:' || !isAllowedHost(url.hostname)) {
        generateErrorUtil('Solo se permiten enlaces HTTPS de Google Maps', 400);
    }

    const directCoordinates = extractCoordinates(url.href);
    if (directCoordinates) return directCoordinates;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
        const response = await fetch(url.href, {
            method: 'GET',
            redirect: 'follow',
            signal: controller.signal,
            headers: {
                'User-Agent': 'SYUSO-Service-Map/1.0',
                Accept: 'text/html,application/xhtml+xml',
            },
        });
        const redirectedCoordinates = extractCoordinates(response.url);
        if (redirectedCoordinates) return redirectedCoordinates;

        const html = await response.text();
        return extractCoordinates(html);
    } catch {
        return null;
    } finally {
        clearTimeout(timeout);
    }
};

export default resolveGoogleMapsLocation;
