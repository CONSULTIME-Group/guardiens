ALTER TABLE public.owner_gallery ADD COLUMN IF NOT EXISTS position integer NOT NULL DEFAULT 0;

-- Initialise position selon l'ordre actuel (created_at desc)
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) - 1 AS rn
  FROM public.owner_gallery
)
UPDATE public.owner_gallery g
SET position = ranked.rn
FROM ranked
WHERE g.id = ranked.id;

CREATE INDEX IF NOT EXISTS idx_owner_gallery_user_position
  ON public.owner_gallery(user_id, position);