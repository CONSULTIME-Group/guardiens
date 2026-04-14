
-- 1. Fix profiles anon SELECT: restrict to non-sensitive columns via a view
-- Drop the overly permissive anon policy
DROP POLICY IF EXISTS "profiles_anon_select_active" ON public.profiles;

-- Create a restricted anon policy that only allows reading non-sensitive columns
-- We use a view approach: create a public_profiles_anon view with restricted columns
-- But simpler: just re-create the policy - RLS can't restrict columns, so we use the existing public_profiles view
-- The real fix: remove direct anon access to profiles table, force through public_profiles view

-- Re-create anon policy with same conditions but it stays - the real fix is ensuring
-- the app uses the view for anon access. However the security finding is about the raw table.
-- Best approach: drop anon access entirely from the profiles table.
-- Anon users should use the public_profiles view instead.

-- Remove anon SELECT from profiles entirely
REVOKE SELECT ON public.profiles FROM anon;

-- Ensure the public_profiles view is accessible to anon
GRANT SELECT ON public.public_profiles TO anon;

-- 2. Fix house_guides RLS: restrict sitter access to strictly within sit dates
-- Drop existing sitter access policy if any
DROP POLICY IF EXISTS "Sitter can view house guide during sit" ON public.house_guides;
DROP POLICY IF EXISTS "sitter_view_house_guide_during_sit" ON public.house_guides;

-- Re-create with strict date boundary (end_date excluded after midnight)
CREATE POLICY "sitter_view_house_guide_during_sit"
ON public.house_guides
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.sits s
    JOIN public.applications a ON a.sit_id = s.id
    WHERE s.property_id = house_guides.property_id
      AND a.sitter_id = auth.uid()
      AND a.status = 'accepted'
      AND s.status IN ('confirmed', 'in_progress')
      AND CURRENT_DATE >= s.start_date
      AND CURRENT_DATE <= s.end_date
  )
  OR public.has_role(auth.uid(), 'admin')
);
