import {
    MISSED_SHIFT_CHECK_INTERVAL_MS,
    MISSED_SHIFT_GRACE_MINUTES,
} from '../../env.js';
import notifyMissedScheduleShiftsService from '../services/schedules/missedShiftNotificationService.js';

const toPositiveInteger = (value, fallback) => {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? Math.floor(number) : fallback;
};

const CHECK_INTERVAL_MS = toPositiveInteger(
    MISSED_SHIFT_CHECK_INTERVAL_MS,
    60 * 1000
);
const GRACE_MINUTES = toPositiveInteger(MISSED_SHIFT_GRACE_MINUTES, 10);

let isRunning = false;
let intervalId = null;

const runMissedShiftNotificationCheck = async () => {
    if (isRunning) return;
    isRunning = true;

    try {
        const result = await notifyMissedScheduleShiftsService({
            graceMinutes: GRACE_MINUTES,
        });

        if (result.processed > 0 || process.env.PUSH_DEBUG === '1') {
            console.log('[missed-shift-notifications]', result);
        }
    } catch (error) {
        console.error('[missed-shift-notifications] failed', {
            message: error.message,
        });
    } finally {
        isRunning = false;
    }
};

export const startMissedShiftNotificationJob = () => {
    if (intervalId) return intervalId;

    setTimeout(runMissedShiftNotificationCheck, 15 * 1000).unref?.();
    intervalId = setInterval(
        runMissedShiftNotificationCheck,
        CHECK_INTERVAL_MS
    );
    intervalId.unref?.();

    console.log('[missed-shift-notifications] started', {
        intervalMs: CHECK_INTERVAL_MS,
        graceMinutes: GRACE_MINUTES,
    });

    return intervalId;
};

export default startMissedShiftNotificationJob;
