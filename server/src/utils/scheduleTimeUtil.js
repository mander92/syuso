const madridFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
});

export const getMadridDateTimeParts = (date = new Date()) => {
    const parts = madridFormatter.formatToParts(date);
    const values = {};

    parts.forEach((part) => {
        if (part.type !== 'literal') values[part.type] = part.value;
    });

    return {
        date: `${values.year}-${values.month}-${values.day}`,
        time: `${values.hour}:${values.minute}:${values.second}`,
    };
};

export const calculateShiftHours = (startTime, endTime) => {
    const [startH, startM, startS = '0'] = startTime.split(':');
    const [endH, endM, endS = '0'] = endTime.split(':');
    const startSeconds =
        Number(startH) * 3600 + Number(startM) * 60 + Number(startS);
    const endSeconds =
        Number(endH) * 3600 + Number(endM) * 60 + Number(endS);

    let diffSeconds = endSeconds - startSeconds;
    if (diffSeconds < 0) diffSeconds += 24 * 3600;

    const hours = diffSeconds / 3600;
    return Math.round(hours * 100) / 100;
};

export const toMadridDateString = (date = new Date()) => {
    return getMadridDateTimeParts(date).date;
};

export const toMadridTimeString = (date = new Date()) => {
    return getMadridDateTimeParts(date).time;
};
