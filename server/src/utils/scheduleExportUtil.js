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

const getFirstRow = (value) => (Array.isArray(value) ? value[0] : value);

const getEmployeeName = (employee, fallback = 'empleado') =>
    `${employee?.firstName || ''} ${employee?.lastName || ''}`.trim() ||
    employee?.email ||
    fallback;

const absenceLabels = {
    vacation: 'VAC',
    off: 'LIB',
    free: 'LIB',
    sick: 'BAJ',
    available: 'DIS',
};

const normalizeDateKey = (value) => {
    if (!value) return '';
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return value.toISOString().slice(0, 10);
    }
    const text = String(value);
    const match = text.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime())
        ? ''
        : parsed.toISOString().slice(0, 10);
};

const getMonthBounds = (month) => {
    const [year, monthValue] = String(month || '').split('-').map(Number);
    const start = new Date(Date.UTC(year, monthValue - 1, 1));
    const end = new Date(Date.UTC(year, monthValue, 0));
    return { start, end };
};

const addCellValue = (target, dateKey, value) => {
    if (!dateKey || !value) return;
    if (!target[dateKey]) target[dateKey] = [];
    if (!target[dateKey].includes(value)) target[dateKey].push(value);
};

const addAbsencesToEntry = (entry, absences, month) => {
    if (!entry || !Array.isArray(absences) || !absences.length) return;

    const { start, end } = getMonthBounds(month);
    absences.forEach((absence) => {
        const label = absenceLabels[absence.type] || 'AUS';
        const startKey = normalizeDateKey(absence.startDate);
        const endKey = normalizeDateKey(absence.endDate);
        if (!startKey || !endKey) return;

        const absenceStart = new Date(`${startKey}T00:00:00Z`);
        const absenceEnd = new Date(`${endKey}T00:00:00Z`);
        const cursor = new Date(Math.max(absenceStart.getTime(), start.getTime()));
        const limit = new Date(Math.min(absenceEnd.getTime(), end.getTime()));

        while (cursor.getTime() <= limit.getTime()) {
            const dateKey = cursor.toISOString().slice(0, 10);
            addCellValue(entry.startsByDay, dateKey, label);
            entry.absenceByDay[dateKey] = label;
            cursor.setUTCDate(cursor.getUTCDate() + 1);
        }
    });
};

const buildEmptyEntry = (name, employeeId = '') => ({
    name,
    employeeId,
    shifts: {},
    startsByDay: {},
    endsByDay: {},
    hoursByDay: {},
    absenceByDay: {},
    totalHours: 0,
    totalRealHours: 0,
    totalNightHours: 0,
    totalHolidayHours: 0,
    totalRegularHours: 0,
});

export const buildServiceScheduleSection = ({
    service,
    shifts,
    month,
    absences = [],
}) => {
    const serviceInfo = getFirstRow(service);
    const employeeMap = new Map();
    const serviceRows = Array.isArray(service) ? service : [service].filter(Boolean);
    const absencesByEmployee = new Map();

    absences.forEach((absence) => {
        if (!absence?.employeeId) return;
        if (!absencesByEmployee.has(absence.employeeId)) {
            absencesByEmployee.set(absence.employeeId, []);
        }
        absencesByEmployee.get(absence.employeeId).push(absence);
    });

    serviceRows.forEach((row) => {
        if (!row?.employeeId || employeeMap.has(row.employeeId)) return;
        const employeeName =
            row.firstName || row.lastName
                ? `${row.firstName || ''} ${row.lastName || ''}`.trim()
                : row.email || 'Trabajador';
        employeeMap.set(row.employeeId, buildEmptyEntry(employeeName, row.employeeId));
    });

    shifts.forEach((shift) => {
        const employeeKey = shift.employeeId || 'unassigned';
        const employeeName =
            shift.firstName || shift.lastName
                ? `${shift.firstName || ''} ${shift.lastName || ''}`.trim()
                : 'Sin asignar';

        if (!employeeMap.has(employeeKey)) {
            employeeMap.set(
                employeeKey,
                buildEmptyEntry(employeeName, shift.employeeId || '')
            );
        }

        const entry = employeeMap.get(employeeKey);
        const dateKey = toDateKey(shift.scheduleDate);
        const startTime = timeShort(shift.startTime);
        const endTime = timeShort(shift.endTime);
        const hoursValue = Number(shift.hours) || 0;
        const realHoursValue = Number(shift.realHours) || hoursValue;
        const nightHoursValue = Number(shift.nightHours) || 0;
        const holidayHoursValue = Number(shift.holidayHours) || 0;
        const regularHoursValue = Number(shift.regularHours) || 0;

        if (!entry.shifts[dateKey]) entry.shifts[dateKey] = [];
        if (startTime && endTime) {
            entry.shifts[dateKey].push(`${startTime}-${endTime}`);
            addCellValue(entry.startsByDay, dateKey, startTime);
            addCellValue(entry.endsByDay, dateKey, endTime);
        }

        entry.hoursByDay[dateKey] = (entry.hoursByDay[dateKey] || 0) + hoursValue;
        entry.totalHours += hoursValue;
        entry.totalRealHours += realHoursValue;
        entry.totalNightHours += nightHoursValue;
        entry.totalHolidayHours += holidayHoursValue;
        entry.totalRegularHours += regularHoursValue;
    });

    employeeMap.forEach((entry) => {
        addAbsencesToEntry(
            entry,
            absencesByEmployee.get(entry.employeeId) || [],
            month
        );
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
        absenceByDay: entry.absenceByDay,
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
            center: serviceInfo?.name || '',
            phone: serviceInfo?.clientPhone || '',
            address: `${serviceInfo?.address || ''} ${
                serviceInfo?.city ? `, ${serviceInfo.city}` : ''
            } ${serviceInfo?.postCode ? ` ${serviceInfo.postCode}` : ''}`.trim(),
            category: serviceInfo?.type || '',
            description: serviceInfo?.comments || serviceInfo?.type || '',
            hourRuleType: serviceInfo?.hourRuleType || 'standard',
            rowHeader: 'Dos apellidos y nombre',
        },
        rows,
    };
};

export const getServiceScheduleFileBaseName = (service, serviceId, month) =>
    `${cleanFilePart(getFirstRow(service)?.name, serviceId)}-${month}`;

export const buildEmployeeScheduleSection = ({
    employee,
    shifts,
    month,
    absences = [],
}) => {
    const employeeName = getEmployeeName(employee);
    const serviceMap = new Map();
    let hasAgreementService = false;

    shifts.forEach((shift) => {
        const serviceId = shift.serviceId || 'sin-servicio';
        const serviceName = shift.serviceName || 'Servicio';
        const hourRuleType = shift.hourRuleType || 'standard';
        if (hourRuleType === 'convenio') hasAgreementService = true;

        if (!serviceMap.has(serviceId)) {
            serviceMap.set(serviceId, buildEmptyEntry(serviceName));
        }

        const entry = serviceMap.get(serviceId);
        const dateKey = toDateKey(shift.scheduleDate);
        const startTime = timeShort(shift.startTime);
        const endTime = timeShort(shift.endTime);
        const hoursValue = Number(shift.hours) || 0;
        const realHoursValue = Number(shift.realHours) || hoursValue;
        const nightHoursValue = Number(shift.nightHours) || 0;
        const holidayHoursValue = Number(shift.holidayHours) || 0;
        const regularHoursValue = Number(shift.regularHours) || 0;

        if (!entry.shifts[dateKey]) entry.shifts[dateKey] = [];
        if (startTime && endTime) {
            entry.shifts[dateKey].push(`${startTime}-${endTime}`);
            addCellValue(entry.startsByDay, dateKey, startTime);
            addCellValue(entry.endsByDay, dateKey, endTime);
        }

        entry.hoursByDay[dateKey] = (entry.hoursByDay[dateKey] || 0) + hoursValue;
        entry.totalHours += hoursValue;
        entry.totalRealHours += realHoursValue;
        entry.totalNightHours += nightHoursValue;
        entry.totalHolidayHours += holidayHoursValue;
        entry.totalRegularHours += regularHoursValue;
    });

    if (absences.length) {
        const absenceEntry = buildEmptyEntry('Ausencias');
        addAbsencesToEntry(absenceEntry, absences, month);
        serviceMap.set('__absences__', absenceEntry);
    }

    const rows = Array.from(serviceMap.values()).map((entry) => ({
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
        absenceByDay: entry.absenceByDay,
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
            center: employeeName,
            phone: employee?.phone || '',
            address: employee?.city || '',
            category: 'Cuadrante personal',
            description: employee?.email || '',
            hourRuleType: hasAgreementService ? 'convenio' : 'standard',
            rowHeader: 'Servicio',
        },
        rows,
    };
};

export const getEmployeeScheduleFileBaseName = (employee, employeeId, month) =>
    `${cleanFilePart(getEmployeeName(employee, employeeId), employeeId)}-${month}`;
