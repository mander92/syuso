import getPool from '../../db/getPool.js';
import path from 'path';
import createExcelUtil from '../../utils/createExcelUtil.js';

const listEmployeeScheduleShiftsService = async (
    employeeId,
    month,
    generateExcel = false,
    serviceId = null
) => {
    const pool = await getPool();

    const params = [employeeId];
    let monthFilter = '';
    let serviceFilter = '';

    if (month) {
        monthFilter = 'AND DATE_FORMAT(scheduleDate, "%Y-%m") = ?';
        params.push(month);
    }

    if (serviceId) {
        serviceFilter = 'AND ss.serviceId = ?';
        params.push(serviceId);
    }

    const [rows] = await pool.query(
        `
        SELECT
            ss.id,
            ss.serviceId,
            ss.scheduleDate,
            ss.startTime,
            ss.endTime,
            ss.hours,
            ss.status,
            ss.shiftTypeId,
            s.name AS serviceName,
            st.name AS shiftTypeName,
            st.color AS shiftTypeColor
        FROM serviceScheduleShifts ss
        INNER JOIN services s ON s.id = ss.serviceId
        LEFT JOIN serviceShiftTypes st ON st.id = ss.shiftTypeId
        WHERE ss.employeeId = ?
          AND ss.deletedAt IS NULL
          ${monthFilter}
          ${serviceFilter}
        ORDER BY ss.scheduleDate DESC, ss.startTime DESC
        `,
        params
    );

    if (!generateExcel) {
        return rows;
    }

    const columns = [
        { header: 'Servicio', key: 'serviceName', width: 28 },
        { header: 'Dia', key: 'scheduleDate', width: 14 },
        { header: 'Inicio', key: 'startTime', width: 10 },
        { header: 'Fin', key: 'endTime', width: 10 },
        { header: 'Horas', key: 'hours', width: 10 },
        { header: 'Tipo', key: 'shiftTypeName', width: 16 },
        { header: 'Estado', key: 'status', width: 14 },
    ];

    const filePath = await createExcelUtil(
        rows,
        columns,
        'employeeSchedule.xlsx'
    );

    const publicUrl = `/uploads/documents/${path.basename(filePath)}`;
    return { excelFilePath: publicUrl };
};

export default listEmployeeScheduleShiftsService;
