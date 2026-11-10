-- Lot ALMA1, « tiroir réparé » (10/11/2026, arène claude/arene/2026-11-10-alma-vivante,
-- lot L1, « ok go » de Jérémie après l'audit des décisions).
-- Constat (base, 30 jours) : 4 types de faits vus sur 11, 0 blague sur 31 en base,
-- relances d'usage à 46 % des faits, 52 textes distincts sur 337.
-- Causes :
--   * le site envoie search, race_page, sits_list ; la fonction attend
--     search_page, breed_page, listings : conseils maison, chien, chat et
--     entraide ne trouvaient jamais leur écran ;
--   * l'humour était réservé aux tableaux de bord, qui ne demandent plus de
--     fait depuis le correctif « double voix » du 16/08/2026 ;
--   * la relance d'usage (priorité 2) gagnait dès qu'elle était éligible ;
--   * aucune rotation : le même texte revenait au même membre.
-- Correctifs (même signature, même retour) :
--   1. chaque surface est lue avec son autre nom (search et search_page,
--      race_page et breed_page, sits_list et listings) ;
--   2. l'humour (animal_humor) est éligible sur les écrans de découverte
--      (recherche, liste des gardes, profil de gardien, page ville, page race,
--      favoris), jamais sur la fiche d'une garde (écran d'action), une fois
--      par visite au plus (p_context.humor_seen_this_visit) ;
--   3. rotation lue dans alma_whisper_history (index user, type, date) : le
--      type du dernier fait cède sa place, un texte montré depuis 30 jours
--      revient seulement quand l'écran n'a plus rien d'autre ;
--   4. la relance d'usage passe après les autres types quand l'un des deux
--      derniers faits montrés au membre en était déjà une (une sur trois au plus) ;
--   5. une blague propre au chien ou au chat (25 sur 31) vient aussi sur un
--      écran qui ne nomme aucune espèce ; avant, seules 6 blagues y étaient
--      éligibles, épuisées en six visites.
-- Repère : alma1_tiroir_repare (contrat de production).

CREATE OR REPLACE FUNCTION public.get_alma_cultural_fact(
  p_user_id uuid,
  p_surface text,
  p_context jsonb DEFAULT '{}'::jsonb,
  p_bypass_cooldown boolean DEFAULT false,
  p_exclude_ids uuid[] DEFAULT ARRAY[]::uuid[],
  p_on_demand boolean DEFAULT false,
  p_frequency text DEFAULT 'balanced'::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  -- alma1_tiroir_repare
  v_role text;
  v_target text;
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
  v_surfaces text[];
  v_is_breed boolean;
  v_humor_ok boolean;
  v_recent_ids uuid[];
  v_last_type text;
  v_nudge_recent boolean;
BEGIN
  IF p_user_id IS NULL OR p_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501', MESSAGE = 'unauthorized';
  END IF;

  -- 1. Surface lue avec son autre nom.
  v_surfaces := CASE p_surface
    WHEN 'search' THEN ARRAY['search', 'search_page']
    WHEN 'search_page' THEN ARRAY['search_page', 'search']
    WHEN 'race_page' THEN ARRAY['race_page', 'breed_page']
    WHEN 'breed_page' THEN ARRAY['breed_page', 'race_page']
    WHEN 'sits_list' THEN ARRAY['sits_list', 'listings']
    WHEN 'listings' THEN ARRAY['listings', 'sits_list']
    ELSE ARRAY[coalesce(p_surface, '')]
  END;
  v_is_breed := v_surfaces && ARRAY['breed_page'];

  -- 2. Humour sur les écrans de découverte, une fois par visite.
  v_humor_ok := v_surfaces && ARRAY[
      'search', 'search_page', 'sits_list', 'listings', 'sitter_profile',
      'city_page', 'breed_page', 'race_page', 'favorites',
      'owner_dashboard', 'sitter_dashboard'
    ]
    AND coalesce(p_context->>'humor_seen_this_visit', 'false') <> 'true';

  -- 3 et 4. Ce que le membre a reçu récemment.
  SELECT coalesce(array_agg(DISTINCT (h.metadata->>'fact_id')::uuid), ARRAY[]::uuid[])
    INTO v_recent_ids
  FROM public.alma_whisper_history h
  WHERE h.user_id = p_user_id
    AND h.whisper_type IN ('cultural_fact', 'usage_nudge')
    AND h.emitted_at > now() - interval '30 days'
    AND h.metadata->>'fact_id' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

  SELECT
    (array_agg(CASE WHEN r.whisper_type = 'usage_nudge' THEN 'usage_nudge'
                    ELSE r.metadata->>'fact_type' END ORDER BY r.emitted_at DESC))[1],
    coalesce(bool_or(r.whisper_type = 'usage_nudge'), false)
    INTO v_last_type, v_nudge_recent
  FROM (
    SELECT h.whisper_type, h.metadata, h.emitted_at
    FROM public.alma_whisper_history h
    WHERE h.user_id = p_user_id
      AND h.whisper_type IN ('cultural_fact', 'usage_nudge')
    ORDER BY h.emitted_at DESC
    LIMIT 2
  ) r;

  SELECT role, coalesce(alma_muted_categories, ARRAY[]::text[])
    INTO v_role, v_muted
  FROM public.profiles WHERE id = p_user_id;

  v_target := coalesce(
    CASE WHEN p_context->>'active_role' IN ('owner', 'sitter') THEN p_context->>'active_role' END,
    CASE WHEN p_surface LIKE 'owner%' THEN 'owner' WHEN p_surface LIKE 'sitter%' THEN 'sitter' END,
    CASE WHEN v_role IN ('owner', 'sitter') THEN v_role END
  );

  -- Premier passage : sans les textes reçus depuis 30 jours.
  v_effective_exclude := coalesce(p_exclude_ids, ARRAY[]::uuid[]) || coalesce(v_recent_ids, ARRAY[]::uuid[]);

  FOR i IN 1..3 LOOP
    v_picked_type := NULL;

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
        OR (f.context_filter->>'surface' = ANY(v_surfaces))
        OR (jsonb_typeof(f.context_filter->'surface') = 'array'
            AND f.context_filter->'surface' ?| v_surfaces)
      )
      AND (
        NOT (f.context_filter ? 'role')
        OR v_role IS NULL
        OR (f.context_filter->>'role' = v_role)
        OR (f.context_filter->>'role' = 'both')
      )
      AND (coalesce(f.target_role, 'any') IN ('any', 'both') OR f.target_role = v_target)
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
            v_surfaces && ARRAY['breed_page','owner_dashboard','sitter_dashboard','search_page']
            AND (NOT v_is_breed OR p_context->>'animal_species' = 'dog')
          WHEN 'cat_behavior_tip' THEN
            v_surfaces && ARRAY['breed_page','owner_dashboard','sitter_dashboard','search_page']
            AND (NOT v_is_breed OR p_context->>'animal_species' = 'cat')
          WHEN 'pet_care_tip' THEN
            (NOT v_is_breed
             OR NOT (f.context_filter ? 'animal_species')
             OR f.context_filter->>'animal_species' = p_context->>'animal_species')
          WHEN 'home_care_tip' THEN
            v_surfaces && ARRAY['sitter_dashboard','owner_dashboard','city_page','house_guide','listings','search_page']
            AND NOT v_is_breed
          WHEN 'mutual_aid_tip' THEN
            v_surfaces && ARRAY['owner_dashboard','sitter_dashboard','mutual_aid','missions','listings','search_page']
          WHEN 'animal_humor' THEN
            v_humor_ok
          WHEN 'breed_did_you_know' THEN
            v_is_breed
          ELSE true
        END
      )
      AND (
        NOT (f.context_filter ? 'animal_species')
        OR (f.context_filter->>'animal_species' = p_context->>'animal_species')
        OR f.fact_type IN ('dog_behavior_tip','cat_behavior_tip')
        OR (f.fact_type = 'animal_humor' AND coalesce(p_context->>'animal_species', '') = '')
      )
    GROUP BY f.fact_type
    ORDER BY
      (v_nudge_recent AND f.fact_type = 'usage_nudge') ASC,
      (f.fact_type IS NOT DISTINCT FROM v_last_type) ASC,
      min(f.priority) ASC,
      random() ASC
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
          OR (f.context_filter->>'surface' = ANY(v_surfaces))
          OR (jsonb_typeof(f.context_filter->'surface') = 'array'
              AND f.context_filter->'surface' ?| v_surfaces)
        )
        AND (
          NOT (f.context_filter ? 'role')
          OR v_role IS NULL
          OR (f.context_filter->>'role' = v_role)
          OR (f.context_filter->>'role' = 'both')
        )
        AND (coalesce(f.target_role, 'any') IN ('any', 'both') OR f.target_role = v_target)
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
          OR (f.fact_type = 'animal_humor' AND coalesce(p_context->>'animal_species', '') = '')
        )
      ORDER BY (-ln(random()) / GREATEST(f.weight, 1)) ASC
      LIMIT 1;
    END IF;

    EXIT WHEN v_row.id IS NOT NULL;

    IF i = 1 THEN
      -- Deuxième passage : les textes déjà reçus reviennent.
      v_effective_exclude := coalesce(p_exclude_ids, ARRAY[]::uuid[]);
    ELSIF i = 2 AND coalesce(p_on_demand, false)
          AND array_length(v_effective_exclude, 1) IS NOT NULL THEN
      -- « Un autre conseil » : dernier passage sans aucune exclusion.
      v_effective_exclude := ARRAY[]::uuid[];
    ELSE
      EXIT;
    END IF;
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
    'picked_type', v_picked_type,
    -- Lot A2 : bouton de la relance, lu en base.
    'cta_label', v_row.cta_label,
    'cta_action', v_row.cta_action
  );
END
$function$;
