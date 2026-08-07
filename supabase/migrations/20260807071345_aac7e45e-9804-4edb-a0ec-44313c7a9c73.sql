select cron.unschedule(jobname) from cron.job where jobname = 'close-orphan-applications-daily';

select cron.schedule(
  'close-orphan-applications-daily',
  '25 9 * * *',
  $$
  select net.http_post(
    url := 'https://erhccyqevdyevpyctsjj.supabase.co/functions/v1/close-orphan-applications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || public.get_vault_secret('SUPABASE_SERVICE_ROLE_KEY')
    ),
    body := jsonb_build_object('source', 'cron')
  );
  $$
);