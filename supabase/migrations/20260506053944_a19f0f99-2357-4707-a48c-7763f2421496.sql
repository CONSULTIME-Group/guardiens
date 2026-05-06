ALTER TABLE public.owner_gallery
  ADD COLUMN IF NOT EXISTS width integer,
  ADD COLUMN IF NOT EXISTS height integer;

COMMENT ON COLUMN public.owner_gallery.width IS 'Largeur en pixels mesurée à l''upload (utilisée pour le filtre qualité indexation SEO).';
COMMENT ON COLUMN public.owner_gallery.height IS 'Hauteur en pixels mesurée à l''upload.';