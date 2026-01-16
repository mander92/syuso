import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
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

export const saveChatImageUtil = async (file) => {
    try {
        if (!file) {
            generateErrorUtil('Debes seleccionar una imagen', 400);
        }

        if (!file.mimetype?.startsWith('image/')) {
            generateErrorUtil('El archivo debe ser una imagen', 400);
        }

        const uploadsRoot = path.join(process.cwd(), UPLOADS_DIR);
        const chatDir = path.join(uploadsRoot, 'serviceChat');

        await ensureDir(chatDir);

        const fileName = `${uuidv4()}.jpg`;
        const finalPath = path.join(chatDir, fileName);
        const input = file.tempFilePath ? file.tempFilePath : file.data;

        if (!input) {
            generateErrorUtil('No se ha recibido la imagen', 400);
        }

        await sharp(input)
            .resize({ width: 1280, withoutEnlargement: true })
            .jpeg({ quality: 80 })
            .toFile(finalPath);

        return `serviceChat/${fileName}`;
    } catch (error) {
        generateErrorUtil('Error al guardar la imagen', 500);
    }
};
