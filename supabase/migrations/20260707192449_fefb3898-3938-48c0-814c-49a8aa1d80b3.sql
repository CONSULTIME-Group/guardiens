-- 1. Ajoute la valeur "low" à l'enum alma_frequency si absente.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'alma_frequency' AND e.enumlabel = 'low'
  ) THEN
    ALTER TYPE public.alma_frequency ADD VALUE 'low' AFTER 'silent';
  END IF;
END $$;

-- 2. Refonte de get_alma_cultural_fact :
--    - retire le cooldown fixe 24 h côté serveur (remplacé par cadence de session côté client) ;
--    - ajoute p_frequency pour filtrer par famille (peu bavarde = utile seulement) ;
--    - conserve p_on_demand qui outrepasse la cadence et le filtre.
DROP FUNCTION IF EXISTS public.get_alma_cultural_fact(uuid, text, jsonb, boolean, uuid[], boolean);

CREATE OR REPLACE FUNCTION public.get_alma_cultural_fact(
  p_user_id uuid,
  p_surface text,
  p_context jsonb DEFAULT '{}'::jsonb,
  p_bypass_cooldown boolean DEFAULT false,
  p_exclude_ids uuid[] DEFAULT ARRAY[]::uuid[],
  p_on_demand boolean DEFAULT false,
  p_frequency text DEFAULT 'balanced'
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
  v_muted text[];
  v_effective_exclude uuid[];
  v_utile_only boolean := (coalesce(p_frequency, 'balanced') = 'low')
                           AND NOT coalesce(p_on_demand, false);
  v_utile constant text[] := ARRAY[
    'pet_care_tip','dog_behavior_tip','cat_behavior_tip',
    'home_care_tip','seasonal_advice','mutual_aid_tip','usage_nudge','breed_did_you_know'
  ];
  v_pro_line constant text := 'Pour un trouble installé, un vétérinaire ou un comportementaliste reste la référence.';
BEGIN
  SELECT role, coalesce(alma_muted_categories, ARRAY[]::text[])
    INTO v_role, v_muted
  FROM public.profiles WHERE id = p_user_id;

  v_effective_exclude := coalesce(p_exclude_ids, ARRAY[]::uuid[]);

  FOR i IN 1..2 LOOP
    SELECT *
    INTO v_row
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
    ORDER BY
      f.priority ASC,
      (-ln(random()) / GREATEST(f.weight, 1)) ASC
    LIMIT 1;

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
    'source_url', v_row.source_url
  );
END
$function$;

GRANT EXECUTE ON FUNCTION public.get_alma_cultural_fact(uuid, text, jsonb, boolean, uuid[], boolean, text) TO authenticated;