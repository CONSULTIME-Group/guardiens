-- Normalise le pays texte libre "Maroc" vers le code ISO "MA" pour rester
-- cohérent avec la nouvelle liste normalisée côté UI (src/lib/countries.ts).
-- Élargir ici si d'autres noms libres apparaissent.
UPDATE public.profiles
SET country = CASE lower(country)
  WHEN 'maroc' THEN 'MA'
  WHEN 'morocco' THEN 'MA'
  WHEN 'france' THEN 'FR'
  WHEN 'belgique' THEN 'BE'
  WHEN 'belgium' THEN 'BE'
  WHEN 'suisse' THEN 'CH'
  WHEN 'switzerland' THEN 'CH'
  ELSE country
END
WHERE country IS NOT NULL
  AND length(country) > 2;

-- Re-géocode Dominique (et tout profil non-FR sans coordonnées) via la
-- nouvelle edge function (avec fallback Nominatim).
SELECT net.http_post(
  url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/geocode-profile',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'x-geocode-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'GEOCODE_PROFILE_SECRET')
  ),
  body := jsonb_build_object('user_id', id)
)
FROM public.profiles
WHERE country IS NOT NULL
  AND country <> 'FR'
  AND city IS NOT NULL
  AND city <> ''
  AND (latitude IS NULL OR longitude IS NULL);
