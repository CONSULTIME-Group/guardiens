ALTER TABLE public.long_stays ADD COLUMN owner_fee_paid boolean NOT NULL DEFAULT false;
ALTER TABLE public.long_stays ADD COLUMN sitter_fee_paid boolean NOT NULL DEFAULT false;