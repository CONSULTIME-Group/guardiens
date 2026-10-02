CREATE TABLE public._backup_small_mission_plantation_20261002 AS
SELECT id, slug, title, category, mission_type, description, exchange_offer, max_participants, updated_at, now() AS backed_up_at
FROM public.small_missions WHERE id = 'e5724f3e-c22b-4fb9-8962-d24c80435660';
GRANT ALL ON public._backup_small_mission_plantation_20261002 TO service_role;
ALTER TABLE public._backup_small_mission_plantation_20261002 ENABLE ROW LEVEL SECURITY;