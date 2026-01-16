import fsPromises from 'fs/promises';
import path from 'path';
import { v4 as uuid } from 'uuid';

import getPool from '../../db/getPool.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';
import { UPLOADS_DIR } from '../../../env.js';

const ensureDir = async (dirPath) => {
    try {
        await fsPromises.access(dirPath);
    } catch (error) {
        await fsPromises.mkdir(dirPath, { recursive: true });
    }
};

const saveWorkReportDraftService = async ({
    shiftRecordId,
    serviceId,
    employeeId,
    payload,
    signatureDataUrl,
    incidents,
    incidentFiles,
}) => {
    const pool = await getPool();

    const [shiftRows] = await pool.query(
        `
        SELECT id, serviceId, employeeId, clockOut
        FROM shiftRecords
        WHERE id = ?
        `,
        [shiftRecordId]
    );

    if (!shiftRows.length) generateErrorUtil('Turno no encontrado', 404);

    const shift = shiftRows[0];
    if (shift.employeeId !== employeeId) {
        generateErrorUtil('Turno invalido', 403);
    }

    if (shift.clockOut) {
        generateErrorUtil('El turno ya esta cerrado', 409);
    }

    const uploadsRoot = path.join(process.cwd(), UPLOADS_DIR);
    const signatureDir = path.join(
        uploadsRoot,
        'workReports',
        'drafts',
        'signatures'
    );
    const photoDir = path.join(
        uploadsRoot,
        'workReports',
        'drafts',
        'photos'
    );
    await ensureDir(signatureDir);
    await ensureDir(photoDir);

    let signaturePath = payload.signaturePath || null;
    if (signatureDataUrl) {
        const signatureId = uuid();
        const signatureFile = `${signatureId}.png`;
        const signatureDiskPath = path.join(signatureDir, signatureFile);
        const signatureBase64 = signatureDataUrl.replace(
            /^data:image\/png;base64,/,
            ''
        );
        await fsPromises.writeFile(
            signatureDiskPath,
            Buffer.from(signatureBase64, 'base64')
        );
        signaturePath = `workReports/drafts/signatures/${signatureFile}`;
    }

    const normalizedIncidents = Array.isArray(incidents)
        ? incidents.map((incident) => ({
              id: incident.id,
              text: incident.text || '',
              photoPaths: Array.isArray(incident.photoPaths)
                  ? [...incident.photoPaths]
                  : [],
          }))
        : [];

    const fileEntries = Object.entries(incidentFiles || {});

    for (const [fieldName, fileValue] of fileEntries) {
        if (!fieldName.startsWith('incidentPhotos_')) continue;
        const incidentId = fieldName.replace('incidentPhotos_', '');
        const incident = normalizedIncidents.find(
            (item) => String(item.id) === incidentId
        );
        if (!incident) continue;
        const files = Array.isArray(fileValue) ? fileValue : [fileValue];

        for (const file of files) {
            if (!file) continue;
            const extension =
                path.extname(file.name || '').toLowerCase() ||
                (file.mimetype === 'image/png' ? '.png' : '.jpg');
            const photoId = uuid();
            const photoFileName = `${photoId}${extension}`;
            const photoDiskPath = path.join(photoDir, photoFileName);

            if (file.tempFilePath) {
                await fsPromises.copyFile(file.tempFilePath, photoDiskPath);
            } else if (file.data) {
                await fsPromises.writeFile(photoDiskPath, file.data);
            }

            incident.photoPaths.push(
                `workReports/drafts/photos/${photoFileName}`
            );
        }
    }

    const data = {
        ...payload,
        incidents: normalizedIncidents,
    };

    const [existing] = await pool.query(
        `
        SELECT id FROM workReportDrafts WHERE shiftRecordId = ?
        `,
        [shiftRecordId]
    );

    if (existing.length) {
        await pool.query(
            `
            UPDATE workReportDrafts
            SET data = ?, signaturePath = ?, photoPaths = ?, updatedAt = CURRENT_TIMESTAMP
            WHERE shiftRecordId = ?
            `,
            [
                JSON.stringify(data),
                signaturePath,
                JSON.stringify([]),
                shiftRecordId,
            ]
        );

        return {
            id: existing[0].id,
            signaturePath,
            incidents: normalizedIncidents,
        };
    }

    const draftId = uuid();
    await pool.query(
        `
        INSERT INTO workReportDrafts (
            id,
            shiftRecordId,
            serviceId,
            employeeId,
            data,
            signaturePath,
            photoPaths
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [
            draftId,
            shiftRecordId,
            serviceId || shift.serviceId,
            employeeId,
            JSON.stringify(data),
            signaturePath,
            JSON.stringify([]),
        ]
    );

    return {
        id: draftId,
        signaturePath,
        incidents: normalizedIncidents,
    };
};

export default saveWorkReportDraftService;
