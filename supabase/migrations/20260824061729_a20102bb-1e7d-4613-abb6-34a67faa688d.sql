-- Sauvegarde datée des lignes miroir avant requalification (doctrine règle 17)
CREATE TABLE public._backup_email_send_log_mirror_20260824 AS
SELECT id, message_id, template_name, recipient_email, status, error_message, metadata, resend_id, created_at
FROM public.email_send_log
WHERE status = 'deferred';

-- Table de sauvegarde : aucun accès API (deny by default, aucune policy)
ALTER TABLE public._backup_email_send_log_mirror_20260824 ENABLE ROW LEVEL SECURITY;

-- Garde-fou watchdog : compte les lignes miroir 'deferred' de plus de 24h
-- sans ligne vivante (pending/processing) dans la file de travail.
-- email_deferred_queue est la seule source de vérité sur ce qui reste à envoyer.
CREATE OR REPLACE FUNCTION public.email_mirror_drift_count()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COUNT(*)
  FROM public.email_send_log l
  WHERE l.status = 'deferred'
    AND l.created_at < now() - interval '24 hours'
    AND NOT EXISTS (
      SELECT 1
      FROM public.email_deferred_queue q
      WHERE q.idempotency_key = l.metadata->>'idempotency_key'
        AND q.status IN ('pending', 'processing')
    );
$$;

GRANT EXECUTE ON FUNCTION public.email_mirror_drift_count() TO service_role;