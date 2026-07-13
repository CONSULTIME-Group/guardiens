
-- 1) Autoriser l'utilisateur à mettre à jour dismissed_reason/action_taken sur SES rows
CREATE POLICY "Users can update own whisper history"
  ON public.alma_whisper_history
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 2) RPC diagnostic (admin only) : simule get_alma_cultural_fact et retourne
-- l'éligibilité par fact_type ainsi que la probabilité de tirage.
CREATE OR REPLACE FUNCTION public.admin_alma_matching_diagnosis(
  p_surface text,
  p_role text,
  p_context jsonb DEFAULT '{}'::jsonb,
  p_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_current_month int := EXTRACT(MONTH FROM now())::int;
  v_muted text[] := ARRAY[]::text[];
  v_effective_role text := p_role;
  v_totals jsonb;
  v_eligible jsonb;
  v_probs jsonb;
  v_total_eligible numeric;
BEGIN
  IF v_caller IS NULL OR NOT public.has_role(v_caller, 'admin'::app_role) THEN
    RAISE EXCEPTION 'admin_only';
  END IF;

  IF p_user_id IS NOT NULL THEN
    SELECT coalesce(alma_muted_categories, ARRAY[]::text[]),
           coalesce(p_role, role)
      INTO v_muted, v_effective_role
      FROM public.profiles WHERE id = p_user_id;
  END IF;

  -- Totaux par fact_type (tous, actifs)
  SELECT jsonb_object_agg(fact_type, cnt)
    INTO v_totals
    FROM (
      SELECT fact_type, count(*)::int AS cnt
      FROM public.alma_cultural_facts
      WHERE active = true
      GROUP BY fact_type
    ) t;

  -- Breakdown par fact_type : count_eligible + raisons de rejet
  WITH facts AS (
    SELECT
      f.fact_type,
      f.id,
      -- Muté par l'utilisateur ?
      (f.fact_type = ANY(v_muted)) AS is_muted,
      -- Saison bloquante ?
      (
        f.seasonal_start_month IS NOT NULL
        AND NOT (
          (f.seasonal_start_month <= f.seasonal_end_month
            AND v_current_month BETWEEN f.seasonal_start_month AND f.seasonal_end_month)
          OR (f.seasonal_start_month > f.seasonal_end_month
            AND (v_current_month >= f.seasonal_start_month OR v_current_month <= f.seasonal_end_month))
        )
      ) AS is_seasonal_blocked,
      -- Surface bloquante ?
      (
        (f.context_filter ? 'surface')
        AND NOT (
          (f.context_filter->>'surface' = p_surface)
          OR (jsonb_typeof(f.context_filter->'surface') = 'array'
              AND f.context_filter->'surface' ? p_surface)
        )
      ) OR (
        -- Whitelist de surface implicite par fact_type (mirror de get_alma_cultural_fact)
        CASE f.fact_type
          WHEN 'dog_behavior_tip' THEN p_surface NOT IN ('breed_page','owner_dashboard','sitter_dashboard','search_page')
          WHEN 'cat_behavior_tip' THEN p_surface NOT IN ('breed_page','owner_dashboard','sitter_dashboard','search_page')
          WHEN 'home_care_tip' THEN p_surface NOT IN ('sitter_dashboard','owner_dashboard','city_page','house_guide','listings','search_page')
          WHEN 'mutual_aid_tip' THEN p_surface NOT IN ('owner_dashboard','sitter_dashboard','mutual_aid','missions','listings','search_page')
          WHEN 'animal_humor' THEN p_surface NOT IN ('owner_dashboard','sitter_dashboard')
          WHEN 'breed_did_you_know' THEN p_surface <> 'breed_page'
          ELSE false
        END
      ) AS is_surface_blocked,
      -- Contexte (role/species/breed/city) bloquant ?
      (
        (
          (f.context_filter ? 'role')
          AND v_effective_role IS NOT NULL
          AND NOT (
            f.context_filter->>'role' = v_effective_role
            OR f.context_filter->>'role' = 'both'
          )
        )
        OR (
          (f.context_filter ? 'animal_species')
          AND f.fact_type NOT IN ('dog_behavior_tip','cat_behavior_tip')
          AND (f.context_filter->>'animal_species') IS DISTINCT FROM (p_context->>'animal_species')
        )
        OR (
          (f.context_filter ? 'animal_breed')
          AND (f.context_filter->>'animal_breed') IS DISTINCT FROM (p_context->>'animal_breed')
        )
        OR (
          (f.context_filter ? 'city')
          AND NOT (
            (f.context_filter->>'city' = p_context->>'city')
            OR (jsonb_typeof(f.context_filter->'city') = 'array'
                AND f.context_filter->'city' ? (p_context->>'city'))
          )
        )
      ) AS is_context_blocked
    FROM public.alma_cultural_facts f
    WHERE f.active = true
  ),
  agg AS (
    SELECT
      fact_type,
      count(*) FILTER (
        WHERE NOT is_muted AND NOT is_seasonal_blocked
          AND NOT is_surface_blocked AND NOT is_context_blocked
      )::int AS count_eligible,
      count(*) FILTER (WHERE is_muted)::int AS count_muted,
      count(*) FILTER (WHERE is_seasonal_blocked)::int AS count_seasonal_blocked,
      count(*) FILTER (WHERE is_surface_blocked)::int AS count_surface_blocked,
      count(*) FILTER (WHERE is_context_blocked)::int AS count_context_blocked
    FROM facts
    GROUP BY fact_type
  )
  SELECT jsonb_agg(
           jsonb_build_object(
             'fact_type', fact_type,
             'count_eligible', count_eligible,
             'count_muted', count_muted,
             'count_seasonal_blocked', count_seasonal_blocked,
             'count_surface_blocked', count_surface_blocked,
             'count_context_blocked', count_context_blocked
           )
           ORDER BY count_eligible DESC, fact_type ASC
         )
    INTO v_eligible
    FROM agg;

  -- Probabilité de tirage = count_eligible / total_eligible
  SELECT sum(count_eligible)::numeric
    INTO v_total_eligible
    FROM (
      SELECT (value->>'count_eligible')::numeric AS count_eligible
      FROM jsonb_array_elements(coalesce(v_eligible, '[]'::jsonb))
    ) s;

  IF v_total_eligible IS NULL OR v_total_eligible = 0 THEN
    v_probs := '{}'::jsonb;
  ELSE
    SELECT jsonb_object_agg(
             value->>'fact_type',
             round(((value->>'count_eligible')::numeric / v_total_eligible) * 100, 2)
           )
      INTO v_probs
      FROM jsonb_array_elements(v_eligible)
      WHERE (value->>'count_eligible')::numeric > 0;
  END IF;

  RETURN jsonb_build_object(
    'eligible_fact_types', coalesce(v_eligible, '[]'::jsonb),
    'picked_type_probability', coalesce(v_probs, '{}'::jsonb),
    'total_seeds_by_type', coalesce(v_totals, '{}'::jsonb),
    'inputs', jsonb_build_object(
      'surface', p_surface,
      'role', v_effective_role,
      'context', coalesce(p_context, '{}'::jsonb),
      'current_month', v_current_month,
      'user_muted', to_jsonb(v_muted)
    )
  );
END
$$;

GRANT EXECUTE ON FUNCTION public.admin_alma_matching_diagnosis(text, text, jsonb, uuid) TO authenticated;
