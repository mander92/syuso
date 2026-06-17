import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { v4 as uuid } from 'uuid';
import { PDFDocument } from 'pdf-lib';
import { PDFParse } from 'pdf-parse';

import generateErrorUtil from './generateErrorUtil.js';

const PAYROLL_ROOT = path.join(process.cwd(), 'private_uploads', 'payrolls');
const execFileAsync = promisify(execFile);
const parsePositiveInt = (value, fallback) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const OCR_DPI = parsePositiveInt(process.env.PAYROLL_OCR_DPI, 150);
const OCR_TIMEOUT_MS = parsePositiveInt(
    process.env.PAYROLL_OCR_TIMEOUT_MS,
    20000
);
const OCR_MAX_PAGES = parsePositiveInt(process.env.PAYROLL_OCR_MAX_PAGES, 1);

const hasReadablePayrollText = (text) => {
    const words = String(text || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
        .split(' ')
        .filter(
            (word) =>
                word.length > 2 &&
                !['page', 'pagina'].includes(word) &&
                !/^\d+$/.test(word)
        );

    return words.length > 0;
};

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

const runTesseract = async (imagePath, lang) => {
    const { stdout } = await execFileAsync(
        'tesseract',
        [imagePath, 'stdout', '-l', lang, '--psm', '6'],
        { maxBuffer: 20 * 1024 * 1024, timeout: OCR_TIMEOUT_MS }
    );

    return stdout || '';
};

const extractPayrollTextWithOcr = async (buffer) => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'syuso-payroll-ocr-'));
    const pdfPath = path.join(tempDir, 'source.pdf');
    const imagePrefix = path.join(tempDir, 'page');

    try {
        await fs.writeFile(pdfPath, buffer);
        await execFileAsync(
            'pdftoppm',
            [
                '-f',
                '1',
                '-l',
                String(OCR_MAX_PAGES),
                '-r',
                String(OCR_DPI),
                '-png',
                pdfPath,
                imagePrefix,
            ],
            {
                maxBuffer: 20 * 1024 * 1024,
                timeout: OCR_TIMEOUT_MS,
            }
        );

        const files = (await fs.readdir(tempDir))
            .filter((file) => /^page-\d+\.png$/i.test(file))
            .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

        const preferredLang = process.env.PAYROLL_OCR_LANG || 'spa+eng';
        const texts = [];

        for (const file of files) {
            const imagePath = path.join(tempDir, file);
            try {
                texts.push(await runTesseract(imagePath, preferredLang));
            } catch {
                if (preferredLang !== 'eng') {
                    try {
                        texts.push(await runTesseract(imagePath, 'eng'));
                    } catch {
                        texts.push('');
                    }
                } else {
                    texts.push('');
                }
            }
        }

        return texts.join('\n');
    } catch {
        return '';
    } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
    }
};

const extractPayrollTextFromPdf = async (buffer) => {
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

export const extractPayrollText = async (buffer, { useOcr = true } = {}) => {
    const text = await extractPayrollTextFromPdf(buffer);
    if (hasReadablePayrollText(text) || !useOcr) return text;

    const ocrText = await extractPayrollTextWithOcr(buffer);
    return hasReadablePayrollText(ocrText) ? ocrText : text;
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
