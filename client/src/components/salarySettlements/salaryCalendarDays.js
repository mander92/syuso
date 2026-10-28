export const salaryCalendarDays = (month) => {
    const [year, monthNumber] = String(month || '').split('-').map(Number);
    if (!year || !monthNumber) return [];
    const start = new Date(Date.UTC(year, monthNumber - 1, 1));
    const count = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
    const offset = (start.getUTCDay() + 6) % 7;
    const days = [
        ...Array(offset).fill(null),
        ...Array.from(
            { length: count },
            (_, index) => `${month}-${String(index + 1).padStart(2, '0')}`
        ),
    ];
    return [...days, ...Array((7 - (days.length % 7)) % 7).fill(null)];
};
