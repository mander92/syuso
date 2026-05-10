import { calculateShiftHours } from './scheduleTimeUtil.js';

const PROVINCE_TO_AUTONOMOUS_COMMUNITY = {
    'a coruna': 'Galicia',
    'alava': 'Pais Vasco',
    'albacete': 'Castilla-La Mancha',
    'alicante': 'Comunidad Valenciana',
    'almeria': 'Andalucia',
    'asturias': 'Asturias',
    'avila': 'Castilla y Leon',
    'badajoz': 'Extremadura',
    'barcelona': 'Cataluna',
    'burgos': 'Castilla y Leon',
    'caceres': 'Extremadura',
    'cadiz': 'Andalucia',
    'cantabria': 'Cantabria',
    'castellon': 'Comunidad Valenciana',
    'ceuta': 'Ceuta',
    'ciudad real': 'Castilla-La Mancha',
    'cordoba': 'Andalucia',
    'cuenca': 'Castilla-La Mancha',
    'girona': 'Cataluna',
    'granada': 'Andalucia',
    'guadalajara': 'Castilla-La Mancha',
    'guipuzcoa': 'Pais Vasco',
    'huelva': 'Andalucia',
    'huesca': 'Aragon',
    'illes balears': 'Illes Balears',
    'jaen': 'Andalucia',
    'la rioja': 'La Rioja',
    'las palmas': 'Canarias',
    'leon': 'Castilla y Leon',
    'lleida': 'Cataluna',
    'lugo': 'Galicia',
    'madrid': 'Comunidad de Madrid',
    'malaga': 'Andalucia',
    'melilla': 'Melilla',
    'murcia': 'Region de Murcia',
    'navarra': 'Navarra',
    'ourense': 'Galicia',
    'palencia': 'Castilla y Leon',
    'pontevedra': 'Galicia',
    'salamanca': 'Castilla y Leon',
    'santa cruz de tenerife': 'Canarias',
    'segovia': 'Castilla y Leon',
    'sevilla': 'Andalucia',
    'soria': 'Castilla y Leon',
    'tarragona': 'Cataluna',
    'teruel': 'Aragon',
    'toledo': 'Castilla-La Mancha',
    'valencia': 'Comunidad Valenciana',
    'valladolid': 'Castilla y Leon',
    'vizcaya': 'Pais Vasco',
    'zamora': 'Castilla y Leon',
    'zaragoza': 'Aragon',
};

const normalize = (value) =>
    String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase();

const pad = (value) => String(value).padStart(2, '0');

const toDateKey = (value) => {
    if (!value) return '';
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-${pad(
            value.getUTCDate()
        )}`;
    }
    return String(value).slice(0, 10);
};

const parseTimeParts = (value) => {
    const [hours = '0', minutes = '0', seconds = '0'] = String(value || '').split(':');
    return {
        hours: Number(hours) || 0,
        minutes: Number(minutes) || 0,
        seconds: Number(seconds) || 0,
    };
};

const buildDateTime = (dateKey, timeValue) => {
    const { hours, minutes, seconds } = parseTimeParts(timeValue);
    const [year, month, day] = dateKey.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds));
};

const addDays = (date, days) => {
    const next = new Date(date.getTime());
    next.setUTCDate(next.getUTCDate() + days);
    return next;
};

const startOfUtcDay = (date) =>
    new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const overlapHours = (start, end, rangeStart, rangeEnd) => {
    const from = Math.max(start.getTime(), rangeStart.getTime());
    const to = Math.min(end.getTime(), rangeEnd.getTime());
    if (to <= from) return 0;
    return (to - from) / 36e5;
};

const roundHours = (value) => Math.round((Number(value) || 0) * 100) / 100;

export const resolveAutonomousCommunity = (province, explicitCommunity = '') =>
    explicitCommunity || PROVINCE_TO_AUTONOMOUS_COMMUNITY[normalize(province)] || '';

export const buildShiftRange = (scheduleDate, startTime, endTime) => {
    const dateKey = toDateKey(scheduleDate);
    const start = buildDateTime(dateKey, startTime);
    let end = buildDateTime(dateKey, endTime);

    if (end <= start) {
        end = addDays(end, 1);
    }

    return { start, end, dateKey };
};

export const calculateAgreementHourBreakdown = ({
    scheduleDate,
    startTime,
    endTime,
    hourRuleType = 'standard',
    holidayDates = [],
}) => {
    const realHours = calculateShiftHours(startTime, endTime);

    if (hourRuleType !== 'convenio') {
        return {
            hours: realHours,
            realHours,
            nightHours: 0,
            holidayHours: 0,
            regularHours: realHours,
        };
    }

    const { start, end } = buildShiftRange(scheduleDate, startTime, endTime);
    const firstDay = startOfUtcDay(addDays(start, -1));
    const lastDay = startOfUtcDay(addDays(end, 1));
    const holidayDateSet = new Set(holidayDates.map(toDateKey).filter(Boolean));

    let nightHours = 0;
    let holidayHours = 0;

    for (
        let day = new Date(firstDay.getTime());
        day <= lastDay;
        day = addDays(day, 1)
    ) {
        const nextDay = addDays(day, 1);
        const weekday = day.getUTCDay();
        const dateKey = toDateKey(day);

        const nightStart = new Date(
            Date.UTC(
                day.getUTCFullYear(),
                day.getUTCMonth(),
                day.getUTCDate(),
                22,
                0,
                0
            )
        );
        const nightEnd = addDays(
            new Date(
                Date.UTC(
                    day.getUTCFullYear(),
                    day.getUTCMonth(),
                    day.getUTCDate(),
                    6,
                    0,
                    0
                )
            ),
            1
        );

        nightHours += overlapHours(start, end, nightStart, nightEnd);

        if (weekday === 6 || weekday === 0 || holidayDateSet.has(dateKey)) {
            holidayHours += overlapHours(start, end, day, nextDay);
        }
    }

    nightHours = roundHours(nightHours);
    holidayHours = roundHours(holidayHours);

    return {
        hours: realHours,
        realHours,
        nightHours,
        holidayHours,
        regularHours: roundHours(Math.max(realHours - holidayHours, 0)),
    };
};

export const normalizeHolidayLocation = ({ autonomousCommunity, province, city }) => ({
    autonomousCommunity: normalize(autonomousCommunity),
    province: normalize(province),
    city: normalize(city),
});
