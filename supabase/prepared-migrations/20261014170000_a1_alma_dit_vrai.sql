-- Lot A1 (14/10/2026) : Alma dit vrai et protège (audit Alma en arène du
-- 14/10/2026, claude/audit-alma-arene-14-octobre-2026.md).
-- Chaque fonction part de sa définition relue en production le 14/10/2026
-- (pg_get_functiondef, lecture seule). Fichier rejouable : CREATE OR REPLACE,
-- UPDATE et DELETE gardés (un second passage ne touche aucune ligne).
-- Droits inchangés : CREATE OR REPLACE garde les droits existants
-- (get_alma_cultural_fact : authenticated et service_role ;
-- anonymize_user_account : service_role).
-- Les trois réponses de FAQ sur le réseau d'urgence ont été réécrites en base
-- le 14/10/2026 (sauvegarde _backup_faq_urgence_20261014) ; elles restent hors
-- de ce fichier.
-- Écarté : le nettoyage des guides de la maison à accolades. 15 guides sur 38
-- portent une trame d'Alma partiellement remplie par le propriétaire ; vider
-- le champ effacerait ses ajouts. L'accord de garde écarte désormais tout
-- champ qui garde une accolade (src/lib/accordDeGarde.ts) et le formulaire
-- demande de les remplacer avant d'enregistrer.

-- =========================================================================
-- A1.1 Faits culturels : le public visé par target_role est respecté.
-- « Votre annonce vit » (fait 02821790, target_role owner) a été vu 524 fois
-- par des comptes gardien en 30 jours : la fonction ne lisait que
-- context_filter->>'role', vide sur les 339 faits. Le public suit l'espace
-- actif transmis par le site (p_context.active_role), puis la surface (tableau
-- de bord propriétaire ou gardien), puis le rôle du compte ; un compte double
-- sans espace connu ne reçoit que les faits pour tous.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.get_alma_cultural_fact(p_user_id uuid, p_surface text, p_context jsonb DEFAULT '{}'::jsonb, p_bypass_cooldown boolean DEFAULT false, p_exclude_ids uuid[] DEFAULT ARRAY[]::uuid[], p_on_demand boolean DEFAULT false, p_frequency text DEFAULT 'balanced'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
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
BEGIN
  IF p_user_id IS NULL OR p_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501', MESSAGE = 'unauthorized';
  END IF;

  SELECT role, coalesce(alma_muted_categories, ARRAY[]::text[])
    INTO v_role, v_muted
  FROM public.profiles WHERE id = p_user_id;

  v_target := coalesce(
    CASE WHEN p_context->>'active_role' IN ('owner', 'sitter') THEN p_context->>'active_role' END,
    CASE WHEN p_surface LIKE 'owner%' THEN 'owner' WHEN p_surface LIKE 'sitter%' THEN 'sitter' END,
    CASE WHEN v_role IN ('owner', 'sitter') THEN v_role END
  );

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

-- =========================================================================
-- A1.2 Faits culturels conformes à la doctrine (lot Y3).
-- =========================================================================
-- Comparaison avec la pension, et « près de chez vous » sans annonce réelle.
UPDATE public.alma_cultural_facts SET active = false
 WHERE id IN ('4e627110-d139-46d8-b298-0fc4ea6735ac', 'd51ed6b9-3ef8-410a-9a9e-344822feed5b')
   AND active = true;

UPDATE public.alma_cultural_facts
   SET content = 'Halètement intense, bave épaisse ou grande fatigue par forte chaleur peuvent signaler un coup de chaud. Mettez l''animal au frais et contactez un vétérinaire.'
 WHERE id = '480c7858-3448-4977-9653-4e9c0ef8a5a3' AND content LIKE 'Halet intense%';

UPDATE public.alma_cultural_facts
   SET content = 'Halètement extrême, bave abondante, abattement soudain par temps chaud : ce sont des signes de coup de chaleur, une urgence vétérinaire.'
 WHERE id = '183d14ea-e29c-4a34-a8fd-b8000d9f92c9' AND content LIKE 'Halet extrême%';

UPDATE public.alma_cultural_facts
   SET content = 'Vous publiez, vous voyez qui répond, vous choisissez ensuite.'
 WHERE id = 'd67e9c36-a4e1-4be0-b505-8b8f8aa3a816' AND content = 'Poster ne vous engage à rien. Vous voyez qui répond, vous décidez ensuite.';

UPDATE public.alma_cultural_facts
   SET content = 'Confier son animal demande de la confiance. Une rencontre avant la garde, si vous le souhaitez tous les deux, aide à se connaître.'
 WHERE id = '49d45e62-4d8f-43fd-b411-daea39b0ea6c' AND content LIKE 'Confier son animal fait toujours un peu peur.%';

UPDATE public.alma_cultural_facts
   SET content = 'Des gardiens à proximité attendent une occasion. Décrivez la vôtre, même courte.'
 WHERE id = '9fd31991-e0b5-4eed-8b19-913220a5a656' AND content LIKE 'Des gardiens près de chez vous%';

UPDATE public.alma_cultural_facts
   SET content = 'Garder vos favoris, c''est bien. Les contacter, c''est mieux : un message suffit à ouvrir la porte.'
 WHERE id = '374a39df-3b53-404a-823d-8a651656ebc4' AND content LIKE '%Un message ne coûte rien%';

-- =========================================================================
-- A1.3 Effacement d'un compte : les échanges avec Alma partent aussi.
-- Deux comptes effacés gardaient 4 lignes d'alma_conversations, alors qu'Alma
-- avait écrit le 19/09/2026 « vos données personnelles sont effacées ».
-- Ajouts : alma_feedback, alma_conversations, alma_journal_shown,
-- alma_mood_views supprimés ; signaux admin Alma réduits au jour ; messages
-- de contact liés anonymisés.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.anonymize_user_account(_user_id uuid, _new_email text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _prop_ids uuid[];
  _archived_sits int := 0;
  _cancelled_missions int := 0;
  _old_email text;
BEGIN
  IF _user_id IS NULL OR _new_email IS NULL THEN
    RAISE EXCEPTION 'anonymize_user_account: arguments requis';
  END IF;

  SELECT email INTO _old_email FROM public.profiles WHERE id = _user_id;

  SELECT array_agg(id) INTO _prop_ids FROM public.properties WHERE user_id = _user_id;

  IF _prop_ids IS NOT NULL THEN
    DELETE FROM public.pets WHERE property_id = ANY(_prop_ids);
    DELETE FROM public.house_guides WHERE property_id = ANY(_prop_ids);
  END IF;
  DELETE FROM public.house_guides WHERE user_id = _user_id;
  DELETE FROM public.properties WHERE user_id = _user_id;
  DELETE FROM public.sitter_profiles WHERE user_id = _user_id;
  DELETE FROM public.owner_profiles WHERE user_id = _user_id;
  DELETE FROM public.sitter_gallery WHERE user_id = _user_id;
  DELETE FROM public.owner_gallery WHERE user_id = _user_id;
  DELETE FROM public.external_experiences WHERE user_id = _user_id;
  DELETE FROM public.identity_verification_logs WHERE user_id = _user_id;
  DELETE FROM public.emergency_sitter_profiles WHERE user_id = _user_id;
  DELETE FROM public.alert_preferences WHERE user_id = _user_id;
  DELETE FROM public.notification_preferences WHERE user_id = _user_id;
  DELETE FROM public.email_preferences WHERE user_id = _user_id;
  DELETE FROM public.favorites WHERE user_id = _user_id;
  DELETE FROM public.notifications WHERE user_id = _user_id;
  DELETE FROM public.alma_whisper_history WHERE user_id = _user_id;
  -- Lot A1 : échanges avec Alma.
  DELETE FROM public.alma_feedback WHERE user_id = _user_id;
  DELETE FROM public.alma_conversations WHERE user_id = _user_id;
  DELETE FROM public.alma_journal_shown WHERE user_id = _user_id;
  DELETE FROM public.alma_mood_views WHERE user_id = _user_id;
  UPDATE public.contact_messages
     SET name = 'Membre supprimé', email = _new_email, message = '[message effacé avec le compte]'
   WHERE (id IN (SELECT (s.metadata->>'contact_message_id')::uuid
                   FROM public.admin_signals s
                  WHERE s.entity_type = 'profile' AND s.entity_id = _user_id
                    AND s.metadata ? 'contact_message_id')
          OR (_old_email IS NOT NULL AND lower(email) = lower(_old_email)))
     AND message <> '[message effacé avec le compte]';
  UPDATE public.admin_signals
     SET metadata = jsonb_build_object('erased', true, 'day', metadata->'day')
   WHERE entity_type = 'profile' AND entity_id = _user_id
     AND signal_type LIKE 'alma%'
     AND NOT coalesce((metadata->>'erased')::boolean, false);

  UPDATE public.sits SET status = 'archived'
   WHERE user_id = _user_id AND status IN ('draft', 'published');
  GET DIAGNOSTICS _archived_sits = ROW_COUNT;

  UPDATE public.small_missions SET status = 'cancelled'
   WHERE user_id = _user_id AND status IN ('open', 'in_progress');
  GET DIAGNOSTICS _cancelled_missions = ROW_COUNT;

  UPDATE public.profiles SET
    first_name = 'Membre supprimé',
    last_name = '',
    email = _new_email,
    avatar_url = NULL,
    bio = NULL,
    city = NULL,
    postal_code = NULL,
    latitude = NULL,
    longitude = NULL,
    departement_code = NULL,
    date_of_birth = NULL,
    identity_document_url = NULL,
    identity_selfie_url = NULL,
    identity_verification_status = NULL,
    identity_verified = false,
    pro_status = 'none',
    pro_specialty = NULL,
    account_status = 'deleted',
    available_for_help = false,
    skill_categories = NULL,
    custom_skills = NULL,
    referral_code = NULL,
    referred_by = NULL,
    suspension_reason = NULL,
    updated_at = now()
  WHERE id = _user_id;

  RETURN jsonb_build_object(
    'user_id', _user_id,
    'archived_sits', _archived_sits,
    'cancelled_missions', _cancelled_missions
  );
END;
$function$;

-- Rattrapage des comptes déjà effacés (account_status deleted).
DELETE FROM public.alma_feedback WHERE user_id IN (SELECT id FROM public.profiles WHERE account_status = 'deleted');
DELETE FROM public.alma_conversations WHERE user_id IN (SELECT id FROM public.profiles WHERE account_status = 'deleted');
DELETE FROM public.alma_journal_shown WHERE user_id IN (SELECT id FROM public.profiles WHERE account_status = 'deleted');
DELETE FROM public.alma_mood_views WHERE user_id IN (SELECT id FROM public.profiles WHERE account_status = 'deleted');
UPDATE public.contact_messages c
   SET name = 'Membre supprimé', email = p.email, message = '[message effacé avec le compte]'
  FROM public.admin_signals s
  JOIN public.profiles p ON p.id = s.entity_id AND p.account_status = 'deleted'
 WHERE s.entity_type = 'profile' AND s.metadata ? 'contact_message_id'
   AND c.id = (s.metadata->>'contact_message_id')::uuid
   AND c.message <> '[message effacé avec le compte]';
UPDATE public.admin_signals s
   SET metadata = jsonb_build_object('erased', true, 'day', s.metadata->'day')
  FROM public.profiles p
 WHERE p.id = s.entity_id AND p.account_status = 'deleted'
   AND s.entity_type = 'profile' AND s.signal_type LIKE 'alma%'
   AND NOT coalesce((s.metadata->>'erased')::boolean, false);
