-- Altas manuales desde el panel: el organizador puede inscribir a alguien del chat
-- sin correo. El CHECK de formato sigue valiendo para los que sí lo traen
-- (un CHECK sobre NULL no falla), y el índice único ignora los NULL.
ALTER TABLE participants ALTER COLUMN email DROP NOT NULL;
