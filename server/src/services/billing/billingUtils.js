export const parseEmails = (value) =>
    Array.isArray(value)
        ? value.map((item) => String(item).trim()).filter(Boolean)
        : String(value || '')
              .split(/[\s,;]+/)
              .map((item) => item.trim())
              .filter(Boolean);

export const serializeEmails = (value) => parseEmails(value).join(', ');

export const formatCurrency = (value) =>
    `${(Number(value) || 0).toFixed(2).replace('.', ',')} €`;

export const formatDate = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString('es-ES');
};
