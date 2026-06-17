import Joi from 'joi';

import generateErrorUtil from '../../utils/generateErrorUtil.js';
import { detectEmployeeMatch } from '../../utils/payrollDetectionUtil.js';
import {
    extractPayrollText,
    preparePayrollFiles,
} from '../../utils/payrollFileUtil.js';
import {
    createPayrollImport,
    insertPayroll,
    listPayrollEmployees,
    updatePayrollImportStats,
} from '../../services/payrolls/payrollService.js';

const schema = Joi.object({
    uploadMode: Joi.string().valid('multiple', 'onePerPage').default('multiple'),
    defaultMonth: Joi.string()
        .pattern(/^20\d{2}-(0[1-9]|1[0-2])$/)
        .required(),
    publishMatched: Joi.boolean().truthy('true').falsy('false').default(false),
});

const parsePositiveInt = (value, fallback) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const SYNC_OCR_MAX_FILES = parsePositiveInt(
    process.env.PAYROLL_SYNC_OCR_MAX_FILES,
    3
);

const importPayrollsController = async (req, res, next) => {
    try {
        const { error, value } = schema.validate(req.body || {}, {
            abortEarly: true,
            stripUnknown: true,
        });
        if (error) generateErrorUtil(error.message, 400);

        const files = req.files?.payrollFiles;
        if (!files) generateErrorUtil('Sube al menos un PDF', 400);

        const importId = await createPayrollImport({
            uploadMode: value.uploadMode,
            originalFileName: Array.isArray(files) ? null : files.name,
            uploadedBy: req.userLogged.id,
        });

        const employees = await listPayrollEmployees({
            viewerId: req.userLogged.id,
            viewerRole: req.userLogged.role,
        });
        const preparedFiles = await preparePayrollFiles({
            files,
            importId,
            uploadMode: value.uploadMode,
        });

        const results = [];
        let matchedCount = 0;
        const useOcr = preparedFiles.length <= SYNC_OCR_MAX_FILES;

        for (const file of preparedFiles) {
            const text = await extractPayrollText(file.buffer, { useOcr });
            const match = detectEmployeeMatch({
                text,
                fileName: file.originalFileName,
                employees,
            });
            const payrollMonth = value.defaultMonth;
            const status = match.employee
                ? value.publishMatched
                    ? payrollMonth
                        ? 'published'
                        : 'matched'
                    : 'matched'
                : 'unmatched';

            if (match.employee) matchedCount += 1;

            const id = await insertPayroll({
                importId,
                employeeId: match.employee?.id || null,
                filePath: file.filePath,
                originalFileName: file.originalFileName,
                detectedName: match.detectedName,
                detectedDni: match.detectedDni,
                payrollMonth,
                status,
                uploadedBy: req.userLogged.id,
            });

            results.push({
                id,
                employeeId: match.employee?.id || null,
                employeeName: match.employee
                    ? `${match.employee.firstName || ''} ${
                          match.employee.lastName || ''
                      }`.trim()
                    : '',
                originalFileName: file.originalFileName,
                detectedName: match.detectedName,
                detectedDni: match.detectedDni,
                payrollMonth,
                status,
                confidence: match.confidence,
            });
        }

        await updatePayrollImportStats({
            importId,
            totalFiles: preparedFiles.length,
            matchedCount,
            unmatchedCount: preparedFiles.length - matchedCount,
        });

        res.send({
            status: 'ok',
            data: {
                importId,
                totalFiles: preparedFiles.length,
                matchedCount,
                unmatchedCount: preparedFiles.length - matchedCount,
                payrolls: results,
            },
        });
    } catch (error) {
        next(error);
    }
};

export default importPayrollsController;
