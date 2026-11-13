-- Lot SORT8 (13/11/2026) : l'alerte « nouvelle sortie » prévient tous les membres
-- actifs du rayon, vus récemment ou pas. Décision de Jérémie du 13/11/2026 :
-- « ce n'est pas une règle d'envoyer qu'aux actifs », un envoi sert aussi à faire
-- revenir les absents. La condition « vus depuis 30 jours » de 0148 est retirée,
-- le reste est inchangé : réglage du membre, même code postal ou distance,
-- 300 destinataires au plus, une alerte sortie par semaine et par membre.
-- Mesure du 13/11/2026 sur une sortie d'essai à Lyon 5e : 26 destinataires avec
-- la condition, 110 membres à 15 km sans elle. Aucune donnée modifiée.
-- S'applique après 0148. Repère : sort8_alerte_tous_les_membres.

CREATE OR REPLACE FUNCTION public.outing_alert_recipients(p_outing uuid, p_now timestamptz DEFAULT now())
RETURNS TABLE (user_id uuid, distance_km numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  -- sort8_alerte_tous_les_membres
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

REVOKE ALL ON FUNCTION public.outing_alert_recipients(uuid, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.outing_alert_recipients(uuid, timestamptz) TO service_role;
