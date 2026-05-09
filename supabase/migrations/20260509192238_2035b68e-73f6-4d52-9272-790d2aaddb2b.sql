UPDATE public.nurturing_sequences
SET enrollment_rule = '{"type":"signup","window_days":365,"min_age_days":21}'::jsonb
WHERE key = 'discover-mutual-aid';