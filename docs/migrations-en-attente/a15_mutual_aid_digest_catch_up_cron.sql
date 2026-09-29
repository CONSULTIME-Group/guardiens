-- Lot A15 : rattrapage du résumé hebdomadaire entraide, mardi 10:00 UTC.
-- Même fonction, même plan, même clé anti-doublon : n'écrit qu'aux membres
-- non servis à 08:00. Écrite, NON appliquée : à appliquer après le
-- déploiement de send-mutual-aid-weekly-digest, sur GO de Jérémie.
SELECT cron.schedule(
  'send_mutual_aid_weekly_digest_rattrapage',
  '0 10 * * 2',
  $$
  SELECT net.http_post(
    url := 'https://erhccyqevdyevpyctsjj.supabase.co/functions/v1/send-mutual-aid-weekly-digest',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='supabase_service_role_key' LIMIT 1)),
    body := jsonb_build_object('trigger','cron','pass','catch_up','time', now()),
    timeout_milliseconds := 60000
  );
  $$
);
