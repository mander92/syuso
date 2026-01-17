import fs from 'fs';
import path from 'path';
import archiver from 'archiver';

import { UPLOADS_DIR } from '../../../env.js';
import selectShiftRecordsService from '../../services/shiftRecords/selectShiftRecordsService.js';
import selectAdminDelegationNamesService from '../../services/delegations/selectAdminDelegationNamesService.js';
import selectDelegationByIdService from '../../services/delegations/selectDelegationByIdService.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';

const downloadWorkReportsZipController = async (req, res, next) => {
    try {
        const {
            typeOfService,
            employeeId,
            city,
            serviceId,
            serviceName,
            startDate,
            endDate,
            delegationId,
            personSearch,
        } = req.query;

        const { id: userId, role } = req.userLogged;
        let allowedDelegations = [];

        if (role === 'admin') {
            allowedDelegations = await selectAdminDelegationNamesService(
                userId
            );
        }

        if (delegationId) {
            const delegation = await selectDelegationByIdService(delegationId);
            if (delegation) {
                allowedDelegations = allowedDelegations.length
                    ? allowedDelegations.filter(
                          (name) => name === delegation.name
                      )
                    : [delegation.name];
            }
        }

        if (role === 'admin' && !allowedDelegations.length) {
            generateErrorUtil(
                'No hay partes de trabajo para descargar',
                404
            );
        }

        const data = await selectShiftRecordsService(
            typeOfService,
            employeeId,
            city,
            serviceId,
            serviceName,
            startDate,
            endDate,
            false,
            allowedDelegations
        );

        const normalizeText = (value) =>
            String(value || '')
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .toLowerCase()
                .trim();

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

        const searchText = normalizeText(personSearch);
        const filteredDetails = searchText
            ? (data?.details || []).filter((record) => {
                  const fullName = normalizeText(
                      `${record.firstName} ${record.lastName}`
                  );
                  return fullName.includes(searchText);
              })
            : data?.details || [];

        const reportIds = [
            ...new Set(
                filteredDetails
                    .map((record) => record.reportId)
                    .filter(Boolean)
            ),
        ];

        if (!reportIds.length) {
            generateErrorUtil(
                'No hay partes de trabajo para descargar',
                404
            );
        }

        const uploadsRoot = path.join(process.cwd(), UPLOADS_DIR);
        const pdfDir = path.join(uploadsRoot, 'workReports', 'pdfs');
        const usedNames = new Set();
        const files = reportIds
            .map((reportId) => {
                const record = filteredDetails.find(
                    (item) => item.reportId === reportId
                );
                const datePart =
                    formatDate(record?.reportDate) ||
                    formatDate(record?.clockIn) ||
                    formatDate(record?.startDateTime) ||
                    'reporte';
                const servicePart = slugify(
                    record?.serviceName || record?.type || 'servicio'
                );
                let fileName = `${datePart}_${servicePart || 'servicio'}.pdf`;
                if (usedNames.has(fileName)) {
                    fileName = `${datePart}_${servicePart || 'servicio'}_${reportId.slice(
                        0,
                        8
                    )}.pdf`;
                }
                usedNames.add(fileName);
                return {
                    reportId,
                    fileName,
                    pdfPath: path.join(pdfDir, `${reportId}.pdf`),
                };
            })
            .filter((item) => fs.existsSync(item.pdfPath));

        if (!files.length) {
            generateErrorUtil(
                'No se encontraron PDFs para descargar',
                404
            );
        }

        const fileName = `partes_trabajo_${Date.now()}.zip`;
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="${fileName}"`
        );

        const archive = archiver('zip', { zlib: { level: 9 } });
        archive.on('error', (error) => next(error));
        archive.pipe(res);

        files.forEach((item) => {
            archive.file(item.pdfPath, {
                name: item.fileName,
            });
        });

        archive.finalize();
    } catch (error) {
        next(error);
    }
};

export default downloadWorkReportsZipController;
