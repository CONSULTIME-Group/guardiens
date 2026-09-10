UPDATE public.admin_signals
SET resolved_at = now(),
    action_taken = 'superseded_by_city_coverage_gap'
WHERE signal_type = 'untapped_city'
  AND resolved_at IS NULL;