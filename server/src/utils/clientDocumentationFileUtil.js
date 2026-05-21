import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

import generateErrorUtil from './generateErrorUtil.js';

const DOCUMENTS_ROOT = path.join(process.cwd(), 'private_uploads');

export const allowedClientDocumentationFileFields = new Set([
    'acceptedBudgetPath',
    'serviceContractPath',
]);

const ensureDir = async (dir) => {
    await fs.mkdir(dir, { recursive: true });
};

export const saveClientDocumentationFile = async (file, clientId, field) => {
    if (!allowedClientDocumentationFileFields.has(field)) {
        generateErrorUtil('Campo de archivo no permitido', 400);
    }

    if (!file) return null;

    if (file.mimetype !== 'application/pdf') {
        generateErrorUtil('El archivo debe ser PDF', 400);
    }

    const clientDir = path.join(DOCUMENTS_ROOT, 'clientDocumentation', clientId);
    await ensureDir(clientDir);

    const fileName = `${field}-${uuidv4()}.pdf`;
    const finalPath = path.join(clientDir, fileName);

    if (file.tempFilePath) {
        await fs.copyFile(file.tempFilePath, finalPath);
    } else if (file.data) {
        await fs.writeFile(finalPath, file.data);
    } else {
        generateErrorUtil('No se ha recibido el archivo', 400);
    }

    return path
        .join('clientDocumentation', clientId, fileName)
        .replace(/\\/g, '/');
};

export const getClientDocumentationFilePath = (relativePath) => {
    if (!relativePath || relativePath.includes('..')) {
        generateErrorUtil('Archivo no valido', 400);
    }

    return path.join(DOCUMENTS_ROOT, relativePath);
};
