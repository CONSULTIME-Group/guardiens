-- Lot SC4, « voiture nécessaire » répondue (10/11/2026, arène
-- claude/arene/2026-11-10-score-completion, « ok go » de Jérémie sur
-- « Demander au bon moment »).
--
-- Constat : properties.car_required vaut false par défaut ; un « non » du
-- propriétaire et un interrupteur jamais touché se confondent (185 logements
-- à false sur 237 le 10/11/2026). La question devient explicite (formulaire
-- Logement et question posée sur l'annonce publiée, OwnerCarQuestion) et
-- la réponse est datée.
--
-- Colonne ajoutée, nulle par défaut : aucune donnée existante ne change, le
-- calcul d'affinité ne la lit pas (le critère véhicule s'applique à true).
-- À appliquer avant la publication du front qui l'écrit.
-- Repère : sc4_voiture_repondue (contrat de production).

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS car_required_answered_at timestamptz;

COMMENT ON COLUMN public.properties.car_required_answered_at IS
  'Heure de la réponse explicite du propriétaire à « voiture nécessaire » (lot SC4, 10/11/2026). Nulle : jamais répondu, car_required à false reste neutre. Repère : sc4_voiture_repondue.';
