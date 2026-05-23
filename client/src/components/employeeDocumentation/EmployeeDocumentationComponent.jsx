import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AuthContext } from '../../context/AuthContext.jsx';
import useUser from '../../hooks/useUser.js';
import {
    fetchEmployeeDocumentation,
    fetchClientDocumentations,
    fetchClientDocumentationDrafts,
    fetchEmployeeDocumentationDrafts,
    fetchEmployeeDocumentations,
    fetchEmployeeSignatureDocuments,
    fetchMyEmployeeDocumentation,
    createEmployeeSignatureDocument,
    createDocumentationDraftLink,
    createClientDocumentationDraftLink,
    createClientFromDocumentationDraft,
    deleteClientDocumentationDraft,
    deleteEmployeeDocumentationDraft,
    createUserFromDocumentationDraft,
    openEmployeeDocumentationFile,
    openEmployeeDocumentationDraftFile,
    openEmployeeSignatureDocumentFile,
    openClientDocumentationFile,
    openClientDocumentationDraftFile,
    saveClientDocumentation,
    saveClientDocumentationDraft,
    saveEmployeeDocumentation,
    saveEmployeeDocumentationDraft,
    signEmployeeSignatureDocument,
} from '../../services/employeeDocumentationService.js';
import './EmployeeDocumentationComponent.css';

const fileFields = [
    ['dniFrontPath', 'DNI anverso'],
    ['dniBackPath', 'DNI reverso'],
    ['tipFrontPath', 'TIP anverso'],
    ['tipBackPath', 'TIP reverso'],
];

const clientFileFields = [
    ['acceptedBudgetPath', 'Presupuesto aceptado'],
    ['serviceContractPath', 'Contrato de prestacion del servicio'],
];

const signatureDocumentTypes = [
    ['epi', 'EPIS'],
    ['information', 'Informacion'],
    ['dataProtection', 'Proteccion de datos'],
    ['contract', 'Contrato'],
    ['medical', 'Reconocimiento medico'],
    ['riskAssessment', 'Evaluacion de riesgos'],
    ['tax', 'Modelo 145'],
    ['workday', 'Registro jornada'],
    ['other', 'Otro'],
];

const signatureDocumentTypeLabels = Object.fromEntries(signatureDocumentTypes);

const signatureDocumentFilters = [
    ['all', 'Todos'],
    ['profile', 'Ficha'],
    ...signatureDocumentTypes,
];

const statusLabels = {
    pending: 'Pendiente',
    submitted: 'Enviada',
    reviewed: 'Revisada',
    rejected: 'Rechazada',
};

const getStatusClassName = (status) =>
    `employee-documentation-status employee-documentation-status--${
        status || 'pending'
    }`;

const emptyForm = {
    firstName: '',
    lastName: '',
    email: '',
    birthDate: '',
    bankAccount: '',
    address: '',
    phone: '',
    socialSecurityNumber: '',
    dni: '',
    status: 'pending',
    reviewNotes: '',
};

const emptyClientForm = {
    displayName: '',
    taxId: '',
    phone: '',
    email: '',
    contactPerson: '',
    authorizations: '',
    paymentMethod: '',
    status: 'pending',
    reviewNotes: '',
};

const toDateInput = (value) => {
    if (!value) return '';
    const match = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : '';
};

const normalizeDocumentation = (data) => ({
    ...emptyForm,
    ...data,
    phone: data?.phone || data?.userPhone || '',
    birthDate: toDateInput(data?.birthDate),
    status: data?.status || 'pending',
});

const normalizeClientDocumentation = (data) => ({
    ...emptyClientForm,
    ...data,
    displayName:
        data?.displayName ||
        `${data?.firstName || ''} ${data?.lastName || ''}`.trim(),
    taxId: data?.taxId || data?.userTaxId || '',
    phone: data?.phone || data?.userPhone || '',
    email: data?.email || data?.userEmail || '',
    status: data?.status || 'pending',
});

const EmployeeDocumentationComponent = () => {
    const { authToken } = useContext(AuthContext);
    const { user } = useUser();
    const isAdminLike = user?.role === 'admin' || user?.role === 'sudo';
    const [items, setItems] = useState([]);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [form, setForm] = useState(emptyForm);
    const [files, setFiles] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [activeFilter, setActiveFilter] = useState('all');
    const [adminMode, setAdminMode] = useState('employees');
    const [clientItems, setClientItems] = useState([]);
    const [selectedClientId, setSelectedClientId] = useState('');
    const [clientForm, setClientForm] = useState(emptyClientForm);
    const [clientFiles, setClientFiles] = useState({});
    const [clientDrafts, setClientDrafts] = useState([]);
    const [selectedClientDraftId, setSelectedClientDraftId] = useState('');
    const [clientDraftForm, setClientDraftForm] = useState({
        ...emptyClientForm,
        status: 'draft',
    });
    const [clientDraftFiles, setClientDraftFiles] = useState({});
    const [drafts, setDrafts] = useState([]);
    const [selectedDraftId, setSelectedDraftId] = useState('');
    const [draftForm, setDraftForm] = useState({
        ...emptyForm,
        status: 'draft',
    });
    const [draftFiles, setDraftFiles] = useState({});
    const [signatureDocuments, setSignatureDocuments] = useState([]);
    const [signatureDocumentForm, setSignatureDocumentForm] = useState({
        title: '',
        documentType: 'other',
        dueDate: '',
        periodMonth: '',
    });
    const [signatureDocumentFile, setSignatureDocumentFile] = useState(null);
    const [signatureTypeFilter, setSignatureTypeFilter] = useState('all');
    const [signingDocument, setSigningDocument] = useState(null);
    const [hasSignature, setHasSignature] = useState(false);
    const signatureCanvasRef = useRef(null);

    const selectedItem = useMemo(
        () =>
            isAdminLike
                ? items.find((item) => item.userId === selectedUserId)
                : form,
        [form, isAdminLike, items, selectedUserId]
    );

    const filteredItems = useMemo(() => {
        const term = search.trim().toLowerCase();
        return items.filter((item) => {
            const isActive =
                item.active === 1 || item.active === true || item.active === '1';
            if (activeFilter === 'active' && !isActive) return false;
            if (activeFilter === 'inactive' && isActive) return false;

            if (!term) return true;

            const fullName = `${item.firstName || ''} ${item.lastName || ''}`.toLowerCase();
            return (
                fullName.includes(term) ||
                String(item.email || '').toLowerCase().includes(term) ||
                String(item.city || '').toLowerCase().includes(term)
            );
        });
    }, [activeFilter, items, search]);

    const filteredDrafts = useMemo(() => {
        const term = search.trim().toLowerCase();
        return drafts.filter((item) => {
            if (!term) return true;
            const fullName = `${item.firstName || ''} ${item.lastName || ''}`.toLowerCase();
            return (
                fullName.includes(term) ||
                String(item.email || '').toLowerCase().includes(term) ||
                String(item.dni || '').toLowerCase().includes(term)
            );
        });
    }, [drafts, search]);

    const filteredClients = useMemo(() => {
        const term = search.trim().toLowerCase();
        return clientItems.filter((item) => {
            const isActive =
                item.active === 1 || item.active === true || item.active === '1';
            if (activeFilter === 'active' && !isActive) return false;
            if (activeFilter === 'inactive' && isActive) return false;

            if (!term) return true;

            const label =
                item.displayName ||
                `${item.firstName || ''} ${item.lastName || ''}`;
            return (
                String(label).toLowerCase().includes(term) ||
                String(item.email || item.userEmail || '').toLowerCase().includes(term) ||
                String(item.taxId || item.userTaxId || '').toLowerCase().includes(term)
            );
        });
    }, [activeFilter, clientItems, search]);

    const filteredClientDrafts = useMemo(() => {
        const term = search.trim().toLowerCase();
        return clientDrafts.filter((item) => {
            if (!term) return true;
            return (
                String(item.displayName || '').toLowerCase().includes(term) ||
                String(item.email || '').toLowerCase().includes(term) ||
                String(item.taxId || '').toLowerCase().includes(term)
            );
        });
    }, [clientDrafts, search]);

    const visibleSignatureDocuments = useMemo(() => {
        const targetEmployeeId = isAdminLike ? selectedUserId : user?.id;
        return signatureDocuments.filter((document) => {
            if (targetEmployeeId && document.employeeId !== targetEmployeeId) {
                return false;
            }
            if (
                signatureTypeFilter !== 'all' &&
                signatureTypeFilter !== 'profile' &&
                document.documentType !== signatureTypeFilter
            ) {
                return false;
            }
            return true;
        });
    }, [
        isAdminLike,
        selectedUserId,
        signatureDocuments,
        signatureTypeFilter,
        user?.id,
    ]);

    const load = async () => {
        if (!authToken) return;
        setLoading(true);
        try {
            if (isAdminLike) {
                const data = await fetchEmployeeDocumentations(authToken);
                const draftData = await fetchEmployeeDocumentationDrafts(authToken);
                const clientData = await fetchClientDocumentations(authToken);
                const clientDraftData =
                    await fetchClientDocumentationDrafts(authToken);
                const signatureData = await fetchEmployeeSignatureDocuments({
                    authToken,
                });
                setItems(data || []);
                setDrafts(draftData || []);
                setClientItems(clientData || []);
                setClientDrafts(clientDraftData || []);
                setSignatureDocuments(signatureData || []);
                const firstId = data?.[0]?.userId || '';
                setSelectedUserId((prev) => prev || firstId);
                if (firstId && !selectedUserId) {
                    setForm(normalizeDocumentation(data[0]));
                }
            } else {
                const data = await fetchMyEmployeeDocumentation(authToken);
                const signatureData = await fetchEmployeeSignatureDocuments({
                    authToken,
                });
                setForm(normalizeDocumentation(data));
                setSignatureDocuments(signatureData || []);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load().catch((error) => alert(error.message));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authToken, isAdminLike]);

    const selectEmployee = async (userId) => {
        setSelectedUserId(userId);
        setFiles({});
        const data = await fetchEmployeeDocumentation(authToken, userId);
        setForm(normalizeDocumentation(data));
    };

    const selectDraft = (draft) => {
        setSelectedDraftId(draft?.id || '');
        setDraftFiles({});
        setDraftForm({
            ...emptyForm,
            ...draft,
            birthDate: toDateInput(draft?.birthDate),
            status: draft?.status || 'draft',
        });
    };

    const handleChange = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleDraftChange = (field, value) => {
        setDraftForm((prev) => ({ ...prev, [field]: value }));
    };

    const reloadSignatureDocuments = async () => {
        const data = await fetchEmployeeSignatureDocuments({ authToken });
        setSignatureDocuments(data || []);
    };

    const handleCreateSignatureDocument = async (event) => {
        event.preventDefault();
        if (!selectedUserId) {
            alert('Selecciona un trabajador');
            return;
        }
        setSaving(true);
        try {
            await createEmployeeSignatureDocument({
                authToken,
                employeeId: selectedUserId,
                title: signatureDocumentForm.title,
                documentType: signatureDocumentForm.documentType,
                dueDate: signatureDocumentForm.dueDate,
                periodMonth: signatureDocumentForm.periodMonth,
                document: signatureDocumentFile,
            });
            setSignatureDocumentForm({
                title: '',
                documentType: 'other',
                dueDate: '',
                periodMonth: '',
            });
            setSignatureDocumentFile(null);
            await reloadSignatureDocuments();
            alert('Documento enviado para firma.');
        } catch (error) {
            alert(error.message || 'No se pudo enviar el documento');
        } finally {
            setSaving(false);
        }
    };

    const getSignaturePoint = (event) => {
        const canvas = signatureCanvasRef.current;
        if (!canvas) return null;
        const source = event.touches?.[0] || event;
        const rect = canvas.getBoundingClientRect();
        return {
            x: source.clientX - rect.left,
            y: source.clientY - rect.top,
        };
    };

    const drawSignature = (event) => {
        if (!signingDocument?.drawing) return;
        event.preventDefault();
        const canvas = signatureCanvasRef.current;
        const point = getSignaturePoint(event);
        if (!canvas || !point) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#0f172a';
        ctx.lineTo(point.x, point.y);
        ctx.stroke();
        setHasSignature(true);
    };

    const startSignature = (event) => {
        event.preventDefault();
        const canvas = signatureCanvasRef.current;
        const point = getSignaturePoint(event);
        if (!canvas || !point) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.beginPath();
        ctx.moveTo(point.x, point.y);
        setSigningDocument((prev) => ({ ...prev, drawing: true }));
    };

    const endSignature = () => {
        setSigningDocument((prev) =>
            prev ? { ...prev, drawing: false } : prev
        );
    };

    const clearSignature = () => {
        const canvas = signatureCanvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setHasSignature(false);
    };

    const openSignModal = (document) => {
        setSigningDocument({ ...document, drawing: false });
        setHasSignature(false);
        setTimeout(clearSignature, 0);
    };

    const handleSignDocument = async () => {
        const canvas = signatureCanvasRef.current;
        if (!canvas || !signingDocument || !hasSignature) {
            alert('La firma es obligatoria');
            return;
        }
        try {
            await signEmployeeSignatureDocument({
                authToken,
                documentId: signingDocument.id,
                signature: canvas.toDataURL('image/png'),
            });
            setSigningDocument(null);
            await reloadSignatureDocuments();
            alert('Documento firmado.');
        } catch (error) {
            alert(error.message || 'No se pudo firmar el documento');
        }
    };

    const handleOpenSignatureDocumentFile = async (documentId, fileType) => {
        try {
            await openEmployeeSignatureDocumentFile({
                authToken,
                documentId,
                fileType,
            });
        } catch (error) {
            alert(error.message || 'No se pudo abrir el archivo');
        }
    };

    const selectClient = (client) => {
        setSelectedClientId(client?.clientId || '');
        setClientFiles({});
        setClientForm(normalizeClientDocumentation(client));
    };

    const handleClientChange = (field, value) => {
        setClientForm((prev) => ({ ...prev, [field]: value }));
    };

    const selectClientDraft = (draft) => {
        setSelectedClientDraftId(draft?.id || '');
        setClientDraftFiles({});
        setClientDraftForm({
            ...emptyClientForm,
            ...draft,
            status: draft?.status || 'draft',
        });
    };

    const handleClientDraftChange = (field, value) => {
        setClientDraftForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleSaveClient = async (event) => {
        event.preventDefault();
        setSaving(true);
        try {
            const data = await saveClientDocumentation({
                authToken,
                clientId: selectedClientId || null,
                data: clientForm,
                files: clientFiles,
            });
            setSelectedClientId(data.clientId);
            setClientForm(normalizeClientDocumentation(data));
            setClientFiles({});
            const list = await fetchClientDocumentations(authToken);
            setClientItems(list || []);
            alert('Ficha de cliente guardada correctamente.');
        } catch (error) {
            alert(error.message || 'Error guardando cliente');
        } finally {
            setSaving(false);
        }
    };

    const handleOpenClientFile = async (field) => {
        try {
            await openClientDocumentationFile({
                authToken,
                clientId: selectedClientId,
                field,
            });
        } catch (error) {
            alert(error.message || 'No se pudo abrir el archivo');
        }
    };

    const handleOpenClientDraftFile = async (field) => {
        try {
            await openClientDocumentationDraftFile({
                authToken,
                draftId: selectedClientDraftId,
                field,
            });
        } catch (error) {
            alert(error.message || 'No se pudo abrir el archivo');
        }
    };

    const handleSaveClientDraft = async (event) => {
        event.preventDefault();
        setSaving(true);
        try {
            const data = await saveClientDocumentationDraft({
                authToken,
                draftId: selectedClientDraftId || null,
                data: clientDraftForm,
                files: clientDraftFiles,
            });
            setSelectedClientDraftId(data.id);
            setClientDraftForm({
                ...emptyClientForm,
                ...data,
                status: data.status || 'draft',
            });
            setClientDraftFiles({});
            const list = await fetchClientDocumentationDrafts(authToken);
            setClientDrafts(list || []);
            alert('Alta de cliente guardada.');
        } catch (error) {
            alert(error.message || 'Error guardando alta de cliente');
        } finally {
            setSaving(false);
        }
    };

    const handleCreateClientDraftLink = async () => {
        try {
            let draftId = selectedClientDraftId;

            if (!draftId) {
                const savedDraft = await saveClientDocumentationDraft({
                    authToken,
                    draftId: null,
                    data: clientDraftForm,
                    files: clientDraftFiles,
                });
                draftId = savedDraft.id;
                setSelectedClientDraftId(savedDraft.id);
                setClientDraftForm({
                    ...emptyClientForm,
                    ...savedDraft,
                    status: savedDraft.status || 'draft',
                });
                setClientDraftFiles({});
                const list = await fetchClientDocumentationDrafts(authToken);
                setClientDrafts(list || []);
            }

            const data = await createClientDocumentationDraftLink(
                authToken,
                draftId
            );
            const clientName = clientDraftForm.displayName || 'cliente';
            const text = `Hola ${clientName}, por favor completa la ficha de cliente de SYUSO en este enlace privado: ${data.url}. El enlace caduca en 7 dias.`;

            try {
                await navigator.clipboard.writeText(text);
                alert('Enlace copiado para enviarlo por WhatsApp.');
            } catch {
                window.prompt('Copia este texto para WhatsApp:', text);
            }
        } catch (error) {
            alert(error.message || 'No se pudo generar el enlace');
        }
    };

    const handleCreateClientFromDraft = async () => {
        if (!selectedClientDraftId) return;
        if (
            !window.confirm(
                'Se creara un cliente interno con esta ficha. Continuar?'
            )
        ) {
            return;
        }
        try {
            const data = await createClientFromDocumentationDraft(
                authToken,
                selectedClientDraftId
            );
            setClientDraftForm({
                ...emptyClientForm,
                ...data,
                status: data.status || 'converted',
            });
            const [draftList, clientList] = await Promise.all([
                fetchClientDocumentationDrafts(authToken),
                fetchClientDocumentations(authToken),
            ]);
            setClientDrafts(draftList || []);
            setClientItems(clientList || []);
            alert('Cliente creado y documentacion vinculada.');
        } catch (error) {
            alert(error.message || 'No se pudo crear el cliente');
        }
    };

    const handleDeleteClientDraft = async () => {
        if (!selectedClientDraftId) return;
        if (
            !window.confirm(
                'Se borrara esta alta de cliente. Si ya creo un cliente interno y no tiene servicios, tambien se liberara su correo. Continuar?'
            )
        ) {
            return;
        }

        try {
            await deleteClientDocumentationDraft(authToken, selectedClientDraftId);
            const list = await fetchClientDocumentationDrafts(authToken);
            setClientDrafts(list || []);
            const nextDraft = list?.[0] || null;
            if (nextDraft) {
                selectClientDraft(nextDraft);
            } else {
                setSelectedClientDraftId('');
                setClientDraftFiles({});
                setClientDraftForm({
                    ...emptyClientForm,
                    status: 'draft',
                });
            }
            alert('Alta de cliente borrada.');
        } catch (error) {
            alert(error.message || 'No se pudo borrar el alta de cliente');
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setSaving(true);
        try {
            const payload = {
                birthDate: form.birthDate,
                bankAccount: form.bankAccount,
                address: form.address,
                phone: form.phone,
                socialSecurityNumber: form.socialSecurityNumber,
                status: form.status,
                reviewNotes: form.reviewNotes,
            };
            const data = await saveEmployeeDocumentation({
                authToken,
                userId: isAdminLike ? selectedUserId : null,
                data: payload,
                files,
            });
            setForm(normalizeDocumentation(data));
            setFiles({});
            if (isAdminLike) {
                const list = await fetchEmployeeDocumentations(authToken);
                setItems(list || []);
            }
            alert('Ficha guardada correctamente.');
        } catch (error) {
            alert(error.message || 'Error guardando documentacion');
        } finally {
            setSaving(false);
        }
    };

    const handleOpenFile = async (field) => {
        try {
            await openEmployeeDocumentationFile({
                authToken,
                userId: isAdminLike ? selectedUserId : user.id,
                field,
            });
        } catch (error) {
            alert(error.message || 'No se pudo abrir el archivo');
        }
    };

    const handleOpenDraftFile = async (field) => {
        try {
            await openEmployeeDocumentationDraftFile({
                authToken,
                draftId: selectedDraftId,
                field,
            });
        } catch (error) {
            alert(error.message || 'No se pudo abrir el archivo');
        }
    };

    const handleSaveDraft = async (event) => {
        event.preventDefault();
        setSaving(true);
        try {
            const data = await saveEmployeeDocumentationDraft({
                authToken,
                draftId: selectedDraftId || null,
                data: {
                    firstName: draftForm.firstName,
                    lastName: draftForm.lastName,
                    email: draftForm.email,
                    dni: draftForm.dni,
                    birthDate: draftForm.birthDate,
                    bankAccount: draftForm.bankAccount,
                    address: draftForm.address,
                    phone: draftForm.phone,
                    socialSecurityNumber: draftForm.socialSecurityNumber,
                    status: draftForm.status,
                    reviewNotes: draftForm.reviewNotes,
                },
                files: draftFiles,
            });
            setSelectedDraftId(data.id);
            setDraftForm({
                ...emptyForm,
                ...data,
                birthDate: toDateInput(data.birthDate),
                status: data.status || 'draft',
            });
            setDraftFiles({});
            const list = await fetchEmployeeDocumentationDrafts(authToken);
            setDrafts(list || []);
            alert('Alta pendiente guardada.');
        } catch (error) {
            alert(error.message || 'Error guardando alta pendiente');
        } finally {
            setSaving(false);
        }
    };

    const handleCreateWorkerFromDraft = async () => {
        if (!selectedDraftId) return;
        if (
            !window.confirm(
                'Se creara un trabajador con esta ficha y se le enviaran credenciales por email. Continuar?'
            )
        ) {
            return;
        }
        try {
            const data = await createUserFromDocumentationDraft(
                authToken,
                selectedDraftId
            );
            setDraftForm({
                ...emptyForm,
                ...data,
                birthDate: toDateInput(data.birthDate),
                status: data.status || 'converted',
            });
            const [draftList, employeeList] = await Promise.all([
                fetchEmployeeDocumentationDrafts(authToken),
                fetchEmployeeDocumentations(authToken),
            ]);
            setDrafts(draftList || []);
            setItems(employeeList || []);
            alert('Trabajador creado y documentacion vinculada.');
        } catch (error) {
            alert(error.message || 'No se pudo crear el trabajador');
        }
    };

    const handleDeleteEmployeeDraft = async () => {
        if (!selectedDraftId) return;
        if (
            !window.confirm(
                'Se borrara esta alta de trabajador y sus enlaces de formulario. Si ya creo un trabajador y no tiene actividad, tambien se liberara su correo. Continuar?'
            )
        ) {
            return;
        }

        try {
            await deleteEmployeeDocumentationDraft(authToken, selectedDraftId);
            const list = await fetchEmployeeDocumentationDrafts(authToken);
            setDrafts(list || []);
            const nextDraft = list?.[0] || null;
            if (nextDraft) {
                selectDraft(nextDraft);
            } else {
                setSelectedDraftId('');
                setDraftFiles({});
                setDraftForm({
                    ...emptyForm,
                    status: 'draft',
                });
            }
            alert('Alta de trabajador borrada.');
        } catch (error) {
            alert(error.message || 'No se pudo borrar el alta de trabajador');
        }
    };

    const handleCreateDraftLink = async () => {
        try {
            let draftId = selectedDraftId;

            if (!draftId) {
                const savedDraft = await saveEmployeeDocumentationDraft({
                    authToken,
                    draftId: null,
                    data: {
                        firstName: draftForm.firstName,
                        lastName: draftForm.lastName,
                        email: draftForm.email,
                        dni: draftForm.dni,
                        birthDate: draftForm.birthDate,
                        bankAccount: draftForm.bankAccount,
                        address: draftForm.address,
                        phone: draftForm.phone,
                        socialSecurityNumber: draftForm.socialSecurityNumber,
                        status: draftForm.status || 'draft',
                        reviewNotes: draftForm.reviewNotes,
                    },
                    files: draftFiles,
                });

                draftId = savedDraft.id;
                setSelectedDraftId(savedDraft.id);
                setDraftForm({
                    ...emptyForm,
                    ...savedDraft,
                    birthDate: toDateInput(savedDraft.birthDate),
                    status: savedDraft.status || 'draft',
                });
                setDraftFiles({});

                const list = await fetchEmployeeDocumentationDrafts(authToken);
                setDrafts(list || []);
            }

            const data = await createDocumentationDraftLink(
                authToken,
                draftId
            );
            const employeeName =
                `${draftForm.firstName || ''} ${draftForm.lastName || ''}`.trim() ||
                'compañero/a';
            const text = `Hola ${employeeName}, por favor completa tu ficha de alta de SYUSO en este enlace privado: ${data.url}. El enlace caduca en 7 dias.`;

            try {
                await navigator.clipboard.writeText(text);
                alert('Enlace copiado para enviarlo por WhatsApp.');
            } catch {
                window.prompt('Copia este texto para WhatsApp:', text);
            }
        } catch (error) {
            alert(error.message || 'No se pudo generar el enlace');
        }
    };

    const handleCopyInstructions = async () => {
        const employeeName =
            `${form.firstName || ''} ${form.lastName || ''}`.trim() ||
            'compañero/a';
        const loginUrl = `${window.location.origin}/login`;
        const text = `Hola ${employeeName}, por favor entra en ${loginUrl} con tu usuario de SYUSO y completa tu ficha en Mi cuenta > Mi documentacion. Ahi podras rellenar tus datos y subir DNI/TIP de forma privada.`;

        try {
            await navigator.clipboard.writeText(text);
            alert('Texto copiado para enviarlo por WhatsApp o email.');
        } catch {
            window.prompt('Copia este texto:', text);
        }
    };

    if (loading) {
        return <p>Cargando documentacion...</p>;
    }

    return (
        <section className='employee-documentation'>
            <header className='employee-documentation-header'>
                <div>
                    <h2>Documentacion de trabajadores</h2>
                    <p>
                        Gestiona la ficha documental y las imagenes de DNI/TIP.
                    </p>
                </div>
                {isAdminLike ? (
                    <button
                        type='button'
                        className='employee-documentation-btn employee-documentation-btn--ghost'
                        onClick={handleCopyInstructions}
                        disabled={!selectedUserId}
                    >
                        Copiar instrucciones
                    </button>
                ) : null}
            </header>

            {isAdminLike ? (
                <div className='employee-documentation-tabs'>
                    <button
                        type='button'
                        className={adminMode === 'employees' ? 'active' : ''}
                        onClick={() => {
                            setAdminMode('employees');
                            setActiveFilter('active');
                        }}
                    >
                        Trabajadores
                    </button>
                    <button
                        type='button'
                        className={adminMode === 'drafts' ? 'active' : ''}
                        onClick={() => {
                            setAdminMode('drafts');
                            if (!selectedDraftId && drafts[0]) {
                                selectDraft(drafts[0]);
                            }
                        }}
                    >
                        Alta trabajadores
                    </button>
                    <button
                        type='button'
                        className={adminMode === 'clients' ? 'active' : ''}
                        onClick={() => {
                            setAdminMode('clients');
                            setActiveFilter('all');
                            if (!selectedClientId && clientItems[0]) {
                                selectClient(clientItems[0]);
                            }
                        }}
                    >
                        Clientes
                    </button>
                    <button
                        type='button'
                        className={adminMode === 'clientDrafts' ? 'active' : ''}
                        onClick={() => {
                            setAdminMode('clientDrafts');
                            if (!selectedClientDraftId && clientDrafts[0]) {
                                selectClientDraft(clientDrafts[0]);
                            }
                        }}
                    >
                        Altas clientes
                    </button>
                </div>
            ) : null}

            {isAdminLike && adminMode === 'clientDrafts' ? (
                <div className='employee-documentation-layout'>
                    <aside className='employee-documentation-list'>
                        <div className='employee-documentation-list-filters'>
                            <input
                                type='search'
                                placeholder='Buscar alta cliente...'
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                            />
                            <button
                                type='button'
                                className='employee-documentation-btn'
                                onClick={() => {
                                    setSelectedClientDraftId('');
                                    setClientDraftFiles({});
                                    setClientDraftForm({
                                        ...emptyClientForm,
                                        status: 'draft',
                                    });
                                }}
                            >
                                Nueva alta
                            </button>
                        </div>
                        <p className='employee-documentation-list-count'>
                            {filteredClientDrafts.length} altas
                        </p>
                        {filteredClientDrafts.map((item) => (
                            <button
                                key={item.id}
                                type='button'
                                className={
                                    item.id === selectedClientDraftId
                                        ? 'active'
                                        : ''
                                }
                                onClick={() => selectClientDraft(item)}
                            >
                                <span>
                                    {item.displayName ||
                                        item.email ||
                                        'Sin nombre'}
                                </span>
                                <span className='employee-documentation-status'>
                                    {item.status || 'draft'}
                                </span>
                            </button>
                        ))}
                    </aside>

                    <form
                        className='employee-documentation-form'
                        onSubmit={handleSaveClientDraft}
                    >
                        <div className='employee-documentation-grid'>
                            {[
                                ['displayName', 'Nombre y apellidos / razon social'],
                                ['taxId', 'DNI/NIE/CIF'],
                                ['phone', 'Telefono de contacto'],
                                ['email', 'Correo electronico'],
                                ['contactPerson', 'Persona responsable/contacto'],
                                ['paymentMethod', 'Metodo de pago'],
                            ].map(([field, label]) => (
                                <div
                                    key={field}
                                    className='employee-documentation-field'
                                >
                                    <label>{label}</label>
                                    <input
                                        type={field === 'email' ? 'email' : 'text'}
                                        value={clientDraftForm[field] || ''}
                                        onChange={(event) =>
                                            handleClientDraftChange(
                                                field,
                                                event.target.value
                                            )
                                        }
                                    />
                                </div>
                            ))}
                            <div className='employee-documentation-field'>
                                <label>Estado</label>
                                <select
                                    value={clientDraftForm.status || 'draft'}
                                    onChange={(event) =>
                                        handleClientDraftChange(
                                            'status',
                                            event.target.value
                                        )
                                    }
                                >
                                    <option value='draft'>Borrador</option>
                                    <option value='pending'>Pendiente</option>
                                    <option value='reviewed'>Revisada</option>
                                    <option value='converted'>Convertida</option>
                                    <option value='rejected'>Rechazada</option>
                                </select>
                            </div>
                            <div className='employee-documentation-field employee-documentation-field--wide'>
                                <label>Autorizaciones necesarias</label>
                                <textarea
                                    rows='3'
                                    value={clientDraftForm.authorizations || ''}
                                    onChange={(event) =>
                                        handleClientDraftChange(
                                            'authorizations',
                                            event.target.value
                                        )
                                    }
                                />
                            </div>
                            <div className='employee-documentation-field employee-documentation-field--wide'>
                                <label>Notas internas</label>
                                <textarea
                                    rows='3'
                                    value={clientDraftForm.reviewNotes || ''}
                                    onChange={(event) =>
                                        handleClientDraftChange(
                                            'reviewNotes',
                                            event.target.value
                                        )
                                    }
                                />
                            </div>
                        </div>

                        <div className='employee-documentation-files'>
                            {clientFileFields.map(([field, label]) => (
                                <div
                                    key={field}
                                    className='employee-documentation-file'
                                >
                                    <span>{label}</span>
                                    <input
                                        type='file'
                                        accept='application/pdf'
                                        onChange={(event) =>
                                            setClientDraftFiles((prev) => ({
                                                ...prev,
                                                [field]: event.target.files?.[0],
                                            }))
                                        }
                                    />
                                    <div className='employee-documentation-file-actions'>
                                        {clientDraftForm?.[field] &&
                                        selectedClientDraftId ? (
                                            <button
                                                type='button'
                                                className='employee-documentation-btn employee-documentation-btn--ghost'
                                                onClick={() =>
                                                    handleOpenClientDraftFile(field)
                                                }
                                            >
                                                Ver PDF
                                            </button>
                                        ) : (
                                            <span>Sin archivo</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className='employee-documentation-actions'>
                            <button
                                type='button'
                                className='employee-documentation-btn employee-documentation-btn--ghost'
                                disabled={saving || clientDraftForm.linkedClientId}
                                onClick={handleCreateClientDraftLink}
                            >
                                Copiar enlace WhatsApp
                            </button>
                            <button
                                type='button'
                                className='employee-documentation-btn employee-documentation-btn--ghost'
                                disabled={
                                    !selectedClientDraftId ||
                                    clientDraftForm.linkedClientId
                                }
                                onClick={handleCreateClientFromDraft}
                            >
                                Crear cliente
                            </button>
                            <button
                                type='submit'
                                className='employee-documentation-btn'
                                disabled={saving}
                            >
                                {saving ? 'Guardando...' : 'Guardar alta'}
                            </button>
                            <button
                                type='button'
                                className='employee-documentation-btn employee-documentation-btn--danger'
                                disabled={!selectedClientDraftId || saving}
                                onClick={handleDeleteClientDraft}
                            >
                                Borrar alta
                            </button>
                        </div>
                    </form>
                </div>
            ) : isAdminLike && adminMode === 'clients' ? (
                <div className='employee-documentation-layout'>
                    <aside className='employee-documentation-list'>
                        <div className='employee-documentation-list-filters'>
                            <input
                                type='search'
                                placeholder='Buscar cliente...'
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                            />
                            <select
                                value={activeFilter}
                                onChange={(event) =>
                                    setActiveFilter(event.target.value)
                                }
                            >
                                <option value='active'>Activos</option>
                                <option value='inactive'>Internos/inactivos</option>
                                <option value='all'>Todos</option>
                            </select>
                            <button
                                type='button'
                                className='employee-documentation-btn'
                                onClick={() => {
                                    setSelectedClientId('');
                                    setClientFiles({});
                                    setClientForm(emptyClientForm);
                                }}
                            >
                                Nuevo cliente
                            </button>
                        </div>
                        <p className='employee-documentation-list-count'>
                            {filteredClients.length} clientes
                        </p>
                        {filteredClients.map((item) => {
                            const label =
                                item.displayName ||
                                `${item.firstName || ''} ${item.lastName || ''}`.trim() ||
                                item.userEmail ||
                                'Cliente';
                            return (
                                <button
                                    key={item.clientId}
                                    type='button'
                                    className={
                                        item.clientId === selectedClientId
                                            ? 'active'
                                            : ''
                                    }
                                    onClick={() => selectClient(item)}
                                >
                                    <span>{label}</span>
                                    <span className='employee-documentation-list-badges'>
                                        <span className={getStatusClassName(item.status)}>
                                            {statusLabels[item.status || 'pending']}
                                        </span>
                                        <span className='employee-documentation-status'>
                                            {item.active ? 'Activo' : 'Interno'}
                                        </span>
                                    </span>
                                </button>
                            );
                        })}
                    </aside>

                    <form
                        className='employee-documentation-form'
                        onSubmit={handleSaveClient}
                    >
                        <div className='employee-documentation-grid'>
                            {[
                                ['displayName', 'Nombre y apellidos / razon social'],
                                ['taxId', 'DNI/NIE/CIF'],
                                ['phone', 'Telefono de contacto'],
                                ['email', 'Correo electronico'],
                                ['contactPerson', 'Persona responsable/contacto'],
                                ['paymentMethod', 'Metodo de pago'],
                            ].map(([field, label]) => (
                                <div
                                    key={field}
                                    className='employee-documentation-field'
                                >
                                    <label>{label}</label>
                                    <input
                                        type={field === 'email' ? 'email' : 'text'}
                                        value={clientForm[field] || ''}
                                        onChange={(event) =>
                                            handleClientChange(
                                                field,
                                                event.target.value
                                            )
                                        }
                                        required={
                                            field === 'displayName' ||
                                            field === 'email'
                                        }
                                    />
                                </div>
                            ))}
                            <div className='employee-documentation-field'>
                                <label>Estado</label>
                                <select
                                    value={clientForm.status || 'pending'}
                                    onChange={(event) =>
                                        handleClientChange(
                                            'status',
                                            event.target.value
                                        )
                                    }
                                >
                                    <option value='pending'>Pendiente</option>
                                    <option value='reviewed'>Revisado</option>
                                    <option value='rejected'>Rechazado</option>
                                </select>
                            </div>
                            <div className='employee-documentation-field employee-documentation-field--wide'>
                                <label>Autorizaciones necesarias</label>
                                <textarea
                                    rows='3'
                                    value={clientForm.authorizations || ''}
                                    onChange={(event) =>
                                        handleClientChange(
                                            'authorizations',
                                            event.target.value
                                        )
                                    }
                                />
                            </div>
                            <div className='employee-documentation-field employee-documentation-field--wide'>
                                <label>Notas internas</label>
                                <textarea
                                    rows='3'
                                    value={clientForm.reviewNotes || ''}
                                    onChange={(event) =>
                                        handleClientChange(
                                            'reviewNotes',
                                            event.target.value
                                        )
                                    }
                                />
                            </div>
                        </div>

                        <div className='employee-documentation-files'>
                            {clientFileFields.map(([field, label]) => (
                                <div
                                    key={field}
                                    className='employee-documentation-file'
                                >
                                    <span>{label}</span>
                                    <input
                                        type='file'
                                        accept='application/pdf'
                                        onChange={(event) =>
                                            setClientFiles((prev) => ({
                                                ...prev,
                                                [field]: event.target.files?.[0],
                                            }))
                                        }
                                    />
                                    <div className='employee-documentation-file-actions'>
                                        {clientForm?.[field] && selectedClientId ? (
                                            <button
                                                type='button'
                                                className='employee-documentation-btn employee-documentation-btn--ghost'
                                                onClick={() =>
                                                    handleOpenClientFile(field)
                                                }
                                            >
                                                Ver PDF
                                            </button>
                                        ) : (
                                            <span>Sin archivo</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className='employee-documentation-actions'>
                            <button
                                type='submit'
                                className='employee-documentation-btn'
                                disabled={saving}
                            >
                                {saving ? 'Guardando...' : 'Guardar cliente'}
                            </button>
                        </div>
                    </form>
                </div>
            ) : isAdminLike && adminMode === 'drafts' ? (
                <div className='employee-documentation-layout'>
                    <aside className='employee-documentation-list'>
                        <div className='employee-documentation-list-filters'>
                            <input
                                type='search'
                                placeholder='Buscar alta...'
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                            />
                            <button
                                type='button'
                                className='employee-documentation-btn'
                                onClick={() => {
                                    setSelectedDraftId('');
                                    setDraftFiles({});
                                    setDraftForm({
                                        ...emptyForm,
                                        status: 'draft',
                                    });
                                }}
                            >
                                Nueva alta
                            </button>
                        </div>
                        <p className='employee-documentation-list-count'>
                            {filteredDrafts.length} altas
                        </p>
                        {filteredDrafts.map((item) => (
                            <button
                                key={item.id}
                                type='button'
                                className={item.id === selectedDraftId ? 'active' : ''}
                                onClick={() => selectDraft(item)}
                            >
                                <span>
                                    {item.firstName || 'Sin nombre'}{' '}
                                    {item.lastName || ''}
                                </span>
                                <span className='employee-documentation-status'>
                                    {item.status || 'draft'}
                                </span>
                            </button>
                        ))}
                    </aside>

                    <form
                        className='employee-documentation-form'
                        onSubmit={handleSaveDraft}
                    >
                        <div className='employee-documentation-grid'>
                            {[
                                ['firstName', 'Nombre'],
                                ['lastName', 'Apellidos'],
                                ['email', 'Email'],
                                ['dni', 'DNI'],
                                ['birthDate', 'Fecha de nacimiento'],
                                ['bankAccount', 'Numero de cuenta bancaria'],
                                ['socialSecurityNumber', 'Numero Seguridad Social'],
                                ['phone', 'Telefono'],
                            ].map(([field, label]) => (
                                <div
                                    key={field}
                                    className='employee-documentation-field'
                                >
                                    <label>{label}</label>
                                    <input
                                        type={field === 'birthDate' ? 'date' : 'text'}
                                        value={draftForm[field] || ''}
                                        onChange={(event) =>
                                            handleDraftChange(
                                                field,
                                                event.target.value
                                            )
                                        }
                                    />
                                </div>
                            ))}
                            <div className='employee-documentation-field'>
                                <label>Estado</label>
                                <select
                                    value={draftForm.status || 'draft'}
                                    onChange={(event) =>
                                        handleDraftChange(
                                            'status',
                                            event.target.value
                                        )
                                    }
                                >
                                    <option value='draft'>Borrador</option>
                                    <option value='pending'>Pendiente</option>
                                    <option value='reviewed'>Revisada</option>
                                    <option value='converted'>Convertida</option>
                                    <option value='rejected'>Rechazada</option>
                                </select>
                            </div>
                            <div className='employee-documentation-field employee-documentation-field--wide'>
                                <label>Direccion</label>
                                <input
                                    value={draftForm.address || ''}
                                    onChange={(event) =>
                                        handleDraftChange(
                                            'address',
                                            event.target.value
                                        )
                                    }
                                />
                            </div>
                            <div className='employee-documentation-field employee-documentation-field--wide'>
                                <label>Notas internas</label>
                                <textarea
                                    rows='3'
                                    value={draftForm.reviewNotes || ''}
                                    onChange={(event) =>
                                        handleDraftChange(
                                            'reviewNotes',
                                            event.target.value
                                        )
                                    }
                                />
                            </div>
                        </div>

                        <div className='employee-documentation-files'>
                            {fileFields.map(([field, label]) => (
                                <div
                                    key={field}
                                    className='employee-documentation-file'
                                >
                                    <span>{label}</span>
                                    <input
                                        type='file'
                                        accept='image/png,image/jpeg,image/webp'
                                        onChange={(event) =>
                                            setDraftFiles((prev) => ({
                                                ...prev,
                                                [field]: event.target.files?.[0],
                                            }))
                                        }
                                    />
                                    <div className='employee-documentation-file-actions'>
                                        {draftForm?.[field] && selectedDraftId ? (
                                            <button
                                                type='button'
                                                className='employee-documentation-btn employee-documentation-btn--ghost'
                                                onClick={() =>
                                                    handleOpenDraftFile(field)
                                                }
                                            >
                                                Ver archivo
                                            </button>
                                        ) : (
                                            <span>Sin archivo</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className='employee-documentation-actions'>
                            <button
                                type='button'
                                className='employee-documentation-btn employee-documentation-btn--ghost'
                                disabled={saving || draftForm.linkedUserId}
                                onClick={handleCreateDraftLink}
                            >
                                Copiar enlace WhatsApp
                            </button>
                            <button
                                type='button'
                                className='employee-documentation-btn employee-documentation-btn--ghost'
                                disabled={!selectedDraftId || draftForm.linkedUserId}
                                onClick={handleCreateWorkerFromDraft}
                            >
                                Crear trabajador
                            </button>
                            <button
                                type='submit'
                                className='employee-documentation-btn'
                                disabled={saving}
                            >
                                {saving ? 'Guardando...' : 'Guardar alta'}
                            </button>
                            <button
                                type='button'
                                className='employee-documentation-btn employee-documentation-btn--danger'
                                disabled={!selectedDraftId || saving}
                                onClick={handleDeleteEmployeeDraft}
                            >
                                Borrar alta
                            </button>
                        </div>
                    </form>
                </div>
            ) : (

            <div className='employee-documentation-layout'>
                {isAdminLike ? (
                    <aside className='employee-documentation-list'>
                        <div className='employee-documentation-list-filters'>
                            <input
                                type='search'
                                placeholder='Buscar trabajador...'
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                            />
                        </div>
                        <p className='employee-documentation-list-count'>
                            {filteredItems.length} trabajadores
                        </p>
                        {filteredItems.map((item) => (
                            <button
                                key={item.userId}
                                type='button'
                                className={
                                    item.userId === selectedUserId
                                        ? 'active'
                                        : ''
                                }
                                onClick={() =>
                                    selectEmployee(item.userId).catch((error) =>
                                        alert(error.message)
                                    )
                                }
                            >
                                <span>
                                    {item.firstName} {item.lastName}
                                </span>
                                <span className='employee-documentation-list-badges'>
                                    <span className={getStatusClassName(item.status)}>
                                        {statusLabels[item.status || 'pending']}
                                    </span>
                                    <span className='employee-documentation-status'>
                                        {item.active ? 'Activo' : 'Inactivo'}
                                    </span>
                                </span>
                            </button>
                        ))}
                        {!filteredItems.length ? (
                            <p className='employee-documentation-empty'>
                                No hay trabajadores con ese filtro.
                            </p>
                        ) : null}
                    </aside>
                ) : null}

                <form
                    className='employee-documentation-form'
                    onSubmit={handleSubmit}
                >
                    <div className='employee-documentation-grid'>
                        <div className='employee-documentation-field'>
                            <label>Nombre</label>
                            <input value={form.firstName || ''} disabled />
                        </div>
                        <div className='employee-documentation-field'>
                            <label>Apellidos</label>
                            <input value={form.lastName || ''} disabled />
                        </div>
                        <div className='employee-documentation-field'>
                            <label>Email</label>
                            <input value={form.email || ''} disabled />
                        </div>
                        <div className='employee-documentation-field'>
                            <label>Fecha de nacimiento</label>
                            <input
                                type='date'
                                value={form.birthDate || ''}
                                onChange={(event) =>
                                    handleChange('birthDate', event.target.value)
                                }
                            />
                        </div>
                        <div className='employee-documentation-field'>
                            <label>Numero de cuenta bancaria</label>
                            <input
                                value={form.bankAccount || ''}
                                onChange={(event) =>
                                    handleChange('bankAccount', event.target.value)
                                }
                            />
                        </div>
                        <div className='employee-documentation-field'>
                            <label>Numero Seguridad Social</label>
                            <input
                                value={form.socialSecurityNumber || ''}
                                onChange={(event) =>
                                    handleChange(
                                        'socialSecurityNumber',
                                        event.target.value
                                    )
                                }
                            />
                        </div>
                        <div className='employee-documentation-field'>
                            <label>Telefono</label>
                            <input
                                value={form.phone || ''}
                                onChange={(event) =>
                                    handleChange('phone', event.target.value)
                                }
                            />
                        </div>
                        {isAdminLike ? (
                            <div className='employee-documentation-field'>
                                <label>Estado</label>
                                <select
                                    value={form.status || 'pending'}
                                    onChange={(event) =>
                                        handleChange('status', event.target.value)
                                    }
                                >
                                    <option value='pending'>Pendiente</option>
                                    <option value='submitted'>Enviada</option>
                                    <option value='reviewed'>Revisada</option>
                                    <option value='rejected'>Rechazada</option>
                                </select>
                            </div>
                        ) : null}
                        <div className='employee-documentation-field employee-documentation-field--wide'>
                            <label>Direccion</label>
                            <input
                                value={form.address || ''}
                                onChange={(event) =>
                                    handleChange('address', event.target.value)
                                }
                            />
                        </div>
                        {isAdminLike ? (
                            <div className='employee-documentation-field employee-documentation-field--wide'>
                                <label>Notas internas</label>
                                <textarea
                                    rows='3'
                                    value={form.reviewNotes || ''}
                                    onChange={(event) =>
                                        handleChange(
                                            'reviewNotes',
                                            event.target.value
                                        )
                                    }
                                />
                            </div>
                        ) : null}
                    </div>

                    <div className='employee-documentation-files'>
                        {fileFields.map(([field, label]) => (
                            <div
                                key={field}
                                className='employee-documentation-file'
                            >
                                <span>{label}</span>
                                <input
                                    type='file'
                                    accept='image/png,image/jpeg,image/webp'
                                    onChange={(event) =>
                                        setFiles((prev) => ({
                                            ...prev,
                                            [field]: event.target.files?.[0],
                                        }))
                                    }
                                />
                                <div className='employee-documentation-file-actions'>
                                    {selectedItem?.[field] ? (
                                        <button
                                            type='button'
                                            className='employee-documentation-btn employee-documentation-btn--ghost'
                                            onClick={() => handleOpenFile(field)}
                                        >
                                            Ver archivo
                                        </button>
                                    ) : (
                                        <span>Sin archivo</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className='employee-signature-documents'>
                        <div className='employee-signature-documents__header'>
                            <div>
                                <h3>Documentos para firma</h3>
                                <p>
                                    Documentos asignados al trabajador para revisar y firmar.
                                </p>
                            </div>
                        </div>

                        <div className='employee-signature-documents__filters'>
                            {signatureDocumentFilters.map(([value, label]) => (
                                <button
                                    key={value}
                                    type='button'
                                    className={`employee-signature-filter employee-signature-filter--${value} ${
                                        signatureTypeFilter === value ? 'active' : ''
                                    }`}
                                    onClick={() => setSignatureTypeFilter(value)}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>

                        {isAdminLike ? (
                            <div className='employee-signature-documents__create'>
                                <div className='employee-documentation-field'>
                                    <label>Titulo</label>
                                    <input
                                        value={signatureDocumentForm.title}
                                        onChange={(event) =>
                                            setSignatureDocumentForm((prev) => ({
                                                ...prev,
                                                title: event.target.value,
                                            }))
                                        }
                                        placeholder='Entrega EPIS, contrato...'
                                    />
                                </div>
                                <div className='employee-documentation-field'>
                                    <label>Tipo</label>
                                    <select
                                        value={signatureDocumentForm.documentType}
                                        onChange={(event) =>
                                            setSignatureDocumentForm((prev) => ({
                                                ...prev,
                                                documentType: event.target.value,
                                            }))
                                        }
                                    >
                                        {signatureDocumentTypes.map(
                                            ([value, label]) => (
                                                <option key={value} value={value}>
                                                    {label}
                                                </option>
                                            )
                                        )}
                                    </select>
                                </div>
                                <div className='employee-documentation-field'>
                                    <label>Fecha limite</label>
                                    <input
                                        type='date'
                                        value={signatureDocumentForm.dueDate}
                                        onChange={(event) =>
                                            setSignatureDocumentForm((prev) => ({
                                                ...prev,
                                                dueDate: event.target.value,
                                            }))
                                        }
                                    />
                                </div>
                                <div className='employee-documentation-field'>
                                    <label>Mes</label>
                                    <input
                                        type='month'
                                        value={signatureDocumentForm.periodMonth}
                                        onChange={(event) =>
                                            setSignatureDocumentForm((prev) => ({
                                                ...prev,
                                                periodMonth: event.target.value,
                                            }))
                                        }
                                    />
                                </div>
                                <div className='employee-documentation-field'>
                                    <label>Documento</label>
                                    <input
                                        type='file'
                                        accept='.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                                        onChange={(event) =>
                                            setSignatureDocumentFile(
                                                event.target.files?.[0] || null
                                            )
                                        }
                                    />
                                </div>
                                <button
                                    type='button'
                                    className='employee-documentation-btn'
                                    disabled={
                                        saving ||
                                        !selectedUserId ||
                                        !signatureDocumentForm.title ||
                                        !signatureDocumentFile
                                    }
                                    onClick={handleCreateSignatureDocument}
                                >
                                    Enviar para firma
                                </button>
                            </div>
                        ) : null}

                        <div className='employee-signature-documents__list'>
                            {visibleSignatureDocuments.map((document) => (
                                <article
                                    key={document.id}
                                    className='employee-signature-document-card'
                                >
                                    <div>
                                        <strong>{document.title}</strong>
                                        <span>
                                            {signatureDocumentTypeLabels[
                                                document.documentType
                                            ] || 'Otro'}
                                        </span>
                                        {document.periodMonth ? (
                                            <small>Mes: {document.periodMonth}</small>
                                        ) : null}
                                        {document.dueDate ? (
                                            <small>
                                                Fecha limite:{' '}
                                                {String(document.dueDate).slice(0, 10)}
                                            </small>
                                        ) : null}
                                        {isAdminLike ? (
                                            <small>
                                                {document.firstName}{' '}
                                                {document.lastName}
                                            </small>
                                        ) : null}
                                    </div>
                                    <span
                                        className={`employee-documentation-status employee-documentation-status--${document.status}`}
                                    >
                                        {document.status === 'signed'
                                            ? 'Firmado'
                                            : 'Pendiente'}
                                    </span>
                                    <div className='employee-documentation-file-actions'>
                                        <button
                                            type='button'
                                            className='employee-documentation-btn employee-documentation-btn--ghost'
                                            onClick={() =>
                                                handleOpenSignatureDocumentFile(
                                                    document.id,
                                                    'original'
                                                )
                                            }
                                        >
                                            Ver documento
                                        </button>
                                        {document.status === 'signed' ? (
                                            <button
                                                type='button'
                                                className='employee-documentation-btn employee-documentation-btn--ghost'
                                                onClick={() =>
                                                    handleOpenSignatureDocumentFile(
                                                        document.id,
                                                        'signature'
                                                    )
                                                }
                                            >
                                                Ver firma
                                            </button>
                                        ) : !isAdminLike ? (
                                            <button
                                                type='button'
                                                className='employee-documentation-btn'
                                                onClick={() => openSignModal(document)}
                                            >
                                                Firmar
                                            </button>
                                        ) : null}
                                    </div>
                                </article>
                            ))}
                            {!visibleSignatureDocuments.length ? (
                                <p className='employee-documentation-empty'>
                                    No hay documentos pendientes de firma.
                                </p>
                            ) : null}
                        </div>
                    </div>

                    <div className='employee-documentation-actions'>
                        <button
                            type='submit'
                            className='employee-documentation-btn'
                            disabled={saving || (isAdminLike && !selectedUserId)}
                        >
                            {saving ? 'Guardando...' : 'Guardar ficha'}
                        </button>
                    </div>
                </form>
            </div>
            )}
            {signingDocument ? (
                <div
                    className='employee-signature-modal'
                    role='presentation'
                    onClick={() => setSigningDocument(null)}
                >
                    <div
                        className='employee-signature-modal__panel'
                        role='dialog'
                        aria-modal='true'
                        onClick={(event) => event.stopPropagation()}
                    >
                        <header>
                            <div>
                                <h3>Firmar documento</h3>
                                <p>{signingDocument.title}</p>
                            </div>
                            <button
                                type='button'
                                className='employee-documentation-btn employee-documentation-btn--ghost'
                                onClick={() => setSigningDocument(null)}
                            >
                                Cerrar
                            </button>
                        </header>
                        <canvas
                            ref={signatureCanvasRef}
                            width='680'
                            height='220'
                            className='employee-signature-canvas'
                            onMouseDown={startSignature}
                            onMouseMove={drawSignature}
                            onMouseUp={endSignature}
                            onMouseLeave={endSignature}
                            onTouchStart={startSignature}
                            onTouchMove={drawSignature}
                            onTouchEnd={endSignature}
                        />
                        <div className='employee-documentation-actions'>
                            <button
                                type='button'
                                className='employee-documentation-btn employee-documentation-btn--ghost'
                                onClick={clearSignature}
                            >
                                Limpiar firma
                            </button>
                            <button
                                type='button'
                                className='employee-documentation-btn'
                                onClick={handleSignDocument}
                            >
                                Guardar firma
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </section>
    );
};

export default EmployeeDocumentationComponent;
