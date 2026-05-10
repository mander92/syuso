import { v4 as uuid } from 'uuid';
import getPool from '../../db/getPool.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';
import recalculateAgreementScheduleShiftsService from '../../services/schedules/recalculateAgreementScheduleShiftsService.js';

const VALID_SCOPES = new Set(['national', 'autonomous', 'local']);

const createHolidayController = async (req, res, next) => {
    try {
        const {
            holidayDate,
            name,
            scope,
            autonomousCommunity = null,
            province = null,
            city = null,
        } = req.body;

        if (!holidayDate || !name || !VALID_SCOPES.has(scope)) {
            generateErrorUtil('Fecha, nombre y alcance de festivo requeridos', 400);
        }

        const pool = await getPool();
        const id = uuid();
        const [existing] = await pool.query(
            `
            SELECT id
            FROM holidays
            WHERE deletedAt IS NULL
              AND holidayDate = ?
              AND scope = ?
              AND COALESCE(autonomousCommunity, '') = COALESCE(?, '')
              AND COALESCE(province, '') = COALESCE(?, '')
              AND COALESCE(city, '') = COALESCE(?, '')
            LIMIT 1
            `,
            [
                holidayDate,
                scope,
                autonomousCommunity || null,
                province || null,
                city || null,
            ]
        );

        if (existing.length) {
            generateErrorUtil('Este festivo ya existe en el calendario', 409);
        }

        await pool.query(
            `
            INSERT INTO holidays
                (id, holidayDate, name, scope, autonomousCommunity, province, city)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            `,
            [
                id,
                holidayDate,
                String(name).trim(),
                scope,
                autonomousCommunity || null,
                province || null,
                city || null,
            ]
        );

        await recalculateAgreementScheduleShiftsService(pool, {
            fromDate: holidayDate,
            toDate: holidayDate,
        });

        res.status(201).send({
            status: 'ok',
            data: {
                id,
                holidayDate,
                name,
                scope,
                autonomousCommunity,
                province,
                city,
            },
        });
    } catch (error) {
        next(error);
    }
};

export default createHolidayController;
