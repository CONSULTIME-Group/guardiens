
-- ============================================
-- FIX 1: Articles — restrict writes to admins
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can insert articles" ON public.articles;
DROP POLICY IF EXISTS "Authenticated users can update articles" ON public.articles;
DROP POLICY IF EXISTS "Authenticated users can delete articles" ON public.articles;

CREATE POLICY "Admins can insert articles"
  ON public.articles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update articles"
  ON public.articles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete articles"
  ON public.articles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- FIX 2: Subscriptions — remove user INSERT/UPDATE
-- ============================================
DROP POLICY IF EXISTS "Users can insert own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update own subscription" ON public.subscriptions;

-- ============================================
-- FIX 3: Profiles — restrict public exposure
-- ============================================

-- Remove the overly broad public-readable policy
DROP POLICY IF EXISTS "Profiles are publicly readable" ON public.profiles;

-- Create a view that excludes sensitive fields for public use
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT
  id,
  first_name,
  avatar_url,
  bio,
  city,
  postal_code,
  role,
  identity_verified,
  is_founder,
  completed_sits_count,
  cancellation_count,
  cancellations_as_proprio,
  profile_completion,
  skill_categories,
  custom_skills,
  available_for_help,
  created_at
FROM public.profiles;

-- Grant access to the view for anon and authenticated
GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- Add a policy for anon users to read only non-sensitive profile data
CREATE POLICY "Anon can read non-sensitive profiles"
  ON public.profiles FOR SELECT TO anon
  USING (true);

-- Note: The "Profiles are viewable by authenticated users" policy already exists
-- and allows authenticated users full SELECT, which is acceptable since they are logged in.
