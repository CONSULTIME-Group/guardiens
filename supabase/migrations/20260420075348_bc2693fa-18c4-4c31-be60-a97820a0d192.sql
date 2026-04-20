
-- Active pg_net pour les appels HTTP depuis Postgres
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Trigger : appelle notify-new-message à chaque nouveau message non-système
CREATE OR REPLACE FUNCTION public.trg_notify_new_message_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url text := 'https://erhccyqevdyevpyctsjj.supabase.co/functions/v1/notify-new-message';
  v_anon text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyaGNjeXFldmR5ZXZweWN0c2pqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MjMzMzQsImV4cCI6MjA4OTk5OTMzNH0.ltBQtcouoqd5tuv_wQXb92x5Q5YYa9mkEQvZUx0wLTY';
BEGIN
  IF NEW.is_system THEN RETURN NEW; END IF;

  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_anon
    ),
    body := jsonb_build_object(
      'message_id', NEW.id,
      'conversation_id', NEW.conversation_id,
      'sender_id', NEW.sender_id,
      'content', NEW.content,
      'is_system', NEW.is_system
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Ne jamais bloquer l'insertion d'un message si l'email échoue
  RAISE WARNING 'notify-new-message HTTP call failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_messages_notify_email ON public.messages;
CREATE TRIGGER trg_messages_notify_email
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_notify_new_message_email();
