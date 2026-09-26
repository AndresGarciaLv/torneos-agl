-- Hora de cierre del formulario público. El torneo del 26-sep cierra inscripciones
-- una hora antes de empezar: 4:00 PM en Ciudad de México (UTC-6 todo el año).
-- Un torneo sin hora propia cierra cuando empieza.
ALTER TABLE tournaments ADD COLUMN registration_closes_at timestamptz;

UPDATE tournaments SET registration_closes_at = '2026-09-26 16:00:00-06'
WHERE slug = 'monster-agl-1v1-2026-09';

UPDATE tournaments SET registration_closes_at = starts_at WHERE registration_closes_at IS NULL;

ALTER TABLE tournaments
  ALTER COLUMN registration_closes_at SET NOT NULL,
  ADD CONSTRAINT tournaments_closes_before_start CHECK (registration_closes_at <= starts_at);
