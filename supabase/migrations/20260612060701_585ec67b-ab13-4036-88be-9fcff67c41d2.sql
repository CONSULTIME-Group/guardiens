ALTER TABLE public.user_journeys DROP CONSTRAINT IF EXISTS user_journeys_user_id_sequence_key_key;
CREATE INDEX IF NOT EXISTS idx_user_journeys_user_seq_started ON public.user_journeys (user_id, sequence_key, started_at DESC);

INSERT INTO public.nurturing_sequences (key, audience, description, enrollment_rule, anchor_field, active)
VALUES (
  'owner-no-sit-relance',
  'owner',
  'Relance propriétaires sans annonce publiée 3 puis 10 jours après inscription.',
  '{"type":"owner_no_sit","min_age_days":3,"window_days":2}'::jsonb,
  'created_at',
  true
)
ON CONFLICT (key) DO UPDATE SET description = EXCLUDED.description, enrollment_rule = EXCLUDED.enrollment_rule, active = true;

INSERT INTO public.nurturing_steps (sequence_id, step_order, delay_hours, template_name, exit_condition)
SELECT s.id, 1, 0, 'owner-no-sit-j3', '{"type":"has_published_sit"}'::jsonb
FROM public.nurturing_sequences s WHERE s.key = 'owner-no-sit-relance'
ON CONFLICT (sequence_id, step_order) DO UPDATE SET template_name = EXCLUDED.template_name, exit_condition = EXCLUDED.exit_condition, delay_hours = EXCLUDED.delay_hours;

INSERT INTO public.nurturing_steps (sequence_id, step_order, delay_hours, template_name, exit_condition)
SELECT s.id, 2, 168, 'owner-no-sit-j10', '{"type":"has_published_sit"}'::jsonb
FROM public.nurturing_sequences s WHERE s.key = 'owner-no-sit-relance'
ON CONFLICT (sequence_id, step_order) DO UPDATE SET template_name = EXCLUDED.template_name, exit_condition = EXCLUDED.exit_condition, delay_hours = EXCLUDED.delay_hours;

INSERT INTO public.nurturing_sequences (key, audience, description, enrollment_rule, anchor_field, active)
VALUES (
  'referral-boost-monthly',
  'all',
  'Email mensuel aux membres actifs : invitation à parrainer pour gagner un mois offert.',
  '{"type":"active_referral","min_age_days":30,"active_within_days":30,"window_days":30}'::jsonb,
  'last_seen_at',
  true
)
ON CONFLICT (key) DO UPDATE SET description = EXCLUDED.description, enrollment_rule = EXCLUDED.enrollment_rule, active = true;

INSERT INTO public.nurturing_steps (sequence_id, step_order, delay_hours, template_name, exit_condition)
SELECT s.id, 1, 0, 'referral-boost-monthly', '{}'::jsonb
FROM public.nurturing_sequences s WHERE s.key = 'referral-boost-monthly'
ON CONFLICT (sequence_id, step_order) DO UPDATE SET template_name = EXCLUDED.template_name, delay_hours = EXCLUDED.delay_hours;