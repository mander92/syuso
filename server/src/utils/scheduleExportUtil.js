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

export const buildServiceScheduleSection = ({ service, shifts, month }) => {
    const serviceInfo = getFirstRow(service);
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

export const buildEmployeeScheduleSection = ({ employee, shifts, month }) => {
    const employeeName = getEmployeeName(employee);
    const serviceMap = new Map();
    let hasAgreementService = false;

    shifts.forEach((shift) => {
        const serviceId = shift.serviceId || 'sin-servicio';
        const serviceName = shift.serviceName || 'Servicio';
        const hourRuleType = shift.hourRuleType || 'standard';
        if (hourRuleType === 'convenio') hasAgreementService = true;

        if (!serviceMap.has(serviceId)) {
            serviceMap.set(serviceId, {
                name: serviceName,
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
