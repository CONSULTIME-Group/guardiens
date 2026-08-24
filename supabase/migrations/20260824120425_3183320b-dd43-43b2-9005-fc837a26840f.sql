-- Etend le scope des redirections aux pages departement et autorise une
-- cible en chemin complet (barre oblique initiale), par exemple une page
-- ville vers laquelle un departement est regroupe. Aucune donnee inseree.
ALTER TABLE public.redirects DROP CONSTRAINT redirects_scope_chk;
ALTER TABLE public.redirects
  ADD CONSTRAINT redirects_scope_chk
  CHECK (scope = ANY (ARRAY['article'::text, 'city'::text, 'department'::text]));

ALTER TABLE public.redirects DROP CONSTRAINT redirects_slug_to_format;
ALTER TABLE public.redirects
  ADD CONSTRAINT redirects_slug_to_format
  CHECK (slug_to ~ '^[a-z0-9-]+$' OR slug_to ~ '^/[a-z0-9-]+(/[a-z0-9-]+)*$');