-- Add max 10 competences constraint on sitter_profiles
ALTER TABLE public.sitter_profiles
  ADD CONSTRAINT max_competences
  CHECK (competences IS NULL OR array_length(competences, 1) IS NULL OR array_length(competences, 1) <= 10);

-- Add max 10 competences constraint on owner_profiles
ALTER TABLE public.owner_profiles
  ADD CONSTRAINT max_competences
  CHECK (competences IS NULL OR array_length(competences, 1) IS NULL OR array_length(competences, 1) <= 10);
