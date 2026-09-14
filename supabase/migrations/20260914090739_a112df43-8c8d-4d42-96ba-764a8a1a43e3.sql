alter table public.small_missions
  add column if not exists max_participants integer default 6,
  add column if not exists accepting_applications boolean not null default true,
  add column if not exists hebergement text,
  add column if not exists repas boolean not null default false,
  add column if not exists ce_que_vous_apprendrez text,
  add column if not exists declarations jsonb;

CREATE OR REPLACE FUNCTION public.validate_small_mission()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_texte text;
BEGIN
  IF NEW.duration_estimate IS NOT NULL AND NEW.duration_estimate NOT IN ('1-2h', 'half_day', 'several', 'weekend', 'day', 'few_days', 'week', 'two_weeks', 'month_plus') THEN
    RAISE EXCEPTION 'Invalid duration_estimate: %. Allowed values: 1-2h, half_day, several, weekend, day, few_days, week, two_weeks, month_plus', NEW.duration_estimate;
  END IF;

  IF TG_OP = 'INSERT' AND NEW.date_needed IS NOT NULL AND NEW.date_needed < CURRENT_DATE THEN
    RAISE EXCEPTION 'date_needed cannot be in the past';
  END IF;

  IF NEW.title IS NOT NULL THEN NEW.title := public.strip_emojis(NEW.title); END IF;
  IF NEW.description IS NOT NULL THEN NEW.description := public.strip_emojis(NEW.description); END IF;
  IF NEW.exchange_offer IS NOT NULL THEN NEW.exchange_offer := public.strip_emojis(NEW.exchange_offer); END IF;

  -- Regle fondatrice, sur les TROIS champs : un service contre un service.
  v_texte := coalesce(NEW.title,'') || ' ' || coalesce(NEW.description,'') || ' ' || coalesce(NEW.exchange_offer,'');
  IF public.mutual_aid_money_mention(v_texte) THEN
    RAISE EXCEPTION 'money_in_mutual_aid'
      USING HINT = 'money_in_mutual_aid',
            MESSAGE = 'Ici on s''echange des services, jamais de l''argent. Proposez plutot ce que vous offrez en retour : un cafe, des oeufs du jardin, un coup de main quand vous pourrez.';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.mission_category_to_skill(p_cat text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  select case p_cat
    when 'animals'   then 'animaux'
    when 'garden'    then 'jardin'
    when 'skills'    then 'competences'
    when 'projet'    then 'competences'
    when 'house'     then 'coups_de_main'
    when 'errand'    then 'coups_de_main'
    when 'transport' then 'coups_de_main'
    else null
  end;
$function$;

CREATE OR REPLACE FUNCTION public.mission_audience(p_lat double precision, p_lng double precision, p_category text, p_exclude uuid DEFAULT NULL::uuid)
 RETURNS TABLE(helper_id uuid, distance_km numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with cible as (
    select p.id,
           round(d.dist::numeric, 2) as dist,
           (public.mission_category_to_skill(p_category) is null
            or coalesce(array_length(p.skill_categories, 1), 0) = 0
            or p.skill_categories @> array[public.mission_category_to_skill(p_category)]) as ok_skill
    from public.profiles p
    left join public.owner_profiles op on op.user_id = p.id
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
      and p.id is distinct from p_exclude
      and (coalesce(p.available_for_help, false) or coalesce(op.competences_disponible, false))
      and p.email is not null
      and p.latitude is not null and p.longitude is not null
      and coalesce(ep.new_mission_digest, true) = true
      and coalesce(ep.product_emails, true) = true
      and se.email is null
      and d.dist <= case
        when p_category = 'projet' then public.mutual_aid_radius_km(p.id, 150, 150)
        else public.mutual_aid_radius_km(p.id)
      end
  ),
  compte as (select count(*) filter (where ok_skill) as n_skill from cible)
  select c.id, c.dist from cible c, compte
  where compte.n_skill >= 8 and c.ok_skill or compte.n_skill < 8;
$function$;

CREATE OR REPLACE FUNCTION public.trg_indexnow_small_missions()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'open'::small_mission_status AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    IF NEW.category::text = 'projet' THEN
      PERFORM public.trigger_indexnow_push('/projets/' || coalesce(NEW.slug, NEW.id::text), 'auto-projet');
    ELSE
      PERFORM public.trigger_indexnow_push('/petites-missions/' || NEW.id::text, 'auto-mission');
    END IF;
  END IF;
  RETURN NEW;
END; $function$;

create or replace view public.public_small_missions as
  SELECT id,
    user_id,
    slug,
    title,
    description,
    category,
    exchange_offer,
    city,
    postal_code,
    round(latitude, 2) AS latitude,
    round(longitude, 2) AS longitude,
    date_needed,
    end_date,
    duration_estimate,
    status,
    mission_type,
    photos,
    pet_species,
    pet_size,
    created_at,
    max_participants,
    accepting_applications,
    hebergement,
    repas,
    ce_que_vous_apprendrez
   FROM small_missions
  WHERE status = 'open'::small_mission_status AND moderation_hidden_at IS NULL AND hidden_at IS NULL;

grant select on public.public_small_missions to anon;
grant select on public.public_small_missions to authenticated;