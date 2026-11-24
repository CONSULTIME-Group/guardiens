-- Lot GUIDE1 (22/11/2026, audit claude/audit-generateurs-guides-22-novembre-2026.md,
-- « ok go » de Jeremie). Repere : guide1_guides_nettoyage.
--
-- 1. Guides de la maison : trames restees entre accolades.
--    Le generateur rangeait un paragraphe a accolades dans « Adresse du
--    veterinaire » et « Nom du contact d'urgence », deux champs courts
--    (17 guides sur 45 le 22/11/2026). Ces deux champs sont vides quand ils
--    portent encore une accolade. Les deux champs de texte libre (precisions
--    WiFi, instructions) ne sont vides que sur les guides publies, lus par un
--    gardien ; sur un guide en cours, la trame reste, le proprietaire la
--    complete. Valeurs d'origine gardees dans house_guides_guide1_backup.
-- 2. Guides de ville : lieux ecrits par l'IA avant le 13/10/2026.
--    1 078 lieux sans source restaient en base, masques par la page mais
--    lisibles par l'API publique et comptes par l'admin et par
--    get_content_stats. Ils sont supprimes sur les guides sources, sauf la
--    selection retenue a la main (src/data/guideOverrides.ts, 36 lieux).
--    Lignes d'origine gardees dans city_guide_places_guide1_backup.
-- Rejouable : un second passage ne trouve plus rien a traiter.

CREATE TABLE IF NOT EXISTS public.house_guides_guide1_backup (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  published boolean,
  wifi_instructions text,
  detailed_instructions text,
  vet_address text,
  emergency_contact_name text,
  saved_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.house_guides_guide1_backup ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.house_guides_guide1_backup FROM anon, authenticated;
COMMENT ON TABLE public.house_guides_guide1_backup IS 'guide1_guides_nettoyage : valeurs d''origine des guides de la maison nettoyes le 22/11/2026. Lecture reservee au role service.';

INSERT INTO public.house_guides_guide1_backup (id, user_id, published, wifi_instructions, detailed_instructions, vet_address, emergency_contact_name)
SELECT h.id, h.user_id, h.published, h.wifi_instructions, h.detailed_instructions, h.vet_address, h.emergency_contact_name
FROM public.house_guides h
WHERE h.vet_address ~ '\{[^{}\n]{2,80}\}'
   OR h.emergency_contact_name ~ '\{[^{}\n]{2,80}\}'
   OR (h.published AND (h.wifi_instructions ~ '\{[^{}\n]{2,80}\}' OR h.detailed_instructions ~ '\{[^{}\n]{2,80}\}'))
ON CONFLICT (id) DO NOTHING;

UPDATE public.house_guides h SET
  vet_address = CASE WHEN h.vet_address ~ '\{[^{}\n]{2,80}\}' THEN NULL ELSE h.vet_address END,
  emergency_contact_name = CASE WHEN h.emergency_contact_name ~ '\{[^{}\n]{2,80}\}' THEN NULL ELSE h.emergency_contact_name END,
  wifi_instructions = CASE WHEN h.published AND h.wifi_instructions ~ '\{[^{}\n]{2,80}\}' THEN NULL ELSE h.wifi_instructions END,
  detailed_instructions = CASE WHEN h.published AND h.detailed_instructions ~ '\{[^{}\n]{2,80}\}' THEN NULL ELSE h.detailed_instructions END
WHERE h.vet_address ~ '\{[^{}\n]{2,80}\}'
   OR h.emergency_contact_name ~ '\{[^{}\n]{2,80}\}'
   OR (h.published AND (h.wifi_instructions ~ '\{[^{}\n]{2,80}\}' OR h.detailed_instructions ~ '\{[^{}\n]{2,80}\}'));

CREATE TABLE IF NOT EXISTS public.city_guide_places_guide1_backup (
  id uuid PRIMARY KEY,
  city_guide_id uuid NOT NULL,
  row_data jsonb NOT NULL,
  saved_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.city_guide_places_guide1_backup ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.city_guide_places_guide1_backup FROM anon, authenticated;
COMMENT ON TABLE public.city_guide_places_guide1_backup IS 'guide1_guides_nettoyage : lieux sans source retires des guides de ville le 22/11/2026. Lecture reservee au role service.';

WITH cible AS (
  SELECT p.id
  FROM public.city_guide_places p
  JOIN public.city_guides g ON g.id = p.city_guide_id
  WHERE p.source_url IS NULL
    AND g.places_sourced_at IS NOT NULL
    AND p.id NOT IN (
    '05cb6b30-af60-4778-b51c-e7c1c88f904a',
    '0a3581bd-8dc1-4f4b-b101-efec619346e4',
    '0b143663-61fd-43b2-8524-c68f3376851d',
    '1a84ee16-c73f-4fb8-a327-6360a42d8ed7',
    '1edbd60b-b853-4d59-b6c9-49715a46d6c3',
    '2442f93d-eec8-4ce4-9ba7-da6a38858d5c',
    '29f7ed5a-ab47-4651-af58-b188b6e37db5',
    '374e7050-f0f5-4771-a557-8c3d84e1d2ab',
    '4436695e-202d-49a9-8233-86dc00dbab04',
    '4c5fc130-fbc9-4211-97b2-ce514242a5f5',
    '5eb9907a-2282-491b-a68d-8d06d50e6570',
    '5ed380cb-5938-450d-b4cc-d8a5e564d9c0',
    '623425b5-9848-4739-83fb-d61d59c52244',
    '6440a244-a5be-4c05-9971-d35c40e79de6',
    '691b44a3-694f-4a2a-b10b-f6385cf4f5dc',
    '6d89b356-78cc-4144-adbc-ac708665b4e0',
    '7594bb90-bc3d-418e-903b-d268f27caae9',
    '7a25ad21-3133-4847-a5ec-bd144836ed32',
    '80e8bbb1-f5cf-4abd-bcb3-fd5107a66a41',
    '8ad7e157-1cc2-432a-bdce-9a61b074a221',
    '8b27289a-b792-43f5-a49e-c152985b9c1d',
    '9ca58d24-0748-450d-a1f0-7def16121898',
    'a0f5b3d5-1659-4d6c-b0c9-34718cb76d6b',
    'b0fcbf8b-9aa2-4d4c-8f0e-8f7d657149a6',
    'c20e304a-f01b-4b0e-93bc-0db9bfde975a',
    'c260a477-62b9-4cfb-8aff-676dfca72159',
    'c4a82b3e-4336-4f98-8b51-9dc9cd185a66',
    'd1985e2e-3fc2-4eb0-b6f6-a77a7911c01b',
    'd56e8e12-dd77-4b94-aa8f-54f205259b61',
    'de087479-3081-4b74-96a7-92c65eaf8494',
    'dfb21090-06df-42ea-b610-0363a6533752',
    'e04b3a80-c3de-4771-a67d-c51b6f5dcc2d',
    'e3867a03-aabb-4010-9e26-f44fddb29e11',
    'e46c8dbd-bf30-4dd0-825f-6cfd3546f832',
    'eb46d472-8172-4a93-ae34-ffe4786caaa4',
    'f36c1d2f-ee58-41e9-9c81-42cca3794b7a'
    )
), sauvegarde AS (
  INSERT INTO public.city_guide_places_guide1_backup (id, city_guide_id, row_data)
  SELECT p.id, p.city_guide_id, to_jsonb(p)
  FROM public.city_guide_places p JOIN cible c ON c.id = p.id
  ON CONFLICT (id) DO NOTHING
  RETURNING id
)
DELETE FROM public.city_guide_places p
USING cible c
WHERE p.id = c.id
  AND (EXISTS (SELECT 1 FROM sauvegarde s WHERE s.id = p.id)
       OR EXISTS (SELECT 1 FROM public.city_guide_places_guide1_backup b WHERE b.id = p.id));
