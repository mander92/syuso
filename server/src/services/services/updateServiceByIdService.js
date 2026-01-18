import getPool from '../../db/getPool.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';

const updateServiceByIdService = async (
    serviceId,
    address,
    postCode,
    city,
    comments,
    startDateTime,
    hours,
    numberOfPeople,
    reportEmail,
    role
) => {
    const pool = await getPool();

    const [serviceInfo] = await pool.query(
        `
        SELECT s.id, s.status, s.startDateTime, s.hours, s.numberOfPeople, s.comments,
               s.reportEmail,
               s.addressId, s.typeOfServicesId,
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

    const resolvedHours =
        hours !== undefined && hours !== null && hours !== ''
            ? Number(hours)
            : Number(current.hours);
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

    await pool.query(
        `
        UPDATE addresses SET address = ?, postCode = ?, city = ?
        WHERE id = ?
        `,
        [resolvedAddress, resolvedPostCode, resolvedCity, current.addressId]
    );

    const updates = [
        'comments = ?',
        'hours = ?',
        'numberOfPeople = ?',
        'reportEmail = ?',
    ];
    const values = [
        resolvedComments,
        resolvedHours,
        resolvedNumberOfPeople,
        resolvedReportEmail,
    ];

    if (startDateTime && startDateTime !== '') {
        updates.push("startDateTime = STR_TO_DATE(?, '%Y-%m-%dT%H:%i:%sZ')");
        values.push(startDateTime);
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

    const [data] = await pool.query(
        `
        SELECT s.startDateTime, s.hours, s.numberOfPeople, s.reportEmail,
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
