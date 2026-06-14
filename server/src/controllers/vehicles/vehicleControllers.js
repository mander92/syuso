import {
    assignVehiclesToServiceService,
    createVehicleFuelLogService,
    createVehicleInspectionService,
    deleteVehicleService,
    listServiceVehiclesService,
    listVehicleLogsService,
    listVehiclesService,
    upsertVehicleService,
} from '../../services/vehicles/vehicleService.js';

export const listVehiclesController = async (req, res, next) => {
    try {
        const vehicles = await listVehiclesService(req.query);
        const logs = await listVehicleLogsService();
        res.send({ status: 'ok', data: { vehicles, ...logs } });
    } catch (error) {
        next(error);
    }
};

export const createVehicleController = async (req, res, next) => {
    try {
        const data = await upsertVehicleService({ payload: req.body });
        res.send({ status: 'ok', data });
    } catch (error) {
        next(error);
    }
};

export const updateVehicleController = async (req, res, next) => {
    try {
        const data = await upsertVehicleService({
            vehicleId: req.params.vehicleId,
            payload: req.body,
        });
        res.send({ status: 'ok', data });
    } catch (error) {
        next(error);
    }
};

export const deleteVehicleController = async (req, res, next) => {
    try {
        const data = await deleteVehicleService(req.params.vehicleId);
        res.send({ status: 'ok', data });
    } catch (error) {
        next(error);
    }
};

export const assignVehiclesToServiceController = async (req, res, next) => {
    try {
        const data = await assignVehiclesToServiceService({
            serviceId: req.params.serviceId,
            vehicleIds: req.body.vehicleIds || [],
            userId: req.userLogged.id,
            role: req.userLogged.role,
        });
        res.send({ status: 'ok', data });
    } catch (error) {
        next(error);
    }
};

export const listServiceVehiclesController = async (req, res, next) => {
    try {
        const data = await listServiceVehiclesService({
            serviceId: req.params.serviceId,
            userId: req.userLogged.id,
            role: req.userLogged.role,
        });
        res.send({ status: 'ok', data });
    } catch (error) {
        next(error);
    }
};

export const createVehicleFuelLogController = async (req, res, next) => {
    try {
        const data = await createVehicleFuelLogService({
            vehicleId: req.params.vehicleId,
            serviceId: req.body.serviceId || null,
            employeeId: req.userLogged.id,
            payload: req.body,
            ticketFile: req.files?.ticket || null,
        });
        res.send({ status: 'ok', data });
    } catch (error) {
        next(error);
    }
};

export const createVehicleInspectionController = async (req, res, next) => {
    try {
        const data = await createVehicleInspectionService({
            serviceId: req.params.serviceId,
            vehicleId: req.params.vehicleId,
            employeeId: req.userLogged.id,
            role: req.userLogged.role,
            payload: req.body,
            files: req.files || {},
        });
        res.send({ status: 'ok', data });
    } catch (error) {
        next(error);
    }
};
