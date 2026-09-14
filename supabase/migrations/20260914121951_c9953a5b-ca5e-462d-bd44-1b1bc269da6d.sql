alter table public.profiles
  add column if not exists certifications text[] default '{}'::text[];

create or replace view public.public_profiles as
 SELECT id,
    first_name,
    city,
    avatar_url,
    bio,
    completed_sits_count,
    identity_verified,
    is_founder,
    postal_code,
    created_at,
    profile_completion,
    round(latitude::numeric, 2)::double precision AS latitude_approx,
    round(longitude::numeric, 2)::double precision AS longitude_approx,
    available_for_help,
    skill_categories,
    custom_skills,
    role,
    last_seen_at,
    departement_code,
    certifications
   FROM profiles
  WHERE account_status = 'active'::text AND first_name IS NOT NULL;

grant select on public.public_profiles to anon;
grant select on public.public_profiles to authenticated;