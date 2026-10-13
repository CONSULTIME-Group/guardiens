-- Lot GL (13/10/2026) : rapport du dernier passage de sourcing d'un guide.
-- source-guide-places travaille désormais en arrière-plan (la réponse part
-- tout de suite) ; son rapport (centre, rayons, essais Overpass, lieux) est
-- écrit ici, essai à blanc compris.
ALTER TABLE public.city_guides ADD COLUMN IF NOT EXISTS places_source_report jsonb;
