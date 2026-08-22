-- Notification de la contrepartie à chaque signature du commodat (accord de garde).
-- Mesuré le 22/08/2026 : 4 accords signés côté propriétaire, zéro signature gardien,
-- faute de notification que l'accord est prêt. Ce trigger appelle l'edge function
-- notify-accord-signed (in-app + email transactionnel) via pg_net, sur le même
-- patron que trg_notify_new_message_email.

CREATE OR REPLACE FUNCTION public.trg_notify_garde_accord_signed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url         text := 'https://erhccyqevdyevpyctsjj.supabase.co/functions/v1/notify-accord-signed';
  v_service_key text;
  v_err         text;
BEGIN
  -- Uniquement les signatures (accepted = true), jamais les refus.
  IF NOT NEW.accepted THEN RETURN NEW; END IF;
  -- Une seule fois par passage à signé : sur UPDATE, ignorer si déjà signé avant.
  IF TG_OP = 'UPDATE' AND OLD.accepted IS NOT DISTINCT FROM NEW.accepted THEN RETURN NEW; END IF;

  BEGIN
    SELECT decrypted_secret INTO v_service_key
    FROM vault.decrypted_secrets
    WHERE name = 'supabase_service_role_key'
    LIMIT 1;

    IF v_service_key IS NULL THEN
      RAISE WARNING 'trg_notify_garde_accord_signed: vault key missing';
      INSERT INTO public.admin_signals (signal_type, severity, entity_type, entity_id, metadata)
      VALUES ('notification_delivery_failed', 'critical', 'garde_accord', NEW.id,
        jsonb_build_object('phase', 'email', 'sqlerrm', 'vault_key_missing', 'garde_id', NEW.garde_id, 'signer_role', NEW.role));
      RETURN NEW;
    END IF;

    PERFORM net.http_post(
      url := v_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_service_key
      ),
      body := jsonb_build_object(
        'garde_id', NEW.garde_id,
        'signer_id', NEW.user_id,
        'signer_role', NEW.role
      )
    );
  EXCEPTION WHEN OTHERS THEN
    v_err := SQLERRM;
    RAISE WARNING 'trg_notify_garde_accord_signed garde=% err=%', NEW.garde_id, v_err;
    BEGIN
      INSERT INTO public.admin_signals (signal_type, severity, entity_type, entity_id, metadata)
      VALUES ('notification_delivery_failed', 'critical', 'garde_accord', NEW.id,
        jsonb_build_object('phase', 'email', 'sqlerrm', v_err, 'garde_id', NEW.garde_id, 'signer_role', NEW.role));
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_garde_accord_signed ON public.garde_accords;
CREATE TRIGGER trg_garde_accord_signed
AFTER INSERT OR UPDATE OF accepted ON public.garde_accords
FOR EACH ROW EXECUTE FUNCTION public.trg_notify_garde_accord_signed();