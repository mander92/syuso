import fs from 'fs';
import path from 'path';

import getPool from '../../db/getPool.js';
import { UPLOADS_DIR } from '../../../env.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';

const slugify = (value) =>
    String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .toLowerCase();

const formatDate = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${day}-${month}-${year}`;
};

const downloadWorkReportPdfController = async (req, res, next) => {
    try {
        const { reportId } = req.params;
        const pool = await getPool();

        const [rows] = await pool.query(
            `
            SELECT wr.id, wr.reportDate, se.name AS serviceName, t.type
            FROM workReports wr
            INNER JOIN services se ON se.id = wr.serviceId
            INNER JOIN typeOfServices t ON t.id = se.typeOfServicesId
            WHERE wr.id = ?
            `,
            [reportId]
        );

        if (!rows.length) {
            generateErrorUtil('Parte no encontrado', 404);
        }

        const report = rows[0];
        const datePart = formatDate(report.reportDate) || 'reporte';
        const servicePart = slugify(report.serviceName || report.type || 'servicio');
        const fileName = `${datePart}_${servicePart || 'servicio'}.pdf`;

        const pdfPath = path.join(
            process.cwd(),
            UPLOADS_DIR,
            'workReports',
            'pdfs',
            `${reportId}.pdf`
        );

        if (!fs.existsSync(pdfPath)) {
            generateErrorUtil('PDF no encontrado', 404);
        }

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
            'Content-Disposition',
            `inline; filename="${fileName}"`
        );
        res.sendFile(pdfPath);
    } catch (error) {
        next(error);
    }
};

export default downloadWorkReportPdfController;
