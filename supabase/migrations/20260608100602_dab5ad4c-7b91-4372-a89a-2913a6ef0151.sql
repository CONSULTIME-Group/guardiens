-- A) AURA / Auvergne-Rhône-Alpes vocabulary cleanup (Core rule)
UPDATE public.articles SET
  title = regexp_replace(regexp_replace(regexp_replace(regexp_replace(title,
    'Auvergne-Rhône-Alpes', 'France', 'g'),
    'AURA', 'France', 'g'),
    'la région France', 'France', 'g'),
    'Région France', 'France', 'g'),
  content = regexp_replace(regexp_replace(regexp_replace(regexp_replace(content,
    'Auvergne-Rhône-Alpes', 'France', 'g'),
    'AURA', 'France', 'g'),
    'la région France', 'France', 'g'),
    'Région France', 'France', 'g'),
  excerpt = regexp_replace(regexp_replace(regexp_replace(regexp_replace(COALESCE(excerpt,''),
    'Auvergne-Rhône-Alpes', 'France', 'g'),
    'AURA', 'France', 'g'),
    'la région France', 'France', 'g'),
    'Région France', 'France', 'g'),
  meta_title = regexp_replace(regexp_replace(regexp_replace(regexp_replace(COALESCE(meta_title,''),
    'Auvergne-Rhône-Alpes', 'France', 'g'),
    'AURA', 'France', 'g'),
    'la région France', 'France', 'g'),
    'Région France', 'France', 'g'),
  meta_description = regexp_replace(regexp_replace(regexp_replace(regexp_replace(COALESCE(meta_description,''),
    'Auvergne-Rhône-Alpes', 'France', 'g'),
    'AURA', 'France', 'g'),
    'la région France', 'France', 'g'),
    'Région France', 'France', 'g'),
  hero_image_alt = regexp_replace(regexp_replace(regexp_replace(regexp_replace(COALESCE(hero_image_alt,''),
    'Auvergne-Rhône-Alpes', 'France', 'g'),
    'AURA', 'France', 'g'),
    'la région France', 'France', 'g'),
    'Région France', 'France', 'g'),
  seo_dirty_at = now()
WHERE
  title ~ 'AURA|Auvergne-Rhône-Alpes'
  OR content ~ 'AURA|Auvergne-Rhône-Alpes'
  OR COALESCE(excerpt,'') ~ 'AURA|Auvergne-Rhône-Alpes'
  OR COALESCE(meta_title,'') ~ 'AURA|Auvergne-Rhône-Alpes'
  OR COALESCE(meta_description,'') ~ 'AURA|Auvergne-Rhône-Alpes'
  OR COALESCE(hero_image_alt,'') ~ 'AURA|Auvergne-Rhône-Alpes';

-- B1) Étoffer pet-sitting-annecy-guide
UPDATE public.articles
SET content = content || $ADD$

## Combien coûte la garde d'animaux à Annecy ?

Le pet sitting entre particuliers à Annecy s'inscrit dans une logique d'entraide : vous proposez votre maison contre une présence rassurante auprès de votre animal. Aucun frais de garde n'est facturé entre propriétaire et gardien sur Guardiens. À titre indicatif, les solutions classiques pratiquées à Annecy se situent dans ces fourchettes :

- **Pension canine ou féline en chenil** : 18 à 35 € par jour selon la taille de l'animal et la saison.
- **Pet sitter rémunéré à domicile** : 15 à 25 € par visite, ou 25 à 40 € la nuit.
- **Garde chez un particulier indépendant** : 12 à 20 € par jour.
- **House-sitting sur Guardiens** : gratuit pour les deux parties, l'échange repose sur la confiance et la couverture mutuelle.

## Quand publier votre demande à Annecy ?

La demande de gardiens à Annecy explose sur trois périodes :

- **Vacances d'hiver (décembre à février)** : station du Semnoz, Aravis, Bauges, beaucoup de propriétaires partent skier.
- **Vacances d'été (juillet-août)** : forte tension, publiez votre annonce 6 à 8 semaines à l'avance.
- **Ponts de printemps (mai-juin)** : demande croissante autour du lac.

Publier tôt augmente vos chances de trouver une personne de confiance. Les gardiens locaux postulent souvent dans la semaine qui suit la publication.

## Profil d'un bon gardien à Annecy

Au-delà des bases (ponctualité, fiabilité, communication), un gardien apprécié à Annecy partage souvent ces qualités :

- À l'aise avec les balades en montagne, capable de gérer un chien actif sur les sentiers du Semnoz ou des Glières.
- Habitué au stationnement compliqué en hyper-centre et aux marchés du week-end.
- Sensibilisé aux risques saisonniers : épillets en été, sel de déneigement en hiver, baignade surveillée sur les plages autorisées.

## Questions fréquentes

**Mon chat sort librement, est-ce un problème ?** Précisez-le clairement dans votre annonce et lors de l'échange. La majorité des gardiens à Annecy connaissent bien cette configuration, notamment dans les quartiers résidentiels (Cran-Gevrier, Annecy-le-Vieux, Seynod).

**Faut-il un véhicule pour le gardien ?** Pas obligatoire en hyper-centre. Recommandé si vous habitez sur les hauteurs ou les communes périphériques.

**Comment vérifier le profil d'un candidat ?** Lisez les avis publiés sur sa fiche, consultez ses badges de confiance, organisez un échange vidéo avant de confirmer.
$ADD$,
    seo_dirty_at = now()
WHERE slug = 'pet-sitting-annecy-guide';

-- B2) Étoffer pet-sitting-grenoble-guide
UPDATE public.articles
SET content = content || $ADD$

## Combien coûte la garde d'animaux à Grenoble ?

Sur Guardiens, le house-sitting est gratuit : un échange entre particuliers, sans transaction financière directe. À titre de comparaison, les autres solutions pratiquées à Grenoble :

- **Pension canine traditionnelle** : 18 à 30 € par jour selon la taille.
- **Pet sitter rémunéré (visites)** : 12 à 22 € par passage.
- **Garde à domicile par un indépendant** : 22 à 38 € la nuit.
- **House-sitting Guardiens** : gratuit, basé sur la réciprocité.

## Quand publier votre annonce à Grenoble ?

La demande suit fortement le calendrier scolaire de l'académie de Grenoble :

- **Décembre à mars** : pic majeur, week-ends ski à Chamrousse, l'Alpe d'Huez, les Sept Laux. Publiez 4 à 6 semaines à l'avance.
- **Juillet-août** : seconde tension. Beaucoup de Grenoblois partent en bord de mer ou à l'étranger.
- **Mai et octobre** : ponts et vacances de la Toussaint, demande modérée mais réelle.

## Profil d'un bon gardien à Grenoble

Grenoble combine ville dense et accès montagne immédiat. Un gardien apprécié sur ce territoire est généralement :

- Capable d'emmener un chien actif sur les sentiers de la Bastille, du Vercors ou de Chartreuse.
- À l'aise avec les particularités urbaines : appartements en étage, ascenseurs, copropriétés.
- Conscient des contraintes saisonnières : pollution hivernale en cuvette, fortes chaleurs estivales, vigilance épillets au printemps.

## Quartiers où la demande est la plus forte

- **Hyper-centre, Championnet, Notre-Dame** : appartements anciens, beaucoup de chats.
- **Île Verte, Saint-Bruno** : familles avec chiens de taille moyenne.
- **La Tronche, Meylan, Corenc** : maisons avec jardin, chiens de plus grand gabarit.
- **Échirolles, Saint-Martin-d'Hères** : forte demande étudiante et jeunes actifs.

## Questions fréquentes

**Faut-il un véhicule à Grenoble ?** Le réseau TAG et les pistes cyclables suffisent en centre-ville. Pour les balades en montagne, un véhicule reste un vrai plus.

**Mon animal a besoin de soins vétérinaires, comment ça se passe ?** Vous laissez les coordonnées de votre vétérinaire habituel et une autorisation écrite. En cas d'urgence, plusieurs cliniques 24h/24 existent à Grenoble et Meylan.

**Peut-on faire garder un NAC (rongeur, oiseau, reptile) ?** Oui. Mentionnez précisément l'espèce et les besoins spécifiques dans votre annonce.
$ADD$,
    seo_dirty_at = now()
WHERE slug = 'pet-sitting-grenoble-guide';

-- B3) Étoffer pet-sitting-clermont-ferrand-guide
UPDATE public.articles
SET content = content || $ADD$

## Combien coûte la garde d'animaux à Clermont-Ferrand ?

Le house-sitting entre particuliers sur Guardiens est gratuit, sans transaction financière entre propriétaire et gardien. Les autres solutions sur Clermont-Ferrand et son agglomération :

- **Pension canine en périphérie** (Volvic, Cournon, Royat) : 15 à 28 € par jour.
- **Pet sitter rémunéré à domicile** : 12 à 20 € la visite, 25 à 35 € la nuit.
- **House-sitting Guardiens** : gratuit, fondé sur la confiance.

## Quand publier votre annonce à Clermont-Ferrand ?

Trois moments concentrent l'essentiel des demandes :

- **Été (juillet-août)** : départs en vacances, surtout vers le littoral atlantique et le Sud.
- **Hiver (décembre-février)** : escapades au Mont-Dore, à Super-Besse, en Sancy.
- **Week-ends prolongés du printemps** : Ascension, Pentecôte, Toussaint.

Publiez au moins 4 semaines à l'avance pour maximiser le nombre de candidatures.

## Profil d'un bon gardien à Clermont-Ferrand

Clermont est une ville à taille humaine, entourée par le parc naturel régional des Volcans. Un gardien à l'aise sur ce territoire est souvent :

- Sensible à la qualité de l'air et au cadre naturel exceptionnel (Puy de Dôme, chaîne des Puys).
- Capable d'emmener un chien sur des sentiers parfois techniques (Pariou, Sancy, Puy de la Vache).
- À l'aise dans les quartiers historiques (Montferrand, place de Jaude) et les zones plus résidentielles (Chamalières, Royat, Beaumont).

## Quartiers où la demande est la plus forte

- **Centre, Jaude, Pasteur** : appartements anciens, fort taux de chats.
- **Chamalières, Royat** : maisons avec jardin, profil familles.
- **Cournon, Aubière, Beaumont** : pavillonnaire, chiens de gabarit moyen à grand.

## Questions fréquentes

**Le climat est-il un facteur à prendre en compte ?** Oui. Les hivers peuvent être rigoureux (gel, neige), les étés secs et chauds. Adaptez les horaires de promenade en conséquence.

**Y a-t-il des vétérinaires de garde la nuit ?** Plusieurs cliniques sur Clermont et Aubière proposent un service d'urgence. Communiquez les coordonnées dès l'arrivée du gardien.

**Mon animal n'est pas habitué aux escaliers d'immeuble, comment l'aider ?** Prévoyez quelques jours d'adaptation avant votre départ. La rencontre préalable avec le gardien facilite la transition.
$ADD$,
    seo_dirty_at = now()
WHERE slug = 'pet-sitting-clermont-ferrand-guide';

-- B4) Étoffer garde-chien-lyon-solutions
UPDATE public.articles
SET content = content || $ADD$

## Comparatif des solutions de garde à Lyon

À Lyon, plusieurs solutions coexistent. Le bon choix dépend du tempérament de votre chien, de la durée de garde et de votre budget.

### Pension canine

Solution traditionnelle. Votre chien est hébergé en chenil ou en environnement collectif. À Lyon et en périphérie (Décines, Brignais, Saint-Genis-Laval), comptez 18 à 35 € par jour selon la taille et la saison.

- **Avantages** : encadrement professionnel, structure dédiée.
- **Inconvénients** : changement total d'environnement, parfois stress pour les chiens âgés ou anxieux, peu d'attention individuelle.

### Pet sitter rémunéré

Un professionnel passe à votre domicile ou héberge votre chien chez lui. Tarifs à Lyon : 15 à 25 € la visite, 25 à 40 € la nuit.

- **Avantages** : chien dans son environnement habituel, attention individualisée.
- **Inconvénients** : coût rapidement élevé sur une longue durée, qualité variable selon les profils.

### Famille ou ami

La solution la moins coûteuse, mais pas toujours disponible et parfois source de tension si la garde se prolonge.

### House-sitting entre particuliers (Guardiens)

Un gardien vient vivre chez vous. Aucun frais entre propriétaire et gardien : c'est un échange de service basé sur la confiance.

- **Avantages** : votre chien garde tous ses repères, votre maison est habitée, gratuité totale, présence continue.
- **Inconvénients** : demande un peu d'organisation et de communication en amont.

## Quel profil de chien pour quelle solution ?

- **Chiot ou jeune chien** : house-sitting ou pet sitter à domicile, pour limiter le stress et garder ses repères.
- **Chien âgé ou sous traitement** : house-sitting fortement recommandé, l'environnement et le rythme sont préservés.
- **Chien anxieux ou réactif** : éviter la pension collective, privilégier une garde à domicile par une personne qu'il a rencontrée avant.
- **Chien sociable et joueur** : toutes les options sont envisageables.

## Comment bien choisir à Lyon ?

- **Distance** : un gardien dans votre quartier (Croix-Rousse, Part-Dieu, Confluence, Monplaisir) facilite la rencontre préalable.
- **Avis et badges** : sur Guardiens, chaque profil affiche un historique de gardes, des avis vérifiés et des badges de confiance.
- **Rencontre préalable** : indispensable. Une promenade test ou un café à la maison permet à votre chien de valider la personne.
- **Documents partagés** : carnet de santé, coordonnées vétérinaire, autorisation de soins, habitudes alimentaires.

## Questions fréquentes

**Combien de temps à l'avance dois-je m'organiser ?** Pour l'été ou les vacances scolaires, comptez 6 à 8 semaines. Hors saison, 2 à 3 semaines suffisent généralement.

**Mon chien aboie quand je pars, est-ce un problème ?** Non, c'est très courant. Le gardien à domicile limite ce stress : votre chien reste dans son environnement et avec ses odeurs familières.

**Que se passe-t-il en cas de problème de santé ?** Le gardien suit le protocole convenu en amont (vétérinaire habituel, autorisation de soins, contact urgence). Tout est cadré avant le départ.
$ADD$,
    seo_dirty_at = now()
WHERE slug = 'garde-chien-lyon-solutions';

-- D) Cannibalization fixes
UPDATE public.articles SET published = false, seo_dirty_at = now()
WHERE slug IN ('petites-missions-entraide-guide', 'devenir-pet-sitter-guide-debutant');

INSERT INTO public.redirects (slug_from, slug_to, redirect_type, notes) VALUES
  ('petites-missions-entraide-guide', 'petites-missions-entraide-guardiens', 301, 'Fusion cannibalisation: version courte vers version longue (2026-06-08)'),
  ('devenir-pet-sitter-guide-debutant', 'comment-devenir-home-sitter-france-guide-debutant', 301, 'Fusion cannibalisation: version courte vers guide complet (2026-06-08)')
ON CONFLICT (slug_from) DO UPDATE SET
  slug_to = EXCLUDED.slug_to,
  redirect_type = EXCLUDED.redirect_type,
  notes = EXCLUDED.notes,
  updated_at = now();