-- Lot C0 « La communauté, verrou de la V0 » (arène du 26/10/2026, projet mis
-- en attente le même jour, go de Jérémie le 26/10).
--
-- Constat (registre des faits de l'arène, n° 1, 2, 6, 30) : les rôles anon et
-- authenticated ont INSERT et UPDATE sur community_questions et
-- community_answers. Un membre publie sans modération sur une page indexable,
-- et l'auteur peut remettre is_hidden à faux, reports_count à 0, se poser
-- is_pinned ou helpful_count par l'API.
--
-- Verrou : retrait de INSERT et UPDATE sur les deux tables pour anon et
-- authenticated. Le retrait au niveau de la table retire aussi les droits par
-- colonne. SELECT reste ouvert : les 3 questions et la réponse existantes
-- restent lisibles. DELETE et community_answer_votes restent inchangés.
-- Les fonctions SECURITY DEFINER et la clé de service gardent leurs droits.
--
-- Retour arrière (une ligne par table) :
--   GRANT INSERT, UPDATE ON public.community_questions TO authenticated;
--   GRANT INSERT, UPDATE ON public.community_answers TO authenticated;
-- Rejouable.

REVOKE INSERT, UPDATE ON public.community_questions FROM anon, authenticated;
REVOKE INSERT, UPDATE ON public.community_answers FROM anon, authenticated;
