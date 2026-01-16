import insertConsultingRequestService from '../../services/requests/insertConsultingRequestService.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';

const createConsultingRequestController = async (req, res, next) => {
    try {
        const { fullName, company, email, phone, topic, message } = req.body;


        if (!fullName || !email || !phone || !topic || !message) {
            generateErrorUtil('Todos los campos obligatorios deben estar rellenos', 400);
        }



        const id = await insertConsultingRequestService({
            fullName,
            company,
            email,
            phone,
            topic,
            message,
        });

        res.send({
            status: 'ok',
            message: 'Solicitud de consultoría enviada correctamente',
            data: { id },
        });
    } catch (error) {
        next(error);
    }
};

export default createConsultingRequestController;
