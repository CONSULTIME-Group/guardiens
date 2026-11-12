-- Lot SORT3 (13/11/2026) : emails de service des sorties, derrière le drapeau
-- sorties_emails créé éteint. Quatre moments, un gabarit (outing-update) :
--   joined    : l'organisateur apprend une inscription ;
--   changed   : les inscrits apprennent un changement de jour, d'heure ou de lieu ;
--   cancelled : les inscrits apprennent l'annulation ;
--   reminder  : la veille à partir de 18 h (heure de Paris), inscrits et organisateur.
-- Chaque email passe par email_deferred_queue, une fois par destinataire et par
-- moment (clé d'envoi). Un envoi en échec ne bloque jamais l'écriture d'origine.
-- S'applique après 0146. send-transactional-email doit connaître le gabarit
-- avant que le drapeau s'allume. Repère : sort3_emails_sorties.

ALTER TABLE public.outings ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz;

INSERT INTO public.feature_flags (key, enabled, description)
VALUES ('sorties_emails', false, 'Emails de service des sorties : inscription, changement, annulation, rappel de la veille (lot SORT3)')
ON CONFLICT (key) DO NOTHING;

-- « Samedi 12 décembre, 18 h » ou « 18 h 30 », à l'heure de Paris.
CREATE OR REPLACE FUNCTION public.outing_when_label(p_starts_at timestamptz) RETURNS text
LANGUAGE sql
STABLE
SET search_path = public
AS $fn$
  -- sort3_emails_sorties
  SELECT (ARRAY['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'])[extract(dow FROM t)::int + 1]
    || ' ' || extract(day FROM t)::int
    || CASE WHEN extract(day FROM t)::int = 1 THEN 'er' ELSE '' END
    || ' ' || (ARRAY['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'])[extract(month FROM t)::int]
    || ', ' || extract(hour FROM t)::int || ' h'
    || CASE WHEN extract(minute FROM t)::int = 0 THEN '' ELSE ' ' || lpad(extract(minute FROM t)::int::text, 2, '0') END
  FROM (SELECT p_starts_at AT TIME ZONE 'Europe/Paris' AS t) x;
$fn$;

-- Met un email de suivi en file pour un membre. Rend le nombre de lignes posées.
CREATE OR REPLACE FUNCTION public.outing_email_enqueue(
  p_kind text, p_outing uuid, p_recipient uuid, p_actor_name text DEFAULT NULL, p_stamp text DEFAULT ''
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
-- sort3_emails_sorties
DECLARE
  v_outing public.outings%ROWTYPE;
  v_email text;
  v_subject text;
  v_title text;
  v_body text;
  v_place text;
  v_key text;
  v_count integer := 0;
BEGIN
  IF NOT COALESCE((SELECT enabled FROM public.feature_flags WHERE key = 'sorties_emails'), false) THEN
    RETURN 0;
  END IF;
  SELECT * INTO v_outing FROM public.outings WHERE id = p_outing;
  IF NOT FOUND THEN RETURN 0; END IF;
  SELECT u.email INTO v_email FROM auth.users u WHERE u.id = p_recipient;
  IF v_email IS NULL OR v_email = '' THEN RETURN 0; END IF;

  v_place := CASE v_outing.place_kind
    WHEN 'online' THEN 'En ligne'
    ELSE COALESCE(NULLIF(btrim(v_outing.place_label), ''), v_outing.city)
  END;

  IF p_kind = 'joined' THEN
    v_subject := COALESCE(p_actor_name, 'Un membre') || ' vient à votre sortie';
    v_title := 'Une place prise : ' || v_outing.title;
    v_body := COALESCE(p_actor_name, 'Un membre') || ' vient. Vous lui donnez le rendez-vous par message, depuis la fiche de votre sortie.';
  ELSIF p_kind = 'changed' THEN
    v_subject := 'Changement pour ' || v_outing.title;
    v_title := 'Le rendez-vous a changé : ' || v_outing.title;
    v_body := 'Voici le nouveau rendez-vous. Votre place reste réservée, et vous la libérez d''un geste depuis la fiche si ce jour vous convient moins.';
  ELSIF p_kind = 'cancelled' THEN
    v_subject := 'Sortie annulée : ' || v_outing.title;
    v_title := 'Sortie annulée : ' || v_outing.title;
    v_body := COALESCE('Un mot de l''organisateur : « ' || v_outing.cancel_note || ' » ', '')
      || 'D''autres sorties vous attendent près de chez vous.';
  ELSIF p_kind = 'reminder' THEN
    v_subject := 'Demain : ' || v_outing.title;
    v_title := 'C''est demain : ' || v_outing.title;
    v_body := CASE WHEN p_recipient = v_outing.organizer_id
      THEN 'Votre sortie a lieu demain. La liste des inscrits est sur la fiche, avec un bouton pour écrire à chacun.'
      ELSE 'Votre place est réservée. Un empêchement ? Libérez-la d''un geste depuis la fiche, elle revient aux gens du coin.'
    END;
  ELSE
    RETURN 0;
  END IF;

  v_key := 'outing-' || p_kind || '-' || p_outing::text || '-' || p_recipient::text || COALESCE(NULLIF('-' || p_stamp, '-'), '');

  INSERT INTO public.email_deferred_queue
    (template_name, recipient_email, template_data, idempotency_key, defer_reason, scheduled_for)
  SELECT
    'outing-update', v_email,
    jsonb_build_object(
      'subject', v_subject, 'title', v_title, 'body', v_body,
      'whenWhere', public.outing_when_label(v_outing.starts_at) || ' · ' || v_place,
      'link', 'https://guardiens.fr/sorties/' || v_outing.slug,
      'cta', CASE WHEN p_kind = 'cancelled' THEN 'Voir les sorties' ELSE 'Voir la sortie' END),
    v_key, 'outing_' || p_kind, now()
  WHERE NOT EXISTS (SELECT 1 FROM public.email_deferred_queue q WHERE q.idempotency_key = v_key);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END
$fn$;

REVOKE ALL ON FUNCTION public.outing_email_enqueue(text, uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.outing_email_enqueue(text, uuid, uuid, text, text) TO service_role;
REVOKE ALL ON FUNCTION public.outing_when_label(timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.outing_when_label(timestamptz) TO authenticated, service_role;

-- Inscription : un email à l'organisateur, une fois par inscrit.
CREATE OR REPLACE FUNCTION public.outing_email_on_attendee() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
-- sort3_emails_sorties
DECLARE
  v_organizer uuid;
  v_name text;
BEGIN
  IF NEW.status <> 'going' OR (TG_OP = 'UPDATE' AND OLD.status = 'going') THEN
    RETURN NEW;
  END IF;
  BEGIN
    SELECT organizer_id INTO v_organizer FROM public.outings WHERE id = NEW.outing_id;
    SELECT NULLIF(btrim(first_name), '') INTO v_name FROM public.profiles WHERE id = NEW.user_id;
    PERFORM public.outing_email_enqueue('joined', NEW.outing_id, v_organizer, v_name, NEW.user_id::text);
  EXCEPTION WHEN OTHERS THEN
    NULL; -- l'email ne bloque jamais une inscription
  END;
  RETURN NEW;
END
$fn$;

DROP TRIGGER IF EXISTS trg_outing_email_on_attendee ON public.outing_attendees;
CREATE TRIGGER trg_outing_email_on_attendee
  AFTER INSERT OR UPDATE OF status ON public.outing_attendees
  FOR EACH ROW EXECUTE FUNCTION public.outing_email_on_attendee();

-- Changement de rendez-vous ou annulation : un email à chaque inscrit.
CREATE OR REPLACE FUNCTION public.outing_email_on_outing_change() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
-- sort3_emails_sorties
DECLARE
  v_kind text;
  v_stamp text;
  v_att record;
BEGIN
  IF NEW.hidden_at IS NOT NULL THEN
    RETURN NEW;
  END IF;
  IF OLD.status = 'open' AND NEW.status = 'cancelled' THEN
    v_kind := 'cancelled';
    v_stamp := '';
  ELSIF NEW.status = 'open' AND (OLD.starts_at IS DISTINCT FROM NEW.starts_at OR OLD.place_kind IS DISTINCT FROM NEW.place_kind
        OR OLD.place_label IS DISTINCT FROM NEW.place_label OR OLD.city IS DISTINCT FROM NEW.city) THEN
    v_kind := 'changed';
    -- Deux changements à plus d'une heure d'écart valent deux emails.
    v_stamp := to_char(date_trunc('hour', now()), 'YYYYMMDDHH24');
  ELSE
    RETURN NEW;
  END IF;
  BEGIN
    FOR v_att IN SELECT a.user_id FROM public.outing_attendees a WHERE a.outing_id = NEW.id AND a.status = 'going' LOOP
      PERFORM public.outing_email_enqueue(v_kind, NEW.id, v_att.user_id, NULL, v_stamp);
    END LOOP;
    IF v_kind = 'changed' THEN
      UPDATE public.outings SET reminder_sent_at = NULL WHERE id = NEW.id AND reminder_sent_at IS NOT NULL AND OLD.starts_at IS DISTINCT FROM NEW.starts_at;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL; -- l'email ne bloque jamais une modification
  END;
  RETURN NEW;
END
$fn$;

DROP TRIGGER IF EXISTS trg_outing_email_on_outing_change ON public.outings;
CREATE TRIGGER trg_outing_email_on_outing_change
  AFTER UPDATE OF status, starts_at, place_kind, place_label, city ON public.outings
  FOR EACH ROW EXECUTE FUNCTION public.outing_email_on_outing_change();

-- Rappel de la veille : sorties ouvertes de demain (jour de Paris), à partir de 18 h.
CREATE OR REPLACE FUNCTION public.outing_enqueue_reminders(p_now timestamptz DEFAULT now()) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
-- sort3_emails_sorties
DECLARE
  v_paris timestamp := p_now AT TIME ZONE 'Europe/Paris';
  v_outing record;
  v_att record;
  v_count integer := 0;
BEGIN
  IF NOT COALESCE((SELECT enabled FROM public.feature_flags WHERE key = 'sorties_emails'), false) THEN
    RETURN 0;
  END IF;
  IF extract(hour FROM v_paris) < 18 THEN
    RETURN 0;
  END IF;
  FOR v_outing IN
    SELECT o.id, o.organizer_id FROM public.outings o
    WHERE o.status = 'open' AND o.hidden_at IS NULL AND o.reminder_sent_at IS NULL
      AND (o.starts_at AT TIME ZONE 'Europe/Paris')::date = (v_paris::date + 1)
    ORDER BY o.starts_at
    LIMIT 200
  LOOP
    -- Une sortie sans inscrit garde le silence : l'organisateur a sa fiche.
    IF EXISTS (SELECT 1 FROM public.outing_attendees a WHERE a.outing_id = v_outing.id AND a.status = 'going') THEN
      v_count := v_count + public.outing_email_enqueue('reminder', v_outing.id, v_outing.organizer_id);
      FOR v_att IN SELECT a.user_id FROM public.outing_attendees a WHERE a.outing_id = v_outing.id AND a.status = 'going' LOOP
        v_count := v_count + public.outing_email_enqueue('reminder', v_outing.id, v_att.user_id);
      END LOOP;
    END IF;
    PERFORM set_config('guardiens.outing_rpc', '1', true);
    UPDATE public.outings SET reminder_sent_at = p_now WHERE id = v_outing.id;
    PERFORM set_config('guardiens.outing_rpc', '0', true);
  END LOOP;
  RETURN v_count;
END
$fn$;

REVOKE ALL ON FUNCTION public.outing_enqueue_reminders(timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.outing_enqueue_reminders(timestamptz) TO service_role;
REVOKE ALL ON FUNCTION public.outing_email_on_attendee() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.outing_email_on_outing_change() FROM PUBLIC, anon, authenticated;

-- Passage chaque heure (UTC) : la fonction ne sert qu'à partir de 18 h à Paris,
-- été comme hiver, et chaque sortie une seule fois.
DO $cron$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'outing-reminders';
    PERFORM cron.schedule('outing-reminders', '12 * * * *', 'SELECT public.outing_enqueue_reminders()');
  END IF;
END
$cron$;
