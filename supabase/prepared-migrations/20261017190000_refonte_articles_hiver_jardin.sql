-- Refonte des guides hiver et jardin, autorisée le 17/10/2026.
-- Les URL, auteurs, dates de publication et couvertures sont conservés.
BEGIN;
CREATE TABLE IF NOT EXISTS public._backup_articles_hiver_jardin_20261017 AS SELECT * FROM public.articles WHERE false;
REVOKE ALL ON public._backup_articles_hiver_jardin_20261017 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public._backup_articles_hiver_jardin_20261017 TO service_role;
ALTER TABLE public._backup_articles_hiver_jardin_20261017 ENABLE ROW LEVEL SECURITY;
SELECT id FROM public.articles WHERE id IN ('a2c25c3a-ff8f-4a91-a862-a67ca63b6f86'::uuid,'fcff585e-80dc-4ea0-92ea-f55553be8720'::uuid) ORDER BY id FOR UPDATE;

DO $guide_0$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $hiver_jardin_content_0_20261017$# Entretenir son jardin pendant une absence : organiser le relais

**Pour entretenir votre jardin pendant une absence, commencez par repérer ce qui demande réellement une intervention, puis organisez l’arrosage et les passages nécessaires.** La durée du séjour compte, mais aussi la saison, la météo, le sol et les plantations. Un programmateur, un proche qui passe ou un gardien hébergé chez vous peuvent répondre à des besoins différents.

Si vous souhaitez une présence dans la maison en plus des soins courants au jardin, le house-sitting est une option, **même sans animaux**. Sur Guardiens, le gardien est hébergé et n’est pas rémunéré. **La plateforme est actuellement 100 % gratuite pour les propriétaires et les gardiens.** Les tâches de jardin se discutent avant la garde, avec leur fréquence, le matériel et leurs limites.

Avec Elisa, nous avons créé ce réseau après cinq ans de garde de maisons et d’animaux. L’objectif est de vous aider à confier votre logement à une personne avec qui les besoins ont été clairement convenus, jardin compris.

Dans ce guide : [repérer les priorités](#besoins), [préparer le jardin](#preparation), [choisir le relais](#solution), [transmettre les consignes](#consignes), [fixer les limites](#limites), [rédiger l’annonce](#annonce), [prévoir un imprévu](#imprevus) et [questions fréquentes](#faq).

## <a id="besoins"></a>Que faut-il surveiller dans un jardin pendant les vacances ?

Il n’existe pas de calendrier universel où un potager mourrait au cinquième jour et une haie tiendrait forcément un mois. Une semaine fraîche et pluvieuse ne demande pas la même organisation qu’une semaine de chaleur sur un sol qui retient peu l’eau.

La [Royal Horticultural Society, association horticole britannique, conseille de porter une attention particulière aux pots, aux cultures potagères et aux plantations récentes](https://www.rhs.org.uk/garden-inspiration/get-gardening/how-to-look-after-your-garden-on-holiday). Les plantes en pot disposent d’une réserve d’humidité plus limitée que celles en pleine terre. Ce sont des repères pour hiérarchiser vos consignes, à adapter aux plantes de votre jardin.

| Zone du jardin | Ce qu’il faut connaître avant le départ | Consigne à préparer |
| --- | --- | --- |
| Pots et jardinières | Exposition, besoins des plantes, accès à l’eau | Pots à vérifier et manière d’évaluer le besoin d’arrosage |
| Potager | Cultures présentes, récoltes attendues, système installé | Zones prioritaires, réglages et récoltes autorisées |
| Jeunes arbres et plantations | Date de plantation, sol et suivi habituel | Plantes repérées sur un plan et consignes adaptées |
| Massifs, arbres et haies installés | Besoins réels selon les espèces et la météo | Ce qui nécessite un contrôle et ce qui peut attendre |
| Pelouse | Saison, état et restrictions locales | Tonte éventuelle convenue ; aucun arrosage automatique par défaut |

Une pelouse jaunie ne permet pas à elle seule de conclure qu’elle est morte ou qu’elle repartira forcément. De la même façon, un arbuste installé n’est pas à l’abri de toute sécheresse. Faites préciser les besoins des végétaux sensibles par votre pépiniériste ou votre jardinier si vous avez un doute.

## <a id="preparation"></a>Comment préparer le jardin avant de partir ?

Quelques jours avant le départ, vérifiez les tuyaux, les raccords et le programmateur dans les conditions où ils seront utilisés. Observez si les zones prévues reçoivent bien l’eau, puis montrez le fonctionnement à la personne qui prendra le relais. Un appareil neuf installé au dernier moment laisse peu de temps pour corriger un réglage.

Regroupez les pots déplaçables dans un endroit adapté à leurs besoins, plus abrité du soleil direct lorsque cela leur convient. Récoltez ce qui est prêt et indiquez ce qui pourra être cueilli pendant votre absence. Un paillage adapté peut aider à limiter les pertes d’humidité ; il ne crée pas une autonomie garantie de plusieurs jours.

La [RHS rappelle que les besoins d’arrosage varient avec la météo, le sol et l’installation des plantes](https://www.rhs.org.uk/garden-jobs/watering). Préférez des consignes fondées sur l’état du sol et les besoins de chaque zone à « arroser tout le jardin tous les soirs ». Pour les dispositifs et les plantes en pot ou d’intérieur, poursuivez avec notre guide sur [l’arrosage des plantes pendant les vacances](/actualites/arroser-plantes-pendant-vacances-guide).

**En France, vérifiez les restrictions à votre adresse sur [VigiEau](https://vigieau.gouv.fr/)** avant de préparer le programme. Les règles dépendent du lieu, de la ressource en eau et de l’usage. Un goutte-à-goutte ou un programmateur ne donne pas, par lui-même, une autorisation d’arroser. La personne qui intervient doit pouvoir retrouver les consignes applicables si elles changent pendant le séjour.

## <a id="solution"></a>Arrosage automatique, passages ou gardien sur place : que choisir ?

**Un dispositif automatique** peut couvrir des zones définies, s’il est adapté, testé et utilisé dans le respect des restrictions. Il ne vérifie pas à votre place un raccord débranché, une plante oubliée ou un changement de besoin. Prévoyez comment un problème sera repéré.

**Des passages ponctuels** peuvent convenir à un jardin dont les interventions sont limitées. Convenez des jours, de l’accès, des contrôles à faire et d’une solution si la personne est indisponible. Une visite par semaine n’est pas une fréquence valable pour tous les jardins : partez des besoins constatés.

**Un gardien hébergé dans la maison** peut assurer les gestes courants acceptés pendant son séjour, ainsi que les autres tâches de garde convenues. Cette solution est à examiner si vous souhaitez aussi une présence dans le logement. Elle suppose un logement utilisable et un accord sur le temps à consacrer au jardin. Elle ne remplace pas un professionnel pour un entretien exigeant ou des travaux.

Pour un besoin limité à l’extérieur, un échange ponctuel ou un prestataire peut mieux correspondre à votre situation. Vous n’avez pas à proposer une garde complète de maison pour quelques arrosages. À l’inverse, notre guide sur la [garde de maison sans animaux](/actualites/garder-une-maison-ce-n-est-pas-garder-un-animal) explique comment présenter un véritable séjour de garde avec jardin.

## <a id="consignes"></a>Quelles consignes laisser pour le jardin et le potager ?

Préparez un plan simple, avec des numéros ou des photos des zones. Repérez les robinets, le matériel, les plantes prioritaires et celles à ne pas arroser selon vos consignes. Une personne peut connaître le jardinage sans reconnaître immédiatement vos plantations.

Pour chaque zone, indiquez comment vous vérifiez le besoin d’eau, le matériel à utiliser et la quantité adaptée que vous avez déterminée. Expliquez quoi changer après la pluie ou pendant une restriction. Faites essayer les commandes du programmateur et montrez comment vous joindre si une consigne paraît inadaptée.

Voici un **exemple fictif de fiche à compléter pour votre jardin** :

> Zone A : les trois grands pots près de la terrasse. Vérifier l’humidité selon la méthode montrée ; arroser seulement si nécessaire et autorisé. Zone B : le potager, relié au programmateur dont la notice est dans la maison. Me signaler tout défaut de fonctionnement. Vous pouvez récolter les tomates mûres ; les autres cultures sont repérées sur le plan. Pour modifier le programme ou acheter du matériel, me contacter d’abord.

Cette fiche ne remplace pas les quantités et les réglages propres à vos plantes. Elle montre le niveau de précision attendu. Joignez les coordonnées d’un relais qui a accepté d’aider en cas de difficulté, puis préparez les accès et le reste du logement avec la [checklist de préparation de la maison](/actualites/preparer-maison-avant-garde).

## <a id="limites"></a>Quelles tâches faut-il convenir séparément ?

Arroser quelques pots, entretenir un grand potager et tondre plusieurs parcelles ne représentent pas le même engagement. Présentez la surface, le relief, le nombre de zones et votre estimation du temps nécessaire. Vérifiez que la personne est à l’aise avec le matériel et accepte les tâches, sans déduire ses compétences de son âge ou de son statut.

La tonte n’est pas incluse automatiquement dans une garde. Si elle est prévue, définissez la zone, les conditions d’utilisation et les limites du matériel. Pour l’élagage, le travail en hauteur, l’abattage, les réparations ou une intervention nécessitant une compétence particulière, organisez une prestation adaptée. Ne transformez pas une garde en chantier pendant votre absence.

Convenez aussi des dépenses : eau, consommables, matériel fourni, achats autorisés et remboursements. Les outils doivent être utilisables dans les conditions annoncées. Vérifiez les garanties avec votre assureur ; [Service Public détaille les précautions d’assurance pour le home sitting](https://www.service-public.gouv.fr/particuliers/vosdroits/F21509). Mettez les conditions de la garde et les responsabilités convenues par écrit.

## <a id="annonce"></a>Comment présenter le jardin dans une annonce de garde ?

Donnez des informations que la personne pourra utiliser pour décider : dates, commune, logement proposé, photos, plantations à suivre et tâches attendues. Précisez la présence d’un arrosage automatique, sans le présenter comme une garantie d’autonomie. Les codes d’accès, l’emplacement des clés et les coordonnées privées du relais se transmettent ensuite à la personne retenue.

Une phrase comme « jardin à entretenir » est trop vague. Préférez par exemple, **à adapter à votre situation** : « Nous cherchons un gardien hébergé chez nous pendant trois semaines. Il y a six pots et un petit potager à suivre ; les consignes et le temps à prévoir seront précisés ensemble. Pas de tonte ni de taille demandée. Le matériel et les dépenses convenues sont pris en charge selon notre accord. »

Complétez avec les éléments du guide pour [rédiger une bonne annonce de garde](/actualites/rediger-bonne-annonce-house-sitting). Échangez sur les compétences, les disponibilités et les tâches avant de confirmer. Vous pouvez vous rencontrer si les deux le souhaitent. Aucune candidature ni disponibilité n’est garantie par la publication.

## <a id="imprevus"></a>Que faire si la météo change ou si le matériel tombe en panne ?

Définissez les situations où vous souhaitez être contacté : panne, fuite, restriction nouvelle ou plante dont l’état inquiète la personne. Une photo peut aider à comprendre le problème, sans remplacer un diagnostic lorsqu’il est nécessaire. Convenez de qui peut intervenir et autoriser une dépense si vous êtes injoignable.

Un relais local n’est utile que s’il a accepté ce rôle et dispose des informations nécessaires. Si le séjour doit se prolonger, vérifiez la disponibilité du gardien : elle n’est pas acquise. Guardiens ne garantit pas de remplacement immédiat.

En dehors de l’été, adaptez la liste des tâches à la saison : certaines zones peuvent ne demander aucun geste pendant votre séjour. Pour une maison en montagne, voyez aussi les points propres à la [garde d’un chalet en hiver](/actualites/house-sitting-hiver-montagne-savoie), notamment l’accès et le chauffage.

La priorité de Guardiens est de créer ce réseau et d’améliorer le service avec vos retours. Une participation aux frais de fonctionnement pourra être mise en place **au plus tôt au second semestre 2027, avec 30 jours de préavis**. Consultez les conditions à jour sur la page [tarifs](/tarifs).

## <a id="faq"></a>Questions fréquentes sur le jardin pendant une absence

:::faq
### Combien de temps un jardin peut-il rester sans arrosage ?

Il n’y a pas de durée valable pour tous les jardins. Elle dépend notamment des plantes, du sol, de la météo, de l’exposition et des dispositifs installés. Repérez les zones sensibles et préparez des consignes adaptées plutôt qu’un calendrier universel.

### Un arrosage automatique suffit-il pendant un mois ?

Il peut couvrir des besoins définis, mais ne garantit pas le suivi de tout le jardin. Testez-le avant de partir, respectez les restrictions et prévoyez qui pourra constater une panne ou ajuster les consignes avec vous.

### Faut-il arroser la pelouse pendant les vacances ?

Ne le prévoyez pas systématiquement. Tenez compte de son état, de la saison et des restrictions à votre adresse. Une pelouse jaunie ne suffit pas à déterminer son état ni à garantir sa reprise.

### Peut-on proposer une garde de maison seulement pour le jardin ?

Oui, sans animaux, si vous proposez un véritable séjour dans un logement habitable et des tâches acceptées. Pour quelques interventions à l’extérieur sans besoin d’hébergement, examinez plutôt des passages ou une prestation adaptée.

### Le gardien doit-il tondre et tailler les haies ?

Ce n’est pas automatique. Chaque tâche, son temps et son matériel se conviennent avant la garde. Les travaux exigeants, les interventions en hauteur et les réparations doivent être organisés avec une personne compétente dans un cadre adapté.

### Faire garder sa maison et son jardin est-il gratuit sur Guardiens ?

La plateforme est actuellement 100 % gratuite pour les propriétaires et les gardiens. Le gardien est hébergé sans rémunération ; les fournitures, consommations et éventuelles dépenses du séjour se conviennent séparément.
:::$hiver_jardin_content_0_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='a2c25c3a-ff8f-4a91-a862-a67ca63b6f86'::uuid AND slug='entretenir-jardin-pendant-absence';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/entretenir-jardin-pendant-absence' THEN
    RAISE EXCEPTION 'Guide hiver-jardin 0 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Entretenir son jardin pendant une absence : organiser le relais'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Que prévoir pour le jardin avant de partir ? Définissez les plantes prioritaires, les tâches acceptées et la solution adaptée à votre absence.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Entretenir son jardin pendant une absence | Guardiens'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Jardin, potager et pelouse pendant les vacances : préparez les priorités, l’arrosage et les consignes. Choisissez entre passages et gardien hébergé chez vous.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Un arroseur bleu relié à un tuyau vert est posé sur l’herbe.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"l’arrosage des plantes pendant les vacances","url":"/actualites/arroser-plantes-pendant-vacances-guide"},{"text":"garde de maison sans animaux","url":"/actualites/garder-une-maison-ce-n-est-pas-garder-un-animal"},{"text":"checklist de préparation de la maison","url":"/actualites/preparer-maison-avant-garde"},{"text":"rédiger une bonne annonce de garde","url":"/actualites/rediger-bonne-annonce-house-sitting"},{"text":"garde d’un chalet en hiver","url":"/actualites/house-sitting-hiver-montagne-savoie"},{"text":"tarifs","url":"/tarifs"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 13:40:17.58332+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide hiver-jardin 0 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_hiver_jardin_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide saisonnier 0 différente';
  END IF;
  INSERT INTO public._backup_articles_hiver_jardin_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_hiver_jardin_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Entretenir son jardin pendant une absence : organiser le relais',
    excerpt='Que prévoir pour le jardin avant de partir ? Définissez les plantes prioritaires, les tâches acceptées et la solution adaptée à votre absence.',
    meta_title='Entretenir son jardin pendant une absence | Guardiens',
    meta_description='Jardin, potager et pelouse pendant les vacances : préparez les priorités, l’arrosage et les consignes. Choisissez entre passages et gardien hébergé chez vous.',
    hero_image_alt='Un arroseur bleu relié à un tuyau vert est posé sur l’herbe.',
    internal_links='[{"text":"l’arrosage des plantes pendant les vacances","url":"/actualites/arroser-plantes-pendant-vacances-guide"},{"text":"garde de maison sans animaux","url":"/actualites/garder-une-maison-ce-n-est-pas-garder-un-animal"},{"text":"checklist de préparation de la maison","url":"/actualites/preparer-maison-avant-garde"},{"text":"rédiger une bonne annonce de garde","url":"/actualites/rediger-bonne-annonce-house-sitting"},{"text":"garde d’un chalet en hiver","url":"/actualites/house-sitting-hiver-montagne-savoie"},{"text":"tarifs","url":"/tarifs"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='entretenir-jardin-pendant-absence' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte hiver-jardin 0 : % ligne au lieu de 1',affected; END IF;
END;
$guide_0$;

DO $guide_1$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $hiver_jardin_content_1_20261017$# Faire garder son chalet en hiver en Savoie et Haute-Savoie

**Pour faire garder un chalet en hiver, vous pouvez accueillir un gardien qui loge sur place pendant votre absence.** Vous convenez ensemble des dates, de la présence attendue et des gestes simples à assurer : relever le courrier, observer le fonctionnement du chauffage, s’occuper des animaux s’il y en a. L’accès au logement et les dépenses d’énergie doivent être clairs avant de confirmer.

Sur Guardiens, cet échange repose sur un logement mis à disposition et une garde sans rémunération. **La plateforme est actuellement 100 % gratuite pour les propriétaires et les gardiens.** Cela ne dispense pas de préparer la maison ni de faire intervenir un professionnel lorsqu’un équipement le demande.

Avec Elisa, nous avons créé Guardiens après cinq ans de garde de maisons et d’animaux. Ce guide vous aide à présenter une garde hivernale en montagne telle qu’elle sera vécue au quotidien, au-delà de la photo du chalet sous la neige.

Au fil du guide : [choisir la formule](#solution), [chauffage](#chauffage), [accès](#acces), [tâches](#taches), [animaux](#animaux), [annonce](#annonce), [imprévus](#imprevus) et [questions fréquentes](#faq).

## <a id="solution"></a>Un gardien sur place ou des passages ponctuels ?

Le house-sitting peut convenir si vous souhaitez que quelqu’un habite votre maison ou votre résidence secondaire pendant une période définie. **Il est possible de proposer une garde sans animaux.** Le logement doit être habitable et les tâches compatibles avec ce que la personne sait et accepte de faire.

Si vous avez seulement besoin d’un contrôle occasionnel, examinez plutôt des passages convenus avec un proche ou un prestataire local. Si le besoin principal est une réparation, du déneigement important ou une surveillance technique, demandez une prestation adaptée. Une personne hébergée chez vous ne remplace pas un chauffagiste, un couvreur ou un service d’astreinte.

La présence ne signifie pas rester à domicile en permanence. Parlez des sorties prévues, des nuits sur place et de ce que vos animaux peuvent accepter comme durée d’absence. Une personne venue profiter de la montagne doit connaître ces contraintes avant de s’engager.

## <a id="chauffage"></a>Quel chauffage laisser pendant une garde en hiver ?

Commencez par distinguer un chalet vide d’un chalet occupé. L’[ADEME conseille d’adapter le chauffage à la présence dans le logement](https://agirpourlatransition.ademe.fr/particuliers/economiser/energie/20-solutions-reduire-consommation-electricite). Un mode prévu pour votre absence ne constitue donc pas, à lui seul, une consigne de confort pour la personne qui vient y vivre.

Faites vérifier les points propres à votre installation avec votre professionnel habituel : réglage adapté au bâtiment, protection des circuits exposés, équipements extérieurs à hiverner et conduite à tenir en cas de panne. Il n’existe pas ici de température extérieure unique à partir de laquelle tous les chalets auraient le même comportement.

Transmettez une fiche courte avec les commandes autorisées, la notice, les messages d’erreur qui doivent vous être signalés et le numéro du chauffagiste. Le gardien peut vous alerter d’un problème observé ; ne lui demandez pas de démonter, de réparer ou de relancer un appareil dont la sécurité est incertaine. Laissez les grilles de ventilation dégagées, comme le rappelle l’ADEME.

**Convenez aussi des frais.** Électricité, gaz, granulés ou bois : précisez ce que vous fournissez, qui règle les consommations et comment les dépenses seront suivies. Si vous envisagez une participation, son mode de calcul et les conditions doivent être acceptés avant la garde. N’annoncez pas une somme forfaitaire sans expliquer ce qu’elle couvre.

## <a id="acces"></a>Comment préparer l’arrivée si la route est enneigée ?

En Savoie comme en Haute-Savoie, donnez les informations de votre adresse réelle : dernier tronçon de route, pente, parking, distance à parcourir avec les bagages et accès aux commerces. La mention « proche d’une station » ne répond pas à ces questions.

Les [règles d’équipement des véhicules en montagne](https://www.service-public.gouv.fr/particuliers/vosdroits/F19459) s’appliquent dans certaines communes entre le 1er novembre et le 31 mars. Vérifiez la zone concernée et les équipements admis pour le véhicule utilisé. La possession d’un 4×4 ne dispense pas de ces vérifications et ne garantit pas que votre chemin soit praticable.

Précisez qui déneige la route publique, l’allée privée et l’accès piéton. Si une intervention extérieure est nécessaire, organisez-la avant le départ. Consultez les informations routières locales et la [Vigilance de Météo-France](https://vigilance.meteofrance.fr/fr) à l’approche de l’arrivée. Prévoyez ce que vous ferez si le trajet doit être reporté ; personne ne doit avoir à prendre un risque pour respecter un horaire de transmission.

## <a id="taches"></a>Quelles tâches peut-on convenir avec le gardien ?

Écrivez ce que vous attendez, avec la fréquence et les limites. Le tableau ci-dessous est une base de discussion à adapter à votre chalet.

| Point à suivre | Ce qui peut être convenu | Ce qu’il faut organiser autrement |
| --- | --- | --- |
| Chauffage | Lire un affichage, utiliser les commandes expliquées, signaler une anomalie | Entretien, diagnostic ou réparation par le professionnel |
| Eau et pièces peu utilisées | Repérer et signaler une fuite visible ; connaître l’emplacement de la coupure | Intervention technique et remise en service |
| Entrée du chalet | Un dégagement léger au sol, seulement si la personne l’accepte et peut le faire sans risque | Déneigement lourd, travail en hauteur ou sur la toiture |
| Courrier et logement | Relever le courrier et assurer l’entretien courant convenu | Travaux, remise en état ou tâches non annoncées |
| Extérieurs | Observer depuis un endroit accessible et signaler un problème | Monter sur un toit, une échelle ou intervenir sur une structure |

Une garde hivernale ne doit pas devenir une liste ouverte de travaux. Si les besoins évoluent pendant le séjour, discutez-en : la personne n’a pas accepté d’avance toute nouvelle tâche. Pour le reste de la transmission, utilisez notre guide pour [préparer sa maison avant une garde](/actualites/preparer-maison-avant-garde).

## <a id="animaux"></a>Et si des animaux restent au chalet ?

Décrivez leur routine réelle : repas, sorties, espaces accessibles, présence nécessaire et soins déjà convenus. Signalez les particularités du terrain, les clôtures et les trajets utilisés en hiver. Les promenades du chien doivent pouvoir s’articuler avec le programme du gardien.

Évitez une règle identique pour tous les animaux, fondée seulement sur une race ou une température. Demandez à votre vétérinaire les adaptations propres à l’âge, à la santé et aux habitudes du vôtre, puis transmettez ces consignes. Laissez ses coordonnées et un contact utilisable hors de ses horaires habituels.

Pour [choisir un gardien](/actualites/choisir-gardien-bons-criteres), vérifiez avec lui son expérience des tâches prévues et sa disponibilité réelle. Son envie de skier, son âge ou son statut professionnel ne suffisent pas à répondre à ces questions. Une rencontre est possible si les deux le souhaitent ; les échanges doivent dans tous les cas permettre de clarifier les besoins et les conditions.

## <a id="annonce"></a>Que préciser dans une annonce pour un chalet en hiver ?

Indiquez la commune, les dates et les contraintes d’accès sans publier vos codes, l’emplacement des clés ni les coordonnées privées de votre relais. Ajoutez des photos du couchage et des pièces utilisables, le mode de chauffage, les tâches, les frais convenus et la présence attendue. Si le télétravail est possible, décrivez la connexion dont vous disposez sans promettre une continuité que vous ne maîtrisez pas.

Voici un **exemple fictif à adapter** :

> Nous cherchons une personne pour habiter notre chalet près de Chambéry du 10 au 24 janvier. Notre chien reste à la maison : ses sorties et les absences possibles seront à préciser ensemble. Chauffage électrique, chambre disponible et voiture nécessaire pour les courses. Un prestataire s’occupe du déneigement de l’allée. Nous expliquerons le chauffage, les tâches et les dépenses avant de confirmer.

Le guide pour [rédiger une annonce de garde](/actualites/rediger-bonne-annonce-house-sitting) aide à compléter ces informations. Si vous partez pendant les réveillons, prévoyez aussi les points propres aux [gardes de Noël et du Nouvel An](/actualites/house-sitting-noel-fetes-fin-annee).

## <a id="imprevus"></a>Que prévoir si le chauffage tombe en panne ou le retour est retardé ?

Laissez un relais local qui a accepté ce rôle, les contacts des professionnels et une façon de vous joindre. Convenez de qui peut autoriser une intervention, de la prise en charge des frais et de la marche à suivre si vous ne répondez pas. Repérez les coupures d’eau et d’électricité pendant la transmission, sans attendre une panne.

Si les conditions rendent le logement inhabitable ou l’accès impossible, une prolongation ou une solution de repli devra être organisée avec les personnes concernées. Le gardien n’est pas automatiquement disponible au-delà des dates prévues et Guardiens ne garantit pas un remplacement immédiat. Gardez une autre solution envisageable avant votre départ.

Vérifiez les garanties avec votre assureur et consignez les conditions de la garde par écrit ; [Service Public explique les assurances du home sitting](https://www.service-public.gouv.fr/particuliers/vosdroits/F21509). La présence d’un gardien ne vaut pas garantie contre un sinistre.

Pensez enfin aux besoins extérieurs réellement maintenus l’hiver. Notre guide pour [confier l’entretien du jardin pendant une absence](/actualites/entretenir-jardin-pendant-absence) aide à décrire les zones et les tâches, selon la saison.

Nous cherchons d’abord à construire ce réseau et à améliorer le service avec vos retours. Une participation aux frais de fonctionnement pourra être mise en place **au plus tôt au second semestre 2027, avec 30 jours de préavis**. Les conditions à jour figurent sur la page [tarifs](/tarifs).

## <a id="faq"></a>Questions fréquentes sur la garde d’un chalet en hiver

:::faq
### Peut-on faire garder un chalet sans animaux ?

Oui. Vous pouvez proposer un logement habitable pour une garde de maison sans animaux. Précisez la présence et les tâches attendues : courrier, entretien courant ou signalement d’un problème observé.

### Faut-il laisser le chauffage en mode hors-gel pendant la garde ?

Un chalet occupé doit offrir les conditions de vie convenues avec le gardien. Faites définir les réglages adaptés à votre installation et distinguez les consignes d’occupation de celles d’une maison vide.

### Le gardien doit-il déneiger le chalet ?

Ce n’est pas automatique. Définissez les tâches acceptées et leurs limites avant la garde. Organisez le déneigement important avec un prestataire ; ne confiez pas une intervention sur la toiture au gardien.

### Qui paie le chauffage pendant le séjour ?

La répartition doit être convenue avant confirmation : énergie fournie, consommations et éventuelles dépenses à rembourser. La gratuité actuelle de Guardiens concerne la plateforme et ne signifie pas que les frais du séjour sont tous inclus.

### Un gardien peut-il sortir skier dans la journée ?

Oui si son programme est compatible avec la présence et les soins convenus. Précisez les durées d’absence possibles et les horaires à couvrir ; le house-sitting n’implique pas une présence permanente.

### Guardiens garantit-il un gardien disponible pour l’hiver ?

Non. Les candidatures dépendent des personnes intéressées par vos dates, votre logement et les tâches annoncées. Publier une annonce permet de présenter votre besoin, sans garantir une candidature ni un remplacement.
:::$hiver_jardin_content_1_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='fcff585e-80dc-4ea0-92ea-f55553be8720'::uuid AND slug='house-sitting-hiver-montagne-savoie';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/house-sitting-hiver-montagne-savoie' THEN
    RAISE EXCEPTION 'Guide hiver-jardin 1 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Faire garder son chalet en hiver en Savoie et Haute-Savoie'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Chauffage, route enneigée, animaux et dépenses : les points à régler pour confier son chalet à un gardien pendant une absence en hiver.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Faire garder son chalet en hiver en Savoie | Guardiens'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Confier un chalet en hiver : chauffage, accès enneigé, présence et frais à convenir. Préparez une garde en Savoie ou Haute-Savoie, avec ou sans animaux.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Une personne dégage la neige devant un chalet, un chien attend à la porte ouverte.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"préparer sa maison avant une garde","url":"/actualites/preparer-maison-avant-garde"},{"text":"choisir un gardien","url":"/actualites/choisir-gardien-bons-criteres"},{"text":"rédiger une annonce de garde","url":"/actualites/rediger-bonne-annonce-house-sitting"},{"text":"gardes de Noël et du Nouvel An","url":"/actualites/house-sitting-noel-fetes-fin-annee"},{"text":"confier l’entretien du jardin pendant une absence","url":"/actualites/entretenir-jardin-pendant-absence"},{"text":"tarifs","url":"/tarifs"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 13:55:16.354587+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide hiver-jardin 1 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_hiver_jardin_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide saisonnier 1 différente';
  END IF;
  INSERT INTO public._backup_articles_hiver_jardin_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_hiver_jardin_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Faire garder son chalet en hiver en Savoie et Haute-Savoie',
    excerpt='Chauffage, route enneigée, animaux et dépenses : les points à régler pour confier son chalet à un gardien pendant une absence en hiver.',
    meta_title='Faire garder son chalet en hiver en Savoie | Guardiens',
    meta_description='Confier un chalet en hiver : chauffage, accès enneigé, présence et frais à convenir. Préparez une garde en Savoie ou Haute-Savoie, avec ou sans animaux.',
    hero_image_alt='Une personne dégage la neige devant un chalet, un chien attend à la porte ouverte.',
    internal_links='[{"text":"préparer sa maison avant une garde","url":"/actualites/preparer-maison-avant-garde"},{"text":"choisir un gardien","url":"/actualites/choisir-gardien-bons-criteres"},{"text":"rédiger une annonce de garde","url":"/actualites/rediger-bonne-annonce-house-sitting"},{"text":"gardes de Noël et du Nouvel An","url":"/actualites/house-sitting-noel-fetes-fin-annee"},{"text":"confier l’entretien du jardin pendant une absence","url":"/actualites/entretenir-jardin-pendant-absence"},{"text":"tarifs","url":"/tarifs"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='house-sitting-hiver-montagne-savoie' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte hiver-jardin 1 : % ligne au lieu de 1',affected; END IF;
END;
$guide_1$;

COMMIT;
