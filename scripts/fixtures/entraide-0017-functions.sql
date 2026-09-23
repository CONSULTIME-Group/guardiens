-- Copie de lecture du lot E5 (migration 0017), partie rejouable hors production.
-- Contient les deux fonctions redéfinies : le déclencheur de mise en file
-- historique, qui laisse désormais les besoins au moteur de vagues, et le
-- compteur d'audience du formulaire, aligné sur mission_wave_audience.

CREATE OR REPLACE FUNCTION public.enqueue_helpers_for_new_mission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  if new.status <> 'open' or new.latitude is null or new.longitude is null then
    return new;
  end if;

  -- Diffusion unique : un besoin est diffusé par vagues de dix personnes
  -- (notify-mission-wave). Seules les offres passent encore par la file.
  if new.mission_type = 'besoin' then
    return new;
  end if;

  insert into public.mission_notification_queue (helper_id, mission_id, distance_km)
  select a.helper_id, new.id, a.distance_km
  from public.mission_audience(
         new.latitude::double precision,
         new.longitude::double precision,
         new.category::text,
         new.user_id
       ) a
  on conflict (helper_id, mission_id) do nothing;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.mission_wave_audience_preview(
  p_lat double precision,
  p_lng double precision
)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    and not exists (
      select 1 from public.blocked_users b
      where (b.blocker_id = p.id and b.blocked_id = auth.uid())
         or (b.blocker_id = auth.uid() and b.blocked_id = p.id)
    )
    and d.dist <= public.mutual_aid_radius_km(p.id);
$function$;
