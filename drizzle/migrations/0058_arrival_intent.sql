ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS arrival_intent text NULL;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_arrival_intent_check CHECK (arrival_intent IS NULL OR arrival_intent IN ('owner','sitter','entraide'));
COMMENT ON COLUMN public.profiles.arrival_intent IS 'Lot 2 arrivee v2 : intention choisie en C1 (owner, sitter, entraide), ecrite au clic de C4.';