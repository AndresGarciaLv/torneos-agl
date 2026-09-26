-- Ruleta del live: entran quienes comentan la palabra clave en el chat de TikTok.
-- Una persona entra una sola vez por ruleta (PK) y gana una sola vez (UNIQUE).

CREATE TABLE raffles (
  id          uuid PRIMARY KEY DEFAULT uuidv7(),
  keyword     text NOT NULL CHECK (char_length(keyword) BETWEEN 1 AND 30),
  prize       text NOT NULL CHECK (char_length(prize) BETWEEN 1 AND 80),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE raffle_entries (
  raffle_id    uuid NOT NULL REFERENCES raffles (id) ON DELETE CASCADE,
  tiktok_user  text NOT NULL CHECK (char_length(tiktok_user) BETWEEN 1 AND 60),
  nickname     text NOT NULL CHECK (char_length(nickname) BETWEEN 1 AND 60),
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (raffle_id, tiktok_user)
);

CREATE TABLE raffle_winners (
  id           uuid PRIMARY KEY DEFAULT uuidv7(),
  raffle_id    uuid NOT NULL REFERENCES raffles (id) ON DELETE CASCADE,
  tiktok_user  text NOT NULL,
  nickname     text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (raffle_id, tiktok_user)
);
