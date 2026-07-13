
ALTER TABLE public.sits
  ADD COLUMN IF NOT EXISTS accepts_sitter_pets text DEFAULT 'discuss'
    CHECK (accepts_sitter_pets IN ('yes','no','discuss')),
  ADD COLUMN IF NOT EXISTS accepts_sitter_children text DEFAULT 'discuss'
    CHECK (accepts_sitter_children IN ('yes','no','discuss'));

ALTER TABLE public.sitter_profiles
  ADD COLUMN IF NOT EXISTS travels_with_children boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS travels_with_own_animals boolean DEFAULT false;

UPDATE public.sitter_profiles
SET travels_with_own_animals = true
WHERE travels_with_own_animals IS DISTINCT FROM true
  AND own_animals IS NOT NULL
  AND array_length(own_animals, 1) > 0
  AND NOT (own_animals = ARRAY['Non']::text[] OR own_animals @> ARRAY['Non']::text[]);
