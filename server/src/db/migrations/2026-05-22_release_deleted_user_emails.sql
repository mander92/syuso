UPDATE users
SET
    email = CONCAT('deleted+', id, '@deleted.local'),
    dni = NULL
WHERE deletedAt IS NOT NULL
  AND email NOT LIKE 'deleted+%@deleted.local';
