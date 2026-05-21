import listClientDocumentationsService from '../../services/clientDocumentation/listClientDocumentationsService.js';

const listClientDocumentationsController = async (req, res, next) => {
    try {
        const data = await listClientDocumentationsService();
        res.send({ status: 'ok', data });
    } catch (error) {
        next(error);
    }
};

export default listClientDocumentationsController;
