-- Lot SORT1 (12/11/2026) : sorties à places comptées (rubrique « Entraide & sorties »).
-- Cadrage : claude/entraide-sorties-cadrage-avant-build-12-novembre-2026.md.
-- Une sortie vit dans ses propres tables. small_missions reste intacte : aucun
-- de ses déclencheurs (vagues de sollicitation, file de rendu SEO, IndexNow,
-- compteurs publics) ne voit une sortie, et aucune lecture existante ne change.
--   public.outings            : la sortie (organisateur, jour, lieu, places, participation)
--   public.outing_attendees   : les inscrits (« Je viens », place libérée, retrait)
--   public.public_outings     : lecture ouverte aux visiteurs, sans adresse précise
-- Écritures sensibles par fonctions : outing_join, outing_leave,
-- outing_remove_attendee, outing_cancel, outing_attendee_list.
-- Deux signalements de membres différents masquent la sortie (hidden_at).
-- Drapeau feature_flags.sorties éteint à la création : rien n'est visible.
-- Aucune donnée existante modifiée. Repère : sort1_sorties.

CREATE TABLE IF NOT EXISTS public.outings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'autre',
  starts_at timestamptz NOT NULL,
  place_kind text NOT NULL DEFAULT 'public',
  place_label text NOT NULL DEFAULT '',
  setting text,
  city text NOT NULL DEFAULT '',
  postal_code text NOT NULL DEFAULT '',
  latitude numeric,
  longitude numeric,
  capacity integer NOT NULL,
  reserved integer NOT NULL DEFAULT 1,
  participation_eur numeric(6, 2),
  agenda_consent boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'open',
  cancel_note text,
  cancelled_at timestamptz,
  hidden_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT outings_title_length CHECK (char_length(btrim(title)) BETWEEN 4 AND 80),
  CONSTRAINT outings_description_length CHECK (char_length(description) <= 1500),
  CONSTRAINT outings_category CHECK (category IN ('jeux', 'balades', 'chiens', 'velo', 'jardin', 'repas', 'culture', 'ateliers', 'autre')),
  CONSTRAINT outings_place_kind CHECK (place_kind IN ('home', 'public', 'online')),
  CONSTRAINT outings_setting CHECK (setting IS NULL OR setting IN ('indoor', 'outdoor')),
  CONSTRAINT outings_capacity CHECK (capacity BETWEEN 2 AND 20),
  CONSTRAINT outings_reserved CHECK (reserved >= 1 AND reserved < capacity),
  CONSTRAINT outings_participation CHECK (participation_eur IS NULL OR (participation_eur > 0 AND participation_eur <= 200)),
  CONSTRAINT outings_status CHECK (status IN ('open', 'cancelled')),
  CONSTRAINT outings_place_label_length CHECK (char_length(place_label) <= 120),
  CONSTRAINT outings_cancel_note_length CHECK (cancel_note IS NULL OR char_length(cancel_note) <= 300)
);

CREATE INDEX IF NOT EXISTS outings_starts_at_idx ON public.outings (starts_at) WHERE status = 'open' AND hidden_at IS NULL;
CREATE INDEX IF NOT EXISTS outings_organizer_idx ON public.outings (organizer_id, starts_at DESC);

CREATE TABLE IF NOT EXISTS public.outing_attendees (
  outing_id uuid NOT NULL REFERENCES public.outings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'going',
  source text NOT NULL DEFAULT 'site',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (outing_id, user_id),
  CONSTRAINT outing_attendees_status CHECK (status IN ('going', 'left', 'removed')),
  CONSTRAINT outing_attendees_source CHECK (source IN ('site', 'lien', 'alerte', 'garde'))
);

CREATE INDEX IF NOT EXISTS outing_attendees_user_idx ON public.outing_attendees (user_id) WHERE status = 'going';

ALTER TABLE public.outings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outing_attendees ENABLE ROW LEVEL SECURITY;

-- Lecture directe : l'organisateur lit ses sorties (masquées comprises), un
-- inscrit lit les sorties où il vient, un admin lit tout. Les listes et les
-- fiches passent par public_outings.
DROP POLICY IF EXISTS outings_select ON public.outings;
CREATE POLICY outings_select ON public.outings
  FOR SELECT TO authenticated
  USING (
    organizer_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

DROP POLICY IF EXISTS outings_insert ON public.outings;
CREATE POLICY outings_insert ON public.outings
  FOR INSERT TO authenticated
  WITH CHECK (organizer_id = auth.uid());

DROP POLICY IF EXISTS outings_update ON public.outings;
CREATE POLICY outings_update ON public.outings
  FOR UPDATE TO authenticated
  USING (organizer_id = auth.uid())
  WITH CHECK (organizer_id = auth.uid());

DROP POLICY IF EXISTS outings_admin_update ON public.outings;
CREATE POLICY outings_admin_update ON public.outings
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS outing_attendees_select ON public.outing_attendees;
CREATE POLICY outing_attendees_select ON public.outing_attendees
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

REVOKE ALL ON public.outings FROM PUBLIC, anon;
REVOKE ALL ON public.outing_attendees FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.outings TO authenticated;
GRANT SELECT ON public.outing_attendees TO authenticated;
GRANT ALL ON public.outings TO service_role;
GRANT ALL ON public.outing_attendees TO service_role;

-- Adresse lisible, à partir du titre, avec un suffixe court unique.
CREATE OR REPLACE FUNCTION public.outings_before_write() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
-- sort1_sorties
DECLARE
  v_base text;
  v_taken integer;
  v_is_admin boolean := false;
  v_text text;
BEGIN
  -- La garde d'enfants reste hors de Guardiens, pour une sortie comme pour un coup de main.
  IF TG_OP = 'INSERT' OR NEW.title IS DISTINCT FROM OLD.title OR NEW.description IS DISTINCT FROM OLD.description THEN
    v_text := coalesce(NEW.title, '') || E'\n' || coalesce(NEW.description, '');
    IF v_text ~* '\ygardes?\s+d[''’]\s*enfants?\y'
       OR v_text ~* '\ybaby[\s-]?sitt?(ing|eur|euse|er)?\y'
       OR v_text ~* '\ynounou\y' THEN
      RAISE EXCEPTION 'La garde d''enfants reste hors de Guardiens.'
        USING HINT = 'child_care_in_outing';
    END IF;
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.starts_at <= now() THEN
      RAISE EXCEPTION 'OUTING_DATE_PAST' USING ERRCODE = 'P0001';
    END IF;
    NEW.status := 'open';
    NEW.cancel_note := NULL;
    NEW.cancelled_at := NULL;
    NEW.hidden_at := NULL;
    v_base := btrim(regexp_replace(lower(translate(NEW.title,
      'àâäáãéèêëíìîïóòôöõúùûüçñÀÂÄÁÃÉÈÊËÍÌÎÏÓÒÔÖÕÚÙÛÜÇÑ',
      'aaaaaeeeeiiiiooooouuuucnaaaaaeeeeiiiiooooouuuucn')), '[^a-z0-9]+', '-', 'g'), '-');
    IF v_base = '' THEN v_base := 'sortie'; END IF;
    NEW.slug := left(v_base, 60) || '-' || substr(replace(NEW.id::text, '-', ''), 1, 8);
    -- Position au niveau de la commune : celle du profil de l'organisateur
    -- quand la sortie se tient dans sa commune.
    IF NEW.latitude IS NULL THEN
      SELECT p.latitude, p.longitude INTO NEW.latitude, NEW.longitude
      FROM public.profiles p
      WHERE p.id = NEW.organizer_id
        AND (NEW.place_kind = 'home' OR (NEW.postal_code <> '' AND p.postal_code = NEW.postal_code));
    END IF;
    RETURN NEW;
  END IF;

  NEW.updated_at := now();
  v_is_admin := auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'::public.app_role);
  IF NEW.organizer_id IS DISTINCT FROM OLD.organizer_id OR NEW.slug IS DISTINCT FROM OLD.slug
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'OUTING_FIELD_LOCKED' USING ERRCODE = 'P0001';
  END IF;
  -- Masquage, état et annulation passent par les fonctions (rôle service,
  -- propriétaire de la base) ou par un admin.
  IF auth.uid() IS NOT NULL AND NOT v_is_admin
     AND current_setting('guardiens.outing_rpc', true) IS DISTINCT FROM '1' THEN
    IF NEW.hidden_at IS DISTINCT FROM OLD.hidden_at OR NEW.status IS DISTINCT FROM OLD.status
       OR NEW.cancelled_at IS DISTINCT FROM OLD.cancelled_at OR NEW.cancel_note IS DISTINCT FROM OLD.cancel_note THEN
      RAISE EXCEPTION 'OUTING_FIELD_LOCKED' USING ERRCODE = 'P0001';
    END IF;
  END IF;
  IF NEW.capacity IS DISTINCT FROM OLD.capacity OR NEW.reserved IS DISTINCT FROM OLD.reserved THEN
    SELECT count(*) INTO v_taken FROM public.outing_attendees a
    WHERE a.outing_id = NEW.id AND a.status = 'going';
    IF NEW.reserved + v_taken > NEW.capacity THEN
      RAISE EXCEPTION 'OUTING_CAPACITY_BELOW_ATTENDEES' USING ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN NEW;
END
$fn$;

DROP TRIGGER IF EXISTS trg_outings_before_write ON public.outings;
CREATE TRIGGER trg_outings_before_write
  BEFORE INSERT OR UPDATE ON public.outings
  FOR EACH ROW EXECUTE FUNCTION public.outings_before_write();

-- Lecture ouverte : sorties non masquées, sans position ni identifiant d'inscrit.
CREATE OR REPLACE VIEW public.public_outings AS
SELECT
  o.id,
  o.slug,
  o.organizer_id,
  o.title,
  o.description,
  o.category,
  o.starts_at,
  o.place_kind,
  o.place_label,
  o.setting,
  o.city,
  o.postal_code,
  o.capacity,
  o.reserved,
  o.participation_eur,
  o.status,
  o.cancel_note,
  o.cancelled_at,
  o.created_at,
  (o.reserved + (SELECT count(*) FROM public.outing_attendees a WHERE a.outing_id = o.id AND a.status = 'going'))::integer AS taken,
  p.first_name AS organizer_first_name,
  p.created_at AS organizer_member_since,
  COALESCE(p.identity_verified, false) AS organizer_identity_verified
FROM public.outings o
JOIN public.profiles p ON p.id = o.organizer_id
WHERE o.hidden_at IS NULL;

REVOKE ALL ON public.public_outings FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.public_outings FROM anon, authenticated;
GRANT SELECT ON public.public_outings TO anon, authenticated;
GRANT SELECT ON public.public_outings TO service_role;

-- « Je viens » : une place prise, sous verrou de la sortie.
CREATE OR REPLACE FUNCTION public.outing_join(p_outing uuid, p_source text DEFAULT 'site')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
-- sort1_sorties
DECLARE
  v_user uuid := auth.uid();
  v_outing public.outings%ROWTYPE;
  v_taken integer;
  v_name text;
  v_source text := CASE WHEN p_source IN ('site', 'lien', 'alerte', 'garde') THEN p_source ELSE 'site' END;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'auth');
  END IF;
  SELECT * INTO v_outing FROM public.outings WHERE id = p_outing FOR UPDATE;
  IF NOT FOUND OR v_outing.hidden_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;
  IF v_outing.organizer_id = v_user THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'organizer');
  END IF;
  IF v_outing.status <> 'open' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'cancelled');
  END IF;
  IF v_outing.starts_at <= now() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'past');
  END IF;
  IF EXISTS (SELECT 1 FROM public.outing_attendees a
             WHERE a.outing_id = p_outing AND a.user_id = v_user AND a.status = 'going') THEN
    RETURN jsonb_build_object('ok', true, 'already', true);
  END IF;
  IF EXISTS (SELECT 1 FROM public.outing_attendees a
             WHERE a.outing_id = p_outing AND a.user_id = v_user AND a.status = 'removed') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'removed');
  END IF;
  SELECT count(*) INTO v_taken FROM public.outing_attendees a
  WHERE a.outing_id = p_outing AND a.status = 'going';
  IF v_outing.reserved + v_taken >= v_outing.capacity THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'full');
  END IF;

  INSERT INTO public.outing_attendees (outing_id, user_id, status, source)
  VALUES (p_outing, v_user, 'going', v_source)
  ON CONFLICT (outing_id, user_id)
  DO UPDATE SET status = 'going', source = EXCLUDED.source, updated_at = now();

  SELECT NULLIF(btrim(first_name), '') INTO v_name FROM public.profiles WHERE id = v_user;
  BEGIN
    INSERT INTO public.notifications (user_id, type, title, body, link, actor_name)
    VALUES (
      v_outing.organizer_id, 'outing_joined', 'Une place prise',
      COALESCE(v_name, 'Un membre') || ' vient à « ' || v_outing.title || ' ».',
      '/sorties/' || v_outing.slug, v_name);
  EXCEPTION WHEN OTHERS THEN
    NULL; -- la cloche ne bloque jamais une inscription
  END;
  RETURN jsonb_build_object('ok', true, 'left', v_outing.capacity - v_outing.reserved - v_taken - 1);
END
$fn$;

-- « Libérer ma place ».
CREATE OR REPLACE FUNCTION public.outing_leave(p_outing uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
-- sort1_sorties
DECLARE
  v_user uuid := auth.uid();
  v_outing public.outings%ROWTYPE;
  v_name text;
  v_rows integer;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'auth');
  END IF;
  SELECT * INTO v_outing FROM public.outings WHERE id = p_outing FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;
  UPDATE public.outing_attendees SET status = 'left', updated_at = now()
  WHERE outing_id = p_outing AND user_id = v_user AND status = 'going';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    RETURN jsonb_build_object('ok', true, 'already', true);
  END IF;
  SELECT NULLIF(btrim(first_name), '') INTO v_name FROM public.profiles WHERE id = v_user;
  BEGIN
    INSERT INTO public.notifications (user_id, type, title, body, link, actor_name)
    VALUES (
      v_outing.organizer_id, 'outing_left', 'Une place s''est libérée',
      COALESCE(v_name, 'Un membre') || ' a libéré sa place pour « ' || v_outing.title || ' ».',
      '/sorties/' || v_outing.slug, v_name);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RETURN jsonb_build_object('ok', true);
END
$fn$;

-- L'organisateur retire un inscrit, qui reçoit un mot neutre.
CREATE OR REPLACE FUNCTION public.outing_remove_attendee(p_outing uuid, p_user uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
-- sort1_sorties
DECLARE
  v_outing public.outings%ROWTYPE;
  v_rows integer;
BEGIN
  SELECT * INTO v_outing FROM public.outings WHERE id = p_outing FOR UPDATE;
  IF NOT FOUND OR auth.uid() IS NULL OR v_outing.organizer_id <> auth.uid() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'forbidden');
  END IF;
  UPDATE public.outing_attendees SET status = 'removed', updated_at = now()
  WHERE outing_id = p_outing AND user_id = p_user AND status = 'going';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    RETURN jsonb_build_object('ok', true, 'already', true);
  END IF;
  BEGIN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (
      p_user, 'outing_removed', 'Votre place a été libérée',
      'L''organisateur a libéré votre place pour « ' || v_outing.title || ' ». D''autres sorties vous attendent près de chez vous.',
      '/sorties');
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RETURN jsonb_build_object('ok', true);
END
$fn$;

-- L'organisateur annule, chaque inscrit est prévenu dans sa cloche.
CREATE OR REPLACE FUNCTION public.outing_cancel(p_outing uuid, p_note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
-- sort1_sorties
DECLARE
  v_outing public.outings%ROWTYPE;
  v_note text := NULLIF(left(btrim(COALESCE(p_note, '')), 300), '');
BEGIN
  SELECT * INTO v_outing FROM public.outings WHERE id = p_outing FOR UPDATE;
  IF NOT FOUND OR auth.uid() IS NULL OR v_outing.organizer_id <> auth.uid() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'forbidden');
  END IF;
  IF v_outing.status = 'cancelled' THEN
    RETURN jsonb_build_object('ok', true, 'already', true);
  END IF;
  PERFORM set_config('guardiens.outing_rpc', '1', true);
  UPDATE public.outings
  SET status = 'cancelled', cancel_note = v_note, cancelled_at = now()
  WHERE id = p_outing;
  PERFORM set_config('guardiens.outing_rpc', '0', true);
  BEGIN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    SELECT a.user_id, 'outing_cancelled', 'Sortie annulée',
           '« ' || v_outing.title || ' » est annulée.' || COALESCE(' Mot de l''organisateur : ' || v_note, ''),
           '/sorties/' || v_outing.slug
    FROM public.outing_attendees a
    WHERE a.outing_id = p_outing AND a.status = 'going';
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RETURN jsonb_build_object('ok', true);
END
$fn$;

-- Inscrits d'une sortie : pour l'organisateur et pour les inscrits eux-mêmes.
CREATE OR REPLACE FUNCTION public.outing_attendee_list(p_outing uuid)
RETURNS TABLE (user_id uuid, first_name text, member_since timestamptz, identity_verified boolean, joined_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  -- sort1_sorties
  SELECT a.user_id, p.first_name, p.created_at, COALESCE(p.identity_verified, false), a.updated_at
  FROM public.outing_attendees a
  JOIN public.profiles p ON p.id = a.user_id
  JOIN public.outings o ON o.id = a.outing_id
  WHERE a.outing_id = p_outing
    AND a.status = 'going'
    AND auth.uid() IS NOT NULL
    AND (
      o.organizer_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.outing_attendees me
                 WHERE me.outing_id = p_outing AND me.user_id = auth.uid() AND me.status = 'going')
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  ORDER BY a.updated_at;
$fn$;

-- État du membre connecté sur une sortie (going, left, removed ou rien).
CREATE OR REPLACE FUNCTION public.outing_my_status(p_outing uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  -- sort1_sorties
  SELECT a.status FROM public.outing_attendees a
  WHERE a.outing_id = p_outing AND a.user_id = auth.uid();
$fn$;

REVOKE ALL ON FUNCTION public.outing_join(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.outing_leave(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.outing_remove_attendee(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.outing_cancel(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.outing_attendee_list(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.outing_my_status(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.outing_join(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.outing_leave(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.outing_remove_attendee(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.outing_cancel(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.outing_attendee_list(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.outing_my_status(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.outings_before_write() FROM PUBLIC, anon, authenticated;

-- Deux signalements de membres différents masquent la sortie en attendant un admin.
CREATE OR REPLACE FUNCTION public.outing_hide_on_reports() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
-- sort1_sorties
DECLARE
  v_reporters integer;
BEGIN
  IF NEW.target_type <> 'outing' THEN
    RETURN NEW;
  END IF;
  BEGIN
    SELECT count(DISTINCT r.reporter_id) INTO v_reporters
    FROM public.reports r
    WHERE r.target_type = 'outing' AND r.target_id = NEW.target_id AND r.status = 'new';
    IF v_reporters >= 2 THEN
      PERFORM set_config('guardiens.outing_rpc', '1', true);
      UPDATE public.outings SET hidden_at = now()
      WHERE id = NEW.target_id AND hidden_at IS NULL;
      PERFORM set_config('guardiens.outing_rpc', '0', true);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL; -- le masquage ne bloque jamais un signalement
  END;
  RETURN NEW;
END
$fn$;

REVOKE ALL ON FUNCTION public.outing_hide_on_reports() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_outing_hide_on_reports ON public.reports;
CREATE TRIGGER trg_outing_hide_on_reports
  AFTER INSERT ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.outing_hide_on_reports();

-- Drapeau de mise en service, éteint : la rubrique reste telle qu'aujourd'hui.
INSERT INTO public.feature_flags (key, enabled, description)
VALUES ('sorties', false, 'Rubrique « Entraide & sorties » : onglet Sorties, publication et inscription (lot SORT1)')
ON CONFLICT (key) DO NOTHING;
