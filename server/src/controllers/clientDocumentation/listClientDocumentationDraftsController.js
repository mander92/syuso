import listClientDocumentationDraftsService from '../../services/clientDocumentation/listClientDocumentationDraftsService.js';

const listClientDocumentationDraftsController = async (req, res, next) => {
    try {
        const data = await listClientDocumentationDraftsService();
        res.send({ status: 'ok', data });
    } catch (error) {
        next(error);
    }
};

export default listClientDocumentationDraftsController;
