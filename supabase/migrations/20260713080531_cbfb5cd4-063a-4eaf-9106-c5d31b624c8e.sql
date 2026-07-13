
CREATE OR REPLACE FUNCTION public.get_alma_cultural_fact(p_user_id uuid, p_surface text, p_context jsonb DEFAULT '{}'::jsonb, p_bypass_cooldown boolean DEFAULT false, p_exclude_ids uuid[] DEFAULT ARRAY[]::uuid[], p_on_demand boolean DEFAULT false, p_frequency text DEFAULT 'balanced'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role text;
  v_current_month integer := EXTRACT(MONTH FROM now())::integer;
  v_row public.alma_cultural_facts%ROWTYPE;
  v_content text;
  v_muted text[];
  v_effective_exclude uuid[];
  v_utile_only boolean := (coalesce(p_frequency, 'balanced') = 'low')
                           AND NOT coalesce(p_on_demand, false);
  v_utile constant text[] := ARRAY[
    'pet_care_tip','dog_behavior_tip','cat_behavior_tip',
    'home_care_tip','seasonal_advice','mutual_aid_tip','usage_nudge','breed_did_you_know'
  ];
  v_pro_line constant text := 'Pour un trouble installé, un vétérinaire ou un comportementaliste reste la référence.';
  v_picked_type text;
BEGIN
  IF p_user_id IS NULL OR p_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501', MESSAGE = 'unauthorized';
  END IF;

  SELECT role, coalesce(alma_muted_categories, ARRAY[]::text[])
    INTO v_role, v_muted
  FROM public.profiles WHERE id = p_user_id;

  v_effective_exclude := coalesce(p_exclude_ids, ARRAY[]::uuid[]);

  FOR i IN 1..2 LOOP
    SELECT f.fact_type
      INTO v_picked_type
    FROM public.alma_cultural_facts f
    WHERE f.active = true
      AND f.fact_type <> ALL(coalesce(v_muted, ARRAY[]::text[]))
      AND (NOT v_utile_only OR f.fact_type = ANY(v_utile))
      AND (array_length(v_effective_exclude, 1) IS NULL
           OR NOT (f.id = ANY(v_effective_exclude)))
      AND (
        NOT (f.context_filter ? 'surface')
        OR (f.context_filter->>'surface' = p_surface)
        OR (jsonb_typeof(f.context_filter->'surface') = 'array'
            AND f.context_filter->'surface' ? p_surface)
      )
      AND (
        NOT (f.context_filter ? 'role')
        OR v_role IS NULL
        OR (f.context_filter->>'role' = v_role)
        OR (f.context_filter->>'role' = 'both')
      )
      AND (
        f.seasonal_start_month IS NULL
        OR (f.seasonal_start_month <= f.seasonal_end_month
            AND v_current_month BETWEEN f.seasonal_start_month AND f.seasonal_end_month)
        OR (f.seasonal_start_month > f.seasonal_end_month
            AND (v_current_month >= f.seasonal_start_month OR v_current_month <= f.seasonal_end_month))
      )
      AND (
        NOT (f.context_filter ? 'animal_breed')
        OR (f.context_filter->>'animal_breed' = p_context->>'animal_breed')
      )
      AND (
        NOT (f.context_filter ? 'city')
        OR (f.context_filter->>'city' = p_context->>'city')
        OR (jsonb_typeof(f.context_filter->'city') = 'array'
            AND f.context_filter->'city' ? (p_context->>'city'))
      )
      AND (
        CASE f.fact_type
          WHEN 'dog_behavior_tip' THEN
            p_surface IN ('breed_page','owner_dashboard','sitter_dashboard','search_page')
            AND (p_surface <> 'breed_page' OR p_context->>'animal_species' = 'dog')
          WHEN 'cat_behavior_tip' THEN
            p_surface IN ('breed_page','owner_dashboard','sitter_dashboard','search_page')
            AND (p_surface <> 'breed_page' OR p_context->>'animal_species' = 'cat')
          WHEN 'pet_care_tip' THEN
            (p_surface <> 'breed_page'
             OR NOT (f.context_filter ? 'animal_species')
             OR f.context_filter->>'animal_species' = p_context->>'animal_species')
          WHEN 'home_care_tip' THEN
            p_surface IN ('sitter_dashboard','owner_dashboard','city_page','house_guide','listings','search_page')
            AND p_surface <> 'breed_page'
          WHEN 'mutual_aid_tip' THEN
            p_surface IN ('owner_dashboard','sitter_dashboard','mutual_aid','missions','listings','search_page')
          WHEN 'animal_humor' THEN
            p_surface IN ('owner_dashboard','sitter_dashboard')
          WHEN 'breed_did_you_know' THEN
            p_surface = 'breed_page'
          ELSE true
        END
      )
      AND (
        NOT (f.context_filter ? 'animal_species')
        OR (f.context_filter->>'animal_species' = p_context->>'animal_species')
        OR f.fact_type IN ('dog_behavior_tip','cat_behavior_tip')
      )
    GROUP BY f.fact_type
    ORDER BY min(f.priority) ASC, random() ASC
    LIMIT 1;

    IF v_picked_type IS NOT NULL THEN
      SELECT *
        INTO v_row
      FROM public.alma_cultural_facts f
      WHERE f.active = true
        AND f.fact_type = v_picked_type
        AND (array_length(v_effective_exclude, 1) IS NULL
             OR NOT (f.id = ANY(v_effective_exclude)))
        AND (
          NOT (f.context_filter ? 'surface')
          OR (f.context_filter->>'surface' = p_surface)
          OR (jsonb_typeof(f.context_filter->'surface') = 'array'
              AND f.context_filter->'surface' ? p_surface)
        )
        AND (
          NOT (f.context_filter ? 'role')
          OR v_role IS NULL
          OR (f.context_filter->>'role' = v_role)
          OR (f.context_filter->>'role' = 'both')
        )
        AND (
          f.seasonal_start_month IS NULL
          OR (f.seasonal_start_month <= f.seasonal_end_month
              AND v_current_month BETWEEN f.seasonal_start_month AND f.seasonal_end_month)
          OR (f.seasonal_start_month > f.seasonal_end_month
              AND (v_current_month >= f.seasonal_start_month OR v_current_month <= f.seasonal_end_month))
        )
        AND (
          NOT (f.context_filter ? 'animal_breed')
          OR (f.context_filter->>'animal_breed' = p_context->>'animal_breed')
        )
        AND (
          NOT (f.context_filter ? 'city')
          OR (f.context_filter->>'city' = p_context->>'city')
          OR (jsonb_typeof(f.context_filter->'city') = 'array'
              AND f.context_filter->'city' ? (p_context->>'city'))
        )
        AND (
          NOT (f.context_filter ? 'animal_species')
          OR (f.context_filter->>'animal_species' = p_context->>'animal_species')
          OR f.fact_type IN ('dog_behavior_tip','cat_behavior_tip')
        )
      ORDER BY (-ln(random()) / GREATEST(f.weight, 1)) ASC
      LIMIT 1;
    END IF;

    EXIT WHEN v_row.id IS NOT NULL;
    EXIT WHEN NOT coalesce(p_on_demand, false);
    EXIT WHEN array_length(v_effective_exclude, 1) IS NULL;
    v_effective_exclude := ARRAY[]::uuid[];
  END LOOP;

  IF v_row.id IS NULL THEN
    RETURN NULL;
  END IF;

  v_content := v_row.content;
  IF v_row.needs_pro_referral THEN
    v_content := v_content || E'\n' || v_pro_line;
  END IF;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'type', v_row.fact_type,
    'content', v_content,
    'source_url', v_row.source_url,
    'picked_type', v_picked_type
  );
END
$function$;

REVOKE EXECUTE ON FUNCTION public.get_alma_cultural_fact(uuid, text, jsonb, boolean, uuid[], boolean, text) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_alma_cultural_fact(uuid, text, jsonb, boolean, uuid[], boolean, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_alma_usage_nudge(p_user_id uuid, p_surface text, p_role text DEFAULT 'any'::text, p_state text DEFAULT 'any'::text, p_bypass_cooldown boolean DEFAULT false, p_exclude_ids uuid[] DEFAULT ARRAY[]::uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_row public.alma_cultural_facts%ROWTYPE;
  v_muted text[];
BEGIN
  IF p_user_id IS NULL OR p_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501', MESSAGE = 'unauthorized';
  END IF;

  SELECT coalesce(alma_muted_categories, ARRAY[]::text[])
    INTO v_muted
  FROM public.profiles WHERE id = p_user_id;

  IF 'usage_nudge' = ANY(coalesce(v_muted, ARRAY[]::text[])) THEN
    RETURN NULL;
  END IF;

  IF NOT p_bypass_cooldown AND EXISTS (
    SELECT 1 FROM public.alma_whisper_history
    WHERE user_id = p_user_id
      AND whisper_type = 'usage_nudge'
      AND emitted_at > now() - interval '6 hours'
  ) THEN
    RETURN NULL;
  END IF;

  SELECT *
  INTO v_row
  FROM public.alma_cultural_facts f
  WHERE f.active = true
    AND f.fact_type = 'usage_nudge'
    AND (p_exclude_ids IS NULL OR NOT (f.id = ANY(p_exclude_ids)))
    AND (f.target_role = 'any' OR f.target_role = p_role)
    AND (f.target_state = 'any' OR f.target_state = p_state)
    AND (
      NOT (f.context_filter ? 'surface')
      OR (f.context_filter->>'surface' = p_surface)
      OR (jsonb_typeof(f.context_filter->'surface') = 'array'
          AND f.context_filter->'surface' ? p_surface)
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.alma_whisper_history h
      WHERE h.user_id = p_user_id
        AND (h.metadata->>'fact_id') = f.id::text
        AND h.emitted_at > now() - interval '24 hours'
    )
  ORDER BY
    f.priority ASC,
    (-ln(random()) / GREATEST(f.weight, 1)) ASC
  LIMIT 1;

  IF v_row.id IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'type', 'usage_nudge',
    'content', v_row.content,
    'cta_label', v_row.cta_label,
    'cta_action', v_row.cta_action
  );
END
$function$;

REVOKE EXECUTE ON FUNCTION public.get_alma_usage_nudge(uuid, text, text, text, boolean, uuid[]) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_alma_usage_nudge(uuid, text, text, text, boolean, uuid[]) TO authenticated;
