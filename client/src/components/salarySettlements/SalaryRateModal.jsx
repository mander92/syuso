import './SalaryRateModal.css';

const emptyRateForm = {
    serviceId: '',
    employeeId: '',
    payMode: 'hourly',
    amountType: 'gross',
    regularRate: '',
    nightRate: '',
    holidayRate: '',
    extraRate: '',
    fixedAmount: '',
    notes: '',
};

const serviceLabel = (service) =>
    service.name || service.type || service.serviceName || 'Servicio';

const employeeLabel = (employee) =>
    employee.employeeName ||
    `${employee.firstName || ''} ${employee.lastName || ''}`.trim() ||
    employee.email ||
    'Trabajador';

const SalaryRateModal = ({
    open,
    title = 'Tarifa guardada',
    form,
    onChange,
    onClose,
    onSubmit,
    serviceOptions = [],
    employeeOptions = [],
    agreement,
    saving = false,
    lockService = false,
    hideEmployee = false,
}) => {
    if (!open) return null;

    const rateForm = { ...emptyRateForm, ...(form || {}) };
    const updateField = (field, value) => {
        onChange?.({
            ...rateForm,
            [field]: value,
            amountType:
                field === 'payMode' && value === 'agreement'
                    ? 'gross'
                    : rateForm.amountType,
        });
    };

    return (
        <div className='salary-rate-modal' role='dialog' aria-modal='true'>
            <button
                type='button'
                className='salary-rate-modal__backdrop'
                onClick={onClose}
                aria-label='Cerrar tarifa'
            />
            <form className='salary-rate-modal__panel' onSubmit={onSubmit}>
                <div className='salary-rate-modal__header'>
                    <h3>{title}</h3>
                    <button type='button' onClick={onClose}>
                        Cerrar
                    </button>
                </div>

                <div className='salary-rate-modal__grid'>
                    <label>
                        Servicio
                        <select
                            value={rateForm.serviceId}
                            disabled={lockService}
                            onChange={(event) =>
                                updateField('serviceId', event.target.value)
                            }
                        >
                            <option value=''>Selecciona</option>
                            {serviceOptions.map((service) => (
                                <option key={service.id} value={service.id}>
                                    {serviceLabel(service)}
                                </option>
                            ))}
                        </select>
                    </label>
                    {!hideEmployee ? (
                        <label>
                            Trabajador concreto
                            <select
                                value={rateForm.employeeId}
                                onChange={(event) =>
                                    updateField('employeeId', event.target.value)
                                }
                            >
                                <option value=''>Todos en ese servicio</option>
                                {employeeOptions.map((employee) => (
                                    <option key={employee.id} value={employee.id}>
                                        {employeeLabel(employee)}
                                    </option>
                                ))}
                            </select>
                        </label>
                    ) : null}
                    <label>
                        Modo
                        <select
                            value={rateForm.payMode}
                            onChange={(event) =>
                                updateField('payMode', event.target.value)
                            }
                        >
                            <option value='hourly'>Por horas</option>
                            <option value='fixed'>Fijo</option>
                            <option value='agreement'>Convenio</option>
                        </select>
                    </label>
                    <label>
                        Tipo
                        <select
                            value={rateForm.amountType}
                            disabled={rateForm.payMode === 'agreement'}
                            onChange={(event) =>
                                updateField('amountType', event.target.value)
                            }
                        >
                            <option value='gross'>Bruto</option>
                            <option value='net'>Neto</option>
                        </select>
                    </label>
                    <label>
                        Hora base
                        <input
                            type='number'
                            step='0.01'
                            value={rateForm.regularRate}
                            onChange={(event) =>
                                updateField('regularRate', event.target.value)
                            }
                        />
                    </label>
                    <label>
                        Nocturna
                        <input
                            type='number'
                            step='0.01'
                            value={rateForm.nightRate}
                            placeholder={String(agreement?.nightRate || '')}
                            onChange={(event) =>
                                updateField('nightRate', event.target.value)
                            }
                        />
                    </label>
                    <label>
                        Festiva
                        <input
                            type='number'
                            step='0.01'
                            value={rateForm.holidayRate}
                            placeholder={String(agreement?.holidayRate || '')}
                            onChange={(event) =>
                                updateField('holidayRate', event.target.value)
                            }
                        />
                    </label>
                    <label>
                        Extra
                        <input
                            type='number'
                            step='0.01'
                            value={rateForm.extraRate}
                            onChange={(event) =>
                                updateField('extraRate', event.target.value)
                            }
                        />
                    </label>
                    <label>
                        Fijo
                        <input
                            type='number'
                            step='0.01'
                            value={rateForm.fixedAmount}
                            onChange={(event) =>
                                updateField('fixedAmount', event.target.value)
                            }
                        />
                    </label>
                </div>

                <label>
                    Notas
                    <input
                        value={rateForm.notes}
                        onChange={(event) => updateField('notes', event.target.value)}
                    />
                </label>

                {rateForm.payMode === 'agreement' ? (
                    <p className='salary-rate-modal__note'>
                        Convenio Seguridad Privada: bruto, 162 h/mes,
                        nocturnidad 22:00-06:00 y extras sobre 162 h. Si dejas
                        nocturna o festiva a 0 se aplica el plus oficial del ano.
                    </p>
                ) : null}

                <div className='salary-rate-modal__actions'>
                    <button type='button' onClick={onClose}>
                        Cancelar
                    </button>
                    <button type='submit' disabled={saving}>
                        {saving ? 'Guardando...' : 'Guardar tarifa'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export { emptyRateForm };
export default SalaryRateModal;
