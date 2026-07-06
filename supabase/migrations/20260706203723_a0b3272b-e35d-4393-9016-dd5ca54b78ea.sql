
ALTER TABLE public.alma_cultural_facts
  ADD COLUMN IF NOT EXISTS target_role text NOT NULL DEFAULT 'any',
  ADD COLUMN IF NOT EXISTS target_state text NOT NULL DEFAULT 'any',
  ADD COLUMN IF NOT EXISTS cta_label text,
  ADD COLUMN IF NOT EXISTS cta_action text;

ALTER TABLE public.alma_cultural_facts
  DROP CONSTRAINT IF EXISTS alma_cultural_facts_fact_type_check;

ALTER TABLE public.alma_cultural_facts
  ADD CONSTRAINT alma_cultural_facts_fact_type_check
  CHECK (fact_type IN (
    'breed_did_you_know','city_did_you_know','social_stat','seasonal_advice','founder_anecdote',
    'dog_behavior_tip','cat_behavior_tip','pet_care_tip','home_care_tip','mutual_aid_tip','animal_humor',
    'usage_nudge'
  ));

ALTER TABLE public.alma_cultural_facts
  DROP CONSTRAINT IF EXISTS alma_cultural_facts_target_role_check,
  DROP CONSTRAINT IF EXISTS alma_cultural_facts_target_state_check,
  DROP CONSTRAINT IF EXISTS alma_cultural_facts_cta_action_check;

ALTER TABLE public.alma_cultural_facts
  ADD CONSTRAINT alma_cultural_facts_target_role_check
    CHECK (target_role IN ('any','owner','sitter')),
  ADD CONSTRAINT alma_cultural_facts_target_state_check
    CHECK (target_state IN ('any','no_active_sit','new_owner','new_sitter','profile_incomplete')),
  ADD CONSTRAINT alma_cultural_facts_cta_action_check
    CHECK (cta_action IS NULL OR cta_action IN (
      'draft_sit','create_entraide','browse_sitters','complete_profile',
      'browse_sits','view_applications','none'
    ));

CREATE INDEX IF NOT EXISTS idx_alma_facts_nudge_targeting
  ON public.alma_cultural_facts(fact_type, target_role, target_state)
  WHERE active AND fact_type = 'usage_nudge';

CREATE OR REPLACE FUNCTION public.get_alma_cultural_fact(
  p_user_id uuid,
  p_surface text,
  p_context jsonb DEFAULT '{}'::jsonb,
  p_bypass_cooldown boolean DEFAULT false,
  p_exclude_ids uuid[] DEFAULT ARRAY[]::uuid[]
)
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
  v_pro_line constant text := 'Pour un trouble installé, un vétérinaire ou un comportementaliste reste la référence.';
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = p_user_id;

  IF NOT p_bypass_cooldown AND EXISTS (
    SELECT 1 FROM public.alma_whisper_history
    WHERE user_id = p_user_id
      AND whisper_type = 'cultural_fact'
      AND emitted_at > now() - interval '24 hours'
  ) THEN
    RETURN NULL;
  END IF;

  SELECT *
  INTO v_row
  FROM public.alma_cultural_facts f
  WHERE f.active = true
    AND f.fact_type <> 'usage_nudge'
    AND (p_exclude_ids IS NULL OR NOT (f.id = ANY(p_exclude_ids)))
    AND NOT EXISTS (
      SELECT 1 FROM public.alma_whisper_history h
      WHERE h.user_id = p_user_id
        AND (h.metadata->>'fact_id') = f.id::text
        AND h.emitted_at > now() - interval '24 hours'
    )
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
          p_surface IN ('sitter_dashboard','owner_dashboard','city_page','house_guide','listings','search_page','sit_detail','favorites','sits_list')
          AND p_surface <> 'breed_page'
        WHEN 'mutual_aid_tip' THEN
          p_surface IN ('owner_dashboard','sitter_dashboard','mutual_aid','missions','listings','search_page')
        WHEN 'animal_humor' THEN
          p_surface IN ('owner_dashboard','sitter_dashboard','sit_detail','favorites','sits_list')
        ELSE true
      END
    )
    AND (
      NOT (f.context_filter ? 'animal_species')
      OR (f.context_filter->>'animal_species' = p_context->>'animal_species')
      OR f.fact_type IN ('dog_behavior_tip','cat_behavior_tip')
    )
  ORDER BY
    f.priority ASC,
    (-ln(random()) / GREATEST(f.weight, 1)) ASC
  LIMIT 1;

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
    'cta_label', v_row.cta_label,
    'cta_action', v_row.cta_action
  );
END
$function$;

GRANT EXECUTE ON FUNCTION public.get_alma_cultural_fact(uuid, text, jsonb, boolean, uuid[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_alma_usage_nudge(
  p_user_id uuid,
  p_surface text,
  p_role text DEFAULT 'any',
  p_state text DEFAULT 'any',
  p_bypass_cooldown boolean DEFAULT false,
  p_exclude_ids uuid[] DEFAULT ARRAY[]::uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_row public.alma_cultural_facts%ROWTYPE;
BEGIN
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

GRANT EXECUTE ON FUNCTION public.get_alma_usage_nudge(uuid, text, text, text, boolean, uuid[]) TO authenticated;
