-- Lot I3 (11/10/2026) : « en priorité, puis tous les gardiens ».
--
-- Le propriétaire qui propose un brouillon peut demander sa publication
-- automatique après 48 heures de priorité (sit_proposal_limits().priority_hours).
-- À l'échéance, publish_due_proposal_sits() publie la garde, sauf si un
-- gardien a déjà dit oui : le propriétaire décide alors. Un non avant
-- l'échéance, sans autre proposition ouverte, avance la publication.
-- Rejouable. Prérequis : 20261011150000_sit_private_proposals.sql.

-- 1. Échéance de publication sur la garde ------------------------------------
ALTER TABLE public.sits ADD COLUMN IF NOT EXISTS proposal_publish_at timestamptz;
COMMENT ON COLUMN public.sits.proposal_publish_at IS
  'Lot I3 : publication automatique du brouillon après la priorité donnée à une proposition privée.';
CREATE INDEX IF NOT EXISTS sits_proposal_publish_at_idx
  ON public.sits (proposal_publish_at) WHERE proposal_publish_at IS NOT NULL;

-- 2. Limites ajustables, avec la durée de priorité ----------------------------
CREATE OR REPLACE FUNCTION public.sit_proposal_limits()
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT jsonb_build_object(
    'expiry_days', 5,
    'max_open_per_sit', 3,
    'max_per_day', 10,
    'priority_hours', 48
  );
$$;

-- 3. Création : option de publication après la priorité ----------------------
DROP FUNCTION IF EXISTS public.create_sit_proposal(uuid, uuid, text);
CREATE OR REPLACE FUNCTION public.create_sit_proposal(
  p_sit_id uuid,
  p_sitter_id uuid,
  p_message text DEFAULT NULL,
  p_publish_after boolean DEFAULT false
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

  -- Option « en priorité, puis tous les gardiens » : la garde se publie seule
  -- à l'échéance (la plus proche si plusieurs propositions la demandent).
  IF p_publish_after THEN
    UPDATE public.sits
       SET proposal_publish_at = LEAST(
         coalesce(proposal_publish_at, 'infinity'::timestamptz),
         now() + make_interval(hours => (v_limits->>'priority_hours')::integer)
       )
     WHERE id = p_sit_id;
  END IF;

  RETURN v_id;
END;
$$;


-- 4. Réponse du gardien : un non sans autre proposition ouverte avance la publication
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

  -- Priorité demandée : sans autre proposition ouverte, la publication n'attend
  -- plus l'échéance (publiée au prochain passage de publish_due_proposal_sits).
  IF NOT EXISTS (
    SELECT 1 FROM public.sit_invitations i
    WHERE i.sit_id = v_inv.sit_id AND i.kind = 'private'
      AND i.status IN ('sent', 'viewed') AND i.expires_at > now()
  ) THEN
    UPDATE public.sits
       SET proposal_publish_at = now()
     WHERE id = v_inv.sit_id AND status = 'draft'::sit_status AND proposal_publish_at IS NOT NULL;
  END IF;

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


-- 5. Publication à l'échéance ------------------------------------------------
CREATE OR REPLACE FUNCTION public.publish_due_proposal_sits()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r record;
  v_published integer := 0;
BEGIN
  FOR r IN
    SELECT s.id, s.user_id, s.title
    FROM public.sits s
    WHERE s.status = 'draft'::sit_status
      AND s.proposal_publish_at IS NOT NULL
      AND s.proposal_publish_at <= now()
    ORDER BY s.proposal_publish_at
    LIMIT 200
    FOR UPDATE SKIP LOCKED
  LOOP
    -- Un gardien a dit oui : le propriétaire confirme ou publie lui-même.
    IF EXISTS (
      SELECT 1 FROM public.applications a
      WHERE a.sit_id = r.id AND a.status IN ('pending', 'viewed', 'discussing', 'accepted')
    ) THEN
      UPDATE public.sits SET proposal_publish_at = NULL WHERE id = r.id;
      CONTINUE;
    END IF;

    BEGIN
      UPDATE public.sits
         SET status = 'published'::sit_status, proposal_publish_at = NULL
       WHERE id = r.id;
      INSERT INTO public.notifications (user_id, type, title, body, link)
      VALUES (
        r.user_id,
        'sit_auto_published',
        'Votre garde est publiée',
        'La priorité donnée à votre proposition est terminée : « '
          || coalesce(r.title, 'votre garde')
          || ' » est maintenant visible par tous les gardiens.',
        '/sits/' || r.id
      );
      v_published := v_published + 1;
    EXCEPTION WHEN OTHERS THEN
      UPDATE public.sits SET proposal_publish_at = NULL WHERE id = r.id;
      INSERT INTO public.notifications (user_id, type, title, body, link)
      VALUES (
        r.user_id,
        'sit_auto_publish_failed',
        'Votre garde attend sa publication',
        'La priorité donnée à votre proposition est terminée. Ouvrez « '
          || coalesce(r.title, 'votre garde')
          || ' » pour la publier.',
        '/sits/' || r.id
      );
    END;
  END LOOP;
  RETURN v_published;
END;
$$;

DO $cron$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'publish-due-proposal-sits';
    PERFORM cron.schedule(
      'publish-due-proposal-sits',
      '*/15 * * * *',
      'SELECT public.publish_due_proposal_sits()'
    );
  END IF;
END
$cron$;

-- 6. Droits ---------------------------------------------------------------
REVOKE ALL ON FUNCTION public.create_sit_proposal(uuid, uuid, text, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.respond_sit_proposal(uuid, boolean, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.publish_due_proposal_sits() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sit_proposal_limits() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_sit_proposal(uuid, uuid, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_sit_proposal(uuid, boolean, text) TO authenticated;
