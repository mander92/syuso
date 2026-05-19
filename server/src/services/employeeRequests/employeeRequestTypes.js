export const employeeRequestTypeLabels = {
    vacation: 'Vacaciones',
    days_off: 'Dias libres',
    weekend_rest: 'Fin de semana de descanso',
    availability: 'Disponibilidad eventual',
};

export const absenceTypeByRequestType = {
    vacation: 'vacation',
    days_off: 'off',
    weekend_rest: 'off',
    availability: 'available',
};

export const normalizeEmployeeRequestType = (value) => {
    const normalized = String(value || '').trim().toLowerCase();
    const map = {
        vacaciones: 'vacation',
        vacation: 'vacation',
        libre: 'days_off',
        libres: 'days_off',
        dias_libres: 'days_off',
        days_off: 'days_off',
        descanso: 'weekend_rest',
        finde: 'weekend_rest',
        fin_de_semana: 'weekend_rest',
        weekend_rest: 'weekend_rest',
        disponibilidad: 'availability',
        available: 'availability',
        availability: 'availability',
    };
    return map[normalized] || normalized;
};
