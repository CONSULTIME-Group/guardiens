-- Restrict precise GPS coordinates from anonymous visitors via column-level privileges.
-- RLS row policies are unchanged; only the set of columns anon can SELECT is narrowed.

-- small_missions: revoke broad SELECT, re-grant all columns except latitude/longitude
REVOKE SELECT ON public.small_missions FROM anon;
GRANT SELECT (
  id, user_id, title, description, category, exchange_offer,
  city, postal_code, date_needed, duration_estimate, status,
  created_at, updated_at, photos, mission_type, view_count
) ON public.small_missions TO anon;

-- pro_profiles: revoke broad SELECT, re-grant all columns except latitude/longitude
REVOKE SELECT ON public.pro_profiles FROM anon;
GRANT SELECT (
  id, user_id, slug, raison_sociale, siret, siret_verified, category,
  sub_categories, logo_url, cover_url, description, diplomes, ordre_number,
  city, postal_code, zone_radius_km, zone_cities, phone, website,
  email_contact, social_links, horaires, urgences_24_7,
  tarif_min, tarif_max, tarif_note, status, rejection_reason,
  approved_at, approved_by, created_at, updated_at
) ON public.pro_profiles TO anon;