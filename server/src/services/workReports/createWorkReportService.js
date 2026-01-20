import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import { v4 as uuid } from 'uuid';
import PDFDocument from 'pdfkit';
import sharp from 'sharp';

import getPool from '../../db/getPool.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';
import sendMail from '../../utils/sendBrevoMail.js';
import { UPLOADS_DIR } from '../../../env.js';
import { formatDateTimeMadrid } from '../../utils/dateTimeMadrid.js';

const ensureDir = async (dirPath) => {
    try {
        await fsPromises.access(dirPath);
    } catch (error) {
        await fsPromises.mkdir(dirPath, { recursive: true });
    }
};

const deleteIfExists = async (filePath) => {
    if (!filePath) return;
    try {
        await fsPromises.unlink(filePath);
    } catch (error) {
        // ignore missing files
    }
};

const escapeXml = (value) =>
    String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

const normalizeDate = (value) => {
    if (!value) return null;
    if (value.includes('T')) return value.split('T')[0];
    return value;
};

const normalizeDateTime = (value) => {
    if (!value) return null;
    if (value.includes('T')) {
        const parts = value.split('T');
        const time = parts[1] || '';
        const normalizedTime = time.length === 5 ? `${time}:00` : time;
        return `${parts[0]} ${normalizedTime}`;
    }
    return value;
};

const buildReportSvg = (payload, signatureDataUrl) => {
    const width = 1240;
    const height = 1754;
    const lines = [
        `Numero de parte: ${payload.folio}`,
        `Fecha del reporte: ${payload.reportDate}`,
        `Hora inicio incidente: ${payload.incidentStart}`,
        `Hora fin incidente: ${payload.incidentEnd}`,
        `Lugar: ${payload.location}`,
        `Vigilante: ${payload.guardFullName}`,
        `Numero empleado: ${payload.guardEmployeeNumber}`,
        `Empresa de seguridad: ${payload.securityCompany}`,
        `Tipo incidencia: ${payload.incidentType}`,
        `Gravedad: ${payload.severity}`,
        `Descripcion: ${payload.description}`,
        `Deteccion: ${payload.detection}`,
        `Acciones: ${payload.actionsTaken}`,
        `Resultado: ${payload.outcome}`,
    ];

    let y = 120;
    const lineHeight = 48;
    const textBlocks = lines
        .map((line) => {
            const text = escapeXml(line);
            const block = `<text x="80" y="${y}" font-size="28" fill="#111">${text}</text>`;
            y += lineHeight;
            return block;
        })
        .join('');

    const signatureBlock = signatureDataUrl
        ? `<image x="80" y="${y + 40}" width="420" height="160" href="${signatureDataUrl}" />`
        : '';

    return `
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#ffffff" />
            <text x="80" y="70" font-size="36" fill="#0f172a">Parte de trabajo</text>
            ${textBlocks}
            <text x="80" y="${y + 30}" font-size="24" fill="#111">Firma:</text>
            ${signatureBlock}
        </svg>
    `;
};

const createPdfFromPng = async (pngPath, pdfPath) => {
    await new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: 'A4', margin: 0 });
        const stream = fs.createWriteStream(pdfPath);
        doc.pipe(stream);
        doc.image(pngPath, 0, 0, { fit: [595, 842] });
        doc.end();
        stream.on('finish', resolve);
        stream.on('error', reject);
    });
};

const createPdfWithIncidents = async (
    pdfPath,
    reportData,
    incidents,
    logoPath,
    signatureSource,
    tagLogs
) => {
    await new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: 'A4', margin: 40 });
        const stream = fs.createWriteStream(pdfPath);
        doc.pipe(stream);

        const sanitizeText = (value) =>
            String(value || '')
                .replace(/\u00d0/g, '')
                .replace(/\r/g, '')
                .trim();

        if (logoPath) {
            try {
                doc.image(logoPath, doc.page.margins.left, 30, {
                    fit: [140, 50],
                });
            } catch (error) {
                // ignore missing logo
            }
        }

        doc.moveDown(3.0);
        doc.fontSize(22).text('Parte de trabajo', { align: 'left' });
        doc.moveDown(0.6);

        doc.fontSize(12).fillColor('#111827');
        doc.text(`Numero de parte: ${sanitizeText(reportData.folio)}`);
        const formatDate = (value) => {
            const dateText = sanitizeText(value);
            if (!dateText) return '';
            if (dateText.includes('T')) return dateText.split('T')[0].split('-').reverse().join('-');
            if (dateText.includes(' ')) return dateText.split(' ')[0].split('-').reverse().join('-');
            if (dateText.includes('-')) return dateText.split('-').reverse().join('-');
            return dateText;
        };

        const formatDateTime = (value) => {
            const dateText = sanitizeText(value);
            if (!dateText) return '';
            if (dateText.includes('T')) {
                const [datePart, timePart] = dateText.split('T');
                return `${datePart.split('-').reverse().join('-')} ${timePart}`;
            }
            if (dateText.includes(' ')) {
                const [datePart, timePart] = dateText.split(' ');
                return `${datePart.split('-').reverse().join('-')} ${timePart}`;
            }
            if (dateText.includes('-')) {
                return dateText.split('-').reverse().join('-');
            }
            return dateText;
        };

        doc.text(`Fecha del reporte: ${formatDate(reportData.reportDate)}`);
        doc.text(`Hora inicio: ${formatDateTime(reportData.incidentStart)}`);
        doc.text(`Hora fin: ${formatDateTime(reportData.incidentEnd)}`);
        doc.text(`Lugar: ${sanitizeText(reportData.location)}`);
        doc.text(`Vigilante: ${sanitizeText(reportData.guardFullName)}`);
        doc.text(`TIP: ${sanitizeText(reportData.guardEmployeeNumber)}`);
        doc.text(`Empresa: ${sanitizeText(reportData.securityCompany)}`);

        doc.moveDown(0.6);
        doc.fontSize(13).text('Informe');
        doc.moveDown(0.2);
        doc.fontSize(12).text(sanitizeText(reportData.description), {
            width:
                doc.page.width -
                doc.page.margins.left -
                doc.page.margins.right,
        });

        if (incidents?.length) {
            doc.moveDown(0.8);
            doc.fontSize(14).text('Incidencias');
            doc.moveDown(0.4);
            doc.fontSize(12);

            const pageWidth =
                doc.page.width -
                doc.page.margins.left -
                doc.page.margins.right;
            const imageGap = 12;
            const imageWidth = (pageWidth - imageGap) / 2;
            const imageHeight = 120;

            incidents.forEach((incident, index) => {
                doc.text(
                    `Incidencia ${index + 1}: ${sanitizeText(incident.text)}`
                );
                doc.moveDown(0.3);

                const photos = incident.photos || [];
                for (let i = 0; i < photos.length; i += 2) {
                    if (
                        doc.y + imageHeight >
                        doc.page.height - doc.page.margins.bottom
                    ) {
                        doc.addPage();
                    }

                    const xLeft = doc.page.margins.left;
                    const xRight = xLeft + imageWidth + imageGap;
                    const y = doc.y;
                    const leftPath = photos[i];
                    const rightPath = photos[i + 1];

                    if (leftPath) {
                        try {
                            doc.image(leftPath, xLeft, y, {
                                width: imageWidth,
                                height: imageHeight,
                            });
                        } catch (error) {
                            // ignore missing image
                        }
                    }

                    if (rightPath) {
                        try {
                            doc.image(rightPath, xRight, y, {
                                width: imageWidth,
                                height: imageHeight,
                            });
                        } catch (error) {
                            // ignore missing image
                        }
                    }

                    doc.moveDown(0.1);
                    doc.y = y + imageHeight + 8;
                }

                doc.moveDown(0.6);
            });
        }

        if (tagLogs?.length) {
            doc.moveDown(0.6);
            doc.fontSize(14).text('Lecturas NFC');
            doc.moveDown(0.3);
            doc.fontSize(12);

            tagLogs.forEach((log) => {
                const when = formatDateTimeMadrid(log.scannedAt);
                const coords =
                    log.latitude != null && log.longitude != null
                        ? ` (${log.latitude}, ${log.longitude})`
                        : '';
                doc.text(
                    `${when} - ${sanitizeText(log.tagName)}${coords}`
                );
            });
        }

        if (signatureSource) {
            const signatureWidth = 140;
            const signatureHeight = 60;
            const signatureX =
                doc.page.width - doc.page.margins.right - signatureWidth;
            const signatureY =
                doc.page.height - doc.page.margins.bottom - signatureHeight;

            if (doc.y + signatureHeight > signatureY) {
                doc.addPage();
            }

            doc.fontSize(11).text('Firma', signatureX, signatureY - 16, {
                width: signatureWidth,
                align: 'right',
            });

            try {
                doc.image(signatureSource, signatureX, signatureY, {
                    fit: [signatureWidth, signatureHeight],
                });
            } catch (error) {
                // ignore missing signature
            }
        }

        doc.end();
        stream.on('finish', resolve);
        stream.on('error', reject);
    });
};

const createWorkReportService = async ({
    shiftRecordId,
    serviceId,
    employeeId,
    reportEmail,
    locationCoords,
    incidents,
    incidentFiles,
    reportData,
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
    if (shift.employeeId !== employeeId || shift.serviceId !== serviceId) {
        generateErrorUtil('Turno invalido', 403);
    }

    if (shift.clockOut) {
        generateErrorUtil('El turno ya esta cerrado', 409);
    }

    const [draftRows] = await pool.query(
        `
        SELECT signaturePath, data
        FROM workReportDrafts
        WHERE shiftRecordId = ?
        `,
        [shiftRecordId]
    );

    const [serviceRows] = await pool.query(
        `
        SELECT reportEmail FROM services WHERE id = ?
        `,
        [serviceId]
    );

    const finalReportEmail =
        reportEmail || serviceRows?.[0]?.reportEmail || null;

    const uploadsRoot = path.join(process.cwd(), UPLOADS_DIR);
    const signatureDir = path.join(uploadsRoot, 'workReports', 'signatures');
    const reportDir = path.join(uploadsRoot, 'workReports', 'reports');
    const pdfDir = path.join(uploadsRoot, 'workReports', 'pdfs');
    const photoDir = path.join(uploadsRoot, 'workReports', 'photos');
    await ensureDir(signatureDir);
    await ensureDir(reportDir);
    await ensureDir(pdfDir);
    await ensureDir(photoDir);

    const signatureId = uuid();
    const reportId = uuid();
    const signaturePath = path.join(signatureDir, `${signatureId}.png`);
    const reportImagePath = path.join(reportDir, `${reportId}.png`);
    const reportPdfPath = path.join(pdfDir, `${reportId}.pdf`);

    const signatureBase64 = reportData.signature.replace(
        /^data:image\/png;base64,/, ''
    );

    if (!signatureBase64 || signatureBase64.length < 50) {
        generateErrorUtil('Firma invalida', 400);
    }
    const signatureBuffer = Buffer.from(signatureBase64, 'base64');
    const signatureImage = await sharp(signatureBuffer)
        .flatten({ background: '#ffffff' })
        .png()
        .toBuffer();
    await fsPromises.writeFile(signaturePath, signatureImage);
    const keepAssets = process.env.WORKREPORT_KEEP_ASSETS === '1';
    if (keepAssets) {
        console.log(
            `[workReports] signature bytes: ${signatureImage.length}`
        );
    }

    const normalizedReportDate = normalizeDate(reportData.reportDate);
    const normalizedIncidentStart = normalizeDateTime(reportData.incidentStart);
    const normalizedIncidentEnd = normalizeDateTime(reportData.incidentEnd);
    const latitudeOut = Array.isArray(locationCoords)
        ? locationCoords[0]
        : null;
    const longitudeOut = Array.isArray(locationCoords)
        ? locationCoords[1]
        : null;

    await pool.query(
        `
        UPDATE shiftRecords
        SET clockIn = ?, clockOut = ?, latitudeOut = ?, longitudeOut = ?
        WHERE id = ?
        `,
        [
            normalizedIncidentStart,
            normalizedIncidentEnd,
            latitudeOut,
            longitudeOut,
            shiftRecordId,
        ]
    );

    const svgPayload = {
        ...reportData,
        reportDate: normalizedReportDate,
        incidentStart: normalizedIncidentStart,
        incidentEnd: normalizedIncidentEnd,
    };

    const svg = buildReportSvg(svgPayload, reportData.signature);
    await sharp(Buffer.from(svg)).png().toFile(reportImagePath);

    await pool.query(
        `
        INSERT INTO workReports (
            id,
            shiftRecordId,
            serviceId,
            folio,
            reportDate,
            incidentStart,
            incidentEnd,
            location,
            guardFullName,
            guardEmployeeNumber,
            guardShift,
            securityCompany,
            incidentType,
            severity,
            description,
            detection,
            actionsTaken,
            outcome,
            signaturePath,
            reportImagePath
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
            reportId,
            shiftRecordId,
            serviceId,
            reportData.folio,
            normalizedReportDate,
            normalizedIncidentStart,
            normalizedIncidentEnd,
            reportData.location,
            reportData.guardFullName,
            reportData.guardEmployeeNumber,
            reportData.guardShift,
            reportData.securityCompany,
            reportData.incidentType,
            reportData.severity,
            reportData.description,
            reportData.detection,
            reportData.actionsTaken,
            reportData.outcome,
            keepAssets ? `workReports/signatures/${signatureId}.png` : '',
            keepAssets ? `workReports/reports/${reportId}.png` : '',
        ]
    );

    const normalizedIncidents = Array.isArray(incidents)
        ? incidents.map((incident) => ({
              id: incident.id,
              text: incident.text || '',
              photoPaths: Array.isArray(incident.photoPaths)
                  ? [...incident.photoPaths]
                  : [],
          }))
        : [];
    let incidentPhotoFiles = [];
    const [tagLogs] = await pool.query(
        `
        SELECT tagName, tagUid, latitude, longitude, scannedAt
        FROM serviceNfcTagLogs
        WHERE shiftRecordId = ?
        ORDER BY scannedAt ASC
        `,
        [shiftRecordId]
    );

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
            const photoPath = path.join(photoDir, photoFileName);

            if (file.tempFilePath) {
                await fsPromises.copyFile(file.tempFilePath, photoPath);
            } else if (file.data) {
                await fsPromises.writeFile(photoPath, file.data);
            }

            incident.photoPaths.push(`workReports/photos/${photoFileName}`);
        }
    }

    if (normalizedIncidents.length) {
        incidentPhotoFiles = normalizedIncidents.map(() => []);

        for (let index = 0; index < normalizedIncidents.length; index += 1) {
            const incident = normalizedIncidents[index];
            const paths = incident.photoPaths || [];

            for (const photoPath of paths) {
                if (!photoPath) continue;
                if (photoPath.includes('workReports/drafts/photos/')) {
                    const sourcePath = path.join(uploadsRoot, photoPath);
                    const extension = path.extname(photoPath) || '.jpg';
                    const photoId = uuid();
                    const photoFileName = `${photoId}${extension}`;
                    const finalPath = path.join(photoDir, photoFileName);
                    try {
                        await fsPromises.copyFile(sourcePath, finalPath);
                        incidentPhotoFiles[index].push(finalPath);
                    } catch (error) {
                        // ignore missing draft file
                    }
                } else {
                    incidentPhotoFiles[index].push(
                        path.join(uploadsRoot, photoPath)
                    );
                }
            }
        }

        const incidentsForPdf = normalizedIncidents
            .map((incident, index) => ({
                text: incident.text || 'Sin descripcion',
                photos: incidentPhotoFiles[index] || [],
            }))
            .filter(
                (incident) =>
                    incident.text.trim() || incident.photos.length
            );

        const logoPath =
            process.env.SYUSO_LOGO_PATH ||
            'C:\\Users\\Mario\\OneDrive\\Escritorio\\SYUSO_app\\client\\src\\assets\\syusoLogo.jpg';

        await createPdfWithIncidents(
            reportPdfPath,
            svgPayload,
            incidentsForPdf,
            logoPath,
            signatureImage,
            tagLogs
        );
    } else if (tagLogs.length) {
        const logoPath =
            process.env.SYUSO_LOGO_PATH ||
            'C:\\Users\\Mario\\OneDrive\\Escritorio\\SYUSO_app\\client\\src\\assets\\syusoLogo.jpg';

        await createPdfWithIncidents(
            reportPdfPath,
            svgPayload,
            [],
            logoPath,
            signatureImage,
            tagLogs
        );
    } else {
        const logoPath =
            process.env.SYUSO_LOGO_PATH ||
            'C:\\Users\\Mario\\OneDrive\\Escritorio\\SYUSO_app\\client\\src\\assets\\syusoLogo.jpg';

        await createPdfWithIncidents(
            reportPdfPath,
            svgPayload,
            [],
            logoPath,
            signatureImage,
            []
        );
    }

    await pool.query(
        `
        DELETE FROM workReportDrafts WHERE shiftRecordId = ?
        `,
        [shiftRecordId]
    );

    const subject = `Parte de trabajo - ${reportData.folio}`;
    const html = `
        <html>
            <body>
                <p>Parte de trabajo generado para el servicio ${serviceId}.</p>
                <p>Folio: ${escapeXml(reportData.folio)}</p>
            </body>
        </html>
    `;

    const parseRecipients = (value) => {
        if (!value) return [];
        return value
            .split(/[,;\s]+/)
            .map((item) => item.trim())
            .filter((item) => item.length > 3)
            .filter((item, index, list) => list.indexOf(item) === index)
            .filter((item) => /.+@.+\..+/.test(item));
    };

    const recipients = parseRecipients(finalReportEmail);

    if (recipients.length) {
        for (const recipient of recipients) {
            await sendMail('Reporte', recipient, subject, html, [
                { path: reportPdfPath },
            ]);
        }
    }

    await pool.query(
        `
        UPDATE serviceNfcTagLogs
        SET workReportId = ?
        WHERE shiftRecordId = ?
        `,
        [reportId, shiftRecordId]
    );

    if (!keepAssets) {
        await deleteIfExists(signaturePath);
        await deleteIfExists(reportImagePath);
    }

    for (const files of incidentPhotoFiles) {
        for (const filePath of files) {
            await deleteIfExists(filePath);
        }
    }

    if (draftRows.length) {
        const draft = draftRows[0];
        const draftSignaturePath = draft.signaturePath
            ? path.join(uploadsRoot, draft.signaturePath)
            : null;
        await deleteIfExists(draftSignaturePath);
        try {
            const draftData = draft.data ? JSON.parse(draft.data) : null;
            const draftIncidents = Array.isArray(draftData?.incidents)
                ? draftData.incidents
                : [];
            const draftPhotos = draftIncidents.flatMap(
                (incident) => incident.photoPaths || []
            );
            for (const relPath of draftPhotos) {
                const fullPath = path.join(uploadsRoot, relPath);
                await deleteIfExists(fullPath);
            }
        } catch (error) {
            // ignore malformed draft data
        }
    }

    return {
        id: reportId,
        reportPdfPath: `workReports/pdfs/${reportId}.pdf`,
    };
};

export default createWorkReportService;
