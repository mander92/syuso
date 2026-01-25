import path from 'path';
import listServiceScheduleShiftsService from '../../services/schedules/listServiceScheduleShiftsService.js';
import ensureServiceDelegationAccessService from '../../services/delegations/ensureServiceDelegationAccessService.js';
import selectServiceByIdService from '../../services/services/selectServiceByIdService.js';
import { createScheduleGridPdfUtil } from '../../utils/schedulePdfUtil.js';

const downloadServiceSchedulePdfController = async (req, res, next) => {
    try {
        const { serviceId } = req.params;
        const { month } = req.query;
        const { id: userId, role } = req.userLogged;

        await ensureServiceDelegationAccessService(serviceId, userId, role);

        const service = await selectServiceByIdService(serviceId);
        const effectiveMonth = month || new Date().toISOString().slice(0, 7);
        const shifts = await listServiceScheduleShiftsService(
            serviceId,
            effectiveMonth
        );

        const toDateKey = (value) => {
            if (!value) return '';
            if (value instanceof Date) return value.toISOString().slice(0, 10);
            if (typeof value === 'string') return value.slice(0, 10);
            return '';
        };

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
                    hoursByDay: {},
                    totalHours: 0,
                });
            }
            const entry = employeeMap.get(employeeName);
            const shiftKey = toDateKey(shift.scheduleDate);
            const startTime = shift.startTime ? shift.startTime.slice(0, 5) : '';
            const endTime = shift.endTime ? shift.endTime.slice(0, 5) : '';
            const shiftLabel =
                startTime && endTime ? `${startTime}-${endTime}` : '';

            if (!entry.shifts[shiftKey]) {
                entry.shifts[shiftKey] = [];
            }
            if (shiftLabel) {
                entry.shifts[shiftKey].push(shiftLabel);
            }

            const hoursValue = Number(shift.hours) || 0;
            entry.hoursByDay[shiftKey] =
                (entry.hoursByDay[shiftKey] || 0) + hoursValue;
            entry.totalHours += hoursValue;
        });

        const rows = Array.from(employeeMap.values()).map((entry) => ({
            name: entry.name,
            shifts: Object.fromEntries(
                Object.entries(entry.shifts).map(([key, value]) => [
                    key,
                    value.join('\n'),
                ])
            ),
            hoursByDay: Object.fromEntries(
                Object.entries(entry.hoursByDay).map(([key, value]) => [
                    key,
                    value ? value.toFixed(2) : '-',
                ])
            ),
            totalHours: entry.totalHours ? entry.totalHours.toFixed(2) : '',
        }));

        const fileName = `schedule-${serviceId}-${effectiveMonth}.pdf`;
        const filePath = await createScheduleGridPdfUtil({
            sections: [
                {
                    month: effectiveMonth,
                    meta: {
                        center: service?.name || '',
                        phone: service?.clientPhone || '',
                        address: `${service?.address || ''} ${
                            service?.city ? `, ${service.city}` : ''
                        } ${service?.postCode ? ` ${service.postCode}` : ''}`.trim(),
                        category: service?.type || '',
                        description: service?.comments || service?.type || '',
                    },
                    rows,
                },
            ],
            fileName,
        });

        return res.download(filePath, path.basename(filePath));
    } catch (error) {
        next(error);
    }
};

export default downloadServiceSchedulePdfController;
