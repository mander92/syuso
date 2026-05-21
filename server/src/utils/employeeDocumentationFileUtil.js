import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

import generateErrorUtil from './generateErrorUtil.js';

const DOCUMENTS_ROOT = path.join(process.cwd(), 'private_uploads');

export const allowedDocumentationFileFields = new Set([
    'dniFrontPath',
    'dniBackPath',
    'tipFrontPath',
    'tipBackPath',
]);

const ensureDir = async (dir) => {
    await fs.mkdir(dir, { recursive: true });
};

export const saveEmployeeDocumentationFile = async (file, userId, field) => {
    if (!allowedDocumentationFileFields.has(field)) {
        generateErrorUtil('Campo de archivo no permitido', 400);
    }

    if (!file) return null;

    const extensionByMime = {
        'image/png': 'png',
        'image/jpeg': 'jpg',
        'image/webp': 'webp',
    };
    const extension = extensionByMime[file.mimetype];

    if (!extension) {
        generateErrorUtil('El archivo debe ser una imagen PNG, JPG o WEBP', 400);
    }

    const userDir = path.join(DOCUMENTS_ROOT, 'employeeDocumentation', userId);
    await ensureDir(userDir);

    const fileName = `${field}-${uuidv4()}.${extension}`;
    const finalPath = path.join(userDir, fileName);

    if (file.tempFilePath) {
        await fs.copyFile(file.tempFilePath, finalPath);
    } else if (file.data) {
        await fs.writeFile(finalPath, file.data);
    } else {
        generateErrorUtil('No se ha recibido el archivo', 400);
    }

    return path.join('employeeDocumentation', userId, fileName).replace(/\\/g, '/');
};

export const getEmployeeDocumentationFilePath = (relativePath) => {
    if (!relativePath || relativePath.includes('..')) {
        generateErrorUtil('Archivo no valido', 400);
    }

    return path.join(DOCUMENTS_ROOT, relativePath);
};

