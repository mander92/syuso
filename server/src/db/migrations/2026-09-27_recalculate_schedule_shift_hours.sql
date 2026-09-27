-- Corrige las horas historicas para que siempre procedan de inicio y fin.
UPDATE serviceScheduleShifts
SET
    hours = ROUND(
        CASE
            WHEN TIME_TO_SEC(endTime) <= TIME_TO_SEC(startTime)
                THEN (TIME_TO_SEC(endTime) + 86400 - TIME_TO_SEC(startTime)) / 3600
            ELSE (TIME_TO_SEC(endTime) - TIME_TO_SEC(startTime)) / 3600
        END,
        2
    ),
    realHours = ROUND(
        CASE
            WHEN TIME_TO_SEC(endTime) <= TIME_TO_SEC(startTime)
                THEN (TIME_TO_SEC(endTime) + 86400 - TIME_TO_SEC(startTime)) / 3600
            ELSE (TIME_TO_SEC(endTime) - TIME_TO_SEC(startTime)) / 3600
        END,
        2
    )
WHERE startTime IS NOT NULL
  AND endTime IS NOT NULL;

DROP TRIGGER IF EXISTS serviceScheduleShifts_calculate_hours_insert;
CREATE TRIGGER serviceScheduleShifts_calculate_hours_insert
BEFORE INSERT ON serviceScheduleShifts
FOR EACH ROW
SET NEW.hours = ROUND(
    CASE
        WHEN TIME_TO_SEC(NEW.endTime) <= TIME_TO_SEC(NEW.startTime)
            THEN (TIME_TO_SEC(NEW.endTime) + 86400 - TIME_TO_SEC(NEW.startTime)) / 3600
        ELSE (TIME_TO_SEC(NEW.endTime) - TIME_TO_SEC(NEW.startTime)) / 3600
    END,
    2
);

DROP TRIGGER IF EXISTS serviceScheduleShifts_calculate_hours_update;
CREATE TRIGGER serviceScheduleShifts_calculate_hours_update
BEFORE UPDATE ON serviceScheduleShifts
FOR EACH ROW
SET NEW.hours = ROUND(
    CASE
        WHEN TIME_TO_SEC(NEW.endTime) <= TIME_TO_SEC(NEW.startTime)
            THEN (TIME_TO_SEC(NEW.endTime) + 86400 - TIME_TO_SEC(NEW.startTime)) / 3600
        ELSE (TIME_TO_SEC(NEW.endTime) - TIME_TO_SEC(NEW.startTime)) / 3600
    END,
    2
);
