-- Append postal_code at the end to avoid renaming existing view columns.
DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles
WITH (security_invoker=on) AS
SELECT
  id,
  first_name,
  city,
  avatar_url,
  bio,
  completed_sits_count,
  identity_verified,
  is_founder,
  postal_code
FROM public.profiles
WHERE account_status = 'active';