
-- ================================================
-- FIX 1: public_profiles view — add security_invoker
-- ================================================
CREATE OR REPLACE VIEW public_profiles
  WITH (security_invoker = true)
AS
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
  FROM profiles;

-- The view now uses security_invoker, so it respects RLS of the querying user.
-- We need a SELECT policy that allows authenticated users to read non-sensitive fields.
-- Since column-level RLS doesn't exist in Postgres, we rely on the view excluding sensitive columns
-- and add a read policy scoped to authenticated users for the underlying table.

-- Add a policy allowing authenticated users to read profiles (the view filters sensitive columns)
CREATE POLICY "profiles_authenticated_read"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- ================================================
-- FIX 2: Sits — restrict authenticated SELECT to relevant statuses or own sits
-- ================================================
DROP POLICY IF EXISTS "Published sits are viewable by authenticated users" ON sits;

CREATE POLICY "Authenticated can view relevant sits"
  ON sits FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR status IN ('published', 'confirmed', 'in_progress', 'completed')
    OR EXISTS (
      SELECT 1 FROM applications a
      WHERE a.sit_id = sits.id
      AND a.sitter_id = auth.uid()
    )
  );
