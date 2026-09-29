-- Lot N7 : source « scanner_suspect » pour les réponses cliquées par un robot de messagerie.
ALTER TABLE public.owner_departure_intents DROP CONSTRAINT owner_departure_intents_source_chk;
ALTER TABLE public.owner_departure_intents ADD CONSTRAINT owner_departure_intents_source_chk
  CHECK (source IN ('email','dashboard','message','scanner_suspect'));
GRANT UPDATE ON public.owner_departure_intents TO service_role;