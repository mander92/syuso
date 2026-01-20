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

export const formatDateTimeMadrid = (value) => {
    const date = toValidDate(value);
    if (!date) return '';
    return madridDateTimeFormatter.format(date);
};
