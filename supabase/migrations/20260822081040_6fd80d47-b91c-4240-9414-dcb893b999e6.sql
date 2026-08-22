CREATE OR REPLACE VIEW public.sitter_profiles_affinity AS
SELECT user_id,
    experience_years,
    life_pace,
    languages,
    interests,
    work_during_sit,
    sensitivities,
    animal_types,
    sitter_type,
    travels_with_children,
    travels_with_own_animals,
    lifestyle,
    availability_during,
    has_vehicle,
    has_license,
    special_animal_skills,
    farm_animals_ok
   FROM sitter_profiles;

CREATE OR REPLACE FUNCTION public.get_garde_accord_status(p_garde_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_owner_id uuid;
  v_sitter_id uuid;
  v_proprio garde_accords%ROWTYPE;
  v_gardien garde_accords%ROWTYPE;
BEGIN
  SELECT s.user_id INTO v_owner_id FROM sits s WHERE s.id = p_garde_id;
  IF v_owner_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT a.sitter_id INTO v_sitter_id
  FROM applications a
  WHERE a.sit_id = p_garde_id AND a.status = 'accepted'
  ORDER BY a.created_at DESC
  LIMIT 1;

  IF auth.uid() IS DISTINCT FROM v_owner_id
     AND auth.uid() IS DISTINCT FROM v_sitter_id
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN NULL;
  END IF;

  SELECT ga.* INTO v_proprio
  FROM garde_accords ga
  WHERE ga.garde_id = p_garde_id AND ga.user_id = v_owner_id
  LIMIT 1;

  IF v_sitter_id IS NOT NULL THEN
    SELECT ga.* INTO v_gardien
    FROM garde_accords ga
    WHERE ga.garde_id = p_garde_id AND ga.user_id = v_sitter_id
    LIMIT 1;
  END IF;

  RETURN jsonb_build_object(
    'proprio', CASE WHEN v_proprio.id IS NULL THEN NULL ELSE jsonb_build_object(
      'accepted', v_proprio.accepted,
      'accepted_at', v_proprio.accepted_at,
      'declined', v_proprio.declined,
      'declined_at', v_proprio.declined_at
    ) END,
    'gardien', CASE WHEN v_gardien.id IS NULL THEN NULL ELSE jsonb_build_object(
      'accepted', v_gardien.accepted,
      'accepted_at', v_gardien.accepted_at,
      'declined', v_gardien.declined,
      'declined_at', v_gardien.declined_at
    ) END,
    'document', v_proprio.document_content
  );
END;
$function$;