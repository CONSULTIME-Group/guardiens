-- Migration : unifier les photos vers owner_gallery
-- 1. Copier les properties.photos manquantes dans owner_gallery (par user_id)
WITH unnested AS (
  SELECT 
    pr.user_id,
    photo_url,
    row_number() OVER (PARTITION BY pr.user_id ORDER BY pr.id, ord) AS rn
  FROM public.properties pr
  CROSS JOIN LATERAL unnest(pr.photos) WITH ORDINALITY AS u(photo_url, ord)
  WHERE pr.photos IS NOT NULL AND array_length(pr.photos, 1) > 0
),
existing AS (
  SELECT user_id, photo_url FROM public.owner_gallery
),
to_insert AS (
  SELECT u.user_id, u.photo_url,
    COALESCE((SELECT MAX(position) FROM public.owner_gallery og WHERE og.user_id = u.user_id), -1) + u.rn AS position
  FROM unnested u
  WHERE NOT EXISTS (
    SELECT 1 FROM existing e WHERE e.user_id = u.user_id AND e.photo_url = u.photo_url
  )
)
INSERT INTO public.owner_gallery (user_id, photo_url, position)
SELECT user_id, photo_url, position FROM to_insert;

-- 2. Pour chaque sit sans cover_photo_url, prendre la 1re photo de la galerie owner
UPDATE public.sits s
SET cover_photo_url = sub.photo_url
FROM (
  SELECT DISTINCT ON (user_id) user_id, photo_url
  FROM public.owner_gallery
  ORDER BY user_id, position ASC, created_at ASC
) sub
WHERE s.user_id = sub.user_id
  AND (s.cover_photo_url IS NULL OR s.cover_photo_url = '');

-- 3. Vider properties.photos (la source de vérité est désormais owner_gallery)
UPDATE public.properties SET photos = '{}' WHERE photos IS NOT NULL AND array_length(photos,1) > 0;