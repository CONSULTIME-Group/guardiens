-- Pivot pricing "gratuit sans deadline", 5 juillet 2026.
-- Désactive les jobs pg_cron liés à l'échéance Fondateur.
-- À réactiver quand PRICING_IS_ACTIVE = true côté code.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send_founder_reminder_30_daily') THEN
    PERFORM cron.unschedule('send_founder_reminder_30_daily');
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send_founder_reminder_7_daily') THEN
    PERFORM cron.unschedule('send_founder_reminder_7_daily');
  END IF;
END$$;