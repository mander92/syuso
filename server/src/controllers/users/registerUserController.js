import randomstring from 'randomstring';
import insertUserService from '../../services/users/insertUserService.js';

const registerUserController = async (req, res, next) => {
    try {
        // De momento sin JOI, pero aquí iría la validación
        const registrationCode = randomstring.generate(30);

        let { email, firstName, lastName, dni, phone, password } = req.body;

        // Normalizamos: si viene vacío o sólo espacios → NULL
        const normalizedDni =
            dni && dni.trim() !== '' ? dni.trim() : null;
        const normalizedPhone =
            phone && phone.trim() !== '' ? phone.trim() : null;

        await insertUserService(
            email,
            password,
            firstName,
            lastName,
            normalizedDni,
            normalizedPhone,
            registrationCode
        );

        res.send({
            status: 'ok',
            message:
                'Usuario registrado correctamente. Revise su email para validar su cuenta',
        });
    } catch (error) {
        next(error);
    }
};

export default registerUserController;
