import fsPromises from 'fs/promises';
import path from 'path';

import { UPLOADS_DIR } from '../../../env.js';
import getPool from '../../db/getPool.js';
import selectShiftRecordsService from '../../services/shiftRecords/selectShiftRecordsService.js';
import selectAdminDelegationNamesService from '../../services/delegations/selectAdminDelegationNamesService.js';
import selectDelegationByIdService from '../../services/delegations/selectDelegationByIdService.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';

const normalizeText = (value) =>
    String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();

const deleteIfExists = async (filePath) => {
    if (!filePath) return;
    try {
        await fsPromises.unlink(filePath);
    } catch (error) {
        // ignore missing files
    }
};

const deleteWorkReportsController = async (req, res, next) => {
    try {
        const {
            typeOfService,
            employeeId,
            city,
            serviceId,
            serviceName,
            startDate,
            endDate,
            delegationId,
            personSearch,
        } = req.query;

        const { id: userId, role } = req.userLogged;
        let allowedDelegations = [];

        if (role === 'admin') {
            allowedDelegations = await selectAdminDelegationNamesService(
                userId
            );
        }

        if (delegationId) {
            const delegation = await selectDelegationByIdService(delegationId);
            if (delegation) {
                allowedDelegations = allowedDelegations.length
                    ? allowedDelegations.filter(
                          (name) => name === delegation.name
                      )
                    : [delegation.name];
            }
        }

        if (role === 'admin' && !allowedDelegations.length) {
            generateErrorUtil(
                'No hay partes de trabajo para eliminar',
                404
            );
        }

        const data = await selectShiftRecordsService(
            typeOfService,
            employeeId,
            city,
            serviceId,
            serviceName,
            startDate,
            endDate,
            false,
            allowedDelegations
        );

        const searchText = normalizeText(personSearch);
        const filteredDetails = searchText
            ? (data?.details || []).filter((record) => {
                  const fullName = normalizeText(
                      `${record.firstName} ${record.lastName}`
                  );
                  return fullName.includes(searchText);
              })
            : data?.details || [];

        const reportIds = [
            ...new Set(
                filteredDetails
                    .map((record) => record.reportId)
                    .filter(Boolean)
            ),
        ];

        if (!reportIds.length) {
            generateErrorUtil(
                'No hay partes de trabajo para eliminar',
                404
            );
        }

        const pool = await getPool();
        const placeholders = reportIds.map(() => '?').join(', ');

        const [incidentPhotoRows] = await pool.query(
            `
            SELECT wp.photoPath
            FROM workReportIncidentPhotos wp
            INNER JOIN workReportIncidents wi ON wi.id = wp.workReportIncidentId
            WHERE wi.workReportId IN (${placeholders})
            `,
            reportIds
        );

        const [reportPhotoRows] = await pool.query(
            `
            SELECT photoPath
            FROM workReportPhotos
            WHERE workReportId IN (${placeholders})
            `,
            reportIds
        );

        const [reportRows] = await pool.query(
            `
            SELECT signaturePath, reportImagePath
            FROM workReports
            WHERE id IN (${placeholders})
            `,
            reportIds
        );

        await pool.query(
            `
            DELETE wp
            FROM workReportIncidentPhotos wp
            INNER JOIN workReportIncidents wi ON wi.id = wp.workReportIncidentId
            WHERE wi.workReportId IN (${placeholders})
            `,
            reportIds
        );

        await pool.query(
            `
            DELETE FROM workReportIncidents
            WHERE workReportId IN (${placeholders})
            `,
            reportIds
        );

        await pool.query(
            `
            DELETE FROM workReportPhotos
            WHERE workReportId IN (${placeholders})
            `,
            reportIds
        );

        await pool.query(
            `
            DELETE FROM workReports
            WHERE id IN (${placeholders})
            `,
            reportIds
        );

        const uploadsRoot = path.join(process.cwd(), UPLOADS_DIR);
        const pdfDir = path.join(uploadsRoot, 'workReports', 'pdfs');

        for (const reportId of reportIds) {
            const pdfPath = path.join(pdfDir, `${reportId}.pdf`);
            await deleteIfExists(pdfPath);
        }

        const extraFiles = [
            ...incidentPhotoRows.map((row) => row.photoPath),
            ...reportPhotoRows.map((row) => row.photoPath),
            ...reportRows.map((row) => row.signaturePath),
            ...reportRows.map((row) => row.reportImagePath),
        ];

        for (const relPath of extraFiles) {
            if (!relPath) continue;
            const fullPath = path.join(uploadsRoot, relPath);
            await deleteIfExists(fullPath);
        }

        res.send({ status: 'ok', deleted: reportIds.length });
    } catch (error) {
        next(error);
    }
};

export default deleteWorkReportsController;
