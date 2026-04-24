-- Ajout du choix manuel d'image hero par le gardien.
-- Si NULL → fallback sur la sélection automatique par hash + pondération de catégories.
-- Si défini → on affiche cette image-là, indépendamment des poids.
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS hero_image_index integer;

-- Validation : doit être >= 0 (la borne max est validée côté client à partir de HERO_BANK.length).
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_hero_image_index_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_hero_image_index_check
CHECK (hero_image_index IS NULL OR hero_image_index >= 0);

COMMENT ON COLUMN public.profiles.hero_image_index IS
'Index 0-based dans HERO_BANK choisi manuellement par le gardien sur son profil public. NULL = sélection automatique par hash de l''id.';