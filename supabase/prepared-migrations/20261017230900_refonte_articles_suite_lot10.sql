-- Refonte des guides garde en Savoie et séjour en Haute-Savoie, autorisée le 17/10/2026.
-- Les URL, auteurs, dates de publication et indexabilité sont conservés.
BEGIN;
CREATE TABLE IF NOT EXISTS public._backup_articles_suite_lot10_20261017 AS SELECT * FROM public.articles WHERE false;
REVOKE ALL ON public._backup_articles_suite_lot10_20261017 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public._backup_articles_suite_lot10_20261017 TO service_role;
ALTER TABLE public._backup_articles_suite_lot10_20261017 ENABLE ROW LEVEL SECURITY;
SELECT id FROM public.articles WHERE id IN ('ad61f9cc-ef75-483e-b000-083742587b53'::uuid,'9be6a6f6-9ea8-481b-8aa1-df2ee29a8e33'::uuid) ORDER BY id FOR UPDATE;

DO $guide_0$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_0_20261017$# Garde de chien et de chat en Savoie : Chambéry, Aix-les-Bains, Tarentaise

**Pour faire garder un chien ou un chat en Savoie, comparez les soins et les horaires assurés, puis les accès à votre logement ou au lieu d’accueil.** Un proche, des visites, une pension ou le séjour d’un gardien chez vous peuvent convenir selon l’animal et vos dates. La commune ne suffit pas à déterminer la bonne formule.

À Chambéry, autour d’Aix-les-Bains, en Tarentaise ou en Maurienne, ce guide aide à organiser la prise en charge. Si vous souhaitez héberger une personne pendant votre absence, la [page house-sitting Chambéry](/house-sitting/chambery) présente le séjour à domicile, et le [guide d’Aix-les-Bains](/actualites/house-sitting-aix-les-bains) complète la préparation autour du lac du Bourget.

**Dans ce guide**

- [Comparer les formules](#solutions)
- [Budget et exemple local](#budget)
- [Les vérifications selon votre secteur](#secteurs)
- [Sorties du chien et consignes des animaux](#animaux)
- [Préparer un séjour sur Guardiens](#guardiens)
- [Questions fréquentes](#faq)

## <a id="solutions"></a>Visites, pension ou gardien chez vous ?

| Formule | Organisation | Question décisive |
| --- | --- | --- |
| Proche | Passages, accueil ou séjour selon ce qu’il accepte. | Peut-il assurer les tâches aux dates et horaires utiles ? |
| Visites à domicile | Interventions définies pour les soins et les sorties. | Le nombre et la durée des passages couvrent-ils les besoins ? |
| Pension ou accueil extérieur | L’animal séjourne dans un autre lieu. | Les conditions d’accueil, de cohabitation et de soins conviennent-elles ? |
| Gardien hébergé | Une personne séjourne dans votre logement. | Son planning et son expérience correspondent-ils aux tâches ? |

Dormir chez vous ne signifie pas rester présent toute la journée. Demandez un planning concret, notamment si votre chien a besoin de sorties à des heures précises ou si un soin prescrit ne peut pas attendre.

Le [comparatif des alternatives à la pension](/actualites/pension-chien-alternatives-guide) détaille les modalités. Une maison avec jardin ne garantit pas davantage les soins qu’un appartement ; l’organisation réelle compte.

## <a id="budget"></a>Quel budget pour une garde en Savoie ?

Pour une prestation payante, demandez un devis pour vos dates et votre adresse. Vérifiez si le tarif correspond à une visite, une journée ou une période de vingt-quatre heures, ainsi que les soins, la nourriture, les déplacements et les conditions d’annulation.

**Exemple consulté le 17 octobre 2026 :** [Team Dog des Savoies, au Montcel](https://teamdogdessavoies.com/pension-canine/), affiche un tarif standard de **35 € par vingt-quatre heures, nuit incluse**. Le tarif de 25 € concerne les chiens déjà suivis en éducation canine. La page demande d’apporter les affaires et la nourriture du chien ; les frais vétérinaires sont distincts. Confirmez les conditions d’accueil et le devis auprès du prestataire. C’est un exemple identifié, pas une moyenne de la Savoie ni une recommandation de qualité.

**Guardiens est actuellement 100 % gratuit pour les propriétaires et les gardiens.** Le gardien est hébergé sans rémunération ; les fournitures et les autres dépenses convenues restent à prévoir. Une participation aux frais de fonctionnement pourra être mise en place au plus tôt au second semestre 2027, avec trente jours de préavis. Consultez les [conditions actuelles](/tarifs).

## <a id="secteurs"></a>Que vérifier selon votre adresse en Savoie ?

### Chambéry et son agglomération

Pour des visites, confirmez la zone desservie et les horaires. Pour une personne hébergée, décrivez les accès, l’étage, les équipements et les parcours du chien. Un gardien n’a pas besoin d’être déjà installé dans le quartier, mais son arrivée doit être organisée.

### Aix-les-Bains et les abords du lac du Bourget

Précisez les tâches du logement et, si vous avez un extérieur, l’arrosage et les accès des animaux. Pour les promenades, vérifiez les règles du lieu choisi : une rive ou une plage n’est pas automatiquement accessible aux chiens.

### Albertville, Tarentaise et Maurienne

Vérifiez les trajets réels pour votre logement, le lieu de garde éventuel et le vétérinaire. Les horaires, les accès et les conditions du séjour peuvent demander une préparation spécifique. Ne déduisez pas d’un emploi en station ou de l’intersaison qu’une personne sera disponible.

Pour un accès de montagne ou un séjour hivernal, le [guide house-sitting en hiver](/actualites/house-sitting-hiver-montagne-savoie) aide à préparer les déplacements et le fonctionnement du logement. Dans le département voisin, le [guide de séjour en Haute-Savoie](/actualites/house-sitting-haute-savoie-annecy-megeve) complète les questions d’accès et d’équipements.

## <a id="animaux"></a>Quelles consignes transmettre pour les animaux ?

Pour un chien, indiquez les sorties, les moments seul, les équipements et les croisements difficiles. Fournissez un parcours adapté à ses possibilités et autorisé, sans supposer qu’une garde en montagne implique une randonnée sportive.

**Pour une promenade avec un chien de compagnie, le cœur du parc national de la Vanoise n’est pas autorisé, même en laisse.** Le [site du parc précise le périmètre, les règles extérieures et les cas particuliers des chiens d’assistance](https://vanoise-parcnational.fr/fr/des-decouvertes/sejourner-dans-le-parc/venir-avec-mon-chien). En dehors du cœur, les règles des communes et des réserves concernées restent à vérifier.

Pour un chat, précisez les repas, les litières, les interactions, les cachettes et les ouvertures autorisées. Les guides [chien à domicile](/actualites/garde-chien-faire-garder-son-chien) et [chat à domicile](/actualites/garde-chat-domicile-house-sitting) permettent d’aller dans le détail. Pour plusieurs espèces, décrivez les besoins de chacune et vérifiez l’expérience utile.

Un traitement demande des consignes prescrites et une personne capable de réaliser les gestes, avec l’avis du vétérinaire si nécessaire. Préparez ses coordonnées, le transport et les règles de dépenses. Un problème de santé préoccupant demande rapidement un avis vétérinaire, sans attendre la réponse du propriétaire pour le solliciter.

## <a id="guardiens"></a>Comment préparer un séjour sur Guardiens ?

Publiez les dates, le logement et les besoins des animaux, puis échangez avec les personnes intéressées. Comparez les disponibilités, les horaires et l’expérience utile. Consultez les avis lorsqu’il y en a ; l’écusson « Identité vérifiée » indique le contrôle d’une pièce d’identité, sans certifier compétence ni fiabilité.

Une rencontre peut avoir lieu si les deux le souhaitent. Après confirmation, un accord de garde est proposé, avec signature facultative. Organisez les clés, les consignes, les contacts et un relais qui a accepté ce rôle et peut accéder au logement. La [checklist avant le départ](/actualites/checklist-partir-vacances-animaux) reprend ces vérifications.

Commencez dès que vos dates sont connues et prévoyez une autre solution tant que la garde n’est pas confirmée. Aucune disponibilité toute l’année, candidature par secteur ou solution de remplacement immédiate n’est garantie.

Jérémie et Elisa ont créé Guardiens après cinq ans de house-sitting pour développer un réseau de confiance. Vos retours nous aident à améliorer le service. Pour les modalités de garde dans le département voisin, consultez aussi le [guide de garde d’animaux en Haute-Savoie](/actualites/garde-animaux-haute-savoie-guide).

## <a id="faq"></a>Questions fréquentes sur la garde d’animaux en Savoie

:::faq
### Comment faire garder mon chien à Chambéry ?
Comparez les sorties et les horaires assurés par un proche, des visites, un accueil ou une pension. Si vous souhaitez héberger un gardien, décrivez votre logement, les dates et les besoins, puis échangez avec les personnes intéressées. Une annonce ne garantit pas de candidature.

### Quel est le prix d’une pension pour chien en Savoie ?
Demandez un devis selon vos dates et les soins. À titre d’exemple, Team Dog des Savoies au Montcel affiche 35 € par vingt-quatre heures, nuit incluse, au tarif standard consulté le 17 octobre 2026. Ce prix ne constitue pas une moyenne du département.

### Peut-on trouver une garde en Tarentaise hors saison ?
La disponibilité dépend des personnes et des dates. Préparez les besoins et les accès dès que votre absence est connue, et gardez une autre solution tant que la prise en charge n’est pas confirmée. Aucun délai de recherche ne garantit un résultat.

### Faut-il un gardien déjà installé près de chez moi ?
Une personne peut venir d’ailleurs pour séjourner dans votre logement. Vérifiez son arrivée, ses déplacements et son planning. Le contact local de secours est un rôle distinct, à convenir avec une personne disponible.

### Peut-on promener le chien dans le parc de la Vanoise ?
Les chiens de compagnie ne sont pas autorisés dans le cœur du parc, même en laisse. Hors du cœur, les règles des communes et des réserves s’appliquent. Consultez le site du parc pour le périmètre, les itinéraires et les cas particuliers.

### Peut-on faire garder la maison sans animaux ?
Oui. Décrivez les besoins de présence, de plantes ou d’entretien et les conditions d’accueil. Les tâches doivent être comprises et acceptées ; le logement ne suppose pas des travaux implicites.

### La garde sur Guardiens est-elle gratuite en Savoie ?
La plateforme est actuellement 100 % gratuite pour les deux rôles, avec un gardien hébergé sans rémunération. Les dépenses restent à convenir. Une contribution au fonctionnement pourra évoluer au plus tôt au second semestre 2027, avec trente jours de préavis.
:::$suite_content_0_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='ad61f9cc-ef75-483e-b000-083742587b53'::uuid AND slug='garde-animaux-savoie-guide';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/garde-animaux-savoie-guide' THEN
    RAISE EXCEPTION 'Guide suite 0 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Garde de chien et de chat en Savoie : Chambéry, Aix-les-Bains, Tarentaise'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Faire garder un chien ou un chat en Savoie : choisir une formule, vérifier les déplacements et préparer les besoins des animaux, avec un exemple de tarif local.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Garde de chien en Savoie : Chambéry, Aix, Tarentaise'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Garde d’animaux en Savoie : comparez visites, pension et gardien hébergé. Budget, accès et soins à préparer à Chambéry, Aix-les-Bains et dans les vallées.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Une personne tient un chien en laisse devant un chalet en montagne.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"page house-sitting Chambéry","url":"/house-sitting/chambery"},{"text":"guide d’Aix-les-Bains","url":"/actualites/house-sitting-aix-les-bains"},{"text":"comparatif des alternatives à la pension","url":"/actualites/pension-chien-alternatives-guide"},{"text":"conditions actuelles","url":"/tarifs"},{"text":"guide house-sitting en hiver","url":"/actualites/house-sitting-hiver-montagne-savoie"},{"text":"guide de séjour en Haute-Savoie","url":"/actualites/house-sitting-haute-savoie-annecy-megeve"},{"text":"chien à domicile","url":"/actualites/garde-chien-faire-garder-son-chien"},{"text":"chat à domicile","url":"/actualites/garde-chat-domicile-house-sitting"},{"text":"checklist avant le départ","url":"/actualites/checklist-partir-vacances-animaux"},{"text":"guide de garde d’animaux en Haute-Savoie","url":"/actualites/garde-animaux-haute-savoie-guide"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 13:55:16.438121+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 0 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot10_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 0 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot10_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot10_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Garde de chien et de chat en Savoie : Chambéry, Aix-les-Bains, Tarentaise',
    excerpt='Faire garder un chien ou un chat en Savoie : choisir une formule, vérifier les déplacements et préparer les besoins des animaux, avec un exemple de tarif local.',
    meta_title='Garde de chien en Savoie : Chambéry, Aix, Tarentaise',
    meta_description='Garde d’animaux en Savoie : comparez visites, pension et gardien hébergé. Budget, accès et soins à préparer à Chambéry, Aix-les-Bains et dans les vallées.',
    hero_image_alt='Une personne tient un chien en laisse devant un chalet en montagne.',
    internal_links='[{"text":"page house-sitting Chambéry","url":"/house-sitting/chambery"},{"text":"guide d’Aix-les-Bains","url":"/actualites/house-sitting-aix-les-bains"},{"text":"comparatif des alternatives à la pension","url":"/actualites/pension-chien-alternatives-guide"},{"text":"conditions actuelles","url":"/tarifs"},{"text":"guide house-sitting en hiver","url":"/actualites/house-sitting-hiver-montagne-savoie"},{"text":"guide de séjour en Haute-Savoie","url":"/actualites/house-sitting-haute-savoie-annecy-megeve"},{"text":"chien à domicile","url":"/actualites/garde-chien-faire-garder-son-chien"},{"text":"chat à domicile","url":"/actualites/garde-chat-domicile-house-sitting"},{"text":"checklist avant le départ","url":"/actualites/checklist-partir-vacances-animaux"},{"text":"guide de garde d’animaux en Haute-Savoie","url":"/actualites/garde-animaux-haute-savoie-guide"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='garde-animaux-savoie-guide' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 0 : % ligne au lieu de 1',affected; END IF;
END;
$guide_0$;

DO $guide_1$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_1_20261017$# House-sitting en Haute-Savoie : préparer le séjour et les accès

**Pour organiser un house-sitting en Haute-Savoie, vérifiez que le gardien peut rejoindre le logement, y vivre dans les conditions annoncées et assurer les tâches convenues.** À Annecy, Megève ou Chamonix, les questions portent sur votre adresse et votre séjour : accès, horaires, équipements, animaux et relais.

Ce guide traite la préparation du logement et des déplacements. Le [guide de garde d’animaux en Haute-Savoie](/actualites/garde-animaux-haute-savoie-guide) compare les modalités de prise en charge ; le [guide des gardes en hiver](/actualites/house-sitting-hiver-montagne-savoie) développe la préparation saisonnière.

**Dans ce guide**

- [Décrire le logement réel](#logement)
- [Préparer l’arrivée et les déplacements](#acces)
- [Clarifier les équipements et les tâches](#equipements)
- [Transmettre les besoins des animaux](#animaux)
- [Assurance, dépenses et confirmation](#confirmation)
- [Questions fréquentes](#faq)

## <a id="logement"></a>Appartement, maison ou chalet : que faut-il décrire ?

La Haute-Savoie ne se résume pas aux chalets isolés. Décrivez le logement proposé, plutôt que de lui attribuer les caractéristiques supposées de sa commune.

| Situation du séjour | Information utile | Vérification avec le gardien |
| --- | --- | --- |
| Appartement à Annecy ou dans une autre ville | Étage, ascenseur, accès, équipements et sorties des animaux. | Clés utilisables, conditions d’accueil et planning compatible. |
| Maison autour du lac ou dans une vallée | Accès, extérieur, jardin et tâches prévues. | Déplacements et tâches compris et acceptés. |
| Chalet ou logement avec accès particulier | Route, accès privé, chauffage et contacts techniques. | Possibilité d’arriver, de vivre sur place et de demander une aide adaptée. |

Présentez le couchage, les espaces disponibles, le chauffage et la connexion si elle a été promise. Une personne accueillie doit pouvoir organiser sa vie sur place, au-delà des tâches de garde.

Une résidence secondaire peut aussi être confiée, avec ou sans animaux. Précisez les dates d’occupation et vérifiez les conditions du logement et de son assurance. Le [guide pour confier sa maison](/actualites/confier-sa-maison-absence-risques) aborde ces précautions.

## <a id="acces"></a>Comment préparer l’arrivée et les déplacements ?

### Le trajet jusqu’au logement

Donnez les informations utiles sur l’arrivée : dernier trajet jusqu’à l’adresse, bagages, stationnement et heure de remise des clés. Pour les transports, vérifiez les jours et horaires réels. Ne supposez pas qu’une voiture est toujours indispensable, ou que l’adresse reste accessible dans les mêmes conditions toute l’année.

Le service départemental [Inforoute74](https://www.inforoute74.fr/) permet de consulter les informations routières, travaux, accès aux stations et conditions hivernales. Vérifiez aussi la réglementation applicable aux équipements du véhicule pour votre trajet et les dates du séjour. Le service donne accès à l’arrêté relatif aux équipements hivernaux.

### L’accès privé et les clés

Distinguez la route publique de l’accès à la maison. Qui s’occupe de l’accès privé si une intervention devient nécessaire ? Qui appeler pour le portail ou une serrure ? Transmettez les consignes et les contacts prévus, sans demander au gardien d’improviser une intervention qu’il ne maîtrise pas.

Testez les clés et organisez un accès de secours avec une personne qui a accepté ce rôle. Les codes et l’emplacement des clés se transmettent en privé. Si le gardien arrive après votre départ, prévoyez la prise en charge des animaux dans l’intervalle.

### Les déplacements pendant le séjour

Vérifiez comment rejoindre les courses, le vétérinaire et les services utiles. Si un véhicule est nécessaire pour une tâche, expliquez pourquoi et convenez des conditions. L’utilisation de la voiture du propriétaire ne doit pas être supposée acquise.

Prévoyez les fournitures pour les dates convenues et une marge adaptée aux contraintes du lieu, plutôt qu’un nombre de jours valable pour tous les logements.

## <a id="equipements"></a>Chauffage et équipements : quelles tâches accepter ?

Montrez le fonctionnement des appareils utiles et les consignes du fabricant. Testez les équipements annoncés et signalez les problèmes connus avant la confirmation. Un chauffage au bois ou une installation particulière ne s’improvise pas le premier soir.

Pour chaque tâche, précisez la fréquence, les gestes attendus et la personne à contacter en cas de problème. Une observation ou un réglage courant accepté ne vaut pas accord pour une réparation. Identifiez un professionnel pour les opérations techniques qui dépassent les compétences du gardien.

Si un jardin ou des plantes sont concernés, donnez un programme compréhensible et vérifiez les mesures applicables à l’eau. Le [guide d’arrosage à Annecy](/actualites/arroser-plantes-vacances-annecy) complète cette préparation. Pour un logement sans animaux, les tâches et les conditions d’accueil restent à définir de la même façon.

Signalez aussi les caméras et leur fonctionnement en respectant la vie privée de la personne hébergée. Le [guide de préparation de la maison](/actualites/preparer-maison-avant-garde) reprend les informations à transmettre.

## <a id="animaux"></a>Quels besoins transmettre pour les animaux ?

Indiquez les repas, les sorties, les soins prescrits, les espaces autorisés et les difficultés connues. La race du chien ou l’adresse ne permettent pas de conclure qu’il est sportif, qu’il peut rester seul ou qu’il vit principalement dehors.

Préparez des parcours autorisés et adaptés à l’animal et au gardien. Une garde en montagne n’implique pas d’emmener le chien en randonnée. Pour les espaces naturels et les rives, vérifiez les règles du lieu avant de proposer un itinéraire.

Un traitement demande des consignes prescrites et une personne capable de réaliser les gestes nécessaires, avec l’avis du vétérinaire si besoin. Laissez ses coordonnées, le moyen de transport et les règles de dépenses. Le [guide des imprévus](/actualites/gerer-imprevu-pendant-garde) aide à organiser les contacts et le relais.

Pour un séjour en Savoie, le département voisin, le [guide de garde d’animaux en Savoie](/actualites/garde-animaux-savoie-guide) précise les choix de formule, un exemple de budget et les questions locales de promenade.

## <a id="confirmation"></a>Comment confirmer le séjour et les dépenses ?

Échangez sur les dates, les horaires de présence, les autres engagements et les personnes accompagnantes. Consultez les avis lorsqu’il y en a. L’écusson « Identité vérifiée » indique le contrôle d’une pièce d’identité ; il ne certifie pas la compétence ni la fiabilité. Une rencontre est possible si les deux le souhaitent.

Sur Guardiens, vous publiez le logement, les dates et les besoins, puis échangez avec les personnes intéressées. Après confirmation, un accord de garde est proposé, avec signature facultative. Préparez les garanties avec l’assureur : [Service Public détaille l’assurance du home-sitting](https://www.service-public.gouv.fr/particuliers/vosdroits/F21509).

**Guardiens est actuellement 100 % gratuit pour les propriétaires et les gardiens.** Le gardien est hébergé sans rémunération. Alimentation, chauffage, consommables, soins et autres dépenses convenues restent à organiser séparément. Une participation aux frais de fonctionnement pourra être mise en place au plus tôt au second semestre 2027, avec trente jours de préavis ; voir les [conditions actuelles](/tarifs).

Convenez de l’arrivée, du départ et d’une solution si votre retour change. Une prolongation demande l’accord du gardien. Le [guide d’accueil](/actualites/accueillir-gardien-bonnes-pratiques) et la [checklist avant les vacances](/actualites/checklist-partir-vacances-animaux) aident à terminer la préparation.

Jérémie et Elisa ont créé Guardiens après cinq ans de house-sitting pour développer un réseau de confiance. Vos retours aident à améliorer le service. La disponibilité dépend des personnes et des dates ; aucune candidature ni solution de remplacement immédiate n’est garantie.

## <a id="faq"></a>Questions fréquentes sur le house-sitting en Haute-Savoie

:::faq
### Peut-on proposer un appartement à Annecy ?
Oui. Décrivez le logement, les accès, les dates et les besoins. Le house-sitting ne concerne pas uniquement les chalets ou les maisons avec jardin.

### Une voiture est-elle obligatoire pour le gardien ?
Cela dépend de l’adresse, des trajets et des tâches. Vérifiez les possibilités pour l’arrivée, les courses et les animaux aux dates du séjour. Clarifiez toute utilisation d’un véhicule avant de confirmer.

### Qui s’occupe du déneigement ou d’un problème de chauffage ?
Convenez des tâches et des limites avant le séjour. Le gardien doit comprendre et accepter les gestes demandés ; une intervention technique peut nécessiter un professionnel. Préparez les contacts et l’accès privé.

### Comment vérifier les conditions routières en hiver ?
Consultez Inforoute74 pour les informations du réseau départemental et les accès aux stations, ainsi que la réglementation des équipements et les consignes applicables au trajet. Vérifiez la situation pour les dates réelles du séjour.

### Peut-on faire garder une résidence secondaire sans animaux ?
Oui. Décrivez les besoins de la maison, les tâches acceptées et les conditions d’accueil. Vérifiez les garanties du logement et l’organisation des dépenses avec l’assureur et le gardien.

### Le séjour sur Guardiens est-il gratuit ?
La plateforme est actuellement 100 % gratuite pour les deux rôles, avec un gardien hébergé sans rémunération. Les dépenses restent à convenir. Une contribution au fonctionnement pourra évoluer au plus tôt au second semestre 2027, avec trente jours de préavis.
:::

## Sources pour préparer votre séjour

Informations consultées le 17 octobre 2026 : [Inforoute74, service routier du Département](https://www.inforoute74.fr/) et [Service Public, assurance du home-sitting](https://www.service-public.gouv.fr/particuliers/vosdroits/F21509). Les conditions routières et les garanties sont à vérifier pour vos dates et votre situation.$suite_content_1_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='9be6a6f6-9ea8-481b-8aa1-df2ee29a8e33'::uuid AND slug='house-sitting-haute-savoie-annecy-megeve';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/house-sitting-haute-savoie-annecy-megeve' THEN
    RAISE EXCEPTION 'Guide suite 1 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'House-sitting en Haute-Savoie : préparer le séjour et les accès'
    AND before_row.excerpt IS NOT DISTINCT FROM 'À Annecy, Megève ou Chamonix, préparez le séjour selon le logement et les accès réels : arrivée, équipements, animaux, déplacements et relais.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'House-sitting Haute-Savoie : Annecy, Megève, Chamonix'
    AND before_row.meta_description IS NOT DISTINCT FROM 'House-sitting en Haute-Savoie : accès, chauffage, animaux et relais. Préparez le séjour d’un gardien dans votre appartement, maison ou chalet.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Un chalet se trouve au bord d’un lac, avec des montagnes en arrière-plan.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"guide de garde d’animaux en Haute-Savoie","url":"/actualites/garde-animaux-haute-savoie-guide"},{"text":"guide des gardes en hiver","url":"/actualites/house-sitting-hiver-montagne-savoie"},{"text":"guide pour confier sa maison","url":"/actualites/confier-sa-maison-absence-risques"},{"text":"guide d’arrosage à Annecy","url":"/actualites/arroser-plantes-vacances-annecy"},{"text":"guide de préparation de la maison","url":"/actualites/preparer-maison-avant-garde"},{"text":"guide des imprévus","url":"/actualites/gerer-imprevu-pendant-garde"},{"text":"guide de garde d’animaux en Savoie","url":"/actualites/garde-animaux-savoie-guide"},{"text":"conditions actuelles","url":"/tarifs"},{"text":"guide d’accueil","url":"/actualites/accueillir-gardien-bonnes-pratiques"},{"text":"checklist avant les vacances","url":"/actualites/checklist-partir-vacances-animaux"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 13:10:17.456078+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 1 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot10_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 1 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot10_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot10_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='House-sitting en Haute-Savoie : préparer le séjour et les accès',
    excerpt='À Annecy, Megève ou Chamonix, préparez le séjour selon le logement et les accès réels : arrivée, équipements, animaux, déplacements et relais.',
    meta_title='House-sitting Haute-Savoie : Annecy, Megève, Chamonix',
    meta_description='House-sitting en Haute-Savoie : accès, chauffage, animaux et relais. Préparez le séjour d’un gardien dans votre appartement, maison ou chalet.',
    hero_image_alt='Un chalet se trouve au bord d’un lac, avec des montagnes en arrière-plan.',
    internal_links='[{"text":"guide de garde d’animaux en Haute-Savoie","url":"/actualites/garde-animaux-haute-savoie-guide"},{"text":"guide des gardes en hiver","url":"/actualites/house-sitting-hiver-montagne-savoie"},{"text":"guide pour confier sa maison","url":"/actualites/confier-sa-maison-absence-risques"},{"text":"guide d’arrosage à Annecy","url":"/actualites/arroser-plantes-vacances-annecy"},{"text":"guide de préparation de la maison","url":"/actualites/preparer-maison-avant-garde"},{"text":"guide des imprévus","url":"/actualites/gerer-imprevu-pendant-garde"},{"text":"guide de garde d’animaux en Savoie","url":"/actualites/garde-animaux-savoie-guide"},{"text":"conditions actuelles","url":"/tarifs"},{"text":"guide d’accueil","url":"/actualites/accueillir-gardien-bonnes-pratiques"},{"text":"checklist avant les vacances","url":"/actualites/checklist-partir-vacances-animaux"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='house-sitting-haute-savoie-annecy-megeve' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 1 : % ligne au lieu de 1',affected; END IF;
END;
$guide_1$;

COMMIT;
