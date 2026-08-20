-- Fixe le search_path de la règle de lecture du rayon (avertissement linter
-- function_search_path_mutable). Corps inchangé, configuration seulement.
ALTER FUNCTION public.effective_search_radius(integer) SET search_path = public;