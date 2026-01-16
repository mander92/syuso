import brevo from '@getbrevo/brevo';
import fs from 'fs';
import path from 'path';
import { BREVO_API_KEY, SMTP_EMAIL } from '../../env.js';

const sendMail = async (name, email, emailSubject, emailBody, attachments = []) => {
    try {
        if (!BREVO_API_KEY) {
            console.error('BREVO_API_KEY no configurada');
            return false;
        }

        const apiInstance = new brevo.TransactionalEmailsApi();

        if (typeof apiInstance.setApiKey === 'function') {
            apiInstance.setApiKey(
                brevo.TransactionalEmailsApiApiKeys.apiKey,
                BREVO_API_KEY
            );
        } else {
            const defaultClient = brevo.ApiClient.instance;
            const apiKey =
                defaultClient.authentications['api-key'] ||
                defaultClient.authentications.apiKey;
            apiKey.apiKey = BREVO_API_KEY;
        }

        const sendSmtpEmail = new brevo.SendSmtpEmail();

        sendSmtpEmail.subject = emailSubject;
        sendSmtpEmail.to = [{ email, name }];
        sendSmtpEmail.htmlContent = emailBody;
        sendSmtpEmail.sender = {
            name: 'Syuso',
            email: SMTP_EMAIL || 'operativa@syuso.es',
        };

        if (attachments.length > 0) {
            // Soportar tanto { filename, path } como { name, content }
            const parsedAttachments = attachments.map((att) => {
                // Si viene con path, lo leemos y convertimos aqui
                if (att.path) {
                    const fileBuffer = fs.readFileSync(att.path);
                    const base64 = fileBuffer.toString('base64');

                    return {
                        name: att.filename || path.basename(att.path),
                        content: base64,
                    };
                }

                // Si ya viene como { name, content }, lo dejamos igual
                return att;
            });

            sendSmtpEmail.attachment = parsedAttachments;
        }

        await apiInstance.sendTransacEmail(sendSmtpEmail);

        console.log('===== mail enviado =====');
        return true;
    } catch (e) {
        console.log('===== mail NO enviado =====');
        console.error(e?.response?.body || e);
        return false;
    }
};

export default sendMail;
