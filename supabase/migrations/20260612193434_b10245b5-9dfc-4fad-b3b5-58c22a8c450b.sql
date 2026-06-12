
-- 1. pro_profiles: remove broad public SELECT, expose a sanitized view excluding SIRET
DROP POLICY IF EXISTS "Public can view approved pro profiles" ON public.pro_profiles;

CREATE OR REPLACE VIEW public.pro_profiles_public
WITH (security_invoker = off, security_barrier = true) AS
SELECT
  id, user_id, slug, raison_sociale, siret_verified, category, sub_categories,
  logo_url, cover_url, description, diplomes, ordre_number, city, postal_code,
  latitude, longitude, zone_radius_km, zone_cities, phone, website, email_contact,
  social_links, horaires, urgences_24_7, tarif_min, tarif_max, tarif_note,
  status, approved_at, created_at, updated_at
FROM public.pro_profiles
WHERE status = 'approved'::pro_moderation_status;

GRANT SELECT ON public.pro_profiles_public TO anon, authenticated;

-- 2. owner_highlights: allow anonymous visitors to see non-hidden highlights on public profiles
DROP POLICY IF EXISTS "Anyone can view non-hidden highlights" ON public.owner_highlights;
CREATE POLICY "Anyone can view non-hidden highlights"
  ON public.owner_highlights
  FOR SELECT
  TO anon, authenticated
  USING (
    hidden = false
    OR auth.uid() = owner_id
    OR auth.uid() = sitter_id
  );
DROP POLICY IF EXISTS "Anyone authenticated can view non-hidden highlights" ON public.owner_highlights;

-- 3. Explicit service_role policies on email infra tables (defense in depth; service_role bypasses RLS but explicit policies remove scanner ambiguity)
DROP POLICY IF EXISTS "Service role manages deferred queue" ON public.email_deferred_queue;
CREATE POLICY "Service role manages deferred queue"
  ON public.email_deferred_queue
  FOR ALL
  TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role manages idempotency hits" ON public.email_idempotency_hits;
CREATE POLICY "Service role manages idempotency hits"
  ON public.email_idempotency_hits
  FOR ALL
  TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
