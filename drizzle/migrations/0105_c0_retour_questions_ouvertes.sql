-- Retour du lot C0 (26/10/2026, décision de Jérémie à 10 h) : l'ancien espace
-- de questions-réponses reste ouvert en écriture, comme avant le verrou.
-- Rend INSERT et UPDATE sur community_questions et community_answers à anon et
-- authenticated (état d'avant 0104). Les politiques RLS existantes s'appliquent.
-- Rejouable.

GRANT INSERT, UPDATE ON public.community_questions TO anon, authenticated;
GRANT INSERT, UPDATE ON public.community_answers TO anon, authenticated;
