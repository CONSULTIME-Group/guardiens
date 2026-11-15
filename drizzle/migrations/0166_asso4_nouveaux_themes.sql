-- Lot ASSO-4 (15/11/2026) : la page /associations accueille aussi des associations
-- de chantiers participatifs, de nature, de partage, de solidarité et de randonnée.
-- Décision de Jérémie du 15/11/2026. Repère : asso4_nouveaux_themes. Rejouable.
--
-- Trois contraintes s'élargissent, la vue publique reste identique :
--  1. association_type : cinq nouveaux types, à côté des cinq types animaux.
--  2. needs : « participants » (sorties ouvertes à de nouveaux participants).
--  3. address : « partage » rejoint les lieux ouverts au public (boutique d'une
--     ressourcerie, jardin). Un siège administratif n'y est jamais renseigné.
ALTER TABLE public.animal_associations DROP CONSTRAINT IF EXISTS animal_associations_association_type_check;
ALTER TABLE public.animal_associations ADD CONSTRAINT animal_associations_association_type_check
  CHECK (association_type = ANY (ARRAY['refuge','sanctuaire','familles_accueil','faune_sauvage','autre','chantier','nature','partage','solidarite','randonnee']::text[]));

ALTER TABLE public.animal_associations DROP CONSTRAINT IF EXISTS animal_associations_needs_check;
ALTER TABLE public.animal_associations ADD CONSTRAINT animal_associations_needs_check
  CHECK (needs <@ ARRAY['benevoles','familles_accueil','dons','materiel','participants']::text[]);

ALTER TABLE public.animal_associations DROP CONSTRAINT IF EXISTS animal_associations_address_lieu_public;
ALTER TABLE public.animal_associations ADD CONSTRAINT animal_associations_address_lieu_public
  CHECK (address IS NULL OR association_type IN ('refuge','sanctuaire','faune_sauvage','partage'));
