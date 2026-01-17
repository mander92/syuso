import fs from 'fs/promises';
import path from 'path';

import { UPLOADS_DIR } from '../../../env.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';

const directoriesByType = {
    workReportsPdfs: ['workReports', 'pdfs'],
    workReportsPhotos: ['workReports', 'photos'],
    workReportsReports: ['workReports', 'reports'],
    workReportsSignatures: ['workReports', 'signatures'],
    workReportsDrafts: ['workReports', 'drafts'],
    serviceChat: ['serviceChat'],
    schedules: ['services', 'schedules'],
    documents: ['documents'],
    cv: ['cv'],
};

const walkAndDelete = async (rootPath, beforeDate) => {
    let deletedCount = 0;
    let deletedBytes = 0;

    const entries = await fs.readdir(rootPath, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(rootPath, entry.name);
        if (entry.isDirectory()) {
            const child = await walkAndDelete(fullPath, beforeDate);
            deletedCount += child.deletedCount;
            deletedBytes += child.deletedBytes;
            continue;
        }

        const stats = await fs.stat(fullPath);
        if (stats.mtime < beforeDate) {
            await fs.unlink(fullPath);
            deletedCount += 1;
            deletedBytes += stats.size;
        }
    }

    return { deletedCount, deletedBytes };
};

const cleanupUploadsController = async (req, res, next) => {
    try {
        const { type, beforeDate } = req.body || {};
        if (!type || !beforeDate) {
            generateErrorUtil('Debes indicar tipo y fecha', 400);
        }

        const types = Array.isArray(type) ? type : [type];
        const parsedDate = new Date(beforeDate);
        if (Number.isNaN(parsedDate.getTime())) {
            generateErrorUtil('Fecha invalida', 400);
        }

        const basePath = path.join(process.cwd(), UPLOADS_DIR);
        let totalDeleted = 0;
        let totalBytes = 0;
        const results = [];

        for (const entry of types) {
            const relative = directoriesByType[entry];
            if (!relative) {
                generateErrorUtil('Tipo no soportado', 400);
            }
            const targetDir = path.join(basePath, ...relative);
            try {
                await fs.access(targetDir);
            } catch (error) {
                results.push({ type: entry, deleted: 0, bytes: 0 });
                continue;
            }

            const { deletedCount, deletedBytes } = await walkAndDelete(
                targetDir,
                parsedDate
            );
            totalDeleted += deletedCount;
            totalBytes += deletedBytes;
            results.push({
                type: entry,
                deleted: deletedCount,
                bytes: deletedBytes,
            });
        }

        res.send({
            status: 'ok',
            data: {
                deleted: totalDeleted,
                bytes: totalBytes,
                results,
            },
        });
    } catch (error) {
        next(error);
    }
};

export default cleanupUploadsController;
