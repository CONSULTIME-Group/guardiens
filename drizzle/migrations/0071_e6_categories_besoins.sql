DO $migration$
DECLARE v_count int;
BEGIN
  CREATE TABLE IF NOT EXISTS public._backup_mission_category_e6_20261011 AS
    SELECT id, category FROM public.small_missions WHERE mission_type = 'besoin' AND category = 'other';
  ALTER TABLE public._backup_mission_category_e6_20261011 ENABLE ROW LEVEL SECURITY;
  REVOKE ALL ON TABLE public._backup_mission_category_e6_20261011 FROM PUBLIC, anon, authenticated;

  UPDATE public.small_missions s
     SET category = v.category::public.small_mission_category, updated_at = now()
    FROM (VALUES
      ('10cfd0b1-92eb-444d-af4f-a7bba962ca7e'::uuid, 'animals'),
      ('15f4a4b5-f800-4ec5-8fef-4b4eeffdc307'::uuid, 'house'),
      ('40c39349-7034-4c60-9e3f-71fccca45cac'::uuid, 'house'),
      ('c6ac0601-9a5a-4cf4-82d4-3f60a34f4fa2'::uuid, 'house'),
      ('f0609ebd-1aca-4617-b905-06b091bd857f'::uuid, 'skills'),
      ('1b68dcb9-589a-4145-8c92-d7a090c34ed6'::uuid, 'animals'),
      ('57cb8d2b-f87b-4781-99e3-3e8a0d2bb4d7'::uuid, 'transport'),
      ('18dcef3b-44ac-4547-b6f0-e1437bfa305f'::uuid, 'transport'),
      ('41746a54-159c-47dd-bc6c-c2e934c09d1c'::uuid, 'animals'),
      ('746e4310-2852-47ba-be94-73f6a18453bf'::uuid, 'animals'),
      ('7f344be3-3b86-4b48-80af-603337ccb1d4'::uuid, 'animals')
    ) AS v(id, category)
   WHERE s.id = v.id AND s.category = 'other';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Lot E6 : % besoins reclassés sur 11 prévus', v_count;
  IF v_count <> 11 THEN RAISE EXCEPTION 'Rattrapage inattendu : % besoins au lieu de 11', v_count; END IF;
END;
$migration$;