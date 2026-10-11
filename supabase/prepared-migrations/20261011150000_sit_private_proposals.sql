-- Lot I2 (11/10/2026) : proposer une garde à un gardien sans la publier.
--
-- Un propriétaire propose un brouillon à un gardien précis. La garde reste
-- privée : seul ce gardien la voit, par get_sit_proposal. Le minimum exigé
-- est ce qui permet de dire oui en confiance et de laisser un avis ensuite :
-- la commune, les dates, au moins une photo, une description.
-- Le oui du gardien crée une candidature ordinaire : le propriétaire confirme
-- ensuite avec accept_application, comme pour toute garde.
--
-- Limites ajustables dans sit_proposal_limits() : réponse sous 5 jours,
-- 3 propositions ouvertes par garde, 10 propositions par jour et par
-- propriétaire.
--
-- Additive : les invitations existantes (kind = 'invite') gardent leur
-- comportement, sauf la clôture automatique quand la garde est confirmée,
-- annulée, archivée ou expirée.

-- 1. Colonnes et contraintes ------------------------------------------------
ALTER TABLE public.sit_invitations
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'invite',
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

ALTER TABLE public.sit_invitations DROP CONSTRAINT IF EXISTS sit_invitations_kind_check;
ALTER TABLE public.sit_invitations
  ADD CONSTRAINT sit_invitations_kind_check CHECK (kind IN ('invite', 'private'));

ALTER TABLE public.sit_invitations DROP CONSTRAINT IF EXISTS sit_invitations_private_expiry_check;
ALTER TABLE public.sit_invitations
  ADD CONSTRAINT sit_invitations_private_expiry_check CHECK (kind <> 'private' OR expires_at IS NOT NULL);

ALTER TABLE public.sit_invitations DROP CONSTRAINT IF EXISTS sit_invitations_status_check;
ALTER TABLE public.sit_invitations
  ADD CONSTRAINT sit_invitations_status_check
  CHECK (status IN ('sent', 'viewed', 'applied', 'declined', 'closed'));

CREATE INDEX IF NOT EXISTS sit_invitations_owner_created_idx
  ON public.sit_invitations (owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS sit_invitations_sit_status_idx
  ON public.sit_invitations (sit_id, status);

-- 2. Une invitation créée directement par le client reste une invitation
--    publique sur une garde publiée. Les propositions privées passent par
--    create_sit_proposal.
DROP POLICY IF EXISTS "owners insert invitations on own sits" ON public.sit_invitations;
CREATE POLICY "owners insert invitations on own sits" ON public.sit_invitations
  FOR INSERT TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    AND kind = 'invite'
    AND expires_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.sits s
      WHERE s.id = sit_invitations.sit_id
        AND s.user_id = auth.uid()
        AND s.status = 'published'::sit_status
    )
    AND public.check_invitation_quota(auth.uid())
  );

-- 3. Le gardien ne modifie que le statut de son invitation (vue, déclinée,
--    candidature envoyée). Avant ce lot, la politique UPDATE lui laissait
--    toutes les colonnes.
CREATE OR REPLACE FUNCTION public.guard_sit_invitation_sitter_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF current_setting('app.via_proposal_rpc', true) = '1' THEN
    RETURN NEW;
  END IF;
  IF auth.uid() IS NOT NULL AND auth.uid() = OLD.sitter_id THEN
    IF NEW.sit_id IS DISTINCT FROM OLD.sit_id
       OR NEW.owner_id IS DISTINCT FROM OLD.owner_id
       OR NEW.sitter_id IS DISTINCT FROM OLD.sitter_id
       OR NEW.kind IS DISTINCT FROM OLD.kind
       OR NEW.expires_at IS DISTINCT FROM OLD.expires_at
       OR NEW.message IS DISTINCT FROM OLD.message
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'invitation_immutable' USING ERRCODE = '42501';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status
       AND NEW.status NOT IN ('viewed', 'declined', 'applied') THEN
      RAISE EXCEPTION 'invitation_status_forbidden' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_sit_invitation_sitter_update ON public.sit_invitations;
CREATE TRIGGER trg_guard_sit_invitation_sitter_update
  BEFORE UPDATE ON public.sit_invitations
  FOR EACH ROW EXECUTE FUNCTION public.guard_sit_invitation_sitter_update();

-- 4. Limites ajustables --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sit_proposal_limits()
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT jsonb_build_object(
    'expiry_days', 5,
    'max_open_per_sit', 3,
    'max_per_day', 10
  );
$$;

-- 5. Ce qui manque pour proposer (lecture réservée au propriétaire) ----------
--    city : commune de la garde ou, à défaut, du profil
--    dates : début et fin, début aujourd'hui ou plus tard
--    photo : photo de couverture, photo du logement ou de la galerie
--    description : 30 caractères au moins (contrainte des gardes confirmées)
CREATE OR REPLACE FUNCTION public.sit_proposal_blockers(p_sit_id uuid)
RETURNS text[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_sit public.sits%ROWTYPE;
  v_profile_city text;
  v_photos integer := 0;
  v_out text[] := ARRAY[]::text[];
BEGIN
  SELECT * INTO v_sit FROM public.sits WHERE id = p_sit_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'sit_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF auth.uid() IS NULL OR v_sit.user_id <> auth.uid() THEN
    RAISE EXCEPTION 'not_owner' USING ERRCODE = '42501';
  END IF;

  SELECT city INTO v_profile_city FROM public.profiles WHERE id = v_sit.user_id;
  IF nullif(btrim(coalesce(v_sit.city, '')), '') IS NULL
     AND nullif(btrim(coalesce(v_profile_city, '')), '') IS NULL THEN
    v_out := v_out || 'city'::text;
  END IF;

  IF v_sit.start_date IS NULL OR v_sit.end_date IS NULL
     OR v_sit.end_date < v_sit.start_date
     OR v_sit.start_date < current_date THEN
    v_out := v_out || 'dates'::text;
  END IF;

  SELECT
    (CASE WHEN nullif(btrim(coalesce(v_sit.cover_photo_url, '')), '') IS NULL THEN 0 ELSE 1 END)
    + coalesce((SELECT cardinality(pr.photos) FROM public.properties pr WHERE pr.id = v_sit.property_id), 0)
    + (SELECT count(*)::integer FROM public.owner_gallery g WHERE g.user_id = v_sit.user_id)
  INTO v_photos;
  IF coalesce(v_photos, 0) = 0 THEN
    v_out := v_out || 'photo'::text;
  END IF;

  IF length(btrim(coalesce(v_sit.specific_expectations, ''))) < 30 THEN
    v_out := v_out || 'description'::text;
  END IF;

  RETURN v_out;
END;
$$;

-- 6. Création d'une proposition privée -------------------------------------
CREATE OR REPLACE FUNCTION public.create_sit_proposal(
  p_sit_id uuid,
  p_sitter_id uuid,
  p_message text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_sit public.sits%ROWTYPE;
  v_limits jsonb := public.sit_proposal_limits();
  v_blockers text[];
  v_sitter_role text;
  v_sitter_status text;
  v_open integer;
  v_day integer;
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_sit FROM public.sits WHERE id = p_sit_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'sit_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF v_sit.user_id <> v_uid THEN
    RAISE EXCEPTION 'not_owner' USING ERRCODE = '42501';
  END IF;
  IF v_sit.status <> 'draft'::sit_status THEN
    RAISE EXCEPTION 'sit_not_draft' USING ERRCODE = '22023';
  END IF;
  IF p_sitter_id IS NULL OR p_sitter_id = v_uid THEN
    RAISE EXCEPTION 'sitter_unavailable' USING ERRCODE = '22023';
  END IF;

  SELECT role::text, coalesce(account_status, 'active')
    INTO v_sitter_role, v_sitter_status
  FROM public.profiles WHERE id = p_sitter_id;
  IF NOT FOUND OR v_sitter_role NOT IN ('sitter', 'both') OR v_sitter_status <> 'active' THEN
    RAISE EXCEPTION 'sitter_unavailable' USING ERRCODE = '22023';
  END IF;

  v_blockers := public.sit_proposal_blockers(p_sit_id);
  IF cardinality(v_blockers) > 0 THEN
    RAISE EXCEPTION 'sit_incomplete: %', array_to_string(v_blockers, ',') USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.sit_invitations WHERE sit_id = p_sit_id AND sitter_id = p_sitter_id
  ) THEN
    RAISE EXCEPTION 'already_proposed' USING ERRCODE = '23505';
  END IF;

  SELECT count(*) INTO v_open
  FROM public.sit_invitations
  WHERE sit_id = p_sit_id AND kind = 'private'
    AND status IN ('sent', 'viewed') AND expires_at > now();
  IF v_open >= (v_limits->>'max_open_per_sit')::integer THEN
    RAISE EXCEPTION 'proposal_open_limit' USING ERRCODE = '22023';
  END IF;

  SELECT count(*) INTO v_day
  FROM public.sit_invitations
  WHERE owner_id = v_uid AND kind = 'private'
    AND created_at > now() - interval '24 hours';
  IF v_day >= (v_limits->>'max_per_day')::integer THEN
    RAISE EXCEPTION 'proposal_daily_limit' USING ERRCODE = '22023';
  END IF;

  -- La garde confirmée exige sa propre commune : reprise du profil si absente.
  IF nullif(btrim(coalesce(v_sit.city, '')), '') IS NULL THEN
    UPDATE public.sits
       SET city = (SELECT p.city FROM public.profiles p WHERE p.id = v_sit.user_id)
     WHERE id = p_sit_id;
  END IF;

  INSERT INTO public.sit_invitations (sit_id, owner_id, sitter_id, message, kind, expires_at)
  VALUES (
    p_sit_id,
    v_uid,
    p_sitter_id,
    nullif(left(btrim(coalesce(p_message, '')), 1000), ''),
    'private',
    now() + make_interval(days => (v_limits->>'expiry_days')::integer)
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- 7. Lecture d'une proposition (gardien invité ou propriétaire) --------------
CREATE OR REPLACE FUNCTION public.get_sit_proposal(p_invitation_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_inv public.sit_invitations%ROWTYPE;
  v_sit public.sits%ROWTYPE;
  v_owner record;
  v_property record;
  v_photos jsonb;
  v_pets jsonb;
  v_state text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_inv FROM public.sit_invitations WHERE id = p_invitation_id;
  IF NOT FOUND OR v_inv.kind <> 'private'
     OR (v_uid <> v_inv.sitter_id AND v_uid <> v_inv.owner_id) THEN
    RAISE EXCEPTION 'proposal_not_found' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_sit FROM public.sits WHERE id = v_inv.sit_id;
  SELECT first_name, avatar_url, identity_verified, city
    INTO v_owner FROM public.profiles WHERE id = v_inv.owner_id;
  SELECT type::text AS type, environment::text AS environment, bedrooms_count, description
    INTO v_property FROM public.properties WHERE id = v_sit.property_id;

  IF v_uid = v_inv.sitter_id AND v_inv.status = 'sent' AND v_inv.expires_at > now() THEN
    PERFORM set_config('app.via_proposal_rpc', '1', true);
    UPDATE public.sit_invitations SET status = 'viewed', viewed_at = now() WHERE id = v_inv.id;
    v_inv.status := 'viewed';
  END IF;

  v_state := CASE
    WHEN v_inv.status IN ('applied', 'declined', 'closed') THEN v_inv.status
    WHEN v_inv.expires_at <= now() THEN 'expired'
    WHEN v_sit.status NOT IN ('draft'::sit_status, 'published'::sit_status) THEN 'closed'
    ELSE 'open'
  END;

  SELECT coalesce(jsonb_agg(z.url ORDER BY z.ord), '[]'::jsonb) INTO v_photos
  FROM (
    SELECT y.url, y.ord FROM (
      SELECT DISTINCT ON (x.url) x.url, x.ord FROM (
        SELECT v_sit.cover_photo_url AS url, 0::bigint AS ord
        UNION ALL
        SELECT t.photo, 1000 + t.i
        FROM public.properties pr, unnest(pr.photos) WITH ORDINALITY AS t(photo, i)
        WHERE pr.id = v_sit.property_id
        UNION ALL
        SELECT g.photo_url, 2000 + coalesce(g.position, 0)
        FROM public.owner_gallery g
        WHERE g.user_id = v_sit.user_id
      ) x
      WHERE nullif(btrim(coalesce(x.url, '')), '') IS NOT NULL
      ORDER BY x.url, x.ord
    ) y
    ORDER BY y.ord
    LIMIT 12
  ) z;

  SELECT coalesce(jsonb_agg(jsonb_build_object('name', p.name, 'species', p.species::text) ORDER BY p.name), '[]'::jsonb)
    INTO v_pets
  FROM public.pets p WHERE p.property_id = v_sit.property_id;

  RETURN jsonb_build_object(
    'id', v_inv.id,
    'state', v_state,
    'viewer', CASE WHEN v_uid = v_inv.sitter_id THEN 'sitter' ELSE 'owner' END,
    'message', v_inv.message,
    'created_at', v_inv.created_at,
    'expires_at', v_inv.expires_at,
    'owner_id', v_inv.owner_id,
    'sitter_id', v_inv.sitter_id,
    'sit', jsonb_build_object(
      'id', v_sit.id,
      'title', v_sit.title,
      'start_date', v_sit.start_date,
      'end_date', v_sit.end_date,
      'flexible_dates', v_sit.flexible_dates,
      'city', coalesce(nullif(btrim(coalesce(v_sit.city, '')), ''), v_owner.city),
      'description', v_sit.specific_expectations,
      'status', v_sit.status::text
    ),
    'property', CASE WHEN v_property IS NULL THEN NULL ELSE jsonb_build_object(
      'type', v_property.type,
      'environment', v_property.environment,
      'bedrooms_count', v_property.bedrooms_count,
      'description', v_property.description
    ) END,
    'photos', v_photos,
    'pets', v_pets,
    'owner', jsonb_build_object(
      'first_name', v_owner.first_name,
      'avatar_url', v_owner.avatar_url,
      'identity_verified', coalesce(v_owner.identity_verified, false)
    )
  );
END;
$$;

-- 8. Réponse du gardien ------------------------------------------------------
CREATE OR REPLACE FUNCTION public.respond_sit_proposal(
  p_invitation_id uuid,
  p_accept boolean,
  p_message text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_inv public.sit_invitations%ROWTYPE;
  v_sit public.sits%ROWTYPE;
  v_app uuid;
  v_sitter record;
  v_message text := nullif(left(btrim(coalesce(p_message, '')), 1000), '');
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_inv FROM public.sit_invitations WHERE id = p_invitation_id FOR UPDATE;
  IF NOT FOUND OR v_inv.kind <> 'private' OR v_inv.sitter_id <> v_uid THEN
    RAISE EXCEPTION 'proposal_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF v_inv.status NOT IN ('sent', 'viewed') THEN
    RAISE EXCEPTION 'proposal_closed' USING ERRCODE = '22023';
  END IF;
  IF v_inv.expires_at <= now() THEN
    RAISE EXCEPTION 'proposal_expired' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_sit FROM public.sits WHERE id = v_inv.sit_id;
  IF v_sit.status NOT IN ('draft'::sit_status, 'published'::sit_status) THEN
    RAISE EXCEPTION 'proposal_closed' USING ERRCODE = '22023';
  END IF;

  PERFORM set_config('app.via_proposal_rpc', '1', true);

  IF p_accept THEN
    BEGIN
      INSERT INTO public.applications (sit_id, sitter_id, message)
      VALUES (v_inv.sit_id, v_uid, v_message)
      RETURNING id INTO v_app;
    EXCEPTION WHEN unique_violation THEN
      RAISE EXCEPTION 'already_applied' USING ERRCODE = '23505';
    END;
    UPDATE public.sit_invitations
       SET status = 'applied', responded_at = now()
     WHERE id = v_inv.id AND status IN ('sent', 'viewed');
    RETURN jsonb_build_object('result', 'accepted', 'application_id', v_app, 'sit_id', v_inv.sit_id);
  END IF;

  UPDATE public.sit_invitations
     SET status = 'declined', responded_at = now()
   WHERE id = v_inv.id;

  SELECT first_name, avatar_url INTO v_sitter FROM public.profiles WHERE id = v_uid;
  INSERT INTO public.notifications (user_id, type, title, body, link, actor_name, actor_avatar_url)
  VALUES (
    v_inv.owner_id,
    'sit_proposal_declined',
    'Proposition déclinée',
    coalesce(v_sitter.first_name, 'Le gardien')
      || ' ne pourra pas garder « ' || coalesce(v_sit.title, 'votre maison') || ' ».'
      || coalesce(' Son mot : « ' || v_message || ' »', ''),
    '/sits/' || v_inv.sit_id,
    v_sitter.first_name,
    v_sitter.avatar_url
  );
  RETURN jsonb_build_object('result', 'declined', 'sit_id', v_inv.sit_id);
END;
$$;

-- 9. Clôture des invitations ouvertes quand la garde n'est plus disponible ---
CREATE OR REPLACE FUNCTION public.close_open_sit_invitations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_owner text;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status IN ('confirmed'::sit_status, 'cancelled'::sit_status,
                        'archived'::sit_status, 'expired'::sit_status) THEN
    PERFORM set_config('app.via_proposal_rpc', '1', true);
    SELECT first_name INTO v_owner FROM public.profiles WHERE id = NEW.user_id;
    WITH closed AS (
      UPDATE public.sit_invitations
         SET status = 'closed', responded_at = coalesce(responded_at, now())
       WHERE sit_id = NEW.id AND status IN ('sent', 'viewed')
      RETURNING id, sitter_id, kind, expires_at
    )
    INSERT INTO public.notifications (user_id, type, title, body, link)
    SELECT c.sitter_id,
           'sit_proposal_closed',
           'Proposition close',
           coalesce(v_owner, 'Le propriétaire')
             || CASE WHEN NEW.status = 'confirmed'::sit_status
                     THEN ' a trouvé son gardien pour « ' || coalesce(NEW.title, 'sa garde') || ' ». Merci d''avoir regardé sa proposition.'
                     ELSE ' a retiré sa garde « ' || coalesce(NEW.title, 'sa garde') || ' ». Merci d''avoir regardé sa proposition.'
                END,
           '/propositions/' || c.id
    FROM closed c
    WHERE c.kind = 'private' AND c.expires_at > now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_close_open_sit_invitations ON public.sits;
CREATE TRIGGER trg_close_open_sit_invitations
  AFTER UPDATE OF status ON public.sits
  FOR EACH ROW EXECUTE FUNCTION public.close_open_sit_invitations();

-- 10. Notification à la réception : lien vers la proposition privée ----------
CREATE OR REPLACE FUNCTION public.notify_sit_invitation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_sit_title text;
  v_sit_city text;
  v_owner_name text;
  v_owner_avatar text;
  v_city text;
BEGIN
  SELECT s.title, nullif(btrim(coalesce(s.city, '')), '') INTO v_sit_title, v_sit_city
  FROM public.sits s WHERE s.id = NEW.sit_id;
  SELECT p.first_name, p.avatar_url, p.city
    INTO v_owner_name, v_owner_avatar, v_city
  FROM public.profiles p WHERE p.id = NEW.owner_id;

  IF NEW.kind = 'private' THEN
    INSERT INTO public.notifications (user_id, type, title, body, link, actor_name, actor_avatar_url)
    VALUES (
      NEW.sitter_id,
      'sit_invitation',
      'Une garde vous est proposée',
      coalesce(v_owner_name, 'Un propriétaire')
        || ' vous propose de garder sa maison'
        || coalesce(' à ' || coalesce(v_sit_city, v_city), '')
        || '. Cette proposition n''est visible que par vous.',
      '/propositions/' || NEW.id,
      v_owner_name,
      v_owner_avatar
    );
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, type, title, body, link, actor_name, actor_avatar_url)
  VALUES (
    NEW.sitter_id,
    'sit_invitation',
    'Invitation à candidater',
    coalesce(v_owner_name, 'Un propriétaire')
      || ' vous invite à candidater pour « '
      || coalesce(v_sit_title, 'sa garde')
      || ' »'
      || coalesce(' à ' || coalesce(v_sit_city, v_city), '')
      || '.',
    '/sits/' || NEW.sit_id,
    v_owner_name,
    v_owner_avatar
  );
  RETURN NEW;
END;
$$;

-- 11. Droits ---------------------------------------------------------------
REVOKE ALL ON FUNCTION public.sit_proposal_blockers(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_sit_proposal(uuid, uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_sit_proposal(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.respond_sit_proposal(uuid, boolean, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.close_open_sit_invitations() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_sit_invitation_sitter_update() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sit_proposal_limits() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sit_proposal_blockers(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_sit_proposal(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sit_proposal(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_sit_proposal(uuid, boolean, text) TO authenticated;
