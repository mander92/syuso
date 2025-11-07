import getPool from '../../db/getPool.js';
import { SERVER_URL } from '../../../env.js';
import sendMail from '../../utils/sendBrevoMail.js';

const updateRecoverPasswwordService = async (email, recoverPasswordCode) => {
    const pool = await getPool();

    await pool.query(
        `
		UPDATE users
        SET recoverPasswordCode = ?
        WHERE email = ?
		`,
        [recoverPasswordCode, email]
    );

    const emailSubject = 'Recuperación de contraseña Syuso';

    // PARA CUANTO TENGA QUE PONER EL LOGO EN EL CORREO
    const logo = `<img src="https://raw.githubusercontent.com/mander92/ClockYou/main/docs/logo-email.png" alt="Logo" style="width: 40px; margin: 0 -3px -10px 0" />`;

    const anio = new Date;

    const anioactual = anio.getFullYear();

    const emailBody = `
    <html>
        <body>
            <table bgcolor="#3c3c3c" width="670" border="0" cellspacing="0" cellpadding="0" align="left" > <tbody> <tr> <td align="left" style=" padding: 20px 40px; color: #fff; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif; " > <p style=" margin: 10px 0 20px; font-size: 35px; font-weight: bold; color: #fff;" >  Syuso </p> <p style="margin: 0 0 5px; font-size: 16px; color: #fff;"> Se ha solicitado la recuperación de la contraseña para el siguiente email </p> <p style="margin: 0 0 15px; font-size: 20px; color: #fff"> ${email} </p> <p style="margin: 35px 0 5px; font-size: 16px; color: #fff;"> Utilice el siguiente código de recuperación para crear una nueva contraseña: </p> <p style="margin: 0 0 15px; font-size: 20px; color: #fff"> ${recoverPasswordCode} </p>  <p> <a href="${SERVER_URL}/users/password" style=" display: inline-block; margin: 0 0 5px; padding: 10px 25px 15px; background-color: #008aff; font-size: 20px; color: #fff; width: auto; text-decoration: none; font-weight: bold; color: #fff;" >Recuperar mi contraseña</a > </p><p style="margin: 70px 0 2px; color: #fff;"> Gracias por confiar en Syuso. </p> <p style="margin: 0 0 10px; color: #fff;">&copy; Syuso ${anioactual}</p> </td> </tr> </tbody> </table>
        </body>
    </html>
	`;
    sendMail("USER", email, emailSubject, emailBody);
};

export default updateRecoverPasswwordService;
