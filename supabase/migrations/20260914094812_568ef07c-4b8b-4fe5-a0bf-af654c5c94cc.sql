alter table public.small_missions add column if not exists nature_projet text;

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
    ce_que_vous_apprendrez,
    nature_projet
   FROM small_missions
  WHERE status = 'open'::small_mission_status AND moderation_hidden_at IS NULL AND hidden_at IS NULL;

grant select on public.public_small_missions to anon;
grant select on public.public_small_missions to authenticated;