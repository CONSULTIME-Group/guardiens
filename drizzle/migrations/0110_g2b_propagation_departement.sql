-- Lot G2 bis (26/10/2026, suite du lot G2, appliqué en base le 26/10).
--
-- trg_profiles_propagate_dept ne réagissait qu'à UPDATE OF departement_code.
-- Or le département est réécrit par le trigger BEFORE de profiles à partir du
-- code postal et du pays : un trigger « UPDATE OF » ne suit que les colonnes
-- de la requête, jamais celles qu'un autre trigger réécrit. Les annonces
-- gardaient donc l'ancien département après un changement de code postal ou
-- de pays (1 brouillon désaligné au 26/10, propriétaire aux États-Unis rangé
-- dans le Gers). propagate_departement_code_to_sits compare déjà l'ancienne et
-- la nouvelle valeur : réagir aussi au code postal et au pays suffit.
-- Rejouable.

DROP TRIGGER IF EXISTS trg_profiles_propagate_dept ON public.profiles;
CREATE TRIGGER trg_profiles_propagate_dept
  AFTER UPDATE OF postal_code, country, departement_code ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.propagate_departement_code_to_sits();

UPDATE public.sits s
SET departement_code = p.departement_code
FROM public.profiles p
WHERE p.id = s.user_id
  AND s.departement_code IS DISTINCT FROM p.departement_code;
