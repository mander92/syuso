import fs from 'fs/promises';
import path from 'path';
import { v4 as uuid } from 'uuid';
import { PDFDocument } from 'pdf-lib';
import { PDFParse } from 'pdf-parse';

import generateErrorUtil from './generateErrorUtil.js';

const PAYROLL_ROOT = path.join(process.cwd(), 'private_uploads', 'payrolls');

const ensureDir = async (dir) => {
    await fs.mkdir(dir, { recursive: true });
};

const normalizeFileArray = (files) => {
    if (!files) return [];
    return Array.isArray(files) ? files : [files];
};

const readUploadedFile = async (file) => {
    if (file.tempFilePath) return fs.readFile(file.tempFilePath);
    if (file.data) return file.data;
    generateErrorUtil('No se ha recibido el archivo de nomina', 400);
};

export const getPayrollFilePath = (relativePath) => {
    if (!relativePath || relativePath.includes('..')) {
        generateErrorUtil('Archivo no valido', 400);
    }
    return path.join(PAYROLL_ROOT, relativePath);
};

export const extractPayrollText = async (buffer) => {
    let parser;
    try {
        parser = new PDFParse({ data: buffer });
        const result = await parser.getText();
        return result?.text || '';
    } catch {
        return '';
    } finally {
        await parser?.destroy?.();
    }
};

export const savePayrollBuffer = async ({
    buffer,
    importId,
    originalFileName,
    suffix = '',
}) => {
    const dir = path.join(PAYROLL_ROOT, importId);
    await ensureDir(dir);

    const safeBase = path
        .basename(originalFileName || 'nomina.pdf', path.extname(originalFileName || ''))
        .replace(/[^a-z0-9_-]+/gi, '-')
        .slice(0, 80);
    const fileName = `${safeBase || 'nomina'}${suffix}-${uuid()}.pdf`;
    const finalPath = path.join(dir, fileName);
    await fs.writeFile(finalPath, buffer);

    return path.join(importId, fileName).replace(/\\/g, '/');
};

export const preparePayrollFiles = async ({ files, importId, uploadMode }) => {
    const uploadedFiles = normalizeFileArray(files);
    if (!uploadedFiles.length) {
        generateErrorUtil('Sube al menos un archivo PDF', 400);
    }

    const prepared = [];

    for (const file of uploadedFiles) {
        if (file.mimetype !== 'application/pdf') {
            generateErrorUtil('Solo se permiten archivos PDF', 400);
        }

        const buffer = await readUploadedFile(file);

        if (uploadMode === 'onePerPage') {
            const pdf = await PDFDocument.load(buffer);
            const pageCount = pdf.getPageCount();

            for (let index = 0; index < pageCount; index += 1) {
                const pagePdf = await PDFDocument.create();
                const [copiedPage] = await pagePdf.copyPages(pdf, [index]);
                pagePdf.addPage(copiedPage);
                const pageBuffer = Buffer.from(await pagePdf.save());
                const filePath = await savePayrollBuffer({
                    buffer: pageBuffer,
                    importId,
                    originalFileName: file.name,
                    suffix: `-pagina-${index + 1}`,
                });
                prepared.push({
                    buffer: pageBuffer,
                    filePath,
                    originalFileName: `${file.name} - pagina ${index + 1}`,
                });
            }
        } else {
            const filePath = await savePayrollBuffer({
                buffer,
                importId,
                originalFileName: file.name,
            });
            prepared.push({
                buffer,
                filePath,
                originalFileName: file.name,
            });
        }
    }

    return prepared;
};
