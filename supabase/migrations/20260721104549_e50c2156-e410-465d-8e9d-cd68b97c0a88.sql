
-- 1. Correction du compteur : ne compter que les gardes où le reviewee était le gardien
--    (i.e. l'avis vient du propriétaire de l'annonce).
CREATE OR REPLACE FUNCTION public.recalc_completed_sits_count(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM set_config('app.allow_internal_profile_update', 'on', true);
  UPDATE public.profiles p
  SET completed_sits_count = (
    SELECT COUNT(DISTINCT r.sit_id)
    FROM public.reviews r
    JOIN public.sits s ON s.id = r.sit_id
    WHERE r.reviewee_id = _user_id
      AND r.sit_id IS NOT NULL
      AND r.published = true
      AND r.moderation_status = 'valide'
      AND r.review_type <> 'annulation'
      AND s.user_id <> r.reviewee_id  -- reviewee était le gardien, pas le propriétaire
  )
  WHERE p.id = _user_id;
END;
$function$;

-- 2. Recalcul en masse pour tous les profils qui ont au moins un avis reçu.
DO $$
DECLARE
  uid uuid;
BEGIN
  FOR uid IN SELECT DISTINCT reviewee_id FROM public.reviews WHERE reviewee_id IS NOT NULL
  LOOP
    PERFORM public.recalc_completed_sits_count(uid);
  END LOOP;
END $$;

-- 3. Vue public_pets : visible dès qu'une annonce a été publiée (published ou archived),
--    hors modération, jamais pour un propriétaire n'ayant jamais publié.
CREATE OR REPLACE VIEW public.public_pets AS
SELECT
  p.id,
  p.property_id,
  p.species,
  p.breed,
  p.name,
  p.age,
  p.photo_url,
  p."character",
  p.activity_level,
  p.alone_duration,
  p.walk_duration
FROM public.pets p
WHERE EXISTS (
  SELECT 1
  FROM public.sits s
  WHERE s.property_id = p.property_id
    AND s.status IN ('published'::sit_status, 'archived'::sit_status)
    AND s.moderation_hidden_at IS NULL
);

GRANT SELECT ON public.public_pets TO anon, authenticated;
