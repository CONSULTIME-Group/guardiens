ALTER TABLE public.journey_step_log
  ADD COLUMN IF NOT EXISTS error_detail jsonb;

ALTER TABLE public.nurturing_sequences
  ADD COLUMN IF NOT EXISTS enrollment_rule jsonb NOT NULL DEFAULT '{"type":"signup","window_days":7}'::jsonb,
  ADD COLUMN IF NOT EXISTS anchor_field text NOT NULL DEFAULT 'created_at';