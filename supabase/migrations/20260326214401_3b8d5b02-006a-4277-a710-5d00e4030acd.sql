
ALTER TABLE public.conversations ADD COLUMN small_mission_id uuid REFERENCES public.small_missions(id) ON DELETE SET NULL DEFAULT NULL;
