-- Lot RCH1 (14/11/2026) : requêtes fixes de la page Recherche, lecture seule.
-- Arène claude/arene/2026-11-14-recherche (plan v3 corrigé, PR 1).

-- 1. Tunnel par garde ouverte, 14 derniers jours : vues de fiche (dont depuis
--    la recherche), clics « Postuler », candidatures envoyées.
WITH o AS (
  SELECT s.id, s.title, s.city, s.published_at
  FROM sits s
  WHERE s.status = 'published' AND s.accepting_applications IS NOT FALSE
    AND (s.end_date IS NULL OR s.end_date >= (now() AT TIME ZONE 'Europe/Paris')::date)
)
SELECT o.city, o.title,
  (SELECT count(*) FROM analytics_events e WHERE e.event_type = 'sit_view' AND e.metadata->>'sit_id' = o.id::text AND e.created_at > now() - interval '14 days') AS vues,
  (SELECT count(*) FROM analytics_events e WHERE e.event_type = 'sit_view' AND e.metadata->>'sit_id' = o.id::text AND e.metadata->>'from' = 'search' AND e.created_at > now() - interval '14 days') AS vues_depuis_recherche,
  (SELECT count(*) FROM analytics_events e WHERE e.event_type = 'sit_apply_clicked' AND e.metadata->>'sit_id' = o.id::text AND e.created_at > now() - interval '14 days') AS clics_postuler,
  (SELECT count(*) FROM applications a WHERE a.sit_id = o.id AND a.created_at > now() - interval '14 days') AS candidatures
FROM o ORDER BY vues DESC LIMIT 50;

-- 2. Gardes ouvertes sans candidature, publiées depuis 7 jours ou plus.
SELECT s.city, s.title, s.published_at::date AS publiee,
  (SELECT count(*) FROM analytics_events e WHERE e.event_type = 'sit_view' AND e.metadata->>'sit_id' = s.id::text) AS vues
FROM sits s
WHERE s.status = 'published' AND s.accepting_applications IS NOT FALSE
  AND (s.end_date IS NULL OR s.end_date >= (now() AT TIME ZONE 'Europe/Paris')::date)
  AND s.published_at < now() - interval '7 days'
  AND NOT EXISTS (SELECT 1 FROM applications a WHERE a.sit_id = s.id AND a.status::text <> 'cancelled')
ORDER BY s.published_at LIMIT 50;

-- 3. Visites de la recherche sans les changements de filtre (page_view kind filter exclu).
SELECT source, count(*) FILTER (WHERE coalesce(metadata->>'kind', '') <> 'filter') AS visites,
       count(*) FILTER (WHERE metadata->>'kind' = 'filter') AS changements_de_filtre
FROM analytics_events
WHERE event_type = 'page_view' AND source IN ('/search', '/recherche', '/annonces')
  AND created_at > now() - interval '30 days'
GROUP BY 1;
