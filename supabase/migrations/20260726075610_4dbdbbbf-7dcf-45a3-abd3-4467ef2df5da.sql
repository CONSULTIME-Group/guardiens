-- Lot 3 : autoriser les statuts 'deferred' et 'unsubscribed_category'
ALTER TABLE public.email_send_log DROP CONSTRAINT IF EXISTS email_send_log_status_check;
ALTER TABLE public.email_send_log ADD CONSTRAINT email_send_log_status_check
  CHECK (status = ANY (ARRAY[
    'pending','sent','dlq','suppressed','failed','bounced','complained','abandoned',
    'deferred','unsubscribed_category'
  ]));

-- Lot 7 : priorite explicite entre sequences (plus petit = gagne)
ALTER TABLE public.nurturing_sequences
  ADD COLUMN IF NOT EXISTS priority integer NOT NULL DEFAULT 500;

UPDATE public.nurturing_sequences SET priority = CASE key
  WHEN 'onboarding-owner' THEN 10
  WHEN 'onboarding-sitter' THEN 10
  WHEN 'owner-no-sit-relance' THEN 20
  WHEN 'sitter-encourage-candidature' THEN 30
  WHEN 'complete-affinity-owner' THEN 40
  WHEN 'complete-affinity-sitter' THEN 40
  WHEN 'helper-to-guard' THEN 50
  WHEN 'discover-mutual-aid' THEN 60
  WHEN 'referral-boost-monthly' THEN 70
  WHEN 'reactivation-d30' THEN 80
  ELSE 500 END;

-- Lot 2 : bornes superieures sur les regles d'inscription
UPDATE public.nurturing_sequences
SET enrollment_rule = enrollment_rule || jsonb_build_object('max_age_days', 21)
WHERE key = 'complete-affinity-sitter';

UPDATE public.nurturing_sequences
SET enrollment_rule = enrollment_rule || jsonb_build_object('max_age_days', 21)
WHERE key = 'complete-affinity-owner';

UPDATE public.nurturing_sequences
SET enrollment_rule = jsonb_set(
      enrollment_rule || jsonb_build_object('max_age_days', 35),
      '{window_days}', '14'::jsonb)
WHERE key = 'discover-mutual-aid';

UPDATE public.nurturing_sequences
SET enrollment_rule = enrollment_rule || jsonb_build_object('max_age_days', 30)
WHERE key = 'sitter-encourage-candidature';

UPDATE public.nurturing_sequences
SET enrollment_rule = enrollment_rule || jsonb_build_object('max_age_days', 10)
WHERE key = 'owner-no-sit-relance';

UPDATE public.nurturing_sequences
SET enrollment_rule = enrollment_rule || jsonb_build_object('max_age_days', 14)
WHERE key IN ('onboarding-owner','onboarding-sitter');

UPDATE public.nurturing_sequences
SET enrollment_rule = enrollment_rule || jsonb_build_object('max_age_days', 60)
WHERE key = 'helper-to-guard';