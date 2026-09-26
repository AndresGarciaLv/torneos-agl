-- El torneo del sábado 26 de septiembre de 2026, 5:00 PM en Ciudad de México.
-- CDMX no tiene horario de verano desde 2022: es UTC-6 todo el año.
INSERT INTO tournaments (slug, name, starts_at)
VALUES ('monster-agl-1v1-2026-09', 'Monster_AGL — Torneo 1 vs 1', '2026-09-26 17:00:00-06')
ON CONFLICT (slug) DO NOTHING;
