
REVOKE SELECT ON public.profiles FROM anon;

GRANT SELECT (
  id, first_name, last_name, avatar_url, bio, city, postal_code, role,
  identity_verified, is_founder, completed_sits_count, cancellation_count,
  cancellations_as_proprio, profile_completion, skill_categories, custom_skills,
  available_for_help, created_at, updated_at, account_status
) ON public.profiles TO anon;
