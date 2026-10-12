-- Lot I1 (12/10/2026) : le pourcentage de profil suit le prénom et le lieu.
--
-- Le barème (_calculate_sitter_score, _calculate_owner_score) compte le prénom
-- avec le code postal (ou la ville hors France), mais le déclencheur sur
-- profiles ne recalculait qu'au changement de photo, bio, identité vérifiée ou
-- rôle. Un membre qui remplit seulement prénom et code postal restait à 0 %.
-- Mesure du 12/10/2026 : 18 profils sous-évalués sur 1 619, aucun au-dessus.
--
-- 1. Déclencheur recréé avec first_name, postal_code, city et country.
--    profile_completion reste hors de la liste : aucune boucle.
-- 2. Rattrapage des seuls profils dont la valeur enregistrée diffère du barème.

DROP TRIGGER IF EXISTS trg_recalc_completion_profiles ON public.profiles;

CREATE TRIGGER trg_recalc_completion_profiles
AFTER UPDATE ON public.profiles
FOR EACH ROW
WHEN (
  (OLD.avatar_url IS DISTINCT FROM NEW.avatar_url)
  OR (OLD.bio IS DISTINCT FROM NEW.bio)
  OR (OLD.identity_verified IS DISTINCT FROM NEW.identity_verified)
  OR (OLD.role IS DISTINCT FROM NEW.role)
  OR (OLD.first_name IS DISTINCT FROM NEW.first_name)
  OR (OLD.postal_code IS DISTINCT FROM NEW.postal_code)
  OR (OLD.city IS DISTINCT FROM NEW.city)
  OR (OLD.country IS DISTINCT FROM NEW.country)
)
EXECUTE FUNCTION public.trigger_recalc_completion_profiles();

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.id
    FROM public.profiles p
    WHERE p.role IS NOT NULL
      AND p.profile_completion IS DISTINCT FROM (
        CASE
          WHEN p.role::text = 'owner' THEN public._calculate_owner_score(p.id)
          WHEN p.role::text = 'both' THEN GREATEST(public._calculate_owner_score(p.id), public._calculate_sitter_score(p.id))
          ELSE public._calculate_sitter_score(p.id)
        END
      )
  LOOP
    PERFORM public.calculate_profile_completion(r.id);
  END LOOP;
END $$;
