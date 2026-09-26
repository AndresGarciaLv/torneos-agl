-- Top de donadores del live: cada regalo real de TikTok, acumulado por persona.
-- Una racha (combo) es UNA fila: los eventos repetidos solo suben repeat_count.

CREATE TABLE live_gifts (
  streak_key    text PRIMARY KEY CHECK (char_length(streak_key) BETWEEN 1 AND 200),
  tiktok_user   text NOT NULL CHECK (char_length(tiktok_user) BETWEEN 1 AND 60),
  nickname      text NOT NULL CHECK (char_length(nickname) BETWEEN 1 AND 60),
  avatar_url    text CHECK (avatar_url IS NULL OR char_length(avatar_url) <= 1000),
  gift_name     text NOT NULL CHECK (char_length(gift_name) <= 80),
  coins_each    integer NOT NULL CHECK (coins_each >= 0),
  repeat_count  integer NOT NULL CHECK (repeat_count >= 1),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX live_gifts_created_at_idx ON live_gifts (created_at);

-- Una sola fila: desde cuándo cuenta el ranking y quién tiene la conexión al live.
CREATE TABLE donor_board (
  id               smallint PRIMARY KEY CHECK (id = 1),
  reset_at         timestamptz NOT NULL DEFAULT now(),
  collector_until  timestamptz
);
INSERT INTO donor_board (id) VALUES (1);
