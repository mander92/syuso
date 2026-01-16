import path from 'path';
import fs from 'fs';
import { v4 as uuid } from 'uuid';
import insertJobApplicationService from '../../services/jobs/insertJobApplicationService.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';
import { UPLOADS_DIR } from '../../../env.js';

const createJobApplicationController = async (req, res, next) => {
    try {
        const { fullName, email, phone, message } = req.body;

        if (!fullName || !email || !phone) {
            generateErrorUtil('Nombre, email y teléfono son obligatorios', 400);
        }

        // 🔥 Comprobar que llega un archivo
        if (!req.files || !req.files.cv) {
            generateErrorUtil('Debes adjuntar un archivo CV', 400);
        }

        const cv = req.files.cv;

        // 🔥 Validar formato
        const allowedTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ];

        if (!allowedTypes.includes(cv.mimetype)) {
            generateErrorUtil('Formato no permitido. Solo PDF o Word.', 400);
        }

        // Crear carpeta si no existe
        const cvFolder = path.join(UPLOADS_DIR, 'cv');
        if (!fs.existsSync(cvFolder)) {
            fs.mkdirSync(cvFolder, { recursive: true });
        }

        // Generar nombre final
        const cvName = `${Date.now()}-${cv.name.replace(/\s+/g, '-')}`;
        const savedPath = path.join(cvFolder, cvName);

        // 🔥 Guardar archivo físicamente
        await cv.mv(savedPath);

        // 🔥 Rutas para BD y para el adjunto del mail
        const cvFileDbPath = `cv/${cvName}`;    // lo que guardas en la columna cvFile
        const cvFileFullPath = savedPath;       // ruta absoluta para adjuntar al mail

        // Guardar en BD y enviar emails
        const id = await insertJobApplicationService({
            fullName,
            email,
            phone,
            message,
            cvFileDbPath,
            cvFileFullPath,
        });

        res.send({
            status: 'ok',
            message: 'Candidatura enviada correctamente',
            data: { id },
        });

    } catch (error) {
        next(error);
    }
};

export default createJobApplicationController;

