-- Lot SC6, compteur des occasions manquées (10/11/2026, suite des lots SC1 à
-- SC5, « ok go » de Jérémie).
--
-- 1. La question des trajets (lots SC1 et SC3) écrit toujours has_vehicle
--    (true ou false) ; une réponse vaut donc has_vehicle non nul, comme
--    shouldAskTrips côté site. La fonction comptait aussi le permis seul et
--    l'ancien type de véhicule : 15 gardiens avec un permis et sans réponse
--    sur le véhicule (base du 10/11/2026) ne voyaient jamais la question.
-- 2. La surcharge sans paramètre, plus appelée par personne, est retirée : un
--    appel sans argument était ambigu (42725) entre les deux surcharges.
--
-- Corps repris de pg_get_functiondef en production le 10/11/2026, seule la
-- ligne « answered » du véhicule change. Mêmes droits.
-- Repère : sc6_compteur_vehicule (contrat de production).

DROP FUNCTION IF EXISTS public.sitter_missing_opportunities();

CREATE OR REPLACE FUNCTION public.sitter_missing_opportunities(_sitter_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_target uuid := COALESCE(_sitter_id, auth.uid());
  v_sp public.sitter_profiles%ROWTYPE;
  v_total integer;
BEGIN
  -- Seul le rôle service (fonctions edge) peut viser un autre gardien.
  IF v_target IS DISTINCT FROM v_uid
     AND COALESCE(auth.jwt() ->> 'role', '') <> 'service_role' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF v_target IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_sp FROM public.sitter_profiles WHERE user_id = v_target;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT count(*) INTO v_total FROM public.sits s WHERE s.status = 'published';

  RETURN jsonb_build_object(
    'total_sits', v_total,
    'items', jsonb_build_array(
      jsonb_build_object(
        'key', 'vehicle',
        -- Lot SC6 : sc6_compteur_vehicule, réponse = has_vehicle non nul.
        'answered', (v_sp.has_vehicle IS NOT NULL),
        'concerned', (SELECT count(*) FROM public.sits s JOIN public.properties pr ON pr.id = s.property_id WHERE s.status = 'published' AND pr.car_required IS TRUE)
      ),
      jsonb_build_object(
        'key', 'species',
        'answered', (coalesce(array_length(v_sp.animal_types, 1), 0) > 0),
        'concerned', (SELECT count(*) FROM public.sits s WHERE s.status = 'published' AND EXISTS (SELECT 1 FROM public.pets pt WHERE pt.property_id = s.property_id))
      ),
      jsonb_build_object(
        'key', 'work',
        'answered', (nullif(v_sp.work_during_sit, '') IS NOT NULL OR nullif(v_sp.availability_during, '') IS NOT NULL),
        'concerned', (SELECT count(*) FROM public.sits s JOIN public.owner_profiles op ON op.user_id = s.user_id WHERE s.status = 'published' AND op.presence_expected IS NOT NULL)
      ),
      jsonb_build_object(
        'key', 'sitter_type',
        'answered', (nullif(v_sp.sitter_type, '') IS NOT NULL),
        'concerned', (SELECT count(*) FROM public.sits s JOIN public.owner_profiles op ON op.user_id = s.user_id WHERE s.status = 'published' AND coalesce(array_length(op.preferred_sitter_types, 1), 0) > 0)
      ),
      jsonb_build_object(
        'key', 'pace',
        'answered', (coalesce(array_length(v_sp.lifestyle, 1), 0) > 0 OR nullif(v_sp.life_pace, '') IS NOT NULL),
        'concerned', (SELECT count(*) FROM public.sits s JOIN public.owner_profiles op ON op.user_id = s.user_id WHERE s.status = 'published' AND (op.life_pace IS NOT NULL OR coalesce(array_length(op.home_ambiance, 1), 0) > 0))
      ),
      jsonb_build_object(
        'key', 'languages',
        'answered', (coalesce(array_length(v_sp.languages, 1), 0) > 0),
        'concerned', (SELECT count(*) FROM public.sits s JOIN public.owner_profiles op ON op.user_id = s.user_id WHERE s.status = 'published' AND coalesce(array_length(op.languages, 1), 0) > 0)
      )
    )
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.sitter_missing_opportunities(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sitter_missing_opportunities(uuid) TO authenticated, service_role;
