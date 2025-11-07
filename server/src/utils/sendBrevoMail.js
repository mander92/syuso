
import brevo from '@getbrevo/brevo';
import { BREVO_API_KEY, SMTP_EMAIL } from '../../env.js';

const sendMail = async (name, email, emailSubject, emailBody) => {


    try {
        const apiInstance = new brevo.TransactionalEmailsApi();

        apiInstance.setApiKey(
            brevo.TransactionalEmailsApiApiKeys.apiKey,
            BREVO_API_KEY
        )


        const sendSmtpEmail = new brevo.SendSmtpEmail();

        sendSmtpEmail.subject = emailSubject;

        sendSmtpEmail.to = [
            { email: email, name: name }
        ]

        sendSmtpEmail.htmlContent = emailBody;


        sendSmtpEmail.sender = {
            name: "Syuso",
            email: SMTP_EMAIL || "operativa@syuso.es"
        }

        await apiInstance.sendTransacEmail(sendSmtpEmail);

        console.log("============================================= mail enviado ==========================================");
        return true;

    } catch (e) {

        //console.log(e)
        console.log("======================================== mail  NOOOOOO enviado ======================================");
        console.error(e);
        return false;

    }
}

export default sendMail;
