-- Lot SORT6 (13/11/2026) : l'entraide sollicite les membres vus depuis 30 jours.
-- Décision de l'arène du 11/11/2026 (lot 1 : « arrêt des emails aux membres
-- absents depuis 30 jours »), reprise dans le découpage validé le 12/11/2026.
-- Mesure en base du 12/11/2026 : 799 membres joignables pour l'entraide, 262 vus
-- depuis 30 jours ; sur 335 sollicitations envoyées en 30 jours, 172 sont parties
-- vers un membre absent depuis plus de 30 jours. Sur les 15 besoins ouverts,
-- l'audience médiane passe de 7 à 4 personnes, 12 besoins gardent une audience
-- (14 avant).
-- Deux fonctions, corps repris de pg_get_functiondef en production le 12/11/2026,
-- une seule condition ajoutée dans chacune (repère sort6_membres_presents) :
--   mission_wave_audience_floor   : l'audience des vagues (enqueue_mission_wave,
--                                   detect_missions_without_audience)
--   mission_wave_audience_preview : le nombre annoncé au membre dans le formulaire
-- Mêmes signatures, mêmes droits. Aucune donnée modifiée. mission_audience
-- (projets, 150 km) reste telle quelle.

CREATE OR REPLACE FUNCTION public.mission_wave_audience_floor(p_mission_id uuid, p_floor integer, p_limit integer DEFAULT 10, p_offset integer DEFAULT 0)
 RETURNS TABLE(helper_id uuid, distance_km numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  -- sort6_membres_presents
  WITH m AS (
    SELECT id, user_id, latitude::double precision AS lat, longitude::double precision AS lng
    FROM public.small_missions WHERE id = p_mission_id
  )
  SELECT p.id, round(d.dist::numeric, 2) AS distance_km
  FROM m
  JOIN public.profiles p ON p.id IS DISTINCT FROM m.user_id
  LEFT JOIN public.email_preferences ep ON ep.user_id = p.id
  LEFT JOIN public.suppressed_emails se ON lower(se.email) = lower(p.email)
  CROSS JOIN LATERAL (
    SELECT 6371 * acos(least(1.0, greatest(-1.0,
      cos(radians(m.lat)) * cos(radians(p.latitude::double precision))
      * cos(radians(p.longitude::double precision) - radians(m.lng))
      + sin(radians(m.lat)) * sin(radians(p.latitude::double precision))
    ))) AS dist
  ) d
  WHERE m.lat IS NOT NULL AND m.lng IS NOT NULL
    AND coalesce(p.available_for_help, false)
    AND coalesce(p.account_status, 'active') = 'active'
    AND p.email IS NOT NULL
    AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL
    AND coalesce(ep.new_mission_digest, true) = true
    AND coalesce(ep.product_emails, true) = true
    AND se.email IS NULL
    -- Lot SORT6 : membres vus depuis 30 jours seulement.
    AND p.last_seen_at > now() - interval '30 days'
    AND NOT EXISTS (
      SELECT 1 FROM public.blocked_users b
      WHERE (b.blocker_id = m.user_id AND b.blocked_id = p.id)
         OR (b.blocker_id = p.id AND b.blocked_id = m.user_id)
    )
    -- Lot E20 : 30 km au plus, en toutes circonstances ; le rayon déclaré de
    -- l'aidant (30 sans préférence) peut seulement réduire.
    AND d.dist <= least(coalesce(p_floor, 30), 30)::double precision
    AND d.dist <= public.mutual_aid_radius_km(p.id)::double precision
  ORDER BY d.dist ASC, p.id ASC
  LIMIT greatest(p_limit, 0) OFFSET greatest(p_offset, 0);
$function$;

CREATE OR REPLACE FUNCTION public.mission_wave_audience_preview(p_lat double precision, p_lng double precision)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  -- sort6_membres_presents
  select count(*)::integer
  from public.profiles p
  left join public.email_preferences ep on ep.user_id = p.id
  left join public.suppressed_emails se on lower(se.email) = lower(p.email)
  cross join lateral (
    select 6371 * acos(least(1.0, greatest(-1.0,
      cos(radians(p_lat)) * cos(radians(p.latitude::double precision))
      * cos(radians(p.longitude::double precision) - radians(p_lng))
      + sin(radians(p_lat)) * sin(radians(p.latitude::double precision))
    ))) as dist
  ) d
  where p_lat is not null and p_lng is not null
    and p.id is distinct from auth.uid()
    and coalesce(p.available_for_help, false)
    and coalesce(p.account_status, 'active') = 'active'
    and p.email is not null
    and p.latitude is not null and p.longitude is not null
    and coalesce(ep.new_mission_digest, true) = true
    and coalesce(ep.product_emails, true) = true
    and se.email is null
    -- Lot SORT6 : même règle que le moteur de vagues.
    and p.last_seen_at > now() - interval '30 days'
    and not exists (
      select 1 from public.blocked_users b
      where (b.blocker_id = p.id and b.blocked_id = auth.uid())
         or (b.blocker_id = auth.uid() and b.blocked_id = p.id)
    )
    -- Lot E20 : même plafond que le moteur de vagues.
    and d.dist <= least(public.mutual_aid_radius_km(p.id), 30);
$function$;

REVOKE ALL ON FUNCTION public.mission_wave_audience_floor(uuid, integer, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mission_wave_audience_floor(uuid, integer, integer, integer) TO service_role;
REVOKE ALL ON FUNCTION public.mission_wave_audience_preview(double precision, double precision) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mission_wave_audience_preview(double precision, double precision) TO authenticated, service_role;
