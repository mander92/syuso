import getPool from '../../db/getPool.js';
import selectServiceByEmployeeIdService from '../services/selectServiceByEmployeeIdService.js';
import selectServiceService from '../services/selectServiceService.js';
import selectAdminDelegationNamesService from '../delegations/selectAdminDelegationNamesService.js';

const listServiceChatUnreadCountsService = async (userId, role) => {
    const pool = await getPool();

    let services = [];
    if (role === 'employee') {
        services = await selectServiceByEmployeeIdService('', '', userId);
    } else if (role === 'admin' || role === 'sudo') {
        let allowedDelegations = [];
        if (role === 'admin') {
            allowedDelegations = await selectAdminDelegationNamesService(userId);
            if (!allowedDelegations.length) {
                return { counts: {}, total: 0 };
            }
        }
        services = await selectServiceService('', '', allowedDelegations);
    } else {
        return { counts: {}, total: 0 };
    }

    const serviceIds = [
        ...new Set(
            services
                .map((service) => service.serviceId || service.id)
                .filter(Boolean)
        ),
    ];

    if (!serviceIds.length) {
        return { counts: {}, total: 0 };
    }

    const placeholders = serviceIds.map(() => '?').join(', ');

    const [rows] = await pool.query(
        `
        SELECT
            s.id AS serviceId,
            COUNT(m.id) AS unreadCount
        FROM services s
        LEFT JOIN serviceChatReads r
            ON r.serviceId = s.id AND r.userId = ?
        LEFT JOIN serviceChatMessages m
            ON m.serviceId = s.id
            AND m.userId <> ?
            AND m.createdAt > COALESCE(r.lastReadAt, '1970-01-01')
        WHERE s.id IN (${placeholders})
        GROUP BY s.id
        `,
        [userId, userId, ...serviceIds]
    );

    const counts = {};
    let total = 0;
    rows.forEach((row) => {
        const count = Number(row.unreadCount) || 0;
        counts[row.serviceId] = count;
        total += count;
    });

    return { counts, total };
};

export default listServiceChatUnreadCountsService;
