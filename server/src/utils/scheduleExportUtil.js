const toDateKey = (value) => {
    if (!value) return '';
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    if (typeof value === 'string') return value.slice(0, 10);
    return '';
};

const timeShort = (value) => (value ? String(value).slice(0, 5) : '');

const cleanFilePart = (value, fallback = 'servicio') =>
    String(value || fallback)
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .slice(0, 80) || fallback;

export const buildServiceScheduleSection = ({ service, shifts, month }) => {
    const employeeMap = new Map();

    shifts.forEach((shift) => {
        const employeeName =
            shift.firstName || shift.lastName
                ? `${shift.firstName || ''} ${shift.lastName || ''}`.trim()
                : 'Sin asignar';

        if (!employeeMap.has(employeeName)) {
            employeeMap.set(employeeName, {
                name: employeeName,
                shifts: {},
                startsByDay: {},
                endsByDay: {},
                hoursByDay: {},
                totalHours: 0,
                totalRealHours: 0,
                totalNightHours: 0,
                totalHolidayHours: 0,
                totalRegularHours: 0,
            });
        }

        const entry = employeeMap.get(employeeName);
        const dateKey = toDateKey(shift.scheduleDate);
        const startTime = timeShort(shift.startTime);
        const endTime = timeShort(shift.endTime);
        const hoursValue = Number(shift.hours) || 0;
        const realHoursValue = Number(shift.realHours) || hoursValue;
        const nightHoursValue = Number(shift.nightHours) || 0;
        const holidayHoursValue = Number(shift.holidayHours) || 0;
        const regularHoursValue = Number(shift.regularHours) || 0;

        if (!entry.shifts[dateKey]) entry.shifts[dateKey] = [];
        if (!entry.startsByDay[dateKey]) entry.startsByDay[dateKey] = [];
        if (!entry.endsByDay[dateKey]) entry.endsByDay[dateKey] = [];

        if (startTime && endTime) {
            entry.shifts[dateKey].push(`${startTime}-${endTime}`);
            entry.startsByDay[dateKey].push(startTime);
            entry.endsByDay[dateKey].push(endTime);
        }

        entry.hoursByDay[dateKey] = (entry.hoursByDay[dateKey] || 0) + hoursValue;
        entry.totalHours += hoursValue;
        entry.totalRealHours += realHoursValue;
        entry.totalNightHours += nightHoursValue;
        entry.totalHolidayHours += holidayHoursValue;
        entry.totalRegularHours += regularHoursValue;
    });

    const rows = Array.from(employeeMap.values()).map((entry) => ({
        name: entry.name,
        shifts: Object.fromEntries(
            Object.entries(entry.shifts).map(([key, value]) => [
                key,
                value.join('\n'),
            ])
        ),
        startsByDay: Object.fromEntries(
            Object.entries(entry.startsByDay).map(([key, value]) => [
                key,
                value.join('\n'),
            ])
        ),
        endsByDay: Object.fromEntries(
            Object.entries(entry.endsByDay).map(([key, value]) => [
                key,
                value.join('\n'),
            ])
        ),
        hoursByDay: Object.fromEntries(
            Object.entries(entry.hoursByDay).map(([key, value]) => [
                key,
                value ? value.toFixed(2) : '',
            ])
        ),
        totalHours: entry.totalHours ? entry.totalHours.toFixed(2) : '',
        totalRealHours: entry.totalRealHours
            ? entry.totalRealHours.toFixed(2)
            : '',
        totalNightHours: entry.totalNightHours
            ? entry.totalNightHours.toFixed(2)
            : '',
        totalHolidayHours: entry.totalHolidayHours
            ? entry.totalHolidayHours.toFixed(2)
            : '',
        totalRegularHours: entry.totalRegularHours
            ? entry.totalRegularHours.toFixed(2)
            : '',
    }));

    return {
        month,
        meta: {
            center: service?.name || '',
            phone: service?.clientPhone || '',
            address: `${service?.address || ''} ${
                service?.city ? `, ${service.city}` : ''
            } ${service?.postCode ? ` ${service.postCode}` : ''}`.trim(),
            category: service?.type || '',
            description: service?.comments || service?.type || '',
            hourRuleType: service?.hourRuleType || 'standard',
        },
        rows,
    };
};

export const getServiceScheduleFileBaseName = (service, serviceId, month) =>
    `schedule-${cleanFilePart(service?.name, serviceId)}-${month}`;
