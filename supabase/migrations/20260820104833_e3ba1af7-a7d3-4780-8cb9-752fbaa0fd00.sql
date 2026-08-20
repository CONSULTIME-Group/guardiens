CREATE OR REPLACE FUNCTION public.sitter_missing_opportunities()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_sp public.sitter_profiles%ROWTYPE;
  v_total integer;
BEGIN
  IF v_uid IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_sp FROM public.sitter_profiles WHERE user_id = v_uid;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT count(*) INTO v_total FROM public.sits s WHERE s.status = 'published';

  RETURN jsonb_build_object(
    'total_sits', v_total,
    'items', jsonb_build_array(
      jsonb_build_object(
        'key', 'vehicle',
        'answered', (v_sp.has_vehicle IS NOT NULL OR v_sp.has_license IS NOT NULL OR nullif(v_sp.vehicle_type, '') IS NOT NULL),
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

REVOKE EXECUTE ON FUNCTION public.sitter_missing_opportunities() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sitter_missing_opportunities() TO authenticated;

COMMENT ON FUNCTION public.sitter_missing_opportunities() IS 'Bloc dashboard gardien : pour six sujets, indique si le gardien a répondu et combien d annonces publiées sont concernées. Compteurs uniquement, recalculés à l appel.';