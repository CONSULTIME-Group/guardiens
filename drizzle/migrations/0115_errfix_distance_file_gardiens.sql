-- Lot ERRFIX du 05/11 : une annonce d'outre-mer se publie.
-- notify_sitters_on_new_sit écrit la distance gardien-annonce dans
-- sitter_digest_queue, bornée à 9 999,99 km : 16 000 km depuis Papeete faisaient
-- échouer toute la publication (22003, numeric field overflow).
-- La plus grande distance sur Terre fait environ 20 016 km.
ALTER TABLE public.sitter_digest_queue
  ALTER COLUMN distance_km TYPE numeric(8, 2);
