-- El torneo pasa al domingo 27 de septiembre de 2026: arranca a las 4:00 PM y el
-- formulario cierra una hora antes, a las 3:00 PM (CDMX, UTC-6 todo el año).
UPDATE tournaments
SET starts_at = '2026-09-27 16:00:00-06',
    registration_closes_at = '2026-09-27 15:00:00-06',
    updated_at = now()
WHERE slug = 'monster-agl-1v1-2026-09';
