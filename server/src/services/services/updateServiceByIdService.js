import getPool from '../../db/getPool.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';
import { calculateShiftHourBreakdowns } from '../schedules/calculateShiftHourBreakdownsService.js';

const updateServiceByIdService = async (
    serviceId,
    address,
    postCode,
    city,
    comments,
    name,
    status,
    startDateTime,
    endDateTime,
    hours,
    hourlyRate,
    numberOfPeople,
    reportEmail,
    locationLink,
    allowUnscheduledClockIn,
    clockInEarlyMinutes,
    scheduleView,
    clientId,
    typeOfServicesId,
    type,
    description,
    province,
    autonomousCommunity,
    hourRuleType,
    image,
    role
) => {
    const pool = await getPool();

    const [serviceInfo] = await pool.query(
        `
        SELECT s.id, s.status, s.startDateTime, s.hours, s.hourlyRate, s.numberOfPeople, s.comments,
               s.reportEmail, s.locationLink, s.name, s.endDateTime, s.clientId,
               s.allowUnscheduledClockIn,
               s.clockInEarlyMinutes,
               s.scheduleView,
               s.addressId, s.typeOfServicesId,
               s.type, s.description, s.province, s.autonomousCommunity,
               s.hourRuleType, s.image,
               a.address, a.postCode, a.city
        FROM services s
        INNER JOIN addresses a ON a.id = s.addressId
        WHERE s.id = ?
        `,
        [serviceId]
    );

    if (!serviceInfo.length) {
        generateErrorUtil('Servicio no encontrado', 404);
    }

    if (
        serviceInfo[0].status !== 'pending' &&
        role !== 'admin' &&
        role !== 'sudo'
    ) {
        generateErrorUtil(
            'El servicio ya no se puede modificar, ya ha sido procesado',
            409
        );
    }

    const current = serviceInfo[0];

    const resolvedAddress =
        address && address.trim() !== '' ? address.trim() : current.address;
    const resolvedPostCode =
        postCode && postCode.trim() !== '' ? postCode.trim() : current.postCode;
    const resolvedCity =
        city && city.trim() !== '' ? city.trim() : current.city;
    const resolvedComments =
        comments && comments.trim() !== '' ? comments.trim() : current.comments;
    const resolvedName =
        name && name.trim() !== '' ? name.trim() : current.name;
    const resolvedStatus =
        status && status.trim() !== '' ? status.trim() : current.status;

    const resolvedHours =
        hours !== undefined && hours !== null && hours !== ''
            ? Number(hours)
            : Number(current.hours);
    const resolvedHourlyRate =
        role === 'sudo' &&
        hourlyRate !== undefined &&
        hourlyRate !== null &&
        hourlyRate !== ''
            ? Number(hourlyRate)
            : current.hourlyRate;
    const resolvedNumberOfPeople =
        numberOfPeople !== undefined &&
        numberOfPeople !== null &&
        numberOfPeople !== ''
            ? Number(numberOfPeople)
            : Number(current.numberOfPeople);
    const resolvedReportEmail =
        reportEmail !== undefined && reportEmail !== null
            ? String(reportEmail).trim()
            : current.reportEmail;
    const resolvedLocationLink =
        locationLink !== undefined && locationLink !== null
            ? String(locationLink).trim()
            : current.locationLink;
    const resolvedAllowUnscheduledClockIn =
        typeof allowUnscheduledClockIn === 'boolean'
            ? allowUnscheduledClockIn
            : current.allowUnscheduledClockIn;
    const resolvedClockInEarlyMinutes =
        clockInEarlyMinutes !== undefined &&
        clockInEarlyMinutes !== null &&
        clockInEarlyMinutes !== ''
            ? Number(clockInEarlyMinutes)
            : current.clockInEarlyMinutes;
    const resolvedScheduleView =
        scheduleView === 'image' || scheduleView === 'grid'
            ? scheduleView
            : current.scheduleView;
    const resolvedClientId =
        clientId && clientId.trim() !== ''
            ? clientId.trim()
            : current.clientId;
    const resolvedTypeOfServicesId =
        typeOfServicesId && typeOfServicesId.trim() !== ''
            ? typeOfServicesId.trim()
            : current.typeOfServicesId;
    const resolvedType =
        type && type.trim() !== '' ? type.trim() : current.type;
    const resolvedDescription =
        description !== undefined && description !== null
            ? String(description).trim()
            : current.description;
    const resolvedProvince =
        province && province.trim() !== '' ? province.trim() : current.province;
    const resolvedAutonomousCommunity =
        autonomousCommunity !== undefined && autonomousCommunity !== null
            ? String(autonomousCommunity).trim()
            : current.autonomousCommunity;
    const resolvedHourRuleType =
        hourRuleType === 'convenio' || hourRuleType === 'standard'
            ? hourRuleType
            : current.hourRuleType || 'standard';
    const resolvedImage =
        image !== undefined && image !== null ? String(image).trim() : current.image;

    await pool.query(
        `
        UPDATE addresses SET address = ?, postCode = ?, city = ?
        WHERE id = ?
        `,
        [resolvedAddress, resolvedPostCode, resolvedCity, current.addressId]
    );

    const updates = [
        'name = ?',
        'status = ?',
        'comments = ?',
        'hours = ?',
        'hourlyRate = ?',
        'numberOfPeople = ?',
        'reportEmail = ?',
        'locationLink = ?',
        'allowUnscheduledClockIn = ?',
        'clockInEarlyMinutes = ?',
        'scheduleView = ?',
        'clientId = ?',
        'typeOfServicesId = ?',
        'type = ?',
        'description = ?',
        'province = ?',
        'autonomousCommunity = ?',
        'hourRuleType = ?',
        'image = ?',
    ];
    const values = [
        resolvedName,
        resolvedStatus,
        resolvedComments,
        resolvedHours,
        resolvedHourlyRate,
        resolvedNumberOfPeople,
        resolvedReportEmail,
        resolvedLocationLink,
        resolvedAllowUnscheduledClockIn,
        resolvedClockInEarlyMinutes,
        resolvedScheduleView,
        resolvedClientId,
        resolvedTypeOfServicesId,
        resolvedType,
        resolvedDescription,
        resolvedProvince,
        resolvedAutonomousCommunity,
        resolvedHourRuleType,
        resolvedImage,
    ];

    if (startDateTime && startDateTime !== '') {
        updates.push(
            `startDateTime = STR_TO_DATE(
                CONCAT(
                    CASE
                        WHEN LOCATE('.', TRIM(TRAILING 'Z' FROM ?)) > 0
                            THEN TRIM(TRAILING 'Z' FROM ?)
                        ELSE CONCAT(TRIM(TRAILING 'Z' FROM ?), '.000')
                    END,
                    'Z'
                ),
                '%Y-%m-%dT%H:%i:%s.%fZ'
            )`
        );
        values.push(startDateTime, startDateTime, startDateTime);
    }

    if (endDateTime === '') {
        updates.push('endDateTime = NULL');
    } else if (endDateTime) {
        updates.push(
            `endDateTime = STR_TO_DATE(
                CONCAT(
                    CASE
                        WHEN LOCATE('.', TRIM(TRAILING 'Z' FROM ?)) > 0
                            THEN TRIM(TRAILING 'Z' FROM ?)
                        ELSE CONCAT(TRIM(TRAILING 'Z' FROM ?), '.000')
                    END,
                    'Z'
                ),
                '%Y-%m-%dT%H:%i:%s.%fZ'
            )`
        );
        values.push(endDateTime, endDateTime, endDateTime);
    }

    values.push(serviceId);

    await pool.query(
        `
        UPDATE services
        SET ${updates.join(', ')}
        WHERE id = ?
        `,
        values
    );

    const shouldRecalculateScheduleHours =
        resolvedHourRuleType !== (current.hourRuleType || 'standard') ||
        resolvedProvince !== current.province ||
        resolvedAutonomousCommunity !== current.autonomousCommunity ||
        resolvedCity !== current.city;

    if (shouldRecalculateScheduleHours) {
        const [shifts] = await pool.query(
            `
            SELECT id, scheduleDate, startTime, endTime
            FROM serviceScheduleShifts
            WHERE serviceId = ?
              AND deletedAt IS NULL
            `,
            [serviceId]
        );

        if (shifts.length) {
            const breakdowns = await calculateShiftHourBreakdowns(
                pool,
                serviceId,
                shifts
            );

            for (let index = 0; index < shifts.length; index += 1) {
                const breakdown = breakdowns[index];
                await pool.query(
                    `
                    UPDATE serviceScheduleShifts
                    SET hours = ?,
                        realHours = ?,
                        nightHours = ?,
                        holidayHours = ?,
                        regularHours = ?
                    WHERE id = ?
                    `,
                    [
                        breakdown.hours,
                        breakdown.realHours,
                        breakdown.nightHours,
                        breakdown.holidayHours,
                        breakdown.regularHours,
                        shifts[index].id,
                    ]
                );
            }
        }
    }

    const [data] = await pool.query(
        `
        SELECT s.startDateTime, s.hours, s.hourlyRate, s.numberOfPeople, s.reportEmail,
               s.locationLink, s.name, s.status, s.endDateTime, s.clientId,
               s.allowUnscheduledClockIn,
               s.clockInEarlyMinutes,
               s.scheduleView,
               s.typeOfServicesId,
               s.type,
               s.description,
               s.province,
               s.autonomousCommunity,
               s.hourRuleType,
               s.image,
               a.address, a.city, a.postCode
        FROM services s
        INNER JOIN addresses a
        ON a.id = s.addressId
        WHERE s.id = ?
        `,
        [serviceId]
    );

    return data[0];
};

export default updateServiceByIdService;
