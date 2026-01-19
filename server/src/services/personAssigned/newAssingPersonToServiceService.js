import { v4 as uuid } from 'uuid';
import getPool from '../../db/getPool.js';
import Randomstring from 'randomstring';
import generateErrorUtil from '../../utils/generateErrorUtil.js';
import sendMail from '../../utils/sendBrevoMail.js';

const newAssingPersonToServiceService = async (employeeId, serviceId) => {
    const pool = await getPool();

    const [verifyUserId] = await pool.query(
        `
        SELECT * FROM users WHERE id = ? AND active = 1 AND deletedAt IS NULL
        `,
        [employeeId]
    );

    const [serviceData] = await pool.query(
        `
        SELECT id, clientId FROM services WHERE id = ?
        `,
        [serviceId]
    );

    if (!verifyUserId) {
        generateErrorUtil('El usuario no existe', 402);
    }

    if (!serviceData) {
        generateErrorUtil('El servicio no existe', 402);
    }

    const [personAlreadyAssigned] = await pool.query(`
        SELECT id FROM personsAssigned WHERE employeeId = ? AND serviceId = ?
        `, [employeeId, serviceId])


    if (personAlreadyAssigned.length > 0) {
        generateErrorUtil('La persona ya ha sido asignada al servicio');
        return
    }

    const personAssignedId = uuid();
    const pin = Randomstring.generate(4);

    await pool.query(`
        INSERT INTO personsAssigned(id, employeeId, serviceId, pin) VALUES(?,?,?,?)
        `, [personAssignedId, employeeId, serviceId, pin]);



    const [serviceInfo] = await pool.query(
        `
            SELECT s.status,
            t.type, t.city AS province, s.validationCode, s.startDateTime, a.address, a.postCode, a.city, u.email, u.firstName
            FROM addresses a
            INNER JOIN services s
            ON a.id = s.addressId
            INNER JOIN personsAssigned pa 
            ON s.id = pa.serviceId
            INNER JOIN users u
            ON u.id = pa.employeeId
            INNER JOIN typeOfServices t
            ON s.typeOfServicesId = t.id
            WHERE s.id = ? AND pa.employeeId = ?
            `,
        [serviceId, employeeId]
    );

    const emailSubjectEmployee = `Has sido asignado a un servicio`;

    const localDateTime = new Date(serviceInfo[0].startDateTime).toLocaleString();

    const logo = `<img src="https://raw.githubusercontent.com/mander92/ClockYou/main/docs/logo-email.png" alt="Logo" style="width: 40px; margin: 0 -3px -10px 0" />`;

    const date = new Date();

    const anioactual = date.getFullYear();

    const emailBodyEmployee = `
        <html>
            <body>
                <table bgcolor="#3c3c3c" width="670" border="0" cellspacing="0" cellpadding="0" align="center" style="margin: 0 auto" > <tbody> <tr> <td> <table bgcolor="#3c3c3c" width="670" border="0" cellspacing="0" cellpadding="0" align="left" > <tbody> <tr> <td align="left" style=" padding: 20px 40px; color: #fff; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif; " > <p style=" margin: 10px 0 20px; font-size: 35px; font-weight: bold; color: #fff;" >  Syuso </p> <p style="margin: 0 0 15px; font-size: 20px; color: #fff;"> Resumen del Servicio </p> <p style="margin: 0 0 10px; font-size: 16px; color: #fff;"> Tipo De Servicio: ${serviceInfo[0].type} en ${serviceInfo[0].province} </p> <p style="margin: 0 0 10px; font-size: 16px; color: #fff;">El ${localDateTime} en Calle: ${serviceInfo[0].address}, ${serviceInfo[0].postCode}, ${serviceInfo[0].city} </p>  <br /> <p style="margin: 50px 0 2px; color: #fff;"> Gracias por trabajar en Syuso.</p><p style="margin: 0 0 10px; color: #fff;">&copy; Syuso ${anioactual}</p> </td> </tr> </tbody> </table> </td> </tr> </tbody> </table>
            </body>
        </html>
    `;

    sendMail(serviceInfo[0].firstName, serviceInfo[0].email, emailSubjectEmployee, emailBodyEmployee);


    const [data] = await pool.query(
        `
        SELECT s.status,
        t.type, t.city AS province, s.hours, s.startDateTime, s.comments, u.email, u.firstName, u.lastName, u.phone
        FROM users u
        INNER JOIN personsAssigned pa
        ON u.id = pa.employeeId
        INNER JOIN services s
        ON s.id = pa.serviceId
        INNER JOIN typeOfServices t
        ON s.typeOfServicesId = t.id
        WHERE u.id = ? AND s.id = ?
    `,
        [employeeId, serviceId]
    );

    return data;
};

export default newAssingPersonToServiceService

