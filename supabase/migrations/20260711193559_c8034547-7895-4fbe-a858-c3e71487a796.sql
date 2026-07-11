
UPDATE public.error_logs
SET resolved_at = now()
WHERE fingerprint = 'email_pipeline:email_pipeline_worker_stalled'
  AND resolved_at IS NULL;
