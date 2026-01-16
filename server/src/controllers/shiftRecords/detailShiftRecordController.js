import selectShiftRecordByIdService from '../../services/shiftRecords/selectShiftRecordByIdService.js';
import ensureServiceDelegationAccessService from '../../services/delegations/ensureServiceDelegationAccessService.js';

const detailShiftRecordController = async (req, res, next) => {
    try {
        const { shiftRecordId } = req.params;

        const data = await selectShiftRecordByIdService(shiftRecordId);

        if (data?.serviceId) {
            await ensureServiceDelegationAccessService(
                data.serviceId,
                req.userLogged.id,
                req.userLogged.role
            );
        }

        res.send({
            status: 'ok',
            data,
        });
    } catch (error) {
        next(error);
    }
};
export default detailShiftRecordController;
