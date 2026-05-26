const spanishMonths = new Map([
    ['enero', '01'],
    ['febrero', '02'],
    ['marzo', '03'],
    ['abril', '04'],
    ['mayo', '05'],
    ['junio', '06'],
    ['julio', '07'],
    ['agosto', '08'],
    ['septiembre', '09'],
    ['setiembre', '09'],
    ['octubre', '10'],
    ['noviembre', '11'],
    ['diciembre', '12'],
]);

export const normalizePayrollText = (value) =>
    String(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();

const levenshtein = (a, b) => {
    const matrix = Array.from({ length: b.length + 1 }, (_, index) => [index]);
    for (let index = 0; index <= a.length; index += 1) matrix[0][index] = index;

    for (let row = 1; row <= b.length; row += 1) {
        for (let col = 1; col <= a.length; col += 1) {
            matrix[row][col] =
                b.charAt(row - 1) === a.charAt(col - 1)
                    ? matrix[row - 1][col - 1]
                    : Math.min(
                          matrix[row - 1][col - 1] + 1,
                          matrix[row][col - 1] + 1,
                          matrix[row - 1][col] + 1
                      );
        }
    }

    return matrix[b.length][a.length];
};

export const detectPayrollDni = (text) => {
    const match = String(text || '').match(/\b\d{7,8}[A-Za-z]\b/);
    return match ? match[0].toUpperCase() : '';
};

export const detectPayrollMonth = (text, fallbackFileName = '') => {
    const source = normalizePayrollText(`${text} ${fallbackFileName}`);
    const numeric = source.match(/\b(20\d{2})\s*(0[1-9]|1[0-2])\b/);
    if (numeric) return `${numeric[1]}-${numeric[2]}`;

    const numericReverse = source.match(/\b(0[1-9]|1[0-2])\s*(20\d{2})\b/);
    if (numericReverse) return `${numericReverse[2]}-${numericReverse[1]}`;

    for (const [monthName, monthNumber] of spanishMonths.entries()) {
        const match = source.match(new RegExp(`\\b${monthName}\\b\\s*(20\\d{2})`));
        if (match) return `${match[1]}-${monthNumber}`;
    }

    const reverse = source.match(
        /\b(20\d{2})\b.*\b(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\b/
    );
    if (reverse) return `${reverse[1]}-${spanishMonths.get(reverse[2])}`;

    return '';
};

export const detectEmployeeMatch = ({ text, fileName, employees }) => {
    const detectedDni = detectPayrollDni(text);
    const normalizedText = normalizePayrollText(`${text} ${fileName}`);

    if (detectedDni) {
        const byDni = employees.find(
            (employee) =>
                String(employee.dni || '').toUpperCase().replace(/\s/g, '') ===
                detectedDni
        );
        if (byDni) {
            return {
                employee: byDni,
                detectedDni,
                detectedName: `${byDni.firstName || ''} ${
                    byDni.lastName || ''
                }`.trim(),
                confidence: 'dni',
            };
        }
    }

    const scored = employees
        .map((employee) => {
            const name = `${employee.firstName || ''} ${employee.lastName || ''}`.trim();
            const normalizedName = normalizePayrollText(name);
            if (!normalizedName) return null;
            if (normalizedText.includes(normalizedName)) {
                return { employee, name, score: 1 };
            }
            const words = normalizedName.split(' ').filter((word) => word.length > 2);
            const matchingWords = words.filter((word) =>
                normalizedText.includes(word)
            ).length;
            const wordScore = words.length ? matchingWords / words.length : 0;
            const distance = levenshtein(
                normalizedName.slice(0, 80),
                normalizedText.slice(0, 120)
            );
            const distanceScore = Math.max(0, 1 - distance / 90);
            return {
                employee,
                name,
                score: Math.max(wordScore, distanceScore * 0.55),
            };
        })
        .filter(Boolean)
        .sort((a, b) => b.score - a.score);

    const best = scored[0];
    if (best && best.score >= 0.55) {
        return {
            employee: best.employee,
            detectedDni,
            detectedName: best.name,
            confidence: best.score >= 0.85 ? 'name' : 'similar',
        };
    }

    return {
        employee: null,
        detectedDni,
        detectedName: '',
        confidence: 'none',
    };
};
