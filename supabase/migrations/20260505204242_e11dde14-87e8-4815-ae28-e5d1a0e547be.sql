
-- A. Bucket limits
UPDATE storage.buckets SET
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp']
WHERE id IN ('avatars','badges','email-assets','mission-photos','property-photos','sitter-gallery','experience-screenshots');

UPDATE storage.buckets SET
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','application/pdf']
WHERE id = 'identity-documents';

-- B. REVOKE EXECUTE FROM PUBLIC sur fonctions internes (triggers)
DO $$
DECLARE
  fn_name text;
  fn_names text[] := ARRAY[
    'notify_application_accepted','notify_application_cancelled_by_sitter',
    'notify_application_rejected','notify_long_stay_application_accepted',
    'notify_long_stay_application_cancelled','notify_long_stay_application_rejected',
    'notify_new_application','notify_new_long_stay_application',
    'notify_new_message','notify_review_published',
    'notify_sit_cancelled','notify_sit_confirmed',
    'trigger_recalc_completion_pets','trigger_recalc_completion_profiles',
    'trigger_recalc_completion_properties','trigger_recalc_completion_related',
    'trigger_update_completed_sits_on_sit','trigger_update_cancellations',
    'validate_cancellations_as_proprio','validate_completed_sits_count',
    'validate_environments','validate_guide_request_status',
    'validate_min_gardien_sits','validate_queue_name',
    'validate_review_dispute','validate_review_fields',
    'validate_skill_status','validate_small_mission',
    'auto_publish_reviews','log_sit_date_change',
    'update_conversation_on_message','update_competence_usage_count',
    'update_updated_at_column','prevent_sensitive_profile_updates',
    'apply_role_from_metadata','admin_message_logs_validate_status',
    'link_guide_request_on_city_guide_publish','upsert_guide_request_from_sit',
    'trg_recache_prerender','trg_notify_new_message_email'
  ];
BEGIN
  FOREACH fn_name IN ARRAY fn_names LOOP
    BEGIN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I() FROM PUBLIC, anon, authenticated', fn_name);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;
END $$;
