import brevo from '@getbrevo/brevo';
import fs from 'fs';
import path from 'path';
import convertHeic from 'heic-convert';
import { BREVO_API_KEY, SMTP_EMAIL } from '../../env.js';

const normalizeEmails = (emails) =>
    Array.isArray(emails)
        ? emails.filter(Boolean)
        : String(emails || '')
              .split(/[\s,;]+/)
              .map((email) => email.trim())
              .filter(Boolean);

const prepareAttachment = async (attachment) => {
    const attachmentName =
        attachment.filename ||
        attachment.name ||
        (attachment.path ? path.basename(attachment.path) : 'adjunto');
    const extension = path.extname(attachmentName).toLowerCase();
    const fileBuffer = attachment.path
        ? fs.readFileSync(attachment.path)
        : Buffer.from(attachment.content || '', 'base64');

    if (extension === '.heic' || extension === '.heif') {
        try {
            const jpegBuffer = await convertHeic({
                buffer: fileBuffer,
                format: 'JPEG',
                quality: 0.9,
            });
            return {
                name: `${path.basename(attachmentName, extension)}.jpg`,
                content: Buffer.from(jpegBuffer).toString('base64'),
            };
        } catch {
            throw new Error(
                `No se pudo convertir el archivo HEIC ${attachmentName} a JPG`
            );
        }
    }

    return {
        name: attachmentName,
        content: fileBuffer.toString('base64'),
    };
};

const sendMail = async (
    name,
    email,
    emailSubject,
    emailBody,
    attachments = [],
    options = {}
) => {
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
        const ccEmails = normalizeEmails(options.cc);
        if (ccEmails.length) {
            sendSmtpEmail.cc = ccEmails.map((ccEmail) => ({ email: ccEmail }));
        }
        sendSmtpEmail.htmlContent = emailBody;
        sendSmtpEmail.sender = {
            name: 'Syuso',
            email: SMTP_EMAIL || 'operativa@syuso.es',
        };

        if (attachments.length > 0) {
            sendSmtpEmail.attachment = await Promise.all(
                attachments.map(prepareAttachment)
            );
        }

        await apiInstance.sendTransacEmail(sendSmtpEmail);

        console.log('===== mail enviado =====');
        return true;
    } catch (e) {
        console.log('===== mail NO enviado =====');
        console.error(e?.body || e?.response?.body || e);
        if (options.throwOnError) throw e;
        return false;
    }
};

export default sendMail;
