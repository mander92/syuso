import createEmployeeAbsenceService from '../../services/schedules/createEmployeeAbsenceService.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';

const createEmployeeAbsenceController = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const { startDate, endDate, type, notes } = req.body;
        const { id: createdBy } = req.userLogged;

        const normalizeAbsenceType = (value) => {
            if (!value) return value;
            const normalized = String(value).trim().toLowerCase();
            const map = {
                free: 'off',
                libre: 'off',
                off: 'off',
                vacation: 'vacation',
                vacaciones: 'vacation',
                vacacion: 'vacation',
                sick: 'sick',
                baja: 'sick',
                available: 'available',
                disponible: 'available',
            };
            return map[normalized] || value;
        };

        const normalizedType = normalizeAbsenceType(type);

        if (!startDate || !endDate || !normalizedType) {
            generateErrorUtil('Datos de ausencia incompletos', 400);
        }

        const data = await createEmployeeAbsenceService(
            userId,
            startDate,
            endDate,
            normalizedType,
            notes,
            createdBy
        );

        res.send({
            status: 'ok',
            data,
        });
    } catch (error) {
        next(error);
    }
};

export default createEmployeeAbsenceController;
