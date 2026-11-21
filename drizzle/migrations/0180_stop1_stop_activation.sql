-- Lot STOP1 (22/11/2026) : un « stop » écrit en réponse à un message personnel
-- de l'équipe coupe les emails produit du membre et lui en accuse réception.
-- Repère : stop1_stop_activation. « ok go » de Jérémie du 22/11/2026.
--
-- Pourquoi : les messages des fondateurs aux propriétaires sans annonce se
-- terminent par « Répondez « stop », nous respecterons votre choix. ». Le
-- 21/11/2026, une propriétaire a répondu « Stop » deux fois : rien n'a changé
-- en base (email_preferences.product_emails resté à true, 6 emails automatiques
-- reçus en 10 jours), le geste restait manuel.
--
-- Règle :
--   - message humain d'un membre, dans une conversation personnelle (sans garde
--     ni coup de main) dont l'autre participant est un admin qui y a déjà écrit ;
--   - texte réduit à ses lettres égal à « stop » (« Stop », « STOP. », « stop ! ») ;
--   - email_preferences.product_emails passe à false (relances de brouillon et
--     d'activation, lettres des fondateurs). Messages des membres, candidatures
--     et emails de garde continuent ;
--   - un message système, une seule fois par conversation, accuse réception
--     (metadata.kind = activation_stop). Un message système ne déclenche ni
--     email, ni notification, ni push.
--   - une erreur dans ce traitement laisse toujours le message du membre s'écrire.
-- Rejouable.

CREATE OR REPLACE FUNCTION public.handle_activation_stop()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  -- stop1_stop_activation
  v_owner uuid;
  v_sitter uuid;
  v_sit uuid;
  v_mission uuid;
  v_admin uuid;
BEGIN
  BEGIN
    IF coalesce(NEW.is_system, false) OR NEW.sender_id IS NULL
       OR NEW.content IS NULL OR length(NEW.content) > 20 THEN
      RETURN NEW;
    END IF;
    IF regexp_replace(lower(NEW.content), '[^a-z]', '', 'g') <> 'stop' THEN
      RETURN NEW;
    END IF;

    SELECT c.owner_id, c.sitter_id, c.sit_id, c.small_mission_id
      INTO v_owner, v_sitter, v_sit, v_mission
    FROM public.conversations c
    WHERE c.id = NEW.conversation_id;

    IF v_owner IS NULL OR v_sitter IS NULL OR v_sit IS NOT NULL OR v_mission IS NOT NULL THEN
      RETURN NEW;
    END IF;

    IF NEW.sender_id = v_owner THEN
      v_admin := v_sitter;
    ELSIF NEW.sender_id = v_sitter THEN
      v_admin := v_owner;
    ELSE
      RETURN NEW;
    END IF;

    IF public.has_role(NEW.sender_id, 'admin'::app_role)
       OR NOT public.has_role(v_admin, 'admin'::app_role) THEN
      RETURN NEW;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.conversation_id = NEW.conversation_id
        AND m.sender_id = v_admin
        AND coalesce(m.is_system, false) = false
    ) THEN
      RETURN NEW;
    END IF;

    INSERT INTO public.email_preferences (user_id, product_emails)
    VALUES (NEW.sender_id, false)
    ON CONFLICT (user_id) DO UPDATE
      SET product_emails = false, updated_at = now()
      WHERE public.email_preferences.product_emails IS DISTINCT FROM false;

    IF NOT EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.conversation_id = NEW.conversation_id
        AND m.is_system
        AND m.metadata->>'kind' = 'activation_stop'
    ) THEN
      INSERT INTO public.messages (conversation_id, sender_id, content, is_system, metadata, created_at)
      VALUES (
        NEW.conversation_id,
        v_admin,
        'C''est noté. Les relances s''arrêtent, vous avancez à votre rythme.',
        true,
        jsonb_build_object('kind', 'activation_stop', 'member_id', NEW.sender_id),
        clock_timestamp()
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_activation_stop msg=% err=%', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.handle_activation_stop() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_messages_activation_stop ON public.messages;
CREATE TRIGGER trg_messages_activation_stop
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.handle_activation_stop();
