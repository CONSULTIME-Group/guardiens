-- Pays de résidence affiché sur les fiches (audit international, 10/10/2026). Code ISO seul, aucune donnée privée.
CREATE OR REPLACE VIEW public.public_profiles AS
 SELECT id, first_name, city, avatar_url, bio, completed_sits_count, identity_verified, is_founder,
    postal_code, created_at, profile_completion,
    round(latitude::numeric, 2)::double precision AS latitude_approx,
    round(longitude::numeric, 2)::double precision AS longitude_approx,
    available_for_help, skill_categories, custom_skills, role, last_seen_at, departement_code, certifications,
    nullif(upper(trim(country)), '') AS country
   FROM profiles
  WHERE account_status = 'active'::text AND first_name IS NOT NULL;