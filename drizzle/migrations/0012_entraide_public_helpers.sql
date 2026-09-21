CREATE VIEW public.public_helpers AS
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
  AND btrim(p.helps_with) <> '';

GRANT SELECT ON public.public_helpers TO anon, authenticated;
GRANT ALL ON public.public_helpers TO service_role;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.public_helpers FROM anon, authenticated, PUBLIC;

COMMENT ON VIEW public.public_helpers IS 'Surface publique minimale des membres disponibles pour l entraide. Vue possedee par postgres, coordonnees arrondies, lecture seule cote client.';

CREATE VIEW public.public_mission_response_counts AS
SELECT
  r.mission_id,
  count(*)::integer AS response_count
FROM public.small_mission_responses r
JOIN public.small_missions m ON m.id = r.mission_id
WHERE m.status = 'open'
  AND m.mission_type = 'besoin'
  AND m.moderation_hidden_at IS NULL
  AND m.hidden_at IS NULL
GROUP BY r.mission_id;

GRANT SELECT ON public.public_mission_response_counts TO anon, authenticated;
GRANT ALL ON public.public_mission_response_counts TO service_role;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.public_mission_response_counts FROM anon, authenticated, PUBLIC;

COMMENT ON VIEW public.public_mission_response_counts IS 'Compteur public agrege des reponses aux besoins ouverts, sans identite de repondant.';