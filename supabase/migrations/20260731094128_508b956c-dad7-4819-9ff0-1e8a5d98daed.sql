ALTER TABLE public.applications
  ADD CONSTRAINT applications_sit_sitter_unique UNIQUE (sit_id, sitter_id);