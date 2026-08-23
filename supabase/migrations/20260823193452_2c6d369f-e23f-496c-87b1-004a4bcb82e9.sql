SELECT cron.schedule(
  'geocode-city-pages',
  '*/10 * * * *',
  $$
    SELECT net.http_post(
      url := 'https://erhccyqevdyevpyctsjj.supabase.co/functions/v1/geocode-city-pages',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyaGNjeXFldmR5ZXZweWN0c2pqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MjMzMzQsImV4cCI6MjA4OTk5OTMzNH0.ltBQtcouoqd5tuv_wQXb92x5Q5YYa9mkEQvZUx0wLTY',
        'x-geocode-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'GEOCODE_PROFILE_SECRET' LIMIT 1)
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);