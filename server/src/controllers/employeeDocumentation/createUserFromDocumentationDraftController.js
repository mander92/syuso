import randomstring from 'randomstring';

import generateErrorUtil from '../../utils/generateErrorUtil.js';
import insertAdminService from '../../services/users/insertUserAdminService.js';
import selectEmployeeDocumentationDraftService from '../../services/employeeDocumentation/selectEmployeeDocumentationDraftService.js';
import upsertEmployeeDocumentationDraftService from '../../services/employeeDocumentation/upsertEmployeeDocumentationDraftService.js';
import upsertEmployeeDocumentationService from '../../services/employeeDocumentation/upsertEmployeeDocumentationService.js';

const createUserFromDocumentationDraftController = async (req, res, next) => {
    try {
        const { draftId } = req.params;
        const draft = await selectEmployeeDocumentationDraftService(draftId);
        if (!draft) generateErrorUtil('Ficha pendiente no encontrada', 404);
        if (draft.linkedUserId) {
            generateErrorUtil('Esta ficha ya esta vinculada a un trabajador', 409);
        }

        const required = ['firstName', 'lastName', 'email', 'dni', 'phone'];
        const missing = required.filter((field) => !draft[field]);
        if (missing.length) {
            generateErrorUtil(
                `Faltan datos para crear el trabajador: ${missing.join(', ')}`,
                400
            );
        }

        const password = randomstring.generate(10);
        const userId = await insertAdminService(
            'employee',
            draft.email,
            password,
            draft.firstName,
            draft.lastName,
            draft.dni,
            draft.phone,
            'Vigilante',
            null,
            [],
            null
        );

        await upsertEmployeeDocumentationService(userId, {
            birthDate: draft.birthDate,
            bankAccount: draft.bankAccount,
            dniFrontPath: draft.dniFrontPath,
            dniBackPath: draft.dniBackPath,
            tipFrontPath: draft.tipFrontPath,
            tipBackPath: draft.tipBackPath,
            address: draft.address,
            phone: draft.phone,
            socialSecurityNumber: draft.socialSecurityNumber,
            status: 'submitted',
            reviewNotes: draft.reviewNotes,
        });

        await upsertEmployeeDocumentationDraftService(draftId, {
            linkedUserId: userId,
            status: 'converted',
        });

        const data = await selectEmployeeDocumentationDraftService(draftId);
        res.send({ status: 'ok', data });
    } catch (error) {
        next(error);
    }
};

export default createUserFromDocumentationDraftController;

