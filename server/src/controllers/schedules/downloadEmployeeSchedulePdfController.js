import path from 'path';
import listEmployeeScheduleShiftsService from '../../services/schedules/listEmployeeScheduleShiftsService.js';
import selectUserByIdService from '../../services/users/selectUserByIdService.js';
import selectServiceByIdService from '../../services/services/selectServiceByIdService.js';
import { createScheduleGridPdfUtil } from '../../utils/schedulePdfUtil.js';

const downloadEmployeeSchedulePdfController = async (req, res, next) => {
    try {
        const { employeeId: employeeIdParam, month, serviceId } = req.query;
        const { id: userId, role } = req.userLogged;

        const employeeId =
            role === 'employee' ? userId : employeeIdParam || userId;

        const employee = await selectUserByIdService(employeeId);
        const effectiveMonth = month || new Date().toISOString().slice(0, 7);
        const shifts = await listEmployeeScheduleShiftsService(
            employeeId,
            effectiveMonth,
            false,
            serviceId || null
        );

        const toDateKey = (value) => {
            if (!value) return '';
            if (value instanceof Date) return value.toISOString().slice(0, 10);
            if (typeof value === 'string') return value.slice(0, 10);
            return '';
        };

        let serviceIds = Array.from(
            new Set(shifts.map((shift) => shift.serviceId).filter(Boolean))
        );

        if (!serviceIds.length && serviceId) {
            serviceIds = [serviceId];
        }

        const serviceInfoMap = new Map();
        for (const id of serviceIds) {
            const serviceInfo = await selectServiceByIdService(id);
            serviceInfoMap.set(id, serviceInfo);
        }

        const sections = serviceIds.map((id) => {
            const serviceInfo = serviceInfoMap.get(id);
            const serviceShifts = shifts.filter((shift) => shift.serviceId === id);

            const entry = {
                name: `${employee?.firstName || ''} ${
                    employee?.lastName || ''
                }`.trim(),
                shifts: {},
                hoursByDay: {},
                totalHours: 0,
            };

            serviceShifts.forEach((shift) => {
                const shiftKey = toDateKey(shift.scheduleDate);
                const startTime = shift.startTime
                    ? shift.startTime.slice(0, 5)
                    : '';
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

            return {
                month: effectiveMonth,
                meta: {
                    center: serviceInfo?.name || '',
                    phone: serviceInfo?.clientPhone || '',
                    address: `${serviceInfo?.address || ''} ${
                        serviceInfo?.city ? `, ${serviceInfo.city}` : ''
                    } ${serviceInfo?.postCode ? ` ${serviceInfo.postCode}` : ''}`.trim(),
                    category: serviceInfo?.type || '',
                    description: serviceInfo?.comments || serviceInfo?.type || '',
                },
                rows: [
                    {
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
                        totalHours: entry.totalHours
                            ? entry.totalHours.toFixed(2)
                            : '',
                    },
                ],
            };
        });

        const fileName = `personal-${employeeId}-${effectiveMonth}.pdf`;
        const filePath = await createScheduleGridPdfUtil({
            sections: sections.length
                ? sections
                : [
                      {
                          month: effectiveMonth,
                          meta: {
                              center: '',
                              phone: '',
                              address: '',
                              category: '',
                              description: '',
                          },
                          rows: [],
                      },
                  ],
            fileName,
        });

        return res.download(filePath, path.basename(filePath));
    } catch (error) {
        next(error);
    }
};

export default downloadEmployeeSchedulePdfController;
