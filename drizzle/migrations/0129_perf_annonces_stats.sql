-- Lot PERF-ANN (10/11/2026, « ok go 1 et 2 » de Jérémie) : la page Annonces
-- lit les vues de chaque annonce (admin_get_listings_stats) par l'index
-- partiel des pages vues sur source, puis la table pour user_id et created_at :
-- 3 614 pages lues sur disque pour 60 annonces, 3,3 s (7,8 s au plus en
-- production). L'index couvrant donne une lecture d'index seule : 56 ms.
-- En production, créé avant en CONCURRENTLY (10/11/2026, 00 h 35) ; IF NOT
-- EXISTS le laisse ici sans effet.
CREATE INDEX IF NOT EXISTS analytics_events_page_view_source_cover_idx
  ON public.analytics_events (source)
  INCLUDE (user_id, created_at)
  WHERE event_type = 'page_view';
