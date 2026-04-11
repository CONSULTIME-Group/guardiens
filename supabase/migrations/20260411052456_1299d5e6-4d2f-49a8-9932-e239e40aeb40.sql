
-- Enable extensions if not already
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Cron à 8h Paris (6h UTC été)
SELECT cron.schedule(
  'alert-digest-8h',
  '0 6 * * *',
  $$SELECT net.http_post(
    url := 'https://erhccyqevdyevpyctsjj.supabase.co/functions/v1/send-alert-digest',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyaGNjeXFldmR5ZXZweWN0c2pqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MjMzMzQsImV4cCI6MjA4OTk5OTMzNH0.ltBQtcouoqd5tuv_wQXb92x5Q5YYa9mkEQvZUx0wLTY"}'::jsonb
  )$$
);

-- Cron à 12h Paris (10h UTC été)
SELECT cron.schedule(
  'alert-digest-12h',
  '0 10 * * *',
  $$SELECT net.http_post(
    url := 'https://erhccyqevdyevpyctsjj.supabase.co/functions/v1/send-alert-digest',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyaGNjeXFldmR5ZXZweWN0c2pqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MjMzMzQsImV4cCI6MjA4OTk5OTMzNH0.ltBQtcouoqd5tuv_wQXb92x5Q5YYa9mkEQvZUx0wLTY"}'::jsonb
  )$$
);

-- Cron à 18h Paris (16h UTC été)
SELECT cron.schedule(
  'alert-digest-18h',
  '0 16 * * *',
  $$SELECT net.http_post(
    url := 'https://erhccyqevdyevpyctsjj.supabase.co/functions/v1/send-alert-digest',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyaGNjeXFldmR5ZXZweWN0c2pqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MjMzMzQsImV4cCI6MjA4OTk5OTMzNH0.ltBQtcouoqd5tuv_wQXb92x5Q5YYa9mkEQvZUx0wLTY"}'::jsonb
  )$$
);
