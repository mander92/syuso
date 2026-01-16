import selectWorkReportDraftService from '../../services/workReports/selectWorkReportDraftService.js';

const selectWorkReportDraftController = async (req, res, next) => {
    try {
        const { shiftRecordId } = req.params;

        const data = await selectWorkReportDraftService(
            shiftRecordId,
            req.userLogged.id
        );

        res.send({
            status: 'ok',
            data,
        });
    } catch (error) {
        next(error);
    }
};

export default selectWorkReportDraftController;
