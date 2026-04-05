
-- ================================================
-- FIX 1: Column-level security on profiles
-- Revoke table-level SELECT, grant only safe columns
-- ================================================

-- Revoke table-level SELECT from authenticated and anon
REVOKE SELECT ON public.profiles FROM authenticated;
REVOKE SELECT ON public.profiles FROM anon;

-- Grant SELECT on non-sensitive columns to authenticated
GRANT SELECT (
  id, role, first_name, last_name, city, postal_code,
  avatar_url, bio, profile_completion, created_at, updated_at,
  cancellation_count, identity_verified, identity_verification_status,
  account_status, is_founder, skill_categories, available_for_help,
  custom_skills, completed_sits_count, cancellations_as_proprio
) ON public.profiles TO authenticated;

-- Grant SELECT on public columns to anon (for public_profiles view)
GRANT SELECT (
  id, role, first_name, avatar_url, bio, city, postal_code,
  identity_verified, is_founder, completed_sits_count,
  cancellation_count, cancellations_as_proprio, profile_completion,
  skill_categories, custom_skills, available_for_help, created_at
) ON public.profiles TO anon;

-- ================================================
-- FIX 2: Admin RPC to fetch emails
-- ================================================

CREATE OR REPLACE FUNCTION public.get_user_emails_admin(p_user_ids uuid[])
RETURNS TABLE(id uuid, email text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  RETURN QUERY SELECT p.id, p.email FROM public.profiles p WHERE p.id = ANY(p_user_ids);
END;
$$;

-- Also allow owner to read own email via RPC
CREATE OR REPLACE FUNCTION public.get_own_email()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (SELECT p.email FROM public.profiles p WHERE p.id = auth.uid());
END;
$$;

-- ================================================
-- FIX 3: Update public_profiles view
-- Remove security_invoker so anon can access via column grants
-- ================================================

DROP VIEW IF EXISTS public_profiles;
CREATE VIEW public_profiles AS
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

-- Grant access to the view
GRANT SELECT ON public_profiles TO anon;
GRANT SELECT ON public_profiles TO authenticated;

-- ================================================
-- FIX 4: Drop useless realtime USING(true) policy
-- ================================================

DROP POLICY IF EXISTS "Users can only listen to own channels" ON realtime.messages;
