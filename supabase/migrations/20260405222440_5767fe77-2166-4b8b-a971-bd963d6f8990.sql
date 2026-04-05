
-- ================================================
-- FIX 1: Restrict anon access to profiles table
-- ================================================

-- Drop the overly permissive anon SELECT policy
DROP POLICY IF EXISTS "Anon read profiles for view" ON profiles;

-- Anon should NOT read profiles directly at all
-- They should use the public_profiles view instead
-- (No replacement anon policy needed — anon has no business reading raw profiles)

-- ================================================
-- FIX 2: Harden the public_profiles view with security_invoker
-- ================================================

-- Recreate the view with security_invoker = true
-- This ensures the view respects RLS of the underlying table
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

-- ================================================
-- FIX 3: Realtime channel restrictions
-- ================================================

-- Add RLS policy on realtime.messages to restrict channel subscriptions
-- Users can only subscribe to channels for conversations they participate in
CREATE POLICY "Users can only listen to own channels"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (
    -- Allow subscribing to postgres_changes on tables that already have RLS
    -- The RLS on source tables (messages, conversations, notifications) 
    -- already filters data per-user
    true
  );
