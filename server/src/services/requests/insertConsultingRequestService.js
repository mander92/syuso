import { v4 as uuid } from 'uuid';
import getPool from '../../db/getPool.js';
import sendMail from '../../utils/sendBrevoMail.js';

const insertConsultingRequestService = async ({
    fullName,
    company,
    email,
    phone,
    topic,
    message,
}) => {
    const pool = await getPool();

    // (Opcional) Podrías comprobar si el email es válido o similar

    const id = uuid();

    await pool.query(
        `
        INSERT INTO consulting_requests (id, fullName, company, email, phone, topic, message)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [id, fullName, company || null, email, phone, topic, message]
    );

    // Enviar correo interno a Syuso
    const subjectInternal = `Nueva solicitud de consultoría (${topic})`;

    const bodyInternal = `
        <html>
            <body>
                <h2>Nueva solicitud de consultoría</h2>
                <p><strong>Nombre:</strong> ${fullName}</p>
                <p><strong>Empresa:</strong> ${company || 'No especificada'}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Teléfono:</strong> ${phone}</p>
                <p><strong>Tipo de consulta:</strong> ${topic}</p>
                <p><strong>Mensaje:</strong></p>
                <p>${message}</p>
                <p>ID de la solicitud: ${id}</p>
            </body>
        </html>
    `;

    // Cambia este correo por el oficial de SYUSO Seguridad
    const SYUSO_EMAIL = 'operativa@syuso.es';

    sendMail('SYUSO Seguridad', SYUSO_EMAIL, subjectInternal, bodyInternal);

    // (Opcional) Mail de confirmación al cliente
    const subjectClient = `Hemos recibido tu solicitud de consultoría - SYUSO Seguridad`;
    const bodyClient = `
        <html>
            <body>
                <p>Hola ${fullName},</p>
                <p>Hemos recibido tu solicitud de consultoría de seguridad. Nuestro equipo revisará tu caso y te contactará lo antes posible.</p>
                <p><strong>Resumen de tu solicitud:</strong></p>
                <ul>
                    <li><strong>Tipo de consulta:</strong> ${topic}</li>
                    <li><strong>Teléfono:</strong> ${phone}</li>
                    <li><strong>Mensaje:</strong> ${message}</li>
                </ul>
                <p>Un saludo,<br/>SYUSO Seguridad</p>
            </body>
        </html>
    `;

    sendMail(fullName, email, subjectClient, bodyClient);

    return id;
};

export default insertConsultingRequestService;
