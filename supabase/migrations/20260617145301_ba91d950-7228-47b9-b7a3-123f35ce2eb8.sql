
-- 1. pro_profiles: revoke sensitive columns from anonymous users
-- Authenticated users keep full access; anon loses phone/email/siret/precise coords
REVOKE SELECT ON public.pro_profiles FROM anon;
GRANT SELECT (
  id, slug, raison_sociale, category, sub_categories, city, postal_code,
  description, website, urgences_24_7, siret_verified, logo_url, cover_url,
  tarif_min, tarif_max, tarif_note, horaires, diplomes, ordre_number,
  zone_radius_km, zone_cities, status, created_at, updated_at
) ON public.pro_profiles TO anon;

-- Make sure authenticated retains full SELECT
GRANT SELECT ON public.pro_profiles TO authenticated;

-- 2. Storage SELECT policies (explicit public read for public buckets)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Public read avatars') THEN
    CREATE POLICY "Public read avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Public read mission-photos') THEN
    CREATE POLICY "Public read mission-photos" ON storage.objects FOR SELECT USING (bucket_id = 'mission-photos');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Public read property-photos') THEN
    CREATE POLICY "Public read property-photos" ON storage.objects FOR SELECT USING (bucket_id = 'property-photos');
  END IF;
END $$;
