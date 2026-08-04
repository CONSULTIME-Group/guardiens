CREATE OR REPLACE FUNCTION public.looks_like_pricing(txt text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  t text;
BEGIN
  IF txt IS NULL OR length(trim(txt)) = 0 THEN
    RETURN false;
  END IF;
  t := lower(unaccent_immutable_safe(txt));

  IF t ~ '(\d+([.,]\d+)?\s*(€|eur\b|euros?\b))' THEN
    RETURN true;
  END IF;
  IF t ~ '((€|eur\b|euros?\b)\s*\d+)' THEN
    RETURN true;
  END IF;
  IF t ~ '(tarif|devis|facture|prestation payante|par jour|par nuit|par visite|par passage)' AND t ~ '\d' THEN
    RETURN true;
  END IF;
  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.unaccent_immutable_safe(txt text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT translate(coalesce(txt, ''), 'àâäáãåçéèêëíìîïñóòôöõúùûüýÿÀÂÄÁÃÅÇÉÈÊËÍÌÎÏÑÓÒÔÖÕÚÙÛÜÝ', 'aaaaaaceeeeiiiinooooouuuuyyAAAAAACEEEEIIIINOOOOOUUUUY');
$$;

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS pricing_flag boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.flag_message_undeclared_pricing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sender_pro text;
BEGIN
  IF coalesce(NEW.is_system, false) THEN
    RETURN NEW;
  END IF;
  IF NEW.content IS NULL OR NOT public.looks_like_pricing(NEW.content) THEN
    RETURN NEW;
  END IF;

  SELECT coalesce(pro_status::text, 'none') INTO sender_pro
  FROM public.profiles WHERE id = NEW.sender_id;

  IF coalesce(sender_pro, 'none') <> 'none' THEN
    RETURN NEW;
  END IF;

  NEW.metadata := coalesce(NEW.metadata, '{}'::jsonb) || jsonb_build_object('pricing_flag', true);

  BEGIN
    INSERT INTO public.admin_signals (signal_type, severity, entity_type, entity_id, metadata)
    VALUES (
      'undeclared_pricing', 'warning', 'message', NEW.id,
      jsonb_build_object(
        'excerpt', left(NEW.content, 300),
        'conversation_id', NEW.conversation_id,
        'sender_id', NEW.sender_id
      )
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_flag_message_undeclared_pricing ON public.messages;
CREATE TRIGGER trg_flag_message_undeclared_pricing
BEFORE INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.flag_message_undeclared_pricing();

CREATE OR REPLACE FUNCTION public.flag_application_undeclared_pricing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sender_pro text;
BEGIN
  IF NEW.message IS NULL OR NOT public.looks_like_pricing(NEW.message) THEN
    RETURN NEW;
  END IF;

  SELECT coalesce(pro_status::text, 'none') INTO sender_pro
  FROM public.profiles WHERE id = NEW.sitter_id;

  IF coalesce(sender_pro, 'none') <> 'none' THEN
    RETURN NEW;
  END IF;

  NEW.pricing_flag := true;

  BEGIN
    INSERT INTO public.admin_signals (signal_type, severity, entity_type, entity_id, metadata)
    VALUES (
      'undeclared_pricing', 'warning', 'application', NEW.id,
      jsonb_build_object(
        'excerpt', left(NEW.message, 300),
        'sit_id', NEW.sit_id,
        'sitter_id', NEW.sitter_id
      )
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_flag_application_undeclared_pricing ON public.applications;
CREATE TRIGGER trg_flag_application_undeclared_pricing
BEFORE INSERT ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.flag_application_undeclared_pricing();