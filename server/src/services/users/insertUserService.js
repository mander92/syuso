import bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';
import { SERVER_URL } from '../../../env.js';
import getPool from '../../db/getPool.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';
import sendMail from '../../utils/sendBrevoMail.js';

const insertUserService = async (
    email,
    password,
    firstName,
    lastName,
    dni,
    phone,
    registrationCode
) => {
    const pool = await getPool();

    const [user] = await pool.query(
        `
        SELECT id FROM users WHERE email = ?
        `,
        [email]
    );

    if (user.length)
        generateErrorUtil('El email ya se encuentra registrado', 409);

    const passwordHashed = await bcrypt.hash(password, 10);

    await pool.query(
        `
        INSERT INTO users(id, email, password, firstName, lastName, dni, phone, registrationCode )
        VALUES (?,?,?,?,?,?,?,?)
        `,
        [
            uuid(),
            email,
            passwordHashed,
            firstName,
            lastName,
            dni,
            phone,
            registrationCode,
        ]
    );

    const anio = new Date;

    const anioactual = anio.getFullYear();

    const emailSubject = `Activa tu cuenta de Syuso`;

    const emailBody = `
    <html>
        <body>
            <table bgcolor="#3c3c3c" width="670" border="0" cellspacing="0" cellpadding="0" align="center" style="margin: 0 auto" > <tbody> <tr> <td> <table bgcolor="#3c3c3c" width="670" border="0" cellspacing="0" cellpadding="0" align="left" > <tbody> <tr> <td align="left" style=" padding: 20px 40px; color: #fff; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif; " > <p style=" margin: 10px 0 20px; font-size: 35px; font-weight: bold; color: #fff;" > Syuso </p> <p style="margin: 0 0 5px; font-size: 25px; color: #fff;"> Bienvenid@, ${firstName} ${lastName}! </p> <p style="margin: 15px 0 5px; font-size: 20px; color: #fff;"> Muchas gracias por registrarte en Syuso. <span style=" display: block; font-size: 18px; margin: 25px 0 0; color: #fff;" > Para continuar, activa tu cuenta haciendo click en el siguiente enlace: </span> </p> <p> <a href="${SERVER_URL}/users/validate/${registrationCode}" style=" display: inline-block; margin: 0 0 5px; padding: 10px 25px 15px; background-color: #008aff; font-size: 20px; color: #fff; width: auto; text-decoration: none; font-weight: bold; " >Activa tu cuenta</a > </p> <p style="margin: 50px 0 10px; color: #fff;">&copy; Syuso Seguridad ${anioactual}</p> </td> </tr> </tbody> </table> </td> </tr> </tbody> </table>
        </body>
    </html>
`;

    sendMail(firstName, email, emailSubject, emailBody);
};

export default insertUserService;
