
-- RPC 1: Bulk update du statut d'une skill_library + propagation dans profiles.custom_skills
CREATE OR REPLACE FUNCTION public.admin_update_skill_status(
  p_skill_id uuid,
  p_new_status text,
  p_new_label text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_normalized text;
  v_updated_profiles integer := 0;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden: admin role required';
  END IF;

  IF p_new_status NOT IN ('approved', 'rejected', 'pending') THEN
    RAISE EXCEPTION 'invalid status: %', p_new_status;
  END IF;

  -- Update du référentiel skills_library
  IF p_new_label IS NOT NULL THEN
    v_normalized := regexp_replace(lower(unaccent(p_new_label)), '\s+', ' ', 'g');
    UPDATE public.skills_library
       SET status = p_new_status,
           label = p_new_label,
           normalized_label = v_normalized
     WHERE id = p_skill_id;
  ELSE
    UPDATE public.skills_library
       SET status = p_new_status
     WHERE id = p_skill_id;
  END IF;

  -- Propagation dans profiles.custom_skills (jsonb array d'objets)
  IF p_new_status = 'rejected' THEN
    -- Retire l'entrée
    WITH updated AS (
      UPDATE public.profiles
         SET custom_skills = COALESCE(
           (SELECT jsonb_agg(elem)
              FROM jsonb_array_elements(custom_skills) elem
             WHERE (elem->>'skill_id')::uuid IS DISTINCT FROM p_skill_id),
           '[]'::jsonb
         )
       WHERE custom_skills @> jsonb_build_array(jsonb_build_object('skill_id', p_skill_id::text))
       RETURNING 1
    )
    SELECT count(*) INTO v_updated_profiles FROM updated;
  ELSE
    -- Met à jour le status (et le label si fourni) dans chaque entrée
    WITH updated AS (
      UPDATE public.profiles p
         SET custom_skills = (
           SELECT jsonb_agg(
             CASE
               WHEN (elem->>'skill_id')::uuid = p_skill_id
                 THEN elem
                      || jsonb_build_object('status', p_new_status)
                      || CASE WHEN p_new_label IS NOT NULL
                              THEN jsonb_build_object('label', p_new_label)
                              ELSE '{}'::jsonb END
               ELSE elem
             END
           )
           FROM jsonb_array_elements(p.custom_skills) elem
         )
       WHERE p.custom_skills @> jsonb_build_array(jsonb_build_object('skill_id', p_skill_id::text))
       RETURNING 1
    )
    SELECT count(*) INTO v_updated_profiles FROM updated;
  END IF;

  RETURN v_updated_profiles;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_skill_status(uuid, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_update_skill_status(uuid, text, text) TO authenticated;

-- RPC 2: Retirer un libellé de compétence de tous les sitter_profiles + owner_profiles
CREATE OR REPLACE FUNCTION public.admin_reject_competence_label(p_label text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden: admin role required';
  END IF;

  WITH s AS (
    UPDATE public.sitter_profiles
       SET competences = array_remove(competences, p_label)
     WHERE competences @> ARRAY[p_label]
     RETURNING 1
  )
  SELECT count(*) INTO v_count FROM s;

  WITH o AS (
    UPDATE public.owner_profiles
       SET competences = array_remove(competences, p_label)
     WHERE competences @> ARRAY[p_label]
     RETURNING 1
  )
  SELECT v_count + count(*) INTO v_count FROM o;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_reject_competence_label(text) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_reject_competence_label(text) TO authenticated;
