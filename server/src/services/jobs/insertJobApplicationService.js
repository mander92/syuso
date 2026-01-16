import path from 'path';
import { v4 as uuid } from 'uuid';
import getPool from '../../db/getPool.js';
import sendMail from '../../utils/sendBrevoMail.js';

const insertJobApplicationService = async ({
    fullName,
    email,
    phone,
    message,
    cvFileDbPath,
    cvFileFullPath,
}) => {
    const pool = await getPool();

    const id = uuid();

    // Guardamos la ruta relativa en BD (para posible descarga futura)
    await pool.query(
        `
        INSERT INTO job_applications (id, fullName, email, phone, message, cvFile)
        VALUES (?, ?, ?, ?, ?, ?)
        `,
        [id, fullName, email, phone, message || null, cvFileDbPath]
    );

    const SYUSO_EMAIL = 'operativa@syuso.es'; // <- pon la de RRHH

    const subjectInternal = `Nueva candidatura de ${fullName}`;
    const bodyInternal = `
        <html>
            <body>
                <h2>Nueva candidatura recibida</h2>
                <p><strong>Nombre:</strong> ${fullName}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Teléfono:</strong> ${phone}</p>
                <p><strong>Mensaje:</strong></p>
                <p>${message || 'Sin mensaje adicional'}</p>
                <p>Se adjunta el CV en este correo.</p>
            </body>
        </html>
    `;

    // 🔥 Adjuntar el CV en el correo interno
    await sendMail(
        'SYUSO RRHH',
        SYUSO_EMAIL,
        subjectInternal,
        bodyInternal,
        [
            {
                filename: path.basename(cvFileFullPath),
                path: cvFileFullPath,
            },
        ]
    );

    // Mail de confirmación al candidato (sin adjunto normalmente)
    const subjectCandidate = `Hemos recibido tu CV - SYUSO Seguridad`;
    const bodyCandidate = `
        <html>
            <body>
                <p>Hola ${fullName},</p>
                <p>Gracias por enviar tu CV a SYUSO Seguridad. Nuestro equipo de RRHH revisará tu perfil y se pondrá en contacto contigo si encaja con nuestras necesidades.</p>
                <p>Un saludo,<br />SYUSO Seguridad</p>
            </body>
        </html>
    `;

    await sendMail(fullName, email, subjectCandidate, bodyCandidate);

    return id;
};

export default insertJobApplicationService;
