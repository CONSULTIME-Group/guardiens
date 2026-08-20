-- Lot affinité (20/08/2026) : moteur unique partagé client/edge.
-- Doctrine : ON TRIE PAR PERTINENCE, ON N'ÉLIMINE JAMAIS.
-- La fonction SQL historique n'est plus lue nulle part : elle est conservée
-- (aucun DROP) et marquée dépréciée pour les futures lectures de schéma.
COMMENT ON FUNCTION public.calculate_affinity_score_pg(uuid, uuid) IS
  'DEPRÉCIÉE le 20/08/2026. Remplacée par le moteur unique partagé
   supabase/functions/_shared/affinity/score.ts (mêmes règles côté client,
   affichage et distribution emails). Conservée sans suppression : ne plus
   appeler, sera retirée dans un lot ultérieur dédié.';