-- Point 1a : reliquat appliqué en base le 02/08/2026, contradictoire avec la
-- décision produit du 12/08/2026 (un animal est recommandé, jamais exigé).
DROP TRIGGER IF EXISTS trg_sits_exige_un_animal ON public.sits;
DROP FUNCTION IF EXISTS public.sits_exige_un_animal();

-- Point 1b : alignement du seuil de description sur la règle produit (30 car.).
ALTER TABLE public.sits DROP CONSTRAINT IF EXISTS sits_publiee_exige_description;
ALTER TABLE public.sits ADD CONSTRAINT sits_publiee_exige_description
  CHECK (((status <> ALL (ARRAY['published'::sit_status, 'confirmed'::sit_status])) OR (length(COALESCE(specific_expectations, ''::text)) >= 30)));

-- Point 2 : raison de conservation en brouillon, déclarée à la sortie du formulaire.
ALTER TABLE public.sits ADD COLUMN IF NOT EXISTS draft_hold_reason text;
ALTER TABLE public.sits ADD COLUMN IF NOT EXISTS draft_hold_reason_at timestamp with time zone;
ALTER TABLE public.sits DROP CONSTRAINT IF EXISTS sits_draft_hold_reason_chk;
ALTER TABLE public.sits ADD CONSTRAINT sits_draft_hold_reason_chk
  CHECK ((draft_hold_reason IS NULL) OR (draft_hold_reason = ANY (ARRAY['dates_uncertain'::text, 'want_reread'::text, 'still_thinking'::text, 'other'::text])));

-- La raison décrit un brouillon : elle s'efface dès que l'annonce passe en ligne.
CREATE OR REPLACE FUNCTION public.sits_clear_draft_hold_reason()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('published'::sit_status, 'confirmed'::sit_status) THEN
    NEW.draft_hold_reason := NULL;
    NEW.draft_hold_reason_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sits_clear_draft_hold_reason ON public.sits;
CREATE TRIGGER trg_sits_clear_draft_hold_reason
  BEFORE INSERT OR UPDATE OF status ON public.sits
  FOR EACH ROW EXECUTE FUNCTION public.sits_clear_draft_hold_reason();

-- Point 3 : signal admin quand une publication se heurte à une erreur non prévue.
CREATE OR REPLACE FUNCTION public.signal_sit_publish_error(_sit_id uuid, _code text, _message text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _open_id uuid;
  _attempts integer;
BEGIN
  IF _uid IS NULL OR _sit_id IS NULL THEN
    RETURN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.sits WHERE id = _sit_id AND user_id = _uid)
     AND NOT public.has_role(_uid, 'admin'::app_role) THEN
    RETURN;
  END IF;

  SELECT s.id, COALESCE((s.metadata->>'attempts')::integer, 0)
    INTO _open_id, _attempts
    FROM public.admin_signals s
   WHERE s.signal_type = 'sit_publish_error'
     AND s.entity_id = _sit_id
     AND s.resolved_at IS NULL
   ORDER BY s.detected_at DESC
   LIMIT 1;

  IF _open_id IS NOT NULL THEN
    UPDATE public.admin_signals
       SET metadata = jsonb_build_object(
             'last_error', left(COALESCE(_message, ''), 500),
             'last_code', _code,
             'attempts', _attempts + 1,
             'reported_by', 'client',
             'last_detected_at', now()),
           detected_at = now()
     WHERE id = _open_id;
  ELSE
    INSERT INTO public.admin_signals (signal_type, severity, entity_type, entity_id, metadata)
    VALUES (
      'sit_publish_error',
      'warning',
      'sit',
      _sit_id,
      jsonb_build_object(
        'last_error', left(COALESCE(_message, ''), 500),
        'last_code', _code,
        'attempts', 1,
        'reported_by', 'client',
        'last_detected_at', now()));
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.signal_sit_publish_error(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.signal_sit_publish_error(uuid, text, text) TO authenticated;