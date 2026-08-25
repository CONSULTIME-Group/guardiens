ALTER TABLE public._backup_breed_content_20260825 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public._backup_breed_content_20260825 FROM anon, authenticated;
GRANT ALL ON public._backup_breed_content_20260825 TO service_role;
COMMENT ON TABLE public._backup_breed_content_20260825 IS 'Sauvegarde des fiches « européen » (cat) et « mérens » (horse) avant correction de contenu du 25/08/2026. Table technique, aucun accès applicatif.';