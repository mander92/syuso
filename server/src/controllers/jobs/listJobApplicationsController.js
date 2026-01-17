import listJobApplicationsService from '../../services/jobs/listJobApplicationsService.js';

const listJobApplicationsController = async (req, res, next) => {
    try {
        const { search, startDate, endDate } = req.query;

        const data = await listJobApplicationsService(
            search?.trim(),
            startDate,
            endDate
        );

        res.send({ status: 'ok', data });
    } catch (error) {
        next(error);
    }
};

export default listJobApplicationsController;
