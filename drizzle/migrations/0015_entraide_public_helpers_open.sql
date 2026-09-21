CREATE OR REPLACE VIEW public.public_helpers AS
SELECT
  p.id,
  p.first_name,
  p.avatar_url,
  p.city,
  round(p.latitude::numeric, 2)::double precision AS latitude_approx,
  round(p.longitude::numeric, 2)::double precision AS longitude_approx,
  p.helps_with
FROM public.profiles p
WHERE p.account_status = 'active'
  AND p.available_for_help = true
  AND p.first_name IS NOT NULL
  AND btrim(p.first_name) <> ''
  AND p.latitude IS NOT NULL
  AND p.longitude IS NOT NULL;

GRANT SELECT ON public.public_helpers TO anon, authenticated;
GRANT ALL ON public.public_helpers TO service_role;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.public_helpers FROM anon, authenticated, PUBLIC;

COMMENT ON VIEW public.public_helpers IS 'Surface publique des membres actifs disponibles pour l entraide. helps_with est optionnel et nullable. Vue possedee par postgres, coordonnees arrondies, lecture seule cote client.';