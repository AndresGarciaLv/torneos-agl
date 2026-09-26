-- Esquema del torneo. PostgreSQL es la única fuente de verdad:
-- las reglas que no pueden romperse viven como constraints, no solo en la app.

CREATE TABLE tournaments (
  id          uuid PRIMARY KEY DEFAULT uuidv7(),
  slug        text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name        text NOT NULL CHECK (char_length(name) BETWEEN 3 AND 120),
  starts_at   timestamptz NOT NULL,
  status      text NOT NULL DEFAULT 'registration'
              CHECK (status IN ('registration', 'bracket_ready', 'live', 'finished')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE participants (
  id                 uuid PRIMARY KEY DEFAULT uuidv7(),
  tournament_id      uuid NOT NULL REFERENCES tournaments (id) ON DELETE CASCADE,
  gamer_tag          text NOT NULL CHECK (char_length(gamer_tag) BETWEEN 2 AND 40),
  email              text NOT NULL CHECK (char_length(email) BETWEEN 3 AND 254 AND position('@' IN email) > 1),
  mobile_legends_id  text CHECK (mobile_legends_id IS NULL OR char_length(mobile_legends_id) BETWEEN 1 AND 40),
  accepted_rules     boolean NOT NULL CHECK (accepted_rules),
  created_at         timestamptz NOT NULL DEFAULT now()
);

-- Unicidad por torneo e insensible a mayúsculas: "Natan" y "natan" son el mismo jugador.
CREATE UNIQUE INDEX participants_tournament_email_key
  ON participants (tournament_id, lower(email));
CREATE UNIQUE INDEX participants_tournament_gamer_tag_key
  ON participants (tournament_id, lower(gamer_tag));

CREATE TABLE matches (
  id             uuid PRIMARY KEY DEFAULT uuidv7(),
  tournament_id  uuid NOT NULL REFERENCES tournaments (id) ON DELETE CASCADE,
  round          integer NOT NULL CHECK (round >= 1),
  position       integer NOT NULL CHECK (position >= 1),
  player1_id     uuid REFERENCES participants (id) ON DELETE RESTRICT,
  player2_id     uuid REFERENCES participants (id) ON DELETE RESTRICT,
  winner_id      uuid REFERENCES participants (id) ON DELETE RESTRICT,
  next_match_id  uuid REFERENCES matches (id) ON DELETE CASCADE,
  next_slot      smallint CHECK (next_slot IN (1, 2)),
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT matches_round_position_key UNIQUE (tournament_id, round, position),
  CONSTRAINT matches_distinct_players CHECK (player1_id IS NULL OR player2_id IS NULL OR player1_id <> player2_id),
  CONSTRAINT matches_winner_is_player CHECK (winner_id IS NULL OR winner_id = player1_id OR winner_id = player2_id),
  CONSTRAINT matches_next_consistent CHECK ((next_match_id IS NULL) = (next_slot IS NULL))
);

CREATE INDEX matches_tournament_idx ON matches (tournament_id, round, position);
CREATE INDEX participants_tournament_idx ON participants (tournament_id, created_at);
