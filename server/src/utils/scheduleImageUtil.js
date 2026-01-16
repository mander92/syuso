import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

import { UPLOADS_DIR } from '../../env.js';
import generateErrorUtil from './generateErrorUtil.js';

const ensureDir = async (dir) => {
    try {
        await fs.access(dir);
    } catch (error) {
        await fs.mkdir(dir, { recursive: true });
    }
};

export const saveScheduleImageUtil = async (file) => {
    try {
        if (!file) {
            generateErrorUtil('Debes seleccionar una imagen', 400);
        }

        if (file.mimetype !== 'image/png') {
            generateErrorUtil('El cuadrante debe ser PNG', 400);
        }

        const uploadsRoot = path.join(process.cwd(), UPLOADS_DIR);
        const scheduleDir = path.join(uploadsRoot, 'services', 'schedules');

        await ensureDir(scheduleDir);

        const fileName = `${uuidv4()}.png`;
        const finalPath = path.join(scheduleDir, fileName);

        if (file.tempFilePath) {
            await fs.copyFile(file.tempFilePath, finalPath);
        } else if (file.data) {
            await fs.writeFile(finalPath, file.data);
        } else {
            generateErrorUtil('No se ha recibido la imagen', 400);
        }

        return `services/schedules/${fileName}`;
    } catch (error) {
        generateErrorUtil('Error al guardar el cuadrante', 500);
    }
};

export const deleteScheduleImageUtil = async (relativePath) => {
    try {
        if (!relativePath) return;

        const imagePath = path.join(process.cwd(), UPLOADS_DIR, relativePath);

        try {
            await fs.access(imagePath);
        } catch (error) {
            return;
        }

        await fs.unlink(imagePath);
    } catch (error) {
        generateErrorUtil('Error al eliminar el cuadrante', 500);
    }
};
