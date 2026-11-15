-- Lot ASSO-4 (15/11/2026) : adresse postale de Le Repère (sanctuaire, Champéon).
-- Adresse du siège déclarée au répertoire officiel (recherche-entreprises.api.gouv.fr,
-- SIREN 885060897) : lieu-dit Le Petit Goupille, 53640 Champéon. Rejouable.
UPDATE public.animal_associations
SET address = 'Lieu-dit Le Petit Goupille',
    sources = sources || '[{"fact": "Adresse du siège déclarée au répertoire officiel : lieu-dit Le Petit Goupille, 53640 Champéon (relevée à l''API officielle le 15/11/2026)", "url": "https://recherche-entreprises.api.gouv.fr/search?q=885060897"}]'::jsonb
WHERE slug = 'le-repere-champeon' AND address IS NULL;
