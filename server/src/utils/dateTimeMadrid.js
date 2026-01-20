const madridDateFormatter = new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
});

const madridDateTimeFormatter = new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
});

const toValidDate = (value) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date;
};

const getParts = (formatter, date) => {
    const parts = formatter.formatToParts(date);
    const map = {};
    parts.forEach((part) => {
        map[part.type] = part.value;
    });
    return map;
};

export const formatDateMadrid = (value) => {
    const date = toValidDate(value);
    if (!date) return '';
    const parts = getParts(madridDateFormatter, date);
    return `${parts.day}-${parts.month}-${parts.year}`;
};

export const formatDateTimeMadrid = (value) => {
    const date = toValidDate(value);
    if (!date) return '';
    const parts = getParts(madridDateTimeFormatter, date);
    return `${parts.day}-${parts.month}-${parts.year} ${parts.hour}:${parts.minute}`;
};
