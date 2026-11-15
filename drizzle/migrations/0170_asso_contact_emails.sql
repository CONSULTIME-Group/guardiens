-- ASSO : adresses email publiques de contact des fiches associations (relevées sur les sites officiels le 15/11/2026).
-- Adresses génériques uniquement (aucune adresse nominative). Sert à l'envoi des emails de consentement.
UPDATE public.animal_associations a SET contact_email = v.e
FROM (VALUES
('1000-moustaches','1000moustaches@gmail.com'),
('arthropologia','info@arthropologia.org'),
('banque-alimentaire-du-rhone','ba690@banquealimentaire.org'),
('club-alpin-francais-lyon-villeurbanne','accueil@clubalpinlyon.fr'),
('compagnons-batisseurs-rhone-alpes','cbrhonealpes@compagnonsbatisseurs.eu'),
('concordia-chantiers-benevoles','info@concordia.fr'),
('conservatoire-espaces-naturels-isere','contact@cen-isere.org'),
('espace-nature-isere','contact@enisere.fr'),
('fne-rhone','rhone@fne-aura.org'),
('le-passe-jardins','contact@lepassejardins.fr'),
('lpo-auvergne-rhone-alpes','auvergne-rhone-alpes@lpo.fr'),
('mountain-riders','info@mountain-riders.org'),
('mountain-wilderness-france','contact@mountainwilderness.fr'),
('petits-freres-des-pauvres-lyon','lyon.nord@petitsfreresdespauvres.fr'),
('rempart-chantiers-patrimoine','contact@rempart.com'),
('ressourcerie-creative-de-lyon','contact@ressourcerielyon.fr'),
('restos-du-coeur-rhone','contact@restosducoeur.org'),
('world-cleanup-day-france','contact@worldcleanupday.fr')
) AS v(s,e)
WHERE a.slug = v.s AND a.contact_email IS NULL;
