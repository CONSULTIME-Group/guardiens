-- Lot SEO-E (25/10/2026, arène entraide, décision 5 validée par Jérémie) :
-- une page ville /petites-missions/<ville> est indexable seulement si au moins
-- un besoin a été déposé dans son rayon au cours des 90 derniers jours.
-- public_small_missions ne montre que les besoins ouverts : un besoin pourvu
-- ou annulé disparaît de la lecture publique, et Lyon, Paris (seuls besoins
-- récents annulés) passeraient à tort en noindex.
-- Cette vue expose le strict nécessaire à la règle partagée
-- (supabase/functions/_shared/entraideCityIndexability.js), lue avec la clé
-- publique par la page, le sitemap et le générateur de llms.txt :
-- position arrondie au centième (même précision que public_small_missions)
-- et jour de dépôt, sans identifiant, titre, auteur ni statut. activity_key
-- (empreinte md5 de l'identifiant) sert seulement de clé de pagination
-- stable au lecteur paginé du sitemap (sitemap-core.js, clé unique exigée).
-- Besoins seulement (mission_type besoin, hors projets), masqués exclus.
-- Fenêtre de 90 jours égale à ENTRAIDE_CITY_WINDOW_DAYS (verrou src/__tests__/seoe/).
-- Aucune donnée modifiée. Rejouable.
CREATE OR REPLACE VIEW public.public_entraide_need_activity AS
SELECT
  md5(m.id::text) AS activity_key,
  round(m.latitude, 2)::double precision AS latitude,
  round(m.longitude, 2)::double precision AS longitude,
  m.created_at::date AS created_on
FROM public.small_missions m
WHERE m.mission_type = 'besoin'
  AND m.category IS DISTINCT FROM 'projet'
  AND m.moderation_hidden_at IS NULL
  AND m.hidden_at IS NULL
  AND m.latitude IS NOT NULL
  AND m.longitude IS NOT NULL
  AND m.created_at >= now() - interval '90 days';

COMMENT ON VIEW public.public_entraide_need_activity IS
  'Lot SEO-E : activité des besoins d''entraide sur 90 jours (position arrondie, jour), lue par la règle d''indexabilité des pages villes.';

GRANT SELECT ON public.public_entraide_need_activity TO anon, authenticated;
