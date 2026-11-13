-- Lot SORT4 (13/11/2026) : alerte « nouvelle sortie », derrière le drapeau
-- sorties_alertes créé éteint. Décisions de Jérémie des 11 et 12/11/2026 :
-- alerte active par défaut ; distance au choix du membre entre « Mon quartier »
-- (même code postal), 5 km et 15 km, 15 km par défaut ; arrêt en un clic des
-- seules alertes sorties ; un envoi à la publication ; membres vus depuis
-- 30 jours ; au plus une alerte sortie par semaine et par membre.
--   outing_alert_preferences : le réglage du membre (sans ligne : actif, 15 km)
--   outing_alert_log         : une ligne par alerte posée, budget hebdomadaire
-- S'applique après 0147. send-transactional-email doit connaître le gabarit
-- outing-alert avant que le drapeau s'allume. Repère : sort4_alertes_sorties.

CREATE TABLE IF NOT EXISTS public.outing_alert_preferences (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  radius text NOT NULL DEFAULT '15',
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT outing_alert_preferences_radius CHECK (radius IN ('quartier', '5', '15'))
);

CREATE TABLE IF NOT EXISTS public.outing_alert_log (
  outing_id uuid NOT NULL REFERENCES public.outings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (outing_id, user_id)
);
CREATE INDEX IF NOT EXISTS outing_alert_log_user_idx ON public.outing_alert_log (user_id, created_at DESC);

ALTER TABLE public.outing_alert_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outing_alert_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS outing_alert_preferences_own_select ON public.outing_alert_preferences;
CREATE POLICY outing_alert_preferences_own_select ON public.outing_alert_preferences
  FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS outing_alert_preferences_own_insert ON public.outing_alert_preferences;
CREATE POLICY outing_alert_preferences_own_insert ON public.outing_alert_preferences
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS outing_alert_preferences_own_update ON public.outing_alert_preferences;
CREATE POLICY outing_alert_preferences_own_update ON public.outing_alert_preferences
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

REVOKE ALL ON public.outing_alert_preferences FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON public.outing_alert_preferences TO authenticated;
GRANT ALL ON public.outing_alert_preferences TO service_role;
REVOKE ALL ON public.outing_alert_log FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.outing_alert_log TO service_role;

INSERT INTO public.feature_flags (key, enabled, description)
VALUES ('sorties_alertes', false, 'Alerte « nouvelle sortie » à la publication : 15 km par défaut, une par semaine et par membre (lot SORT4)')
ON CONFLICT (key) DO NOTHING;

-- Distance à vol d'oiseau en kilomètres, sans dépendance.
CREATE OR REPLACE FUNCTION public.outing_distance_km(lat1 numeric, lng1 numeric, lat2 numeric, lng2 numeric) RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $fn$
  -- sort4_alertes_sorties
  SELECT (6371 * 2 * asin(sqrt(
    power(sin(radians((lat2 - lat1)::double precision) / 2), 2)
    + cos(radians(lat1::double precision)) * cos(radians(lat2::double precision))
      * power(sin(radians((lng2 - lng1)::double precision) / 2), 2))))::numeric;
$fn$;

-- Membres à prévenir pour une sortie, les plus proches d'abord.
CREATE OR REPLACE FUNCTION public.outing_alert_recipients(p_outing uuid, p_now timestamptz DEFAULT now())
RETURNS TABLE (user_id uuid, distance_km numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  -- sort4_alertes_sorties
  SELECT p.id,
         CASE WHEN o.latitude IS NOT NULL AND p.latitude IS NOT NULL
              THEN round(public.outing_distance_km(o.latitude, o.longitude, p.latitude::numeric, p.longitude::numeric), 1) END AS distance_km
  FROM public.outings o
  JOIN public.profiles p ON p.id <> o.organizer_id
  LEFT JOIN public.outing_alert_preferences pref ON pref.user_id = p.id
  WHERE o.id = p_outing
    AND o.status = 'open' AND o.hidden_at IS NULL
    AND o.place_kind <> 'online'
    AND o.starts_at > p_now
    AND COALESCE(p.account_status, 'active') = 'active'
    AND p.last_seen_at > p_now - interval '30 days'
    AND COALESCE(pref.enabled, true)
    AND (
      -- Mon quartier, ou position inconnue d'un côté : même code postal.
      (o.postal_code <> '' AND p.postal_code = o.postal_code)
      OR (
        COALESCE(pref.radius, '15') <> 'quartier'
        AND o.latitude IS NOT NULL AND p.latitude IS NOT NULL
        AND public.outing_distance_km(o.latitude, o.longitude, p.latitude::numeric, p.longitude::numeric)
            <= CASE COALESCE(pref.radius, '15') WHEN '5' THEN 5 ELSE 15 END
      )
    )
    -- Une alerte sortie par semaine et par membre.
    AND NOT EXISTS (SELECT 1 FROM public.outing_alert_log l
                    WHERE l.user_id = p.id AND l.created_at > p_now - interval '7 days')
    AND NOT EXISTS (SELECT 1 FROM public.outing_attendees a
                    WHERE a.outing_id = o.id AND a.user_id = p.id)
  ORDER BY distance_km NULLS FIRST, p.id
  LIMIT 300;
$fn$;

-- Pose les alertes d'une sortie en file. Rend le nombre de membres prévenus.
CREATE OR REPLACE FUNCTION public.outing_alert_enqueue(p_outing uuid) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
-- sort4_alertes_sorties
DECLARE
  v_outing public.outings%ROWTYPE;
  v_organizer text;
  v_left integer;
  v_rec record;
  v_email text;
  v_count integer := 0;
BEGIN
  IF NOT COALESCE((SELECT enabled FROM public.feature_flags WHERE key = 'sorties_alertes'), false) THEN
    RETURN 0;
  END IF;
  SELECT * INTO v_outing FROM public.outings WHERE id = p_outing;
  IF NOT FOUND THEN RETURN 0; END IF;
  v_left := v_outing.capacity - v_outing.reserved
    - (SELECT count(*) FROM public.outing_attendees a WHERE a.outing_id = p_outing AND a.status = 'going');
  IF v_left <= 0 THEN RETURN 0; END IF;
  SELECT NULLIF(btrim(first_name), '') INTO v_organizer FROM public.profiles WHERE id = v_outing.organizer_id;

  FOR v_rec IN SELECT r.user_id, r.distance_km FROM public.outing_alert_recipients(p_outing) r LOOP
    SELECT u.email INTO v_email FROM auth.users u WHERE u.id = v_rec.user_id;
    CONTINUE WHEN v_email IS NULL OR v_email = '';
    INSERT INTO public.outing_alert_log (outing_id, user_id) VALUES (p_outing, v_rec.user_id)
    ON CONFLICT DO NOTHING;
    CONTINUE WHEN NOT FOUND;
    INSERT INTO public.email_deferred_queue
      (template_name, recipient_email, template_data, idempotency_key, defer_reason, scheduled_for)
    VALUES (
      'outing-alert', v_email,
      jsonb_build_object(
        'title', v_outing.title,
        'organizerFirstName', v_organizer,
        'whenLabel', public.outing_when_label(v_outing.starts_at),
        'placeLabel', COALESCE(NULLIF(btrim(v_outing.place_label), ''), v_outing.city),
        'placesLeft', v_left,
        'capacity', v_outing.capacity,
        'participationEur', v_outing.participation_eur,
        'near', v_rec.distance_km IS NULL OR v_rec.distance_km <= 2,
        'link', 'https://guardiens.fr/sorties/' || v_outing.slug || '?via=alerte'),
      'outing-alert-' || p_outing::text || '-' || v_rec.user_id::text, 'outing_alert', now());
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END
$fn$;

CREATE OR REPLACE FUNCTION public.outing_alert_on_publish() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
-- sort4_alertes_sorties
BEGIN
  BEGIN
    PERFORM public.outing_alert_enqueue(NEW.id);
  EXCEPTION WHEN OTHERS THEN
    NULL; -- l'alerte ne bloque jamais une publication
  END;
  RETURN NEW;
END
$fn$;

DROP TRIGGER IF EXISTS trg_outing_alert_on_publish ON public.outings;
CREATE TRIGGER trg_outing_alert_on_publish
  AFTER INSERT ON public.outings
  FOR EACH ROW EXECUTE FUNCTION public.outing_alert_on_publish();

-- Réglage du membre connecté (sans ligne : actif, 15 km).
CREATE OR REPLACE FUNCTION public.my_outing_alert_preference() RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  -- sort4_alertes_sorties
  SELECT jsonb_build_object(
    'enabled', COALESCE((SELECT enabled FROM public.outing_alert_preferences WHERE user_id = auth.uid()), true),
    'radius', COALESCE((SELECT radius FROM public.outing_alert_preferences WHERE user_id = auth.uid()), '15'));
$fn$;

CREATE OR REPLACE FUNCTION public.set_my_outing_alert_preference(p_enabled boolean, p_radius text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
-- sort4_alertes_sorties
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'auth');
  END IF;
  IF p_radius NOT IN ('quartier', '5', '15') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'radius');
  END IF;
  INSERT INTO public.outing_alert_preferences (user_id, enabled, radius, updated_at)
  VALUES (auth.uid(), COALESCE(p_enabled, true), p_radius, now())
  ON CONFLICT (user_id) DO UPDATE SET enabled = EXCLUDED.enabled, radius = EXCLUDED.radius, updated_at = now();
  RETURN jsonb_build_object('ok', true);
END
$fn$;

-- Arrêt ou reprise par le lien de l'email, sans connexion : le jeton de
-- désinscription du destinataire désigne le membre. Seules les alertes sorties
-- changent, les autres emails restent tels quels.
CREATE OR REPLACE FUNCTION public.outing_alerts_set_by_token(p_token text, p_enabled boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
-- sort4_alertes_sorties
DECLARE
  v_user uuid;
BEGIN
  IF p_token IS NULL OR length(p_token) < 32 THEN
    RETURN jsonb_build_object('ok', false);
  END IF;
  SELECT p.id INTO v_user
  FROM public.email_unsubscribe_tokens t
  JOIN public.profiles p ON lower(p.email) = lower(t.email)
  WHERE t.token = p_token
  LIMIT 1;
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('ok', false);
  END IF;
  INSERT INTO public.outing_alert_preferences (user_id, enabled, updated_at)
  VALUES (v_user, COALESCE(p_enabled, false), now())
  ON CONFLICT (user_id) DO UPDATE SET enabled = EXCLUDED.enabled, updated_at = now();
  RETURN jsonb_build_object('ok', true, 'enabled', COALESCE(p_enabled, false));
END
$fn$;

REVOKE ALL ON FUNCTION public.outing_alert_recipients(uuid, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.outing_alert_enqueue(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.outing_alert_on_publish() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.outing_alert_recipients(uuid, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.outing_alert_enqueue(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.my_outing_alert_preference() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_my_outing_alert_preference(boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_outing_alert_preference() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_my_outing_alert_preference(boolean, text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.outing_alerts_set_by_token(text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.outing_alerts_set_by_token(text, boolean) TO anon, authenticated, service_role;
