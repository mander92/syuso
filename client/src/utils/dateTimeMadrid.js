const madridDateTimeFormatter = new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
});

const madridDateTimePartsFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
});

const normalizeDateValue = (value) => {
    if (!value) return value;
    if (value instanceof Date) return value;
    if (typeof value !== 'string') return value;

    const trimmed = value.trim();
    const hasTimezone = /[zZ]|[+\-]\d{2}:\d{2}$/.test(trimmed);
    if (hasTimezone) return trimmed;

    const normalized = trimmed.replace(' ', 'T');
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(normalized)) {
        return `${normalized}Z`;
    }

    return trimmed;
};

const toValidDate = (value) => {
    if (!value) return null;
    const normalized = normalizeDateValue(value);
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) return null;
    return date;
};

export const formatDateTimeMadrid = (value) => {
    const date = toValidDate(value);
    if (!date) return '';
    return madridDateTimeFormatter.format(date);
};

export const toMadridDate = (value) => {
    const date = toValidDate(value);
    if (!date) return null;

    const parts = madridDateTimePartsFormatter.formatToParts(date);
    const map = parts.reduce((acc, part) => {
        if (part.type !== 'literal') {
            acc[part.type] = part.value;
        }
        return acc;
    }, {});

    return new Date(
        Number(map.year),
        Number(map.month) - 1,
        Number(map.day),
        Number(map.hour),
        Number(map.minute),
        Number(map.second)
    );
};
