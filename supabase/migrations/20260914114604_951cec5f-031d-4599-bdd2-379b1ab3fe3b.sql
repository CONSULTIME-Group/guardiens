-- 1) Fonctions recréées AVANT toute suppression de ce qu'elles lisent.

CREATE OR REPLACE FUNCTION public.set_declared_pro_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.pro_specialty IS NOT NULL AND btrim(NEW.pro_specialty) <> '' THEN
    NEW.pro_status := 'declared';
  ELSIF (NEW.pro_specialty IS NULL OR btrim(NEW.pro_specialty) = '')
        AND NEW.pro_status = 'declared' THEN
    NEW.pro_status := 'none';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.prevent_profile_sensitive_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;
  IF current_setting('app.allow_internal_profile_update', true) = 'on' THEN
    RETURN NEW;
  END IF;
  IF current_setting('role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Escape hatch : le membre peut soumettre son dossier (statut -> 'pending')
  -- depuis un état non décidé. Les statuts 'verified' / 'rejected' / 'needs_review'
  -- restent réservés à l'équipe (verify-identity, admin-manage-identity-verification).
  IF NEW.identity_verification_status IS DISTINCT FROM OLD.identity_verification_status
     AND NEW.identity_verification_status = 'pending'
     AND COALESCE(OLD.identity_verification_status, 'not_submitted') IN ('not_submitted', 'pending', 'rejected')
     AND NEW.identity_verified IS NOT DISTINCT FROM OLD.identity_verified
  THEN
    NULL;
  ELSIF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.identity_verified IS DISTINCT FROM OLD.identity_verified
     OR NEW.identity_verification_status IS DISTINCT FROM OLD.identity_verification_status
     OR NEW.account_status IS DISTINCT FROM OLD.account_status
     OR NEW.is_founder IS DISTINCT FROM OLD.is_founder
     OR NEW.pro_status IS DISTINCT FROM OLD.pro_status
     OR NEW.suspended_at IS DISTINCT FROM OLD.suspended_at
     OR NEW.suspended_by IS DISTINCT FROM OLD.suspended_by
     OR NEW.suspension_reason IS DISTINCT FROM OLD.suspension_reason
     OR NEW.suspended_until IS DISTINCT FROM OLD.suspended_until
     OR NEW.boosted_until IS DISTINCT FROM OLD.boosted_until
     OR NEW.free_months_credit IS DISTINCT FROM OLD.free_months_credit
     OR NEW.referred_by IS DISTINCT FROM OLD.referred_by
     OR NEW.completed_sits_count IS DISTINCT FROM OLD.completed_sits_count
     OR NEW.cancellation_count IS DISTINCT FROM OLD.cancellation_count
     OR NEW.cancellations_as_proprio IS DISTINCT FROM OLD.cancellations_as_proprio
     OR NEW.referral_code IS DISTINCT FROM OLD.referral_code
  THEN
    RAISE EXCEPTION 'Modification interdite d''un champ sensible du profil';
  END IF;
  RETURN NEW;
END;
$function$;

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
BEGIN
  IF _user_id IS NULL OR _new_email IS NULL THEN
    RAISE EXCEPTION 'anonymize_user_account: arguments requis';
  END IF;

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

CREATE OR REPLACE FUNCTION public.admin_dashboard_summary()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_result jsonb := '{}'::jsonb;
  v_money_regex text := '(\d+\s*€|€\s*\d+|\meuros?\M|\mrémunér|\mremuner|\msalaire\M|\mtarif\M|\mpayer\M|\mpaiement\M|\mcash\M|\mespèces?\M)';
  v_health record;
  v_reports_count int; v_reports_avg_days numeric;
  v_missions_money_count int; v_missions_money jsonb;
  v_reviews_pending_count int;
  v_identity_pending_count int;
  v_pipeline_critical boolean := false; v_pipeline_reasons jsonb := '[]'::jsonb;
  v_mass_paused_count int; v_mass_paused jsonb;
  v_deferred_stuck_count int;
  v_sits_zero_apps_count int; v_sits_zero_apps jsonb;
  v_sits_overdue_count int; v_sits_overdue jsonb;
  v_new_incomplete_count int;
BEGIN
  IF v_uid IS NULL OR NOT public.has_role(v_uid, 'admin') THEN
    RAISE EXCEPTION 'admin only' USING ERRCODE = '42501';
  END IF;

  SELECT count(*)::int, COALESCE(avg(EXTRACT(EPOCH FROM (now() - created_at)) / 86400.0), 0)
    INTO v_reports_count, v_reports_avg_days
  FROM reports WHERE status IN ('new','in_progress');

  WITH m AS (
    SELECT id, title, slug FROM small_missions
    WHERE status = 'open'
      AND (description ~* v_money_regex OR exchange_offer ~* v_money_regex)
    ORDER BY created_at DESC
  )
  SELECT count(*)::int, COALESCE(jsonb_agg(jsonb_build_object('id',id,'title',title,'slug',slug)) FILTER (WHERE row_num <= 5), '[]'::jsonb)
    INTO v_missions_money_count, v_missions_money
  FROM (SELECT id, title, slug, row_number() OVER () AS row_num FROM m) x;

  SELECT count(*)::int INTO v_reviews_pending_count
  FROM reviews WHERE moderation_status = 'en_attente';

  SELECT count(*)::int INTO v_identity_pending_count
  FROM profiles WHERE identity_verification_status IN ('pending','submitted');

  -- Pipeline email : la criticité NE dépend PLUS de last_run_age_seconds.
  -- Le worker est event-driven ; un silence en période calme est normal.
  SELECT * INTO v_health FROM v_email_pipeline_health LIMIT 1;
  IF v_health IS NOT NULL THEN
    IF v_health.oldest_pending_age_seconds IS NOT NULL AND v_health.oldest_pending_age_seconds > 600 THEN
      v_pipeline_critical := true;
      v_pipeline_reasons := v_pipeline_reasons || to_jsonb('Backlog file : plus vieux pending ' || round(v_health.oldest_pending_age_seconds)::text || 's');
    END IF;
    IF COALESCE(v_health.failure_rate_1h,0) > 0.3 AND COALESCE(v_health.attempts_1h,0) >= 10 THEN
      v_pipeline_critical := true;
      v_pipeline_reasons := v_pipeline_reasons || to_jsonb('Taux d''échec ' || round(v_health.failure_rate_1h*100)::text || '% (1h)');
    END IF;
    IF COALESCE(v_health.stuck_rate_limit, false) THEN
      v_pipeline_critical := true;
      v_pipeline_reasons := v_pipeline_reasons || to_jsonb('Rate-limit bloqué'::text);
    END IF;
    IF COALESCE(v_health.dlq_last_hour, 0) > 0 THEN
      v_pipeline_critical := true;
      v_pipeline_reasons := v_pipeline_reasons || to_jsonb('DLQ ' || v_health.dlq_last_hour::text || ' sur 1h');
    END IF;
  END IF;

  WITH me AS (
    SELECT id, subject FROM mass_emails WHERE status = 'paused'
    ORDER BY created_at DESC
  )
  SELECT count(*)::int, COALESCE(jsonb_agg(jsonb_build_object('id',id,'subject',subject)) FILTER (WHERE rn <= 5), '[]'::jsonb)
    INTO v_mass_paused_count, v_mass_paused
  FROM (SELECT id, subject, row_number() OVER () AS rn FROM me) x;

  SELECT count(*)::int INTO v_deferred_stuck_count
  FROM email_deferred_queue
  WHERE status = 'pending' AND scheduled_for < now() - interval '1 hour';

  WITH s AS (
    SELECT s.id, s.title, s.slug FROM sits s
    WHERE s.status = 'published'
      AND s.published_at IS NOT NULL
      AND s.published_at < now() - interval '7 days'
      AND NOT EXISTS (SELECT 1 FROM applications a WHERE a.sit_id = s.id)
    ORDER BY s.published_at ASC
  )
  SELECT count(*)::int, COALESCE(jsonb_agg(jsonb_build_object('id',id,'title',title,'slug',slug)) FILTER (WHERE rn <= 5), '[]'::jsonb)
    INTO v_sits_zero_apps_count, v_sits_zero_apps
  FROM (SELECT id, title, slug, row_number() OVER () AS rn FROM s) x;

  WITH s AS (
    SELECT id, title, end_date FROM sits
    WHERE status = 'confirmed' AND end_date IS NOT NULL AND end_date < CURRENT_DATE
    ORDER BY end_date ASC
  )
  SELECT count(*)::int, COALESCE(jsonb_agg(jsonb_build_object('id',id,'title',title,'end_date',end_date)) FILTER (WHERE rn <= 5), '[]'::jsonb)
    INTO v_sits_overdue_count, v_sits_overdue
  FROM (SELECT id, title, end_date, row_number() OVER () AS rn FROM s) x;

  SELECT count(*)::int INTO v_new_incomplete_count
  FROM profiles
  WHERE created_at > now() - interval '7 days'
    AND COALESCE(profile_completion,0) < 60;

  v_result := jsonb_build_object(
    'generated_at', now(),
    'reports', jsonb_build_object('count', v_reports_count, 'avg_days', round(v_reports_avg_days,1)),
    'missions_money', jsonb_build_object('count', v_missions_money_count, 'items', v_missions_money),
    'reviews_pending', jsonb_build_object('count', v_reviews_pending_count),
    'identity_pending', jsonb_build_object('count', v_identity_pending_count),
    'email_pipeline', jsonb_build_object('critical', v_pipeline_critical, 'reasons', v_pipeline_reasons),
    'mass_emails_paused', jsonb_build_object('count', v_mass_paused_count, 'items', v_mass_paused),
    'deferred_stuck', jsonb_build_object('count', v_deferred_stuck_count),
    'sits_zero_apps', jsonb_build_object('count', v_sits_zero_apps_count, 'items', v_sits_zero_apps),
    'sits_overdue', jsonb_build_object('count', v_sits_overdue_count, 'items', v_sits_overdue),
    'new_incomplete', jsonb_build_object('count', v_new_incomplete_count)
  );

  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_inventaire_counts()
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    'cities_total', (SELECT count(*) FROM public.city_guides WHERE published = true),
    'places_total', (SELECT count(*) FROM public.city_guide_places p JOIN public.city_guides g ON g.id = p.city_guide_id WHERE g.published = true),
    'places_by_category', (
      SELECT COALESCE(jsonb_object_agg(category, cnt), '{}'::jsonb)
      FROM (
        SELECT p.category::text AS category, count(*) AS cnt
        FROM public.city_guide_places p
        JOIN public.city_guides g ON g.id = p.city_guide_id
        WHERE g.published = true
        GROUP BY p.category
      ) x
    ),
    'breeds_total', (SELECT count(*) FROM public.breed_profiles),
    'breeds_by_species', (
      SELECT COALESCE(jsonb_object_agg(species, cnt), '{}'::jsonb)
      FROM (SELECT species, count(*) AS cnt FROM public.breed_profiles GROUP BY species) x
    ),
    'generated_at', now()
  );
$function$;

-- 2) Vue publique recréée sans aucune colonne pro_.
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles AS
SELECT id,
    first_name,
    city,
    avatar_url,
    bio,
    completed_sits_count,
    identity_verified,
    is_founder,
    postal_code,
    created_at,
    profile_completion,
    round(latitude::numeric, 2)::double precision AS latitude_approx,
    round(longitude::numeric, 2)::double precision AS longitude_approx,
    available_for_help,
    skill_categories,
    custom_skills,
    role,
    last_seen_at,
    departement_code
   FROM profiles
  WHERE account_status = 'active'::text AND first_name IS NOT NULL;

GRANT SELECT ON public.public_profiles TO anon;
GRANT SELECT ON public.public_profiles TO authenticated;

-- 3) Fonctions purement annuaire.
DROP FUNCTION IF EXISTS public.get_pro_map_points() CASCADE;
DROP FUNCTION IF EXISTS public.increment_pro_view(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.refresh_pro_rating() CASCADE;
DROP FUNCTION IF EXISTS public.trg_pro_reviews_refresh() CASCADE;
DROP FUNCTION IF EXISTS public.set_pro_google_reviews_cache_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.sync_profile_pro_status() CASCADE;
DROP FUNCTION IF EXISTS public.clear_my_pro_status() CASCADE;

-- 4) Les quatre tables de l'annuaire, toutes vides.
DROP TABLE IF EXISTS public.pro_reviews CASCADE;
DROP TABLE IF EXISTS public.pro_google_reviews_cache CASCADE;
DROP TABLE IF EXISTS public.pro_verifications CASCADE;
DROP TABLE IF EXISTS public.pro_profiles CASCADE;

-- 5) Les cinq colonnes d'annuaire du profil.
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS pro_business_name,
  DROP COLUMN IF EXISTS pro_siret,
  DROP COLUMN IF EXISTS pro_tagline,
  DROP COLUMN IF EXISTS pro_pricing_note,
  DROP COLUMN IF EXISTS pro_approved_at;

COMMENT ON COLUMN public.profiles.pro_status IS 'Déclaration de statut professionnel, interne. Sert la modération du positionnement entre particuliers.';
COMMENT ON COLUMN public.profiles.pro_specialty IS 'Spécialité déclarée. Bascule pro_status en declared par set_declared_pro_status().';