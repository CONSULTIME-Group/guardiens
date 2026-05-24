-- ============================================================
-- 1) RLS policies "USING/WITH CHECK (true)" → conditions explicites
-- ============================================================

-- contact_messages: formulaire public, mais avec garde-fous min
DROP POLICY IF EXISTS "Anyone can insert contact messages" ON public.contact_messages;
CREATE POLICY "Anyone can insert contact messages"
  ON public.contact_messages
  FOR INSERT
  WITH CHECK (
    char_length(coalesce(message, '')) BETWEEN 1 AND 5000
    AND char_length(coalesce(email, '')) BETWEEN 3 AND 200
    AND email LIKE '%@%'
  );

-- email_campaign_events: pixel de tracking, on impose au moins un event_type
DROP POLICY IF EXISTS "Anyone can insert campaign events" ON public.email_campaign_events;
CREATE POLICY "Anyone can insert campaign events"
  ON public.email_campaign_events
  FOR INSERT
  WITH CHECK (
    event_type IS NOT NULL
    AND char_length(event_type) BETWEEN 1 AND 50
  );

-- notifications: la policy "Service role can insert" est redondante
-- (le service_role bypasse RLS de toute façon). On la supprime.
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.notifications;

-- ============================================================
-- 2) Storage: supprimer les SELECT broad sur buckets publics
--    (les URLs /storage/v1/object/public/ continuent de servir)
-- ============================================================

DROP POLICY IF EXISTS "Anyone can view gallery photos" ON storage.objects;
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Mission photos are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Property photos are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Public can read email assets" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for badges" ON storage.objects;

-- ============================================================
-- 3) EXECUTE sur fonctions SECURITY DEFINER
-- ============================================================

-- 3a) Trigger functions: aucun client n'a besoin d'EXECUTE
DO $$
DECLARE
  fn text;
  trigger_fns text[] := ARRAY[
    'apply_role_from_metadata',
    'auto_publish_reviews',
    'ensure_subprofiles_on_role_change',
    'handle_new_user',
    'link_guide_request_on_city_guide_publish',
    'log_sit_date_change',
    'mark_invitation_applied',
    'notify_application_accepted',
    'notify_application_cancelled_by_sitter',
    'notify_application_rejected',
    'notify_long_stay_application_accepted',
    'notify_long_stay_application_cancelled',
    'notify_long_stay_application_rejected',
    'notify_new_application',
    'notify_new_long_stay_application',
    'notify_new_message',
    'notify_review_published',
    'notify_sit_cancelled',
    'notify_sit_confirmed',
    'notify_sit_invitation',
    'trg_geocode_profile',
    'trg_notify_new_message_email',
    'trg_prevent_sensitive_profile_updates',
    'trg_recache_prerender',
    'trg_reviews_recalc_completed_sits',
    'trigger_recalc_completion_pets',
    'trigger_recalc_completion_profiles',
    'trigger_recalc_completion_properties',
    'trigger_recalc_completion_related',
    'trigger_update_completed_sits_on_sit',
    'update_competence_usage_count',
    'update_conversation_on_message',
    'upsert_guide_request_from_sit',
    'prevent_sensitive_profile_updates',
    'validate_completed_sits_count',
    'validate_min_gardien_sits',
    'validate_cancellations_as_proprio',
    'validate_guide_request_status',
    'validate_skill_status',
    'validate_review_dispute',
    'notify_long_stay_application_rejected'
  ];
BEGIN
  FOREACH fn IN ARRAY trigger_fns LOOP
    BEGIN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I() FROM PUBLIC, anon, authenticated', fn);
    EXCEPTION WHEN OTHERS THEN
      -- Fonction sans () (avec args) ou inexistante : on tente la forme générique
      BEGIN
        EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I FROM PUBLIC, anon, authenticated', fn);
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Skip revoke %: %', fn, SQLERRM;
      END;
    END;
  END LOOP;
END $$;

-- 3b) RPC: revoke FROM PUBLIC + anon, then re-grant to authenticated
DO $$
DECLARE
  fn_sig text;
BEGIN
  FOR fn_sig IN
    SELECT format('public.%I(%s)', p.proname, pg_get_function_identity_arguments(p.oid))
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
      AND NOT EXISTS (
        SELECT 1 FROM pg_trigger t WHERE t.tgfoid = p.oid AND NOT t.tgisinternal
      )
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', fn_sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn_sig);
  END LOOP;
END $$;

-- 3c) RPC explicitement publiques (anon autorisé)
GRANT EXECUTE ON FUNCTION public.get_public_stats() TO anon;
GRANT EXECUTE ON FUNCTION public.log_client_error(text, text, text, text, integer, integer, text, text, text, jsonb, text) TO anon;
GRANT EXECUTE ON FUNCTION public.set_email_preferences_by_token(text, boolean, boolean, boolean) TO anon;
GRANT EXECUTE ON FUNCTION public.get_email_preferences_by_email(text) TO anon;
GRANT EXECUTE ON FUNCTION public.increment_redirect_hit(text) TO anon;
GRANT EXECUTE ON FUNCTION public.slugify_city(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_mission_author_public(uuid) TO anon;