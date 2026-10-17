-- Refonte des guides arrosage à Lyon et choix de commune avec un chien, autorisée le 17/10/2026.
-- Les URL, auteurs, dates de publication et indexabilité sont conservés.
BEGIN;
CREATE TABLE IF NOT EXISTS public._backup_articles_suite_lot16_20261017 AS SELECT * FROM public.articles WHERE false;
REVOKE ALL ON public._backup_articles_suite_lot16_20261017 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public._backup_articles_suite_lot16_20261017 TO service_role;
ALTER TABLE public._backup_articles_suite_lot16_20261017 ENABLE ROW LEVEL SECURITY;
SELECT id FROM public.articles WHERE id IN ('585fc8ba-625d-4e68-939e-28f43165b466'::uuid,'a6f2ba49-6419-4c1f-ad3d-8aaf1f9178ee'::uuid) ORDER BY id FOR UPDATE;

DO $guide_0$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_0_20261017$# Arrosage des plantes pendant les vacances à Lyon : quelle aide choisir ?

**Pour faire arroser vos plantes pendant les vacances à Lyon, choisissez une aide qui peut assurer les passages et les gestes nécessaires à votre adresse.** Un voisin, un proche, l’entraide ou une prestation professionnelle sont des possibilités à comparer. Le prix seul ne décrit ni l’accès au logement ni le travail attendu.

Guardiens permet de publier un besoin d’entraide pour des passages sans hébergement. Si vous cherchez aussi à confier la maison à une personne qui séjourne chez vous, c’est une [organisation de house-sitting](/actualites/c-est-quoi-le-house-sitting) à préparer séparément.

**Repères :** [comparer les solutions](#solutions), [décrire votre demande](#demande), [convenir des accès](#acces), [préparer les plantes et l’eau](#plantes), [si personne n’est disponible](#relais), [questions fréquentes](#faq).

## <a id="solutions"></a>Voisin, entraide ou professionnel : que comparer ?

La première question est la disponibilité aux dates prévues. Viennent ensuite les tâches, les compétences nécessaires et les conditions pratiques.

| Possibilité | Questions avant de confirmer |
| --- | --- |
| Proche ou voisin | Quels passages peut-il assurer ? Que faire s’il doit s’absenter lui aussi ? |
| Entraide entre particuliers | Quel besoin, quel trajet et quels gestes sont acceptés des deux côtés ? |
| Prestation professionnelle | Que comprend le devis : durée, déplacement, préparation, clés et éventuels suppléments ? |
| Séjour hébergé | Souhaitez-vous confier le logement avec des tâches et une présence convenues ? |

Pour une prestation payante, demandez le **coût total correspondant à votre demande**. Un tarif de visite pour animaux ne doit pas être automatiquement assimilé à un tarif d’arrosage ; un jardin important peut aussi demander une prestation différente de quelques pots. Nous ne publions pas ici de moyenne lyonnaise sans données comparables.

Sur Guardiens, l’entraide fonctionne **sans paiement**, avec un merci, un café ou un coup de main lorsque ce sera votre tour, à voir ensemble. La plateforme est **actuellement 100 % gratuite**. Nous souhaitons d’abord construire ce réseau et l’améliorer avec vos retours. Consultez les [conditions actuelles](/tarifs) pour son fonctionnement et son évolution.

## <a id="demande"></a>Les informations qui rendent une demande d’arrosage utile

Indiquez votre secteur dans Lyon, les dates et les conditions de passage. Le quartier donne un point de départ pour discuter, sans promettre qu’une personne sera disponible tout près. Ne publiez pas l’adresse complète avec les codes d’accès ou l’emplacement des clés.

Votre demande peut préciser :

- **les espaces concernés** : appartement, balcon, terrasse ou jardin ;
- **les plantes à suivre** : nombre de pots, photos utiles et gestes attendus ;
- **les passages à organiser**, d’après les besoins réels des plantes ;
- **le temps estimé**, en vous appuyant sur votre propre routine ;
- **les contraintes matérielles** : étage, ascenseur, point d’eau et équipement ;
- **les limites** : pas de taille, de traitement ou de manutention si ce n’est pas prévu.

Ces informations permettent une discussion concrète. « Quelques plantes, tout est facile » laisse trop de place à l’interprétation, surtout si les pots sont répartis entre plusieurs pièces ou plusieurs niveaux.

## <a id="acces"></a>Clés, immeuble et passage : les conditions à régler

Discutez du trajet réel depuis l’adresse du relais. Les pentes, les escaliers, le stationnement éventuel et les horaires possibles comptent davantage qu’une distance approximative sur la carte.

Convenez de la remise et de la restitution des clés, des portes à utiliser et de la fermeture après chaque visite. Gardez les détails d’accès pour la personne retenue. Laissez le matériel prêt, avec une notice pour tout équipement qui doit être vérifié.

Échangez avant de confier l’accès. Une rencontre est possible **si les deux personnes le souhaitent**. Un écusson d’identité atteste d’un contrôle de document ; il ne garantit pas la compétence d’arrosage ni la fiabilité d’une personne. Les avis peuvent compléter la discussion lorsqu’ils existent.

## <a id="plantes"></a>Quelles consignes et restrictions d’eau transmettre ?

Préparez des indications par plante, avec photo ou emplacement, geste habituel, quantité mesurée avec le récipient laissé sur place et situation à vous signaler. Le rythme dépend des végétaux et des conditions du logement : il n’existe pas de fréquence unique pour tous les balcons lyonnais.

Le [guide d’arrosage pendant les vacances](/actualites/arroser-plantes-pendant-vacances-guide) détaille la préparation des méthodes. Testez à l’avance les dispositifs retenus et demandez conseil sur les besoins que vous ne connaissez pas. Ne laissez pas le relais improviser une même quantité pour tous les pots.

Avant le départ, vérifiez les mesures applicables sur [VigiEau](https://vigieau.gouv.fr/) avec l’adresse, le profil et le type d’eau utilisés. Transmettez les consignes correspondantes et convenez de les revérifier pendant l’absence si nécessaire. Un horaire cité dans une ancienne actualité ne fixe pas ce qui sera autorisé pendant vos vacances.

## <a id="relais"></a>Si personne ne peut assurer les passages

Anticipez la recherche et gardez plusieurs possibilités. Publier un besoin ne garantit ni réponse ni remplacement immédiat. Si une personne se désiste, contactez le relais qui a accepté de l’être ou cherchez une autre organisation avant le départ.

Pour un séjour plus long, le [guide de préparation du jardin pendant une absence](/actualites/entretenir-jardin-pendant-absence) aide à distinguer tâches courantes et entretien technique. Un gardien hébergé peut être envisagé si le séjour et les responsabilités conviennent aux deux personnes, avec ou sans animaux. Il est hébergé sans rémunération, les dépenses convenues restant distinctes.

S’il y a des animaux à la maison, préparez leurs soins et leur besoin de présence séparément. Une visite d’arrosage ne définit pas leur garde.

## <a id="faq"></a>Questions fréquentes

:::faq
### Qui peut venir arroser mes plantes à Lyon ?
Un proche, un voisin, une personne rencontrée via l’entraide ou un professionnel, selon les disponibilités et les tâches nécessaires. Confirmez les conditions avant votre départ.

### Combien coûte l’arrosage pendant une absence ?
Pour un professionnel, demandez un devis qui précise passages, déplacement, accès et préparation. L’entraide sur Guardiens fonctionne sans paiement et la plateforme est actuellement gratuite.

### Faut-il demander quelqu’un dans le même arrondissement ?
Le trajet réel et les créneaux possibles sont plus utiles que la seule limite d’un arrondissement. Donnez un secteur, puis discutez des accès avec la personne intéressée.

### La personne doit-elle dormir chez moi ?
Non pour de simples passages d’entraide. Un séjour de house-sitting correspond à une autre organisation, avec hébergement et responsabilités convenues.

### Peut-on ajouter d’autres tâches à l’arrosage ?
Décrivez-les avant de confirmer et vérifiez que la personne les accepte et sait les faire. La garde d’animaux, le jardinage technique et les réparations ne sont pas implicitement inclus.
:::$suite_content_0_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='585fc8ba-625d-4e68-939e-28f43165b466'::uuid AND slug='arroser-plantes-vacances-lyon';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/arroser-plantes-vacances-lyon' THEN
    RAISE EXCEPTION 'Guide suite 0 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Arrosage des plantes pendant les vacances à Lyon : quelle aide choisir ?'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Voisin, coup de main ou professionnel : comparez les conditions pour faire arroser vos plantes à Lyon, puis préparez une demande précise.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Arroser ses plantes pendant les vacances à Lyon'
    AND before_row.meta_description IS NOT DISTINCT FROM 'À Lyon, choisissez entre voisin, entraide et prestation d’arrosage. Décrivez les passages, le budget éventuel et les accès pour organiser votre absence.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Une personne arrose des plantes en pot sur un balcon.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"organisation de house-sitting","url":"/actualites/c-est-quoi-le-house-sitting"},{"text":"conditions actuelles","url":"/tarifs"},{"text":"guide d’arrosage pendant les vacances","url":"/actualites/arroser-plantes-pendant-vacances-guide"},{"text":"guide de préparation du jardin pendant une absence","url":"/actualites/entretenir-jardin-pendant-absence"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 13:10:17.548028+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 0 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot16_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 0 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot16_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot16_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Arrosage des plantes pendant les vacances à Lyon : quelle aide choisir ?',
    excerpt='Voisin, coup de main ou professionnel : comparez les conditions pour faire arroser vos plantes à Lyon, puis préparez une demande précise.',
    meta_title='Arroser ses plantes pendant les vacances à Lyon',
    meta_description='À Lyon, choisissez entre voisin, entraide et prestation d’arrosage. Décrivez les passages, le budget éventuel et les accès pour organiser votre absence.',
    hero_image_alt='Une personne arrose des plantes en pot sur un balcon.',
    internal_links='[{"text":"organisation de house-sitting","url":"/actualites/c-est-quoi-le-house-sitting"},{"text":"conditions actuelles","url":"/tarifs"},{"text":"guide d’arrosage pendant les vacances","url":"/actualites/arroser-plantes-pendant-vacances-guide"},{"text":"guide de préparation du jardin pendant une absence","url":"/actualites/entretenir-jardin-pendant-absence"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='arroser-plantes-vacances-lyon' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 0 : % ligne au lieu de 1',affected; END IF;
END;
$guide_0$;

DO $guide_1$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_1_20261017$# Vivre avec un chien autour de Lyon : quelles villes comparer ?

**La meilleure ville autour de Lyon pour vivre avec votre chien est celle où votre quotidien fonctionne depuis le logement envisagé.** Sortie du matin, escaliers, trajet vers le travail, accès aux soins et organisation des absences comptent autant qu’un grand espace vert aperçu sur une carte.

Voici des repères dans **Villeurbanne, Tassin-la-Demi-Lune, Écully, Oullins et Saint-Genis-Laval**, puis les vérifications à faire sur place. Cette sélection donne des points de comparaison ; elle ne mesure pas la qualité de toutes les communes ni la disponibilité de gardiens dans chacune.

**Repères :** [comparer les communes](#communes), [tester les sorties](#sorties), [préparer les transports](#transports), [vérifier le logement](#logement), [organiser les absences](#absences), [questions fréquentes](#faq).

## <a id="communes"></a>Cinq communes, des questions différentes à vérifier

Informations consultées le **17 octobre 2026**. Vérifiez les règles et accès actuels avant une visite ; un projet d’aménagement n’est pas un équipement déjà disponible.

| Commune | Repère vérifiable | Ce qu’il faut tester depuis le logement |
| --- | --- | --- |
| Villeurbanne | La Ville distingue des aires de liberté et les parcs de la Feyssine et Nathalie Gautier autorisés en laisse. | Parcours quotidien, traversées et accès à l’espace adapté à votre chien. |
| Tassin-la-Demi-Lune | La Ville indique l’admission en laisse dans ses parcs ; de nouveaux aménagements canins sont à l’étude. | Promenade possible aujourd’hui, sans compter sur un futur espace de liberté. |
| Écully | La Métropole présente le parc du Vivier, chemin du Trouillat. | Accès réel, horaires et règles pour les chiens ; la présence d’un parc ne signifie pas liberté partout. |
| Oullins | Le métro B dessert notamment Oullins Centre et Gare d’Oullins. | Trajet à pied, correspondances et conditions de transport de votre chien. |
| Saint-Genis-Laval | La ligne B atteint Saint-Genis-Laval Hôpital Lyon Sud. | Distance du logement à la station et organisation des sorties pendant vos déplacements. |

Sources : [Villeurbanne, Mon chien en ville](https://www.villeurbanne.fr/fiches-pratiques/cabinet-du-maire/mon-chien-en-ville), [Tassin, point municipal du 9 octobre 2026](https://www.tassinlademilune.fr/cadre-de-ville/mieux-vivre-avec-nos-animaux-les-pistes-de-reflexion-pour-tassin-la-demi-lune), [Métropole, parc du Vivier](https://www.grandlyon.com/parc/parc-du-vivier), [TCL, ligne B](https://www.tcl.fr/lignes/metro-b).

À Tassin, les espaces envisagés et les créneaux de liberté discutés ne doivent pas être présentés comme des possibilités acquises. À Villeurbanne, un canisite destiné aux besoins n’a pas le même usage qu’une aire de liberté. Ces différences sont plus utiles qu’une étiquette générale de ville « amie des chiens ».

Pour explorer d’autres communes, appliquez les mêmes vérifications à l’adresse visée et consultez les informations municipales. Aucun type de foyer, niveau de revenu ou race de chien ne désigne automatiquement une commune idéale.

## <a id="sorties"></a>Tester la promenade ordinaire, pas seulement la sortie du week-end

Parcourez le quartier aux heures où vous sortiriez réellement. Regardez les traversées, la largeur des passages, les escaliers, les zones fréquentées et une possibilité de trajet plus court. Vérifiez les horaires du parc et les règles affichées pour les chiens, y compris dans les espaces dédiés.

Un jardin peut être pratique, mais ne décrit pas à lui seul les besoins de sorties, d’activité et de présence de votre animal. Un parc animé peut convenir à certains chiens et compliquer la sortie d’autres. Raisonnez selon les habitudes et difficultés de votre chien ; en cas de doute sur son état ou son comportement, demandez conseil au vétérinaire.

Le [guide des parcs et promenades avec un chien à Lyon](/actualites/parcs-chiens-lyon-guide-complet) complète le repérage. Ne déduisez pas de la présence d’un sentier une autorisation générale de détacher le chien.

## <a id="transports"></a>Se déplacer avec le chien : vérifier le trajet et les conditions

La proximité d’une station compte pour vos déplacements, mais elle ne garantit pas que l’animal puisse effectuer le trajet prévu. Consultez le [règlement actuel du réseau TCL, accès et transport des animaux](https://www.tcl.fr/a-propos/reglement-du-reseau-tcl-unifie), selon le chien et le service emprunté.

Le règlement distingue notamment les petits animaux transportés dans un contenant fermé et la dérogation pour certains chiens de plus de 6 kg, avec attestation, laisse et muselière. Les conditions et exclusions sont à lire avant le voyage. Ne réduisez pas cette règle à « tous les chiens sont acceptés avec un billet ».

Pour comparer deux logements, évaluez également votre temps d’absence réel, les déplacements du gardien éventuel et la solution de transport vers le vétérinaire. Ne faites pas du transport en commun l’unique solution supposée possible en cas d’urgence.

## <a id="logement"></a>Les points à vérifier dans le logement lui-même

Pendant la visite, examinez ce qui change la vie de tous les jours :

- étage, ascenseur et accès si votre chien ne peut pas utiliser les escaliers ;
- bruit, passages devant la porte et emplacement de son repos ;
- ouvertures, balcon, clôture et portillon si un extérieur existe ;
- place pour le matériel et nettoyage après les sorties ;
- conditions d’accueil des animaux à vérifier pour le logement concerné.

Ne présumez ni qu’une maison sera calme ni qu’un appartement sera inadapté. Comparez les conditions concrètes et les absences envisagées. Une rencontre avec des habitants peut enrichir le repérage, sans transformer leur avis en mesure de toute la commune.

## <a id="absences"></a>Préparer une garde après l’installation

Repérez un vétérinaire habituel, les contacts de garde et les trajets avant d’en avoir besoin. Le [guide des urgences vétérinaires de Lyon](/actualites/veterinaire-urgence-lyon-guide) fournit des contacts à appeler avant de se déplacer.

Pour une absence, comparez visites, accueil ailleurs et gardien hébergé avec le [guide du pet-sitting à Lyon](/actualites/pet-sitting-lyon-guide-complet). Sur Guardiens, le house-sitting consiste à accueillir une personne qui veille sur le logement et, s’il y en a, les animaux, selon les tâches et horaires convenus. Le gardien est hébergé sans rémunération ; la plateforme est **actuellement 100 % gratuite pour les deux rôles**, avec les dépenses convenues distinctes. Consultez les [conditions actuelles](/tarifs).

Présentez les besoins de votre chien et le logement sans compter sur une disponibilité à proximité. Un écusson d’identité n’est pas une garantie de compétence ; échangez sur l’expérience utile et les avis lorsqu’ils existent. Une rencontre est possible **si les deux personnes le souhaitent**. Après confirmation, un accord est proposé et sa signature est facultative.

Gardez un relais accepté ou une autre solution : ni les candidats ni un remplacement immédiat ne sont garantis. Le [guide pour choisir un gardien](/actualites/choisir-gardien-bons-criteres) aide à préparer ces échanges.

## <a id="faq"></a>Questions fréquentes

:::faq
### Quelle est la meilleure commune autour de Lyon avec un chien ?
Cela dépend de votre adresse, de votre logement, des sorties accessibles et de vos absences. Comparez ces critères plutôt que de choisir une commune sur un classement général.

### Peut-on détacher son chien dans tous les parcs de Villeurbanne ?
La Ville distingue les aires de liberté des parcs autorisés en laisse. Consultez sa fiche pratique et la signalisation du lieu, sans généraliser les règles d’un espace à toute la commune.

### Le métro dessert-il déjà Saint-Genis-Laval ?
Oui, la ligne B atteint Saint-Genis-Laval Hôpital Lyon Sud. Vérifiez le trajet depuis le logement, les informations de service et les conditions applicables si vous voyagez avec un chien.

### Un jardin suffit-il pour choisir le logement d’un chien ?
Non : examinez aussi les sorties, les accès, le repos, les absences et les besoins individuels de l’animal. Un extérieur ne répond pas à toutes ces questions.

### Trouvera-t-on forcément un gardien dans ces communes ?
Aucune disponibilité à une date ou dans un rayon donné n’est garantie. Décrivez votre besoin, anticipez les échanges et préparez une autre solution si nécessaire.
:::$suite_content_1_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='a6f2ba49-6419-4c1f-ad3d-8aaf1f9178ee'::uuid AND slug='meilleures-villes-vivre-chien-autour-lyon';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/meilleures-villes-vivre-chien-autour-lyon' THEN
    RAISE EXCEPTION 'Guide suite 1 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Vivre avec un chien autour de Lyon : quelles villes comparer ?'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Des repères vérifiables dans cinq communes autour de Lyon et une méthode pour comparer le quotidien depuis une adresse précise avec votre chien.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Où vivre avec un chien autour de Lyon ? Villes et critères'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Villeurbanne, Tassin, Écully, Oullins et Saint-Genis-Laval : comparez accès aux sorties, transports et logement avant de choisir où vivre avec votre chien.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Deux adultes et deux enfants marchent sur une allée dans un parc paysager.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"guide des parcs et promenades avec un chien à Lyon","url":"/actualites/parcs-chiens-lyon-guide-complet"},{"text":"guide des urgences vétérinaires de Lyon","url":"/actualites/veterinaire-urgence-lyon-guide"},{"text":"guide du pet-sitting à Lyon","url":"/actualites/pet-sitting-lyon-guide-complet"},{"text":"conditions actuelles","url":"/tarifs"},{"text":"guide pour choisir un gardien","url":"/actualites/choisir-gardien-bons-criteres"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 14:55:16.585687+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 1 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot16_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 1 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot16_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot16_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Vivre avec un chien autour de Lyon : quelles villes comparer ?',
    excerpt='Des repères vérifiables dans cinq communes autour de Lyon et une méthode pour comparer le quotidien depuis une adresse précise avec votre chien.',
    meta_title='Où vivre avec un chien autour de Lyon ? Villes et critères',
    meta_description='Villeurbanne, Tassin, Écully, Oullins et Saint-Genis-Laval : comparez accès aux sorties, transports et logement avant de choisir où vivre avec votre chien.',
    hero_image_alt='Deux adultes et deux enfants marchent sur une allée dans un parc paysager.',
    internal_links='[{"text":"guide des parcs et promenades avec un chien à Lyon","url":"/actualites/parcs-chiens-lyon-guide-complet"},{"text":"guide des urgences vétérinaires de Lyon","url":"/actualites/veterinaire-urgence-lyon-guide"},{"text":"guide du pet-sitting à Lyon","url":"/actualites/pet-sitting-lyon-guide-complet"},{"text":"conditions actuelles","url":"/tarifs"},{"text":"guide pour choisir un gardien","url":"/actualites/choisir-gardien-bons-criteres"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='meilleures-villes-vivre-chien-autour-lyon' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 1 : % ligne au lieu de 1',affected; END IF;
END;
$guide_1$;

COMMIT;
