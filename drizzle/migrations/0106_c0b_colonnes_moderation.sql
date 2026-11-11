-- Lot C0b (26/10/2026, go de Jérémie) : l'ancien espace de questions reste
-- ouvert (0105), mais les colonnes de modération et de compteurs ne sont plus
-- écrites par le navigateur.
--
-- Constat : avec INSERT et UPDATE au niveau de la table, l'auteur d'une
-- question ou d'une réponse peut, par l'API, remettre is_hidden à faux,
-- reports_count à 0, se poser is_pinned, helpful_count, accepted_answer_id ou
-- is_author_pick.
--
-- Droits par colonne pour anon et authenticated (les politiques RLS restent
-- inchangées : création et modification par l'auteur seulement) :
-- - community_questions, INSERT : author_id, category, title, body, tags,
--   city, latitude, longitude ; UPDATE : category, title, body, tags, city,
--   latitude, longitude, status (bouton « Marquer comme résolue »).
-- - community_answers, INSERT : question_id, author_id, parent_answer_id,
--   body ; UPDATE : body.
-- Les déclencheurs de compteurs et de masquage sont SECURITY DEFINER : ils
-- continuent d'écrire answers_count, helpful_count, is_hidden. Les colonnes
-- modifiées par un déclencheur BEFORE (updated_at, coordonnées arrondies) ne
-- demandent aucun droit. La clé de service et les admins par fonction serveur
-- gardent tous leurs droits.
--
-- Retour arrière :
--   GRANT INSERT, UPDATE ON public.community_questions TO anon, authenticated;
--   GRANT INSERT, UPDATE ON public.community_answers TO anon, authenticated;
-- Rejouable.

REVOKE INSERT, UPDATE ON public.community_questions FROM anon, authenticated;
REVOKE INSERT, UPDATE ON public.community_answers FROM anon, authenticated;

GRANT INSERT (author_id, category, title, body, tags, city, latitude, longitude)
  ON public.community_questions TO anon, authenticated;
GRANT UPDATE (category, title, body, tags, city, latitude, longitude, status)
  ON public.community_questions TO anon, authenticated;

GRANT INSERT (question_id, author_id, parent_answer_id, body)
  ON public.community_answers TO anon, authenticated;
GRANT UPDATE (body)
  ON public.community_answers TO anon, authenticated;
