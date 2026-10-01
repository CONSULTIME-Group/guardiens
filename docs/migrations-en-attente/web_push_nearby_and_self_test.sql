-- ============================================================================
-- Lot notifications Android : annonces proches + test membre.
-- PRÉPARÉ, NON APPLIQUÉ. Application seulement sur GO explicite de Jérémie.
-- Strictement additif : aucun DROP, aucune ligne existante modifiée, aucun
-- consentement changé (opt_in_nearby_sits vaut false pour tous les appareils
-- existants), aucun backfill : seules les notifications insérées APRÈS
-- l'application peuvent produire un push.
-- Les fonctions existantes (messages, candidatures, push_claim_test) ne sont
-- pas redéfinies : leur comportement reste identique.
-- Marche arrière en fin de fichier (désactivation, sans suppression).
-- ============================================================================

BEGIN;

-- 1. Préférence appareil distincte, false par défaut ---------------------------
ALTER TABLE public.push_subscriptions
  ADD COLUMN IF NOT EXISTS opt_in_nearby_sits boolean NOT NULL DEFAULT false;

-- 2. File dédiée aux annonces proches ----------------------------------------
-- Séparée de push_delivery_jobs pour ne pas toucher sa contrainte event_kind.
CREATE TABLE IF NOT EXISTS public.push_nearby_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.push_subscriptions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  sit_id uuid NOT NULL,
  notification_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'claimed', 'accepted', 'failed', 'skipped')),
  attempts integer NOT NULL DEFAULT 0,
  available_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz,
  claim_expires_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '6 hours',
  last_error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- Déduplication appareil + annonce, y compris après republication.
  CONSTRAINT push_nearby_jobs_unique UNIQUE (subscription_id, sit_id)
);
CREATE INDEX IF NOT EXISTS push_nearby_jobs_claimable_idx
  ON public.push_nearby_jobs (created_at) WHERE status IN ('pending', 'claimed');
CREATE INDEX IF NOT EXISTS push_nearby_jobs_user_cap_idx
  ON public.push_nearby_jobs (user_id, created_at DESC);
COMMENT ON TABLE public.push_nearby_jobs IS
  'File push annonces proches. Aucun titre, nom, ville ni coordonnée : identifiants techniques uniquement. Lignes conservées 7 jours pour le plafond et la déduplication par annonce.';

GRANT ALL ON public.push_nearby_jobs TO service_role;
REVOKE ALL ON public.push_nearby_jobs FROM PUBLIC, anon, authenticated;
ALTER TABLE public.push_nearby_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_nearby_jobs FORCE ROW LEVEL SECURITY;

-- 3. Règle d'éligibilité unique, utilisée à l'entrée en file et à l'envoi -----
-- « Près de moi » : distance entre coordonnées de profil réelles des deux
-- côtés (aucune coordonnée inventée ni ville géocodée par défaut), comparée
-- au rayon canonique effective_search_radius du gardien.
CREATE OR REPLACE FUNCTION public.push_nearby_target_ok(p_user_id uuid, p_sit_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.sits si
    JOIN public.profiles owner ON owner.id = si.user_id
    JOIN public.profiles me ON me.id = p_user_id
    LEFT JOIN public.sitter_profiles sp ON sp.user_id = p_user_id
    WHERE si.id = p_sit_id
      AND si.status = 'published'::sit_status
      AND si.moderation_hidden_at IS NULL
      AND si.end_date >= current_date
      AND si.user_id <> p_user_id
      AND coalesce(me.account_status, 'active') = 'active'
      AND me.suspended_at IS NULL
      AND owner.latitude IS NOT NULL AND owner.longitude IS NOT NULL
      AND me.latitude IS NOT NULL AND me.longitude IS NOT NULL
      AND public.haversine_km(me.latitude, me.longitude, owner.latitude, owner.longitude)
          <= public.effective_search_radius(sp.geographic_radius)
      AND NOT EXISTS (
        SELECT 1 FROM public.blocked_users b
        WHERE (b.blocker_id = si.user_id AND b.blocked_id = p_user_id)
           OR (b.blocker_id = p_user_id AND b.blocked_id = si.user_id)
      )
  );
$$;
REVOKE ALL ON FUNCTION public.push_nearby_target_ok(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.push_nearby_target_ok(uuid, uuid) TO service_role;

-- 4. Entrée en file : trigger ADDITIF sur les notifications new_sit_nearby ----
-- Réutilise l'attribution existante, sans changer distribution, email ni
-- affinité. Plafond 3 annonces par membre sur 24 h, sous verrou bloquant.
CREATE OR REPLACE FUNCTION public.push_enqueue_on_nearby_notification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_sit uuid;
  v_recent integer;
BEGIN
  BEGIN
    IF NEW.type IS DISTINCT FROM 'new_sit_nearby' OR NEW.read_at IS NOT NULL
       OR NEW.link IS NULL
       OR NEW.link !~ '^/sits/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      RETURN NEW;
    END IF;
    v_sit := substr(NEW.link, 7)::uuid;

    IF NOT EXISTS (SELECT 1 FROM public.push_subscriptions s
                   WHERE s.user_id = NEW.user_id AND s.enabled AND s.opt_in_nearby_sits) THEN
      RETURN NEW;
    END IF;
    IF NOT public.push_nearby_target_ok(NEW.user_id, v_sit) THEN
      RETURN NEW;
    END IF;

    -- Réservation atomique du plafond : deux annonces simultanées pour le
    -- même membre sont sérialisées, le quota ne peut pas être dépassé.
    PERFORM pg_advisory_xact_lock(hashtextextended('push_nearby:' || NEW.user_id::text, 0));
    IF EXISTS (SELECT 1 FROM public.push_nearby_jobs j
               WHERE j.user_id = NEW.user_id AND j.sit_id = v_sit) THEN
      RETURN NEW;
    END IF;
    SELECT count(DISTINCT j.sit_id) INTO v_recent
    FROM public.push_nearby_jobs j
    WHERE j.user_id = NEW.user_id AND j.created_at > now() - interval '24 hours';
    IF v_recent >= 3 THEN
      RETURN NEW;
    END IF;

    INSERT INTO public.push_nearby_jobs (subscription_id, user_id, sit_id, notification_id)
    SELECT s.id, NEW.user_id, v_sit, NEW.id
    FROM public.push_subscriptions s
    WHERE s.user_id = NEW.user_id AND s.enabled AND s.opt_in_nearby_sits
    ON CONFLICT (subscription_id, sit_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- Une notification ne doit jamais échouer à cause du push.
    RAISE WARNING 'push_enqueue_on_nearby_notification error %', SQLSTATE;
  END;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.push_enqueue_on_nearby_notification() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_push_enqueue_on_nearby_notification
AFTER INSERT ON public.notifications
FOR EACH ROW WHEN (NEW.type = 'new_sit_nearby')
EXECUTE FUNCTION public.push_enqueue_on_nearby_notification();

-- 5. Éligibilité au moment de l'envoi --------------------------------------
CREATE OR REPLACE FUNCTION public.push_nearby_job_eligible(p_job_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.push_nearby_jobs j
    JOIN public.push_subscriptions s ON s.id = j.subscription_id AND s.user_id = j.user_id
    JOIN public.notifications n ON n.id = j.notification_id AND n.user_id = j.user_id
    WHERE j.id = p_job_id AND s.enabled AND s.opt_in_nearby_sits
      AND j.expires_at > now()
      AND (j.status = 'pending' OR (j.status = 'claimed' AND j.claim_expires_at > now()))
      AND n.read_at IS NULL
      AND public.push_nearby_target_ok(j.user_id, j.sit_id)
  );
$$;
REVOKE ALL ON FUNCTION public.push_nearby_job_eligible(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.push_nearby_job_eligible(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.push_claim_nearby_jobs(p_limit integer DEFAULT 20)
RETURNS TABLE (job_id uuid, subscription_id uuid, sit_id uuid, endpoint text,
               endpoint_host text, auth_key text, p256dh_key text, attempts integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_limit integer := least(greatest(coalesce(p_limit, 20), 1), 20);
BEGIN
  -- Même reprise bornée que la file existante : un claim expiré n'est jamais rejoué.
  UPDATE public.push_nearby_jobs j SET status = 'failed', last_error_code = 'claim_ambiguous', updated_at = now()
    WHERE j.status = 'claimed' AND j.claim_expires_at < now();
  UPDATE public.push_nearby_jobs j SET status = 'skipped', last_error_code = 'expired_or_irrelevant', updated_at = now()
    WHERE j.status = 'pending' AND (j.expires_at <= now() OR NOT public.push_nearby_job_eligible(j.id));
  RETURN QUERY
  WITH claimable AS (
    SELECT j.id FROM public.push_nearby_jobs j
    WHERE j.status = 'pending' AND j.expires_at > now() AND j.available_at <= now()
      AND j.attempts < 3 AND public.push_nearby_job_eligible(j.id)
    ORDER BY j.created_at LIMIT v_limit FOR UPDATE SKIP LOCKED
  ), claimed AS (
    UPDATE public.push_nearby_jobs j
    SET status = 'claimed', claimed_at = now(), claim_expires_at = now() + interval '2 minutes',
        attempts = j.attempts + 1, updated_at = now()
    FROM claimable c WHERE j.id = c.id
    RETURNING j.id, j.subscription_id, j.sit_id, j.attempts
  )
  SELECT cl.id, cl.subscription_id, cl.sit_id, s.endpoint, s.endpoint_host, s.auth_key, s.p256dh_key, cl.attempts
  FROM claimed cl JOIN public.push_subscriptions s ON s.id = cl.subscription_id
  WHERE s.enabled;
END;
$$;
REVOKE ALL ON FUNCTION public.push_claim_nearby_jobs(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.push_claim_nearby_jobs(integer) TO service_role;

CREATE OR REPLACE FUNCTION public.push_close_nearby_job(p_job_id uuid, p_outcome text, p_error_code text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF p_outcome NOT IN ('accepted', 'failed', 'retry', 'skipped') THEN
    RAISE EXCEPTION 'push_invalid_outcome' USING ERRCODE = '22023';
  END IF;
  UPDATE public.push_nearby_jobs
  SET status = CASE WHEN p_outcome = 'retry' AND attempts < 3 AND expires_at > now() THEN 'pending'
                    WHEN p_outcome = 'retry' THEN 'failed' ELSE p_outcome END,
      available_at = CASE WHEN p_outcome = 'retry' THEN now() + interval '1 minute' * greatest(attempts, 1) ELSE available_at END,
      claim_expires_at = CASE WHEN p_outcome = 'retry' THEN now() ELSE claim_expires_at END,
      last_error_code = p_error_code, updated_at = now()
  WHERE id = p_job_id AND status = 'claimed';
  RETURN FOUND;
END;
$$;
REVOKE ALL ON FUNCTION public.push_close_nearby_job(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.push_close_nearby_job(uuid, text, text) TO service_role;

-- 6. RPC membre : lecture et préférence annonces proches ----------------------
-- Nouvelle fonction de lecture : push_my_subscriptions reste inchangée.
CREATE OR REPLACE FUNCTION public.push_my_subscriptions_v2()
RETURNS TABLE (id uuid, opt_in_messages boolean, opt_in_applications boolean,
               opt_in_nearby_sits boolean, enabled boolean, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT s.id, s.opt_in_messages, s.opt_in_applications, s.opt_in_nearby_sits, s.enabled, s.created_at
  FROM public.push_subscriptions s WHERE s.user_id = auth.uid() ORDER BY s.created_at DESC;
$$;
REVOKE ALL ON FUNCTION public.push_my_subscriptions_v2() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.push_my_subscriptions_v2() TO authenticated, service_role;

-- Activation volontaire uniquement : appelée par une action authentifiée.
CREATE OR REPLACE FUNCTION public.push_set_my_nearby_preference(p_subscription_id uuid, p_opt_in boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'push_not_authenticated' USING ERRCODE = '42501'; END IF;
  UPDATE public.push_subscriptions SET opt_in_nearby_sits = (p_opt_in IS TRUE), updated_at = now()
  WHERE id = p_subscription_id AND user_id = v_uid;
  RETURN FOUND;
END;
$$;
REVOKE ALL ON FUNCTION public.push_set_my_nearby_preference(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.push_set_my_nearby_preference(uuid, boolean) TO authenticated, service_role;

-- 7. Test lancé par le membre : réservation atomique, même journal --------------
-- Partage push_test_attempts avec le test opérateur : 1 test / 5 min / compte.
-- N'exige aucune préférence : seulement un appareil actif du membre.
CREATE OR REPLACE FUNCTION public.push_claim_self_test(p_request_id uuid, p_user_id uuid, p_subscription_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF p_request_id IS NULL OR p_user_id IS NULL OR p_subscription_id IS NULL THEN RETURN false; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('push-test:' || p_user_id::text, 0));
  IF EXISTS (SELECT 1 FROM push_test_attempts WHERE request_id = p_request_id)
     OR EXISTS (SELECT 1 FROM push_test_attempts WHERE user_id = p_user_id
                AND created_at > clock_timestamp() - interval '5 minutes') THEN
    RETURN false;
  END IF;
  PERFORM 1 FROM push_subscriptions WHERE id = p_subscription_id AND user_id = p_user_id AND enabled FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  INSERT INTO push_test_attempts(request_id, user_id, subscription_id)
    VALUES (p_request_id, p_user_id, p_subscription_id) ON CONFLICT DO NOTHING;
  RETURN FOUND;
END;
$$;
REVOKE ALL ON FUNCTION public.push_claim_self_test(uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.push_claim_self_test(uuid, uuid, uuid) TO service_role;

COMMIT;

-- ============================================================================
-- MARCHE ARRIÈRE (sans DROP ni DELETE) :
--   ALTER TABLE public.notifications DISABLE TRIGGER trg_push_enqueue_on_nearby_notification;
--   UPDATE public.push_nearby_jobs SET status = 'skipped', last_error_code = 'rollback'
--     WHERE status IN ('pending', 'claimed');
--   COMMENT ON TABLE public.push_nearby_jobs IS 'DEPRECATED: lot annonces proches désactivé';
--   COMMENT ON COLUMN public.push_subscriptions.opt_in_nearby_sits IS 'DEPRECATED';
-- puis redéployer les fonctions dispatch-web-push et push-subscription précédentes
-- et ne plus déployer push-self-test.
-- ============================================================================
