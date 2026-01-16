import saveWorkReportDraftService from '../../services/workReports/saveWorkReportDraftService.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';

const saveWorkReportDraftController = async (req, res, next) => {
    try {
        const { shiftRecordId } = req.params;

        if (req.body.incidents && typeof req.body.incidents === 'string') {
            try {
                req.body.incidents = JSON.parse(req.body.incidents);
            } catch (error) {
                generateErrorUtil('Formato de incidencias invalido', 400);
            }
        }

        const payload = {
            folio: req.body.folio || '',
            reportDate: req.body.reportDate || '',
            incidentStart: req.body.incidentStart || '',
            incidentEnd: req.body.incidentEnd || '',
            totalHours: req.body.totalHours || '',
            location: req.body.location || '',
            guardFullName: req.body.guardFullName || '',
            guardEmployeeNumber: req.body.guardEmployeeNumber || '',
            securityCompany: req.body.securityCompany || '',
            description: req.body.description || '',
        };

        const data = await saveWorkReportDraftService({
            shiftRecordId,
            serviceId: req.body.serviceId,
            employeeId: req.userLogged.id,
            payload,
            signatureDataUrl: req.body.signature,
            incidents: req.body.incidents,
            incidentFiles: req.files || {},
        });

        res.send({
            status: 'ok',
            data,
        });
    } catch (error) {
        next(error);
    }
};

export default saveWorkReportDraftController;
