-- Lot Z2 (14/10/2026) : finitions après le lot Z (droits, gardes réalisées,
-- dates d'une garde confirmée, crons sans fonction dans le dépôt).
-- Chaque fonction modifiée part de sa définition relue en production le
-- 14/10/2026 (lecture seule, pg_get_functiondef, pg_trigger, has_function_privilege).
-- Les chiffres cités sont ceux de la base du 14/10/2026, comptés par SELECT.
-- Fichier rejouable : REVOKE et GRANT idempotents, DROP ... IF EXISTS avant
-- chaque CREATE, aucune écriture de ligne. Aucun accès au coffre de secrets.
-- Convention Y2 : tout REVOKE vise PUBLIC, anon et authenticated nommément,
-- puis un GRANT rend l'accès voulu.

-- =========================================================================
-- Z2.1. Droits : fonctions réservées aux membres connectés.
-- 52 fonctions SECURITY DEFINER (hors triggers) lisent auth.uid() et restent
-- exécutables par anon. 42 refusent ou ne renvoient rien sans membre connecté
-- (exception, has_role(auth.uid()) faux, filtre sur auth.uid()) et ne sont
-- appelées par aucun écran visiteur (recherche dans src) : elles passent à
-- authenticated et service_role. profile_completion_missing laissait même un
-- visiteur lire les manques de n'importe quel profil (auth.uid() nul traité
-- comme service_role).
-- Restent ouvertes aux visiteurs, par usage : get_public_sit (fiche publique),
-- search_sitter_pool, search_sitter_pool_mobile, search_sitter_country_counts
-- (recherche), can_view_restricted_profile (vues publiques), log_client_error
-- (journal d'erreurs), increment_small_mission_view (page d'un besoin),
-- link_referral (inscription, répond non_authentifie sans session),
-- count_mission_notification_audience (aucun appel, accepte un visiteur).
-- =========================================================================
REVOKE EXECUTE ON FUNCTION public.accept_application(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_application(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.accept_mission_response(uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_mission_response(uuid, boolean) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.admin_alma_matching_diagnosis(text, text, jsonb, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_alma_matching_diagnosis(text, text, jsonb, uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.admin_cron_health() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_cron_health() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.admin_dashboard_snapshot() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_dashboard_snapshot() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.admin_get_conversation_messages(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_conversation_messages(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.admin_get_listing_applications(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_listing_applications(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.admin_get_listing_conversations(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_listing_conversations(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.admin_get_pending_deletions_count() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_pending_deletions_count() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.admin_get_recent_account_deletions(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_recent_account_deletions(integer) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.admin_get_recent_sit_status_changes(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_recent_sit_status_changes(integer) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.admin_get_sits_status_counts(timestamp with time zone) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_sits_status_counts(timestamp with time zone) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.admin_liquidity_snapshot() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_liquidity_snapshot() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.admin_projet_kpis() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_projet_kpis() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.admin_release_projet(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_release_projet(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.admin_sit_exit_reasons(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_sit_exit_reasons(integer) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.archive_sit(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.archive_sit(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.decline_garde_accord(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.decline_garde_accord(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.filter_blocked_partners(uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.filter_blocked_partners(uuid[]) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_activity_since_last_visit() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_activity_since_last_visit() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_affinity_completeness_stats() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_affinity_completeness_stats() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_alma_blacklisted_types() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_alma_blacklisted_types() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_alma_mood(uuid, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_alma_mood(uuid, text, text, text, text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_garde_accord_status(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_garde_accord_status(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_mutual_aid_funnel_metrics(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_mutual_aid_funnel_metrics(integer) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_nearby_helpers(integer, double precision) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_nearby_helpers(integer, double precision) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_or_create_conversation(uuid, public.conversation_context, uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_conversation(uuid, public.conversation_context, uuid, uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_owner_sits_enriched(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_owner_sits_enriched(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_signup_funnel_metrics(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_signup_funnel_metrics(integer) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.mark_sit_applications_viewed(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_sit_applications_viewed(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.my_mission_meetup_tokens(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.my_mission_meetup_tokens(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.notify_owner_of_new_application(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notify_owner_of_new_application(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.patch_my_email_preferences(boolean, boolean, boolean, boolean, boolean, boolean, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.patch_my_email_preferences(boolean, boolean, boolean, boolean, boolean, boolean, integer) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.profile_completion_missing(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.profile_completion_missing(uuid, text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.reopen_application(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reopen_application(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.report_contact_details_attempt(text, text[], text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.report_contact_details_attempt(text, text[], text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.report_mission_content_signal(uuid, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.report_mission_content_signal(uuid, text, jsonb) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.signal_sit_publish_error(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.signal_sit_publish_error(uuid, text, text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.sitter_missing_opportunities(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sitter_missing_opportunities(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.unpublish_sit(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.unpublish_sit(uuid, text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.upsert_my_email_preferences(boolean, boolean, boolean, boolean, boolean, integer, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_my_email_preferences(boolean, boolean, boolean, boolean, boolean, integer, text, text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.upsert_my_email_preferences(boolean, boolean, boolean, boolean, boolean, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_my_email_preferences(boolean, boolean, boolean, boolean, boolean, integer) TO authenticated, service_role;

-- freeze_seasonal_cohorts refuse un membre non admin mais laisse passer un
-- appel sans auth.uid(), donc un visiteur. Aucun appel du site ni des
-- fonctions edge (recherche dans src et supabase/functions) : service_role seul.
REVOKE EXECUTE ON FUNCTION public.freeze_seasonal_cohorts(text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.freeze_seasonal_cohorts(text, integer) TO service_role;

-- =========================================================================
-- Z2.2. Gardes réalisées, même règle à l'écran et au serveur.
-- get_my_applications renvoie sit_reviewable = public.sit_is_reviewable(sit_id),
-- la règle de l'insertion d'un avis (terminée, ou archivée après son passage
-- par « terminée » et sa date de fin). Au 14/10/2026, 6 candidatures acceptées
-- sur des gardes évaluables, aucun écart entre l'écran et le serveur ; la
-- colonne évite qu'une garde annulée puis archivée passe un jour pour réalisée.
-- Colonnes existantes dans le même ordre, sit_reviewable à la fin. Le type de
-- retour change : DROP puis CREATE, mêmes droits (authenticated, service_role).
-- =========================================================================
DROP FUNCTION IF EXISTS public.get_my_applications();
CREATE FUNCTION public.get_my_applications()
 RETURNS TABLE(application_id uuid, status application_status, created_at timestamp with time zone, viewed_at timestamp with time zone, sit_id uuid, sit_status sit_status, sit_title text, sit_start_date date, sit_end_date date, sit_city text, owner_id uuid, cover_photo text, content_visible boolean, sit_cancelled_by_me boolean, sit_reviewable boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    a.id,
    a.status,
    a.created_at,
    a.viewed_at,
    s.id,
    s.status,
    CASE WHEN s.status = 'draft'::sit_status THEN NULL ELSE s.title END,
    CASE WHEN s.status = 'draft'::sit_status THEN NULL ELSE s.start_date::date END,
    CASE WHEN s.status = 'draft'::sit_status THEN NULL ELSE s.end_date::date END,
    CASE WHEN s.status = 'draft'::sit_status THEN NULL ELSE s.city END,
    s.user_id,
    CASE WHEN s.status = 'draft'::sit_status THEN NULL
         ELSE (SELECT p.photos[1] FROM properties p WHERE p.id = s.property_id) END,
    (s.status <> 'draft'::sit_status),
    (s.cancelled_by IS NOT NULL AND s.cancelled_by = a.sitter_id AND a.status = 'cancelled'::application_status),
    public.sit_is_reviewable(s.id)
  FROM applications a
  JOIN sits s ON s.id = a.sit_id
  WHERE a.sitter_id = auth.uid()
  ORDER BY a.created_at DESC;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_my_applications() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_applications() TO authenticated, service_role;

-- =========================================================================
-- Z2.3. Garde confirmée dont les dates changent (audit A-10).
-- trg_log_sit_date_change écrit déjà sit_date_changes à chaque changement de
-- start_date ou end_date (201 lignes, aucune sous confirmed ou in_progress au
-- 14/10/2026) ; cette écriture reste la seule. Personne ne prévenait le
-- gardien retenu, et EditSit annonçait qu'aucune notification ne partait.
-- Le nouveau trigger, sur une annonce qui reste confirmed ou in_progress :
-- a) notification sit_dates_changed au gardien retenu (lien /sits/{id}, dates
--    JJ/MM/AAAA), une seule non lue par garde (la précédente est remplacée) ;
-- b) message système dans la conversation propriétaire et gardien retenu si
--    elle existe. Un message is_system ne déclenche ni email, ni push, ni
--    new_message (notify_new_message, trg_notify_new_message_email,
--    push_enqueue_on_message l'écartent). Expéditeur : le propriétaire,
--    comme les messages système existants (metadata actor « proprio »).
--    enforce_active_account_writes contrôle alors le compte du propriétaire
--    s'il est l'auteur de la modification : l'insertion est isolée dans un
--    bloc d'exception pour que le changement de dates passe toujours.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.notify_sitter_on_sit_dates_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_sitter uuid;
  v_conv uuid;
  v_owner_name text;
  v_owner_avatar text;
  v_link text := '/sits/' || NEW.id::text;
  v_title text := coalesce(nullif(btrim(NEW.title), ''), 'votre garde');
  v_new text;
  v_old text;
BEGIN
  v_new := CASE
    WHEN NEW.start_date IS NOT NULL AND NEW.end_date IS NOT NULL THEN
      'du ' || to_char(NEW.start_date, 'DD/MM/YYYY') || ' au ' || to_char(NEW.end_date, 'DD/MM/YYYY')
    WHEN NEW.start_date IS NOT NULL THEN
      'à partir du ' || to_char(NEW.start_date, 'DD/MM/YYYY')
    WHEN NEW.end_date IS NOT NULL THEN
      'jusqu''au ' || to_char(NEW.end_date, 'DD/MM/YYYY')
    ELSE 'à convenir ensemble'
  END;
  v_old := CASE
    WHEN OLD.start_date IS NOT NULL AND OLD.end_date IS NOT NULL THEN
      'du ' || to_char(OLD.start_date, 'DD/MM/YYYY') || ' au ' || to_char(OLD.end_date, 'DD/MM/YYYY')
    WHEN OLD.start_date IS NOT NULL THEN
      'à partir du ' || to_char(OLD.start_date, 'DD/MM/YYYY')
    WHEN OLD.end_date IS NOT NULL THEN
      'jusqu''au ' || to_char(OLD.end_date, 'DD/MM/YYYY')
    ELSE NULL
  END;

  SELECT p.first_name, p.avatar_url INTO v_owner_name, v_owner_avatar
    FROM public.profiles p WHERE p.id = NEW.user_id;

  FOR v_sitter IN
    SELECT a.sitter_id
      FROM public.applications a
     WHERE a.sit_id = NEW.id
       AND a.status = 'accepted'::application_status
       AND a.sitter_id IS DISTINCT FROM NEW.user_id
  LOOP
    BEGIN
      DELETE FROM public.notifications n
       WHERE n.user_id = v_sitter
         AND n.type = 'sit_dates_changed'
         AND n.read_at IS NULL
         AND n.link = v_link;
      INSERT INTO public.notifications (user_id, type, title, body, link, actor_name, actor_avatar_url)
      VALUES (
        v_sitter,
        'sit_dates_changed',
        'Nouvelles dates pour votre garde',
        coalesce(v_owner_name, 'Le propriétaire') || ' a mis à jour « ' || v_title || ' » : ' || v_new || '.',
        v_link,
        v_owner_name,
        v_owner_avatar
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'notify_sitter_on_sit_dates_change[notif] sit=% err=%', NEW.id, SQLERRM;
    END;

    v_conv := NULL;
    SELECT c.id INTO v_conv
      FROM public.conversations c
     WHERE c.sit_id = NEW.id
       AND c.owner_id = NEW.user_id
       AND c.sitter_id = v_sitter
     ORDER BY c.last_message_at DESC NULLS LAST, c.created_at DESC
     LIMIT 1;

    IF v_conv IS NOT NULL THEN
      BEGIN
        INSERT INTO public.messages (conversation_id, sender_id, content, is_system, metadata)
        VALUES (
          v_conv,
          NEW.user_id,
          'Nouvelles dates de la garde : ' || v_new
            || CASE WHEN v_old IS NOT NULL THEN ' (auparavant ' || v_old || ')' ELSE '' END || '.',
          true,
          jsonb_build_object(
            'actor', 'proprio',
            'action', 'sit_dates_changed',
            'actor_id', NEW.user_id,
            'actor_name', v_owner_name,
            'sit_id', NEW.id,
            'new_start_date', NEW.start_date,
            'new_end_date', NEW.end_date,
            'old_start_date', OLD.start_date,
            'old_end_date', OLD.end_date
          )
        );
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'notify_sitter_on_sit_dates_change[message] sit=% err=%', NEW.id, SQLERRM;
      END;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.notify_sitter_on_sit_dates_change() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_notify_sitter_on_sit_dates_change ON public.sits;
CREATE TRIGGER trg_notify_sitter_on_sit_dates_change
  AFTER UPDATE OF start_date, end_date ON public.sits
  FOR EACH ROW
  WHEN ((OLD.start_date IS DISTINCT FROM NEW.start_date OR OLD.end_date IS DISTINCT FROM NEW.end_date)
        AND OLD.status IN ('confirmed'::sit_status, 'in_progress'::sit_status)
        AND NEW.status IN ('confirmed'::sit_status, 'in_progress'::sit_status))
  EXECUTE FUNCTION public.notify_sitter_on_sit_dates_change();

-- =========================================================================
-- Z2.4. Crons sans fonction dans le dépôt : aucune déprogrammation.
-- 68 tâches cron.job (65 actives) ; toutes les fonctions SQL appelées existent.
-- Quatre tâches visent une fonction edge absente de supabase/functions :
--   157 nudge-suspicious-accounts        0 */4 * * *  active
--   158 nudge-repeated-cancellations     0 10 * * 4   active
--   159 nudge-repeated-republished-sits  0 12 * * 5   active
--   156 nudge-dormant-top-sitters        0 11 * * 3   inactive
-- Ces fonctions sont déployées hors dépôt et répondent : cron_run_log les
-- note toutes en succès (560 passages pour nudge-suspicious-accounts, dernier
-- le 13/10/2026 à 20:00, 50 signaux suspicious_account dont le dernier le
-- 12/10/2026 ; 13 passages chacune pour les deux autres, sans erreur ;
-- cron.job_run_details sans échec ; aucun 404 dans net._http_response).
-- Les déprogrammer couperait une détection vivante : elles sont gardées, et
-- leur source reste à rapatrier dans le dépôt.
-- =========================================================================

-- =========================================================================
-- Z2.5. Contrôles après application (chaque requête doit renvoyer 0 ligne).
-- =========================================================================
-- Z2.1, fonction réservée aux membres encore exécutable par un visiteur :
-- SELECT f FROM unnest(ARRAY[
--   'public.accept_application(uuid)', 'public.decline_garde_accord(uuid)',
--   'public.profile_completion_missing(uuid,text)', 'public.freeze_seasonal_cohorts(text,integer)',
--   'public.get_or_create_conversation(uuid,conversation_context,uuid,uuid)',
--   'public.admin_dashboard_snapshot()']) f
--  WHERE has_function_privilege('anon', f, 'EXECUTE');
--
-- Z2.1, recensement complet (seules les 9 fonctions publiques listées en Z2.1 restent) :
-- SELECT p.oid::regprocedure FROM pg_proc p
--  WHERE p.pronamespace = 'public'::regnamespace AND p.prosecdef
--    AND p.prorettype <> 'trigger'::regtype AND p.prosrc ~* 'auth\.uid\(\)'
--    AND has_function_privilege('anon', p.oid, 'EXECUTE')
--    AND p.proname NOT IN ('get_public_sit', 'search_sitter_pool', 'search_sitter_pool_mobile',
--      'search_sitter_country_counts', 'can_view_restricted_profile', 'log_client_error',
--      'increment_small_mission_view', 'link_referral', 'count_mission_notification_audience');
--
-- Z2.1, membre privé d'une fonction qu'il appelle :
-- SELECT f FROM unnest(ARRAY['public.accept_application(uuid)', 'public.get_my_applications()']) f
--  WHERE NOT has_function_privilege('authenticated', f, 'EXECUTE');
--
-- Z2.2, colonne sit_reviewable absente ou en écart avec la règle serveur :
-- SELECT 1 WHERE NOT EXISTS (
--   SELECT 1 FROM pg_proc WHERE proname = 'get_my_applications'
--      AND 'sit_reviewable' = ANY (proargnames));
--
-- Z2.3, trigger absent :
-- SELECT 1 WHERE NOT EXISTS (
--   SELECT 1 FROM pg_trigger WHERE tgname = 'trg_notify_sitter_on_sit_dates_change');
--
-- Z2.3, deux notifications non lues pour la même garde et le même gardien :
-- SELECT user_id, link FROM public.notifications
--  WHERE type = 'sit_dates_changed' AND read_at IS NULL
--  GROUP BY user_id, link HAVING count(*) > 1;