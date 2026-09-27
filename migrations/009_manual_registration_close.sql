-- Las inscripciones ya no cierran por hora: el organizador las cierra a mano desde
-- el panel. La columna registration_closes_at queda sin uso.
ALTER TABLE tournaments ADD COLUMN registration_closed boolean NOT NULL DEFAULT false;
