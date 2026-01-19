// services/users/insertUserAdminService.js
import { v4 as uuid } from 'uuid';
import getPool from '../../db/getPool.js';
import generateErrorUtil from '../../utils/generateErrorUtil.js';
import { CLIENT_URL } from '../../../env.js';
import randomstring from 'randomstring';
import sendMail from '../../utils/sendBrevoMail.js';
import bcrypt from 'bcrypt';
import replaceAdminDelegationsService from '../delegations/replaceAdminDelegationsService.js';

const insertAdminService = async (
    role,
    email,
    password,
    firstName,
    lastName,
    dni,
    phone,
    job,
    city,
    delegationIds = []
) => {
    const pool = await getPool();

    // ¿ya existe el email?
    const [user] = await pool.query(
        `
            SELECT id FROM users WHERE email = ?
        `,
        [email]
    );

    if (user.length) {
        generateErrorUtil('El email ya se encuentra registrado', 409);
    }

    const recoverPasswordCode = randomstring.generate(10);
    const passwordHashed = await bcrypt.hash(password, 10);

    const userId = uuid();

    await pool.query(
        `
            INSERT INTO users
                (id, email, password, firstName, lastName, dni, phone, recoverPasswordCode, role, job, city, active)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
        `,
        [
            userId,
            email,
            passwordHashed,
            firstName,
            lastName,
            dni,
            phone,
            recoverPasswordCode,
            role,
            job,
            city,
            1,
        ]
    );

    if (role === 'admin' && Array.isArray(delegationIds)) {
        await replaceAdminDelegationsService(userId, delegationIds);
    }

    const anio = new Date();
    const anioactual = anio.getFullYear();

    const emailSubject = `Tu cuenta de Syuso ha sido creada`;

    const emailBody = `
    <html>
        <body>
            <table bgcolor="#3c3c3c" width="670" border="0" cellspacing="0" cellpadding="0" align="center" style="margin: 0 auto">
                <tbody>
                    <tr>
                        <td>
                            <table bgcolor="#3c3c3c" width="670" border="0" cellspacing="0" cellpadding="0" align="left">
                                <tbody>
                                    <tr>
                                        <td align="left" style="padding: 20px 40px; color: #fff; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;">
                                            <p style="margin: 10px 0 20px; font-size: 35px; font-weight: bold; color: #fff;">
                                                Syuso
                                            </p>
                                            <p style="margin: 0 0 5px; font-size: 25px; color: #fff;">
                                                Bienvenid@, ${firstName} ${lastName}!!!
                                            </p>
                                            <p style="margin: 0 0 5px; font-size: 20px; color: #fff;">
                                                Tu contraseña es: <strong>${password}</strong>
                                            </p>
                                            <p style="margin: 15px 0 5px; font-size: 20px; color: #fff;">
                                                Tu cuenta ha sido creada por la administración de Syuso.
                                                <span style="display: block; font-size: 18px; margin: 25px 0 0; color: #fff;">
                                                    Si quieres cambiar la contraseña utiliza el siguiente código: <strong>${recoverPasswordCode}</strong><br />
                                                </span>
                                            </p>
                                            <p>
                                                <a href="${CLIENT_URL}/recoverpassword"
                                                   style="display: inline-block; margin: 0 0 5px; padding: 10px 25px 15px; background-color: #008aff; font-size: 20px; color: #fff; width: auto; text-decoration: none; font-weight: bold;">
                                                    Cambiar mi contraseña
                                                </a>
                                            </p>
                                            <p style="margin: 50px 0 10px; color: #fff;">
                                                &copy; Syuso Seguridad ${anioactual}
                                            </p>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </td>
                    </tr>
                </tbody>
            </table>
        </body>
    </html>
    `;

    // no hace falta await, pero si quieres controlar errores, pon await
    sendMail(firstName, email, emailSubject, emailBody);
};

export default insertAdminService;
