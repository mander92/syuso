import getPool from '../../db/getPool.js';

const updateServiceScheduleImageService = async (serviceId, scheduleImage) => {
    const pool = await getPool();

    await pool.query(
        `
        UPDATE services
        SET scheduleImage = ?
        WHERE id = ?
        `,
        [scheduleImage, serviceId]
    );
};

export default updateServiceScheduleImageService;
