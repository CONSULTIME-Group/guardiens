
-- Fonction utilitaire : détecte un refus / dégénérescence LLM.
-- Renvoie true si le texte ressemble à une réponse d'assistant IA en échec.
CREATE OR REPLACE FUNCTION public.is_llm_refusal_text(_txt text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    _txt ~* 'je ne peux pas (rédiger|écrire|produire|générer)'
    OR _txt ~* 'je suis (désolée?|navrée?),? mais'
    OR _txt ~* 'je suis incapable de'
    OR _txt ~* 'je ne suis pas en mesure de'
    OR _txt ~* 'informations? (sur (l''|la |le )[a-zéèêà '']+)?(sont|est) manquantes?'
    OR _txt ~* '(pourrais|pourriez|peux)-(tu|vous) me fournir'
    OR _txt ~* 'pourrais-tu me fournir les détails'
    OR _txt ~* 'je n''ai pas (assez )?(d''|de )?(éléments|informations|détails|contexte)'
    OR _txt ~* 'impossible de rédiger',
    false
  );
$$;

-- Trigger : bloque l'insertion d'une candidature dont le message est un refus IA.
CREATE OR REPLACE FUNCTION public.guard_application_no_llm_refusal()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.message IS NOT NULL AND public.is_llm_refusal_text(NEW.message) THEN
    RAISE EXCEPTION 'Message de candidature invalide : ressemble à une réponse d''assistant IA en échec. Merci de personnaliser le texte avant envoi.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_application_no_llm_refusal ON public.applications;
CREATE TRIGGER trg_guard_application_no_llm_refusal
BEFORE INSERT OR UPDATE OF message ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.guard_application_no_llm_refusal();

-- Trigger : bloque l'insertion d'un message de conversation qui est un refus IA.
CREATE OR REPLACE FUNCTION public.guard_message_no_llm_refusal()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.content IS NOT NULL AND public.is_llm_refusal_text(NEW.content) THEN
    RAISE EXCEPTION 'Message invalide : ressemble à une réponse d''assistant IA en échec. Merci de personnaliser le texte avant envoi.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_message_no_llm_refusal ON public.messages;
CREATE TRIGGER trg_guard_message_no_llm_refusal
BEFORE INSERT OR UPDATE OF content ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.guard_message_no_llm_refusal();
