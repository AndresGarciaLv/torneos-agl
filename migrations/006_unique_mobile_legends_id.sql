-- El formulario ya no pide correo: lo que identifica a un jugador es su ID de
-- Mobile Legends. Una misma cuenta no entra dos veces con Gamer Tags distintos.
-- La app guarda el ID sin espacios; lower() cubre letras en IDs con servidor.
CREATE UNIQUE INDEX participants_tournament_ml_id_key
  ON participants (tournament_id, lower(mobile_legends_id));
