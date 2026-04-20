-- Permettre la lecture publique des statistiques agrégées (sans exposer aucune donnée individuelle)
ALTER VIEW public.public_stats SET (security_invoker = off);

-- S'assurer que anon et authenticated peuvent SELECT sur la vue
GRANT SELECT ON public.public_stats TO anon, authenticated;