
import brevo from '@getbrevo/brevo';
import { BREVO_API_KEY, SMTP_EMAIL } from '../../env.js';

const sendMail = (name, email, emailSubject, emailBody) => {


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

        apiInstance.sendTransacEmail(sendSmtpEmail);

        console.log("============================================= mail enviado ==========================================");
    } catch (e) {

        //console.log(e)
        console.log("======================================== mail  NOOOOOO enviado ======================================");

    }
}

export default sendMail;
