import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';

import { UPLOADS_DIR } from '../../../env.js';
import getPool from '../../db/getPool.js';
import createExcelUtil from '../../utils/createExcelUtil.js';
import { formatDateTimeMadrid } from '../../utils/dateTimeMadrid.js';

const pad = (value) => String(value).padStart(2, '0');

const normalizeDateKey = (value) => {
    if (!value) return '';
    if (value instanceof Date) {
        return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(
            value.getDate()
        )}`;
    }
    return String(value).slice(0, 10);
};

const normalizeTime = (value) => {
    if (!value) return '';
    return String(value).slice(0, 5);
};

const minutesBetween = (start, end) => {
    if (!start || !end) return null;
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
        return null;
    }
    return Math.round((endDate.getTime() - startDate.getTime()) / 60000);
};

const formatMinutes = (minutes) => {
    if (minutes === null || minutes === undefined) return '-';
    const sign = minutes < 0 ? '-' : '';
    const abs = Math.abs(minutes);
    return `${sign}${Math.floor(abs / 60)}h ${pad(abs % 60)}m`;
};

const getMadridDateKey = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Madrid',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(date);
    const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${map.year}-${map.month}-${map.day}`;
};

const toLocalScheduleDate = (dateKey, time) => {
    if (!dateKey || !time) return null;
    return new Date(`${dateKey}T${normalizeTime(time)}:00`);
};

const addDayIfNight = (date, startTime, endTime) => {
    if (!date) return null;
    const next = new Date(date);
    if (normalizeTime(endTime) <= normalizeTime(startTime)) {
        next.setDate(next.getDate() + 1);
    }
    return next;
};

const getMapUrl = (lat, lng) => {
    if (lat === null || lat === undefined || lng === null || lng === undefined) {
        return '';
    }
    return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=18/${lat}/${lng}`;
};

const buildStatus = ({ record, absence, plannedStart, plannedEnd }) => {
    if (absence) {
        const labels = {
            vacation: 'Vacaciones',
            off: 'Libre',
            sick: 'Baja',
            available: 'Disponible',
        };
        return labels[absence.type] || 'Ausencia';
    }

    if (!record) return 'Sin fichaje';
    if (!record.realClockOut && !record.clockOut) return 'Salida pendiente';

    const realIn = record.realClockIn || record.clockIn;
    const realOut = record.realClockOut || record.clockOut;
    const lateMinutes = minutesBetween(plannedStart, realIn);
    const earlyMinutes = minutesBetween(realOut, plannedEnd);

    if (lateMinutes !== null && lateMinutes > 5) return 'Entrada tarde';
    if (earlyMinutes !== null && earlyMinutes > 5) return 'Salida anticipada';
    if (record.realClockIn || record.realClockOut) return 'Correcto';
    return 'Registrado';
};

const findMatchingRecord = (shift, records, usedRecordIds) => {
    const shiftDate = normalizeDateKey(shift.scheduleDate);
    const candidates = records.filter((record) => {
        if (usedRecordIds.has(record.id)) return false;
        if (record.employeeId !== shift.employeeId) return false;
        if (record.serviceId !== shift.serviceId) return false;
        return getMadridDateKey(record.realClockIn || record.clockIn) === shiftDate;
    });

    if (!candidates.length) return null;

    candidates.sort((a, b) => {
        const aTime = new Date(a.realClockIn || a.clockIn || 0).getTime();
        const bTime = new Date(b.realClockIn || b.clockIn || 0).getTime();
        return aTime - bTime;
    });

    const [record] = candidates;
    usedRecordIds.add(record.id);
    return record;
};

const createPdf = async ({ rows, summary, month }) => {
    const directoryPath = path.resolve(`${UPLOADS_DIR}/documents`);
    await fs.promises.mkdir(directoryPath, { recursive: true });
    const filePath = path.join(directoryPath, `time-record-report-${month}.pdf`);
    const doc = new PDFDocument({ size: 'A4', margin: 36 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    doc.font('Helvetica-Bold').fontSize(16).fillColor('#0f172a');
    doc.text('Informe de registro horario');
    doc.moveDown(0.3);
    doc.font('Helvetica').fontSize(10).fillColor('#334155');
    doc.text(`Periodo: ${month}`);
    doc.text(
        'Informe operativo basado en cuadrantes previstos, fichajes reales, partes de trabajo, ausencias y correcciones registradas.'
    );
    doc.moveDown();

    doc.font('Helvetica-Bold').fontSize(11).fillColor('#0f172a');
    doc.text(
        `Turnos: ${summary.totalRows} | Correctos: ${summary.okRows} | Incidencias: ${summary.issueRows} | Horas reales: ${summary.realHours.toFixed(
            2
        )}`
    );
    doc.moveDown();

    const columns = [
        ['Fecha', 55],
        ['Trabajador', 98],
        ['Servicio', 100],
        ['Previsto', 58],
        ['Real', 70],
        ['Estado', 78],
        ['Dif.', 45],
    ];

    const drawHeader = () => {
        let x = doc.page.margins.left;
        doc.font('Helvetica-Bold').fontSize(8).fillColor('#0f172a');
        columns.forEach(([label, width]) => {
            doc.text(label, x, doc.y, { width });
            x += width;
        });
        doc.moveDown(0.6);
        doc.moveTo(doc.page.margins.left, doc.y).lineTo(560, doc.y).stroke('#cbd5e1');
        doc.moveDown(0.4);
    };

    drawHeader();

    rows.forEach((row) => {
        if (doc.y > 760) {
            doc.addPage();
            drawHeader();
        }
        const values = [
            row.dateLabel,
            row.employeeName,
            row.serviceName,
            row.plannedRange,
            row.realRange,
            row.status,
            row.differenceLabel,
        ];
        let x = doc.page.margins.left;
        doc.font('Helvetica').fontSize(7).fillColor('#0f172a');
        values.forEach((value, index) => {
            doc.text(String(value || '-'), x, doc.y, {
                width: columns[index][1],
                height: 24,
            });
            x += columns[index][1];
        });
        doc.moveDown(1.5);
    });

    doc.end();
    await new Promise((resolve, reject) => {
        stream.on('finish', resolve);
        stream.on('error', reject);
    });

    return filePath;
};

const listTimeRecordReportService = async ({
    month,
    employeeId,
    serviceId,
    delegationNames = [],
    generateExcel = false,
    generatePdf = false,
}) => {
    const pool = await getPool();
    const effectiveMonth = month || new Date().toISOString().slice(0, 7);
    const startDate = `${effectiveMonth}-01`;
    const [year, monthNumber] = effectiveMonth.split('-').map(Number);
    const endDate = `${effectiveMonth}-${pad(
        new Date(year, monthNumber, 0).getDate()
    )}`;

    const shiftValues = [startDate, endDate];
    let shiftQuery = `
        SELECT
            ss.id AS scheduleShiftId,
            ss.serviceId,
            ss.employeeId,
            ss.scheduleDate,
            ss.startTime,
            ss.endTime,
            ss.hours AS plannedHours,
            ss.status AS scheduleStatus,
            ss.modifiedAt AS scheduleModifiedAt,
            s.name AS serviceName,
            s.province AS serviceDelegation,
            a.city AS serviceCity,
            a.address AS serviceAddress,
            st.name AS shiftTypeName,
            st.color AS shiftTypeColor,
            u.firstName,
            u.lastName,
            u.email AS employeeEmail,
            u.dni AS employeeDni
        FROM serviceScheduleShifts ss
        INNER JOIN services s ON s.id = ss.serviceId
        LEFT JOIN addresses a ON a.id = s.addressId
        LEFT JOIN users u ON u.id = ss.employeeId
        LEFT JOIN serviceShiftTypes st ON st.id = ss.shiftTypeId
        WHERE ss.deletedAt IS NULL
          AND ss.employeeId IS NOT NULL
          AND ss.scheduleDate BETWEEN ? AND ?
    `;

    if (employeeId) {
        shiftQuery += ' AND ss.employeeId = ?';
        shiftValues.push(employeeId);
    }
    if (serviceId) {
        shiftQuery += ' AND ss.serviceId = ?';
        shiftValues.push(serviceId);
    }
    if (delegationNames.length) {
        shiftQuery += ` AND s.province IN (${delegationNames.map(() => '?').join(', ')})`;
        shiftValues.push(...delegationNames);
    }
    shiftQuery += ' ORDER BY ss.scheduleDate ASC, u.lastName ASC, u.firstName ASC';

    const [shifts] = await pool.query(shiftQuery, shiftValues);

    const recordValues = [`${startDate} 00:00:00`, `${endDate} 23:59:59`];
    let recordQuery = `
        SELECT
            sr.*,
            s.name AS serviceName,
            s.province AS serviceDelegation,
            a.city AS serviceCity,
            u.firstName,
            u.lastName,
            u.email AS employeeEmail,
            u.dni AS employeeDni,
            wr.id AS workReportId,
            wr.reportDate,
            wr.incidentType
        FROM shiftRecords sr
        INNER JOIN services s ON s.id = sr.serviceId
        LEFT JOIN addresses a ON a.id = s.addressId
        INNER JOIN users u ON u.id = sr.employeeId
        LEFT JOIN workReports wr ON wr.shiftRecordId = sr.id
        WHERE sr.deletedAt IS NULL
          AND COALESCE(sr.realClockIn, sr.clockIn, sr.createdAt) BETWEEN ? AND ?
    `;

    if (employeeId) {
        recordQuery += ' AND sr.employeeId = ?';
        recordValues.push(employeeId);
    }
    if (serviceId) {
        recordQuery += ' AND sr.serviceId = ?';
        recordValues.push(serviceId);
    }
    if (delegationNames.length) {
        recordQuery += ` AND s.province IN (${delegationNames.map(() => '?').join(', ')})`;
        recordValues.push(...delegationNames);
    }

    const [records] = await pool.query(recordQuery, recordValues);

    const absenceValues = [endDate, startDate];
    let absenceQuery = `
        SELECT *
        FROM employeeAbsences
        WHERE startDate <= ?
          AND endDate >= ?
    `;
    if (employeeId) {
        absenceQuery += ' AND employeeId = ?';
        absenceValues.push(employeeId);
    }
    const [absences] = await pool.query(absenceQuery, absenceValues);

    const findAbsence = (shift) => {
        const dateKey = normalizeDateKey(shift.scheduleDate);
        return absences.find(
            (absence) =>
                absence.employeeId === shift.employeeId &&
                normalizeDateKey(absence.startDate) <= dateKey &&
                normalizeDateKey(absence.endDate) >= dateKey
        );
    };

    const usedRecordIds = new Set();
    const scheduledRows = shifts.map((shift) => {
        const dateKey = normalizeDateKey(shift.scheduleDate);
        const plannedStart = toLocalScheduleDate(dateKey, shift.startTime);
        const plannedEnd = addDayIfNight(
            toLocalScheduleDate(dateKey, shift.endTime),
            shift.startTime,
            shift.endTime
        );
        const record = findMatchingRecord(shift, records, usedRecordIds);
        const absence = findAbsence(shift);
        const realIn = record?.realClockIn || record?.clockIn;
        const realOut = record?.realClockOut || record?.clockOut;
        const plannedMinutes = minutesBetween(plannedStart, plannedEnd) || 0;
        const realMinutes = minutesBetween(realIn, realOut);

        return {
            id: shift.scheduleShiftId,
            scheduleShiftId: shift.scheduleShiftId,
            shiftRecordId: record?.id || null,
            employeeId: shift.employeeId,
            employeeName:
                `${shift.firstName || ''} ${shift.lastName || ''}`.trim() ||
                shift.employeeEmail ||
                'Trabajador',
            employeeEmail: shift.employeeEmail || '',
            employeeDni: shift.employeeDni || '',
            serviceId: shift.serviceId,
            serviceName: shift.serviceName || 'Servicio',
            serviceDelegation: shift.serviceDelegation || '',
            serviceCity: shift.serviceCity || '',
            serviceAddress: shift.serviceAddress || '',
            date: dateKey,
            dateLabel: dateKey.split('-').reverse().join('/'),
            plannedStart: `${dateKey} ${normalizeTime(shift.startTime)}`,
            plannedEnd: `${normalizeDateKey(plannedEnd)} ${normalizeTime(shift.endTime)}`,
            plannedRange: `${normalizeTime(shift.startTime)}-${normalizeTime(
                shift.endTime
            )}`,
            realStart: realIn ? formatDateTimeMadrid(realIn) : '',
            realEnd: realOut ? formatDateTimeMadrid(realOut) : '',
            realRange: realIn || realOut ? `${formatDateTimeMadrid(realIn)} / ${formatDateTimeMadrid(realOut)}` : '-',
            plannedHours: Number(shift.plannedHours || plannedMinutes / 60),
            realHours: realMinutes === null ? 0 : realMinutes / 60,
            differenceMinutes: realMinutes === null ? null : realMinutes - plannedMinutes,
            differenceLabel:
                realMinutes === null
                    ? '-'
                    : formatMinutes(realMinutes - plannedMinutes),
            status: buildStatus({ record, absence, plannedStart, plannedEnd }),
            scheduleStatus: shift.scheduleStatus,
            shiftTypeName: shift.shiftTypeName || '',
            workReportId: record?.workReportId || '',
            incidentType: record?.incidentType || '',
            latitudeIn: record?.latitudeIn ?? null,
            longitudeIn: record?.longitudeIn ?? null,
            latitudeOut: record?.latitudeOut ?? null,
            longitudeOut: record?.longitudeOut ?? null,
            mapInUrl: getMapUrl(record?.latitudeIn, record?.longitudeIn),
            mapOutUrl: getMapUrl(record?.latitudeOut, record?.longitudeOut),
            source: 'scheduled',
        };
    });

    const unmatchedRows = records
        .filter((record) => !usedRecordIds.has(record.id))
        .map((record) => {
            const realIn = record.realClockIn || record.clockIn;
            const realOut = record.realClockOut || record.clockOut;
            const realMinutes = minutesBetween(realIn, realOut);
            const dateKey = getMadridDateKey(realIn || record.createdAt);
            return {
                id: record.id,
                scheduleShiftId: null,
                shiftRecordId: record.id,
                employeeId: record.employeeId,
                employeeName:
                    `${record.firstName || ''} ${record.lastName || ''}`.trim() ||
                    record.employeeEmail ||
                    'Trabajador',
                employeeEmail: record.employeeEmail || '',
                employeeDni: record.employeeDni || '',
                serviceId: record.serviceId,
                serviceName: record.serviceName || 'Servicio',
                serviceDelegation: record.serviceDelegation || '',
                serviceCity: record.serviceCity || '',
                date: dateKey,
                dateLabel: dateKey ? dateKey.split('-').reverse().join('/') : '',
                plannedStart: '',
                plannedEnd: '',
                plannedRange: 'Sin turno',
                realStart: formatDateTimeMadrid(realIn),
                realEnd: formatDateTimeMadrid(realOut),
                realRange: `${formatDateTimeMadrid(realIn)} / ${formatDateTimeMadrid(
                    realOut
                )}`,
                plannedHours: 0,
                realHours: realMinutes === null ? 0 : realMinutes / 60,
                differenceMinutes: realMinutes,
                differenceLabel: formatMinutes(realMinutes),
                status: realOut ? 'Fichaje sin turno' : 'Salida pendiente',
                workReportId: record.workReportId || '',
                incidentType: record.incidentType || '',
                latitudeIn: record.latitudeIn ?? null,
                longitudeIn: record.longitudeIn ?? null,
                latitudeOut: record.latitudeOut ?? null,
                longitudeOut: record.longitudeOut ?? null,
                mapInUrl: getMapUrl(record.latitudeIn, record.longitudeIn),
                mapOutUrl: getMapUrl(record.latitudeOut, record.longitudeOut),
                source: 'unmatched',
            };
        });

    const rows = [...scheduledRows, ...unmatchedRows].sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.employeeName.localeCompare(b.employeeName);
    });

    const summary = {
        totalRows: rows.length,
        okRows: rows.filter((row) => ['Correcto', 'Registrado'].includes(row.status))
            .length,
        issueRows: rows.filter(
            (row) =>
                ![
                    'Correcto',
                    'Registrado',
                    'Vacaciones',
                    'Libre',
                    'Baja',
                    'Disponible',
                ].includes(row.status)
        ).length,
        absenceRows: rows.filter((row) =>
            ['Vacaciones', 'Libre', 'Baja', 'Disponible'].includes(row.status)
        ).length,
        realHours: rows.reduce((sum, row) => sum + Number(row.realHours || 0), 0),
        plannedHours: rows.reduce(
            (sum, row) => sum + Number(row.plannedHours || 0),
            0
        ),
    };

    const result = { month: effectiveMonth, rows, summary };

    if (generateExcel) {
        const filePath = await createExcelUtil(
            [
                {
                    name: 'Registro horario',
                    columns: [
                        { header: 'Fecha', key: 'dateLabel', width: 14 },
                        { header: 'Trabajador', key: 'employeeName', width: 28 },
                        { header: 'DNI', key: 'employeeDni', width: 16 },
                        { header: 'Email', key: 'employeeEmail', width: 30 },
                        { header: 'Servicio', key: 'serviceName', width: 32 },
                        { header: 'Delegacion', key: 'serviceDelegation', width: 18 },
                        { header: 'Ciudad', key: 'serviceCity', width: 18 },
                        { header: 'Previsto', key: 'plannedRange', width: 16 },
                        { header: 'Entrada real', key: 'realStart', width: 22 },
                        { header: 'Salida real', key: 'realEnd', width: 22 },
                        { header: 'Horas previstas', key: 'plannedHours', width: 16 },
                        { header: 'Horas reales', key: 'realHours', width: 14 },
                        { header: 'Diferencia', key: 'differenceLabel', width: 14 },
                        { header: 'Estado', key: 'status', width: 22 },
                        { header: 'Mapa entrada', key: 'mapInUrl', width: 48 },
                        { header: 'Mapa salida', key: 'mapOutUrl', width: 48 },
                    ],
                    rows,
                },
            ],
            null,
            `time-record-report-${effectiveMonth}.xlsx`
        );
        result.excelFilePath = `/uploads/documents/${path.basename(filePath)}`;
    }

    if (generatePdf) {
        const filePath = await createPdf({ rows, summary, month: effectiveMonth });
        result.pdfFilePath = `/uploads/documents/${path.basename(filePath)}`;
    }

    return result;
};

export default listTimeRecordReportService;
