-- Restore table-level GRANTs on public.profiles.
-- RLS policies (including the restrictive own/admin SELECT policy) continue
-- to enforce row-level visibility; this only fixes the "permission denied
-- for table profiles" errors caused by missing GRANTs to authenticated/
-- service_role that some SECURITY DEFINER paths and PostgREST calls need.

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO service_role;

-- Anonymous users must not read raw profiles; they use public_profiles view.
REVOKE ALL ON public.profiles FROM anon;
