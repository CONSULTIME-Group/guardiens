-- ============================================================================
-- Lot push utilisateur, etape 1/3, SQL PREPARE, NON APPLIQUE.
-- A appliquer uniquement apres GO explicite. Aucun cron, aucun secret ici.
-- Perimetre : abonnements push, file de livraison, RPC de gestion,
-- triggers ADDITIFS sur public.messages et public.applications.
-- Les emails existants et leurs delais ne sont pas touches par ce fichier.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Tables privees
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  endpoint_host text NOT NULL,
  auth_key text NOT NULL,
  p256dh_key text NOT NULL,
  opt_in_messages boolean NOT NULL DEFAULT false,
  opt_in_applications boolean NOT NULL DEFAULT false,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_success_at timestamptz,
  disabled_at timestamptz,
  disabled_reason text,
  CONSTRAINT push_subscriptions_endpoint_unique UNIQUE (endpoint)
);

CREATE INDEX IF NOT EXISTS push_subscriptions_user_active_idx
  ON public.push_subscriptions (user_id) WHERE enabled;

CREATE TABLE IF NOT EXISTS public.push_delivery_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.push_subscriptions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  event_kind text NOT NULL CHECK (event_kind IN ('message', 'application')),
  source_id uuid NOT NULL,
  -- contexte technique uniquement, sert au cooldown et a la verification finale
  context_id uuid,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'claimed', 'accepted', 'failed', 'skipped')),
  attempts integer NOT NULL DEFAULT 0,
  available_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz,
  claim_expires_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '1 hour',
  last_error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT push_delivery_jobs_unique_event
    UNIQUE (subscription_id, event_kind, source_id)
);

CREATE INDEX IF NOT EXISTS push_delivery_jobs_claimable_idx
  ON public.push_delivery_jobs (created_at)
  WHERE status IN ('pending', 'claimed');

CREATE INDEX IF NOT EXISTS push_delivery_jobs_cooldown_idx
  ON public.push_delivery_jobs (user_id, event_kind, context_id, created_at DESC);

-- Aucune donnee personnelle dans les jobs : ni contenu, ni nom, ni adresse.
COMMENT ON TABLE public.push_delivery_jobs IS
  'File de livraison push. Ne doit jamais contenir de contenu de message, de nom ni d''adresse.';

-- ---------------------------------------------------------------------------
-- 2. RLS et droits : tables strictement privees
-- ---------------------------------------------------------------------------

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_delivery_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.push_delivery_jobs FORCE ROW LEVEL SECURITY;

-- Aucune policy pour anon ni authenticated : pas de lecture directe des
-- endpoints ni des jobs depuis le client. Tout passe par les RPC ci-dessous.
REVOKE ALL ON public.push_subscriptions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.push_delivery_jobs FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
GRANT ALL ON public.push_delivery_jobs TO service_role;

-- ---------------------------------------------------------------------------
-- 3. RPC service_role : enregistrement d'un abonnement
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.push_upsert_subscription(
  p_user_id uuid,
  p_endpoint text,
  p_endpoint_host text,
  p_auth_key text,
  p_p256dh_key text,
  p_opt_in_messages boolean,
  p_opt_in_applications boolean
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_owner uuid;
  v_active integer;
  v_id uuid;
BEGIN
  -- Serialize registrations for this member, including reactivation.
  PERFORM pg_advisory_xact_lock(hashtextextended('push_devices:' || p_user_id::text, 0));
  IF p_user_id IS NULL OR coalesce(p_endpoint, '') = ''
     OR coalesce(p_auth_key, '') = '' OR coalesce(p_p256dh_key, '') = '' THEN
    RAISE EXCEPTION 'push_invalid_input' USING ERRCODE = '22023';
  END IF;

  -- Jamais de transfert silencieux d'un endpoint vers un autre compte.
  SELECT user_id INTO v_owner
  FROM public.push_subscriptions
  WHERE endpoint = p_endpoint;

  IF v_owner IS NOT NULL AND v_owner <> p_user_id THEN
    RAISE EXCEPTION 'push_endpoint_owned_by_other_account' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.push_subscriptions WHERE endpoint = p_endpoint AND enabled) THEN
    SELECT count(*) INTO v_active
    FROM public.push_subscriptions
    WHERE user_id = p_user_id AND enabled;

    IF v_active >= 5 THEN
      RAISE EXCEPTION 'push_max_active_endpoints' USING ERRCODE = '54000';
    END IF;
  END IF;

  INSERT INTO public.push_subscriptions AS s (
    user_id, endpoint, endpoint_host, auth_key, p256dh_key,
    opt_in_messages, opt_in_applications, enabled
  )
  VALUES (
    p_user_id, p_endpoint, p_endpoint_host, p_auth_key, p_p256dh_key,
    coalesce(p_opt_in_messages, false), coalesce(p_opt_in_applications, false), true
  )
  ON CONFLICT (endpoint) DO UPDATE
    SET auth_key = EXCLUDED.auth_key,
        p256dh_key = EXCLUDED.p256dh_key,
        endpoint_host = EXCLUDED.endpoint_host,
        opt_in_messages = EXCLUDED.opt_in_messages,
        opt_in_applications = EXCLUDED.opt_in_applications,
        enabled = true,
        disabled_at = NULL,
        disabled_reason = NULL,
        updated_at = now()
    WHERE s.user_id = EXCLUDED.user_id
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    RAISE EXCEPTION 'push_endpoint_owned_by_other_account' USING ERRCODE = '42501';
  END IF;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.push_upsert_subscription(uuid, text, text, text, text, boolean, boolean)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.push_upsert_subscription(uuid, text, text, text, text, boolean, boolean)
  TO service_role;

-- ---------------------------------------------------------------------------
-- 4. RPC membre : lecture sans endpoint, preferences, suppression
--    Chaque opt-in exige donc une action utilisateur authentifiee.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.push_my_subscriptions()
RETURNS TABLE (
  id uuid,
  endpoint_host text,
  opt_in_messages boolean,
  opt_in_applications boolean,
  enabled boolean,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT s.id, s.endpoint_host, s.opt_in_messages, s.opt_in_applications,
         s.enabled, s.created_at
  FROM public.push_subscriptions s
  WHERE s.user_id = auth.uid()
  ORDER BY s.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.push_my_subscriptions() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.push_my_subscriptions() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.push_set_my_preferences(
  p_subscription_id uuid,
  p_opt_in_messages boolean,
  p_opt_in_applications boolean
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'push_not_authenticated' USING ERRCODE = '42501';
  END IF;

  UPDATE public.push_subscriptions
  SET opt_in_messages = coalesce(p_opt_in_messages, false),
      opt_in_applications = coalesce(p_opt_in_applications, false),
      updated_at = now()
  WHERE id = p_subscription_id AND user_id = v_uid;

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.push_set_my_preferences(uuid, boolean, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.push_set_my_preferences(uuid, boolean, boolean)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.push_delete_my_subscription(p_subscription_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'push_not_authenticated' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.push_subscriptions
  WHERE id = p_subscription_id AND user_id = v_uid;

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.push_delete_my_subscription(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.push_delete_my_subscription(uuid)
  TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5. Enqueue : triggers ADDITIFS, aucun trigger existant remplace
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.push_enqueue_on_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_owner uuid;
  v_sitter uuid;
  v_recipient uuid;
BEGIN
  BEGIN
    -- Evenement autoritaire : message humain, non masque, avec expediteur.
    IF NEW.is_system IS TRUE OR NEW.moderation_hidden_at IS NOT NULL
       OR NEW.sender_id IS NULL THEN
      RETURN NEW;
    END IF;

    SELECT c.owner_id, c.sitter_id INTO v_owner, v_sitter
    FROM public.conversations c
    WHERE c.id = NEW.conversation_id;

    IF v_owner IS NULL OR v_sitter IS NULL THEN
      RETURN NEW;
    END IF;

    -- L'expediteur doit etre participant, le destinataire n'est jamais lui-meme.
    IF NEW.sender_id = v_owner THEN
      v_recipient := v_sitter;
    ELSIF NEW.sender_id = v_sitter THEN
      v_recipient := v_owner;
    ELSE
      RETURN NEW;
    END IF;

    IF v_recipient = NEW.sender_id THEN
      RETURN NEW;
    END IF;

    -- Cooldown 5 minutes par conversation, protege de la concurrence par un
    -- verrou consultatif transactionnel : deux messages simultanes ne peuvent
    -- pas produire deux notifications.
    IF NOT pg_try_advisory_xact_lock(
         hashtextextended('push_msg:' || v_recipient::text || ':' || NEW.conversation_id::text, 0)
       ) THEN
      RETURN NEW;
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.push_delivery_jobs j
      WHERE j.user_id = v_recipient
        AND j.event_kind = 'message'
        AND j.context_id = NEW.conversation_id
        AND j.created_at > now() - interval '5 minutes'
    ) THEN
      RETURN NEW;
    END IF;

    INSERT INTO public.push_delivery_jobs (subscription_id, user_id, event_kind, source_id, context_id)
    SELECT s.id, v_recipient, 'message', NEW.id, NEW.conversation_id
    FROM public.push_subscriptions s
    WHERE s.user_id = v_recipient AND s.enabled AND s.opt_in_messages
    ON CONFLICT (subscription_id, event_kind, source_id) DO NOTHING;

  EXCEPTION WHEN OTHERS THEN
    -- Fail-open strict : un message ne doit jamais echouer a cause du push.
    RAISE WARNING 'push_enqueue_on_message error %', SQLSTATE;
  END;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.push_enqueue_on_message() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_push_enqueue_on_message ON public.messages;
CREATE TRIGGER trg_push_enqueue_on_message
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.push_enqueue_on_message();

CREATE OR REPLACE FUNCTION public.push_enqueue_on_application()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_recipient uuid;
BEGIN
  BEGIN
    IF NEW.status IS DISTINCT FROM 'pending'::application_status THEN
      RETURN NEW;
    END IF;

    SELECT si.user_id INTO v_recipient
    FROM public.sits si
    WHERE si.id = NEW.sit_id;

    IF v_recipient IS NULL OR v_recipient = NEW.sitter_id THEN
      RETURN NEW;
    END IF;

    INSERT INTO public.push_delivery_jobs (subscription_id, user_id, event_kind, source_id, context_id)
    SELECT s.id, v_recipient, 'application', NEW.id, NEW.sit_id
    FROM public.push_subscriptions s
    WHERE s.user_id = v_recipient AND s.enabled AND s.opt_in_applications
    ON CONFLICT (subscription_id, event_kind, source_id) DO NOTHING;

  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'push_enqueue_on_application error %', SQLSTATE;
  END;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.push_enqueue_on_application() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_push_enqueue_on_application ON public.applications;
CREATE TRIGGER trg_push_enqueue_on_application
AFTER INSERT ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.push_enqueue_on_application();

-- Pas de backfill historique : seuls les evenements posterieurs comptent.

-- ---------------------------------------------------------------------------
-- 6. Claim atomique et cloture, service_role uniquement
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.push_job_eligible(p_job_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.push_delivery_jobs j
    JOIN public.push_subscriptions s ON s.id = j.subscription_id AND s.user_id = j.user_id
    WHERE j.id = p_job_id AND s.enabled AND j.expires_at > now()
    AND (j.status='pending' OR (j.status='claimed' AND j.claim_expires_at > now()))
    AND (
      (j.event_kind = 'message' AND s.opt_in_messages AND EXISTS (
        SELECT 1 FROM public.messages m
        JOIN public.conversations c ON c.id = m.conversation_id
        WHERE m.id = j.source_id AND m.read_at IS NULL
          AND m.is_system IS FALSE AND m.moderation_hidden_at IS NULL
          AND m.sender_id IN (c.owner_id, c.sitter_id)
          AND j.user_id IN (c.owner_id, c.sitter_id) AND m.sender_id <> j.user_id
          AND NOT EXISTS (SELECT 1 FROM public.blocked_users b
            WHERE (b.blocker_id=m.sender_id AND b.blocked_id=j.user_id)
               OR (b.blocker_id=j.user_id AND b.blocked_id=m.sender_id))
      ))
      OR (j.event_kind = 'application' AND s.opt_in_applications AND EXISTS (
        SELECT 1 FROM public.applications a JOIN public.sits si ON si.id=a.sit_id
        WHERE a.id=j.source_id AND a.status='pending'::application_status
          AND a.viewed_at IS NULL AND si.user_id=j.user_id AND a.sitter_id<>j.user_id
          AND NOT EXISTS (SELECT 1 FROM public.blocked_users b
            WHERE (b.blocker_id=a.sitter_id AND b.blocked_id=j.user_id)
               OR (b.blocker_id=j.user_id AND b.blocked_id=a.sitter_id))
      ))
    )
  );
$$;
REVOKE ALL ON FUNCTION public.push_job_eligible(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.push_job_eligible(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.push_claim_jobs(p_limit integer DEFAULT 20)
RETURNS TABLE (
  job_id uuid,
  subscription_id uuid,
  event_kind text,
  endpoint text,
  endpoint_host text,
  auth_key text,
  p256dh_key text,
  attempts integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_limit integer := least(greatest(coalesce(p_limit, 20), 1), 20);
BEGIN
  RETURN QUERY
  WITH claimable AS (
    SELECT j.id
    FROM public.push_delivery_jobs j
    WHERE j.status IN ('pending', 'claimed')
      AND j.expires_at > now()
      AND (j.status = 'pending' OR j.claim_expires_at < now())
    ORDER BY j.created_at
    LIMIT v_limit
    FOR UPDATE SKIP LOCKED
  ), claimed AS (
    UPDATE public.push_delivery_jobs j
    SET status = 'claimed',
        claimed_at = now(),
        claim_expires_at = now() + interval '2 minutes',
        attempts = j.attempts + 1,
        updated_at = now()
    FROM claimable c
    WHERE j.id = c.id
    RETURNING j.id, j.subscription_id, j.event_kind, j.user_id, j.attempts,
              j.source_id, j.context_id
  )
  SELECT cl.id, cl.subscription_id, cl.event_kind,
         s.endpoint, s.endpoint_host, s.auth_key, s.p256dh_key, cl.attempts
  FROM claimed cl
  JOIN public.push_subscriptions s ON s.id = cl.subscription_id
  WHERE s.enabled
    -- Verification a l'envoi : le destinataire est toujours le bon et
    -- l'evenement est toujours pertinent.
    AND (
      (cl.event_kind = 'message' AND EXISTS (
        SELECT 1
        FROM public.messages m
        JOIN public.conversations c ON c.id = m.conversation_id
        WHERE m.id = cl.source_id
          AND m.read_at IS NULL
          AND m.is_system IS NOT TRUE
          AND m.moderation_hidden_at IS NULL
          AND m.sender_id <> cl.user_id
          AND cl.user_id IN (c.owner_id, c.sitter_id)
      ))
      OR (cl.event_kind = 'application' AND EXISTS (
        SELECT 1
        FROM public.applications a
        JOIN public.sits si ON si.id = a.sit_id
        WHERE a.id = cl.source_id
          AND a.status = 'pending'::application_status
          AND a.viewed_at IS NULL
          AND si.user_id = cl.user_id
      ))
    );
END;
$$;

REVOKE ALL ON FUNCTION public.push_claim_jobs(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.push_claim_jobs(integer) TO service_role;

CREATE OR REPLACE FUNCTION public.push_close_job(
  p_job_id uuid,
  p_outcome text,
  p_error_code text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF p_outcome NOT IN ('accepted', 'failed', 'retry', 'skipped') THEN
    RAISE EXCEPTION 'push_invalid_outcome' USING ERRCODE = '22023';
  END IF;

  UPDATE public.push_delivery_jobs
  SET status = CASE WHEN p_outcome = 'retry' THEN 'pending' ELSE p_outcome END,
      claim_expires_at = CASE WHEN p_outcome = 'retry' THEN now() ELSE claim_expires_at END,
      last_error_code = p_error_code,
      updated_at = now()
  WHERE id = p_job_id;

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.push_close_job(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.push_close_job(uuid, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.push_disable_subscription(
  p_subscription_id uuid,
  p_reason text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.push_subscriptions
  SET enabled = false,
      disabled_at = now(),
      disabled_reason = left(coalesce(p_reason, 'gone'), 40),
      updated_at = now()
  WHERE id = p_subscription_id;

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.push_disable_subscription(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.push_disable_subscription(uuid, text) TO service_role;

COMMIT;

-- Aucun job pg_cron n'est cree ici. La planification de dispatch-web-push
-- fera l'objet d'une etape ulterieure, sur GO explicite.
