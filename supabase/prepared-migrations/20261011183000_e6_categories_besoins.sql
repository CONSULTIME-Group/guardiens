-- Lot E6 (11/10/2026) : catégorie réelle des besoins publiés avec « other »
-- depuis la suppression du choix de catégorie dans le formulaire. Classement
-- relu à la main, besoin par besoin (titre et description). Le formulaire
-- déduit désormais la catégorie du texte (src/lib/missionCategories.ts).
-- Seules les lignes encore en « other » sont touchées ; sauvegarde avant.

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
      ('10cfd0b1-92eb-444d-af4f-a7bba962ca7e'::uuid, 'animals'),   -- Garder ma chienne pendant Noël
      ('15f4a4b5-f800-4ec5-8fef-4b4eeffdc307'::uuid, 'house'),     -- Ponceuse pour le comptoir
      ('40c39349-7034-4c60-9e3f-71fccca45cac'::uuid, 'house'),     -- Aide déménagement
      ('c6ac0601-9a5a-4cf4-82d4-3f60a34f4fa2'::uuid, 'house'),     -- Déplacer un petit meuble colonne
      ('f0609ebd-1aca-4617-b905-06b091bd857f'::uuid, 'skills'),    -- Coudre des rideaux
      ('1b68dcb9-589a-4145-8c92-d7a090c34ed6'::uuid, 'animals'),   -- Famille d'accueil pour une chienne
      ('57cb8d2b-f87b-4781-99e3-3e8a0d2bb4d7'::uuid, 'transport'), -- Transporter un canapé
      ('18dcef3b-44ac-4547-b6f0-e1437bfa305f'::uuid, 'transport'), -- Transporter des meubles
      ('41746a54-159c-47dd-bc6c-c2e934c09d1c'::uuid, 'animals'),   -- Nourrir et sortir des chevaux
      ('746e4310-2852-47ba-be94-73f6a18453bf'::uuid, 'animals'),   -- Aide garde petite chienne
      ('7f344be3-3b86-4b48-80af-603337ccb1d4'::uuid, 'animals')    -- Garder mon chien en mon absence
    ) AS v(id, category)
   WHERE s.id = v.id AND s.category = 'other';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count > 11 THEN RAISE EXCEPTION 'Rattrapage inattendu : % besoins', v_count; END IF;
END;
$migration$;
