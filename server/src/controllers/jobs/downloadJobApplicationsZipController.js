import fs from 'fs';
import path from 'path';
import archiver from 'archiver';

import { UPLOADS_DIR } from '../../../env.js';
import listJobApplicationsService from '../../services/jobs/listJobApplicationsService.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';

const downloadJobApplicationsZipController = async (req, res, next) => {
    try {
        const { search, startDate, endDate } = req.query;

        const data = await listJobApplicationsService(
            search?.trim(),
            startDate,
            endDate
        );

        if (!data?.length) {
            generateErrorUtil('No hay CVs para descargar', 404);
        }

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

        const uploadsRoot = path.join(process.cwd(), UPLOADS_DIR);
        const usedNames = new Set();
        const files = data
            .map((item) => {
                if (!item?.cvFile) return null;
                const extension = path.extname(item.cvFile) || '';
                const namePart = slugify(item.fullName || 'cv');
                const datePart = formatDate(item.createdAt) || 'cv';
                let fileName = `${datePart}_${namePart || 'cv'}${extension}`;
                if (usedNames.has(fileName)) {
                    fileName = `${datePart}_${namePart || 'cv'}_${item.id?.slice(
                        0,
                        6
                    )}${extension}`;
                }
                usedNames.add(fileName);
                return {
                    fileName,
                    filePath: path.join(uploadsRoot, item.cvFile),
                };
            })
            .filter(
                (item) => item?.filePath && fs.existsSync(item.filePath)
            );

        if (!files.length) {
            generateErrorUtil('No se encontraron CVs', 404);
        }

        const zipName = `cvs_${Date.now()}.zip`;
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="${zipName}"`
        );

        const archive = archiver('zip', { zlib: { level: 9 } });
        archive.on('error', (error) => next(error));
        archive.pipe(res);

        files.forEach((item) => {
            archive.file(item.filePath, { name: item.fileName });
        });

        archive.finalize();
    } catch (error) {
        next(error);
    }
};

export default downloadJobApplicationsZipController;
