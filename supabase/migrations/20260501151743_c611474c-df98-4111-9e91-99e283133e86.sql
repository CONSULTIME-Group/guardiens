-- Fix linter: 3 vues SECURITY DEFINER → security_invoker=on
ALTER VIEW public.public_stats SET (security_invoker = on);
ALTER VIEW public.mass_email_stats SET (security_invoker = on);
ALTER VIEW public.public_profiles SET (security_invoker = on);