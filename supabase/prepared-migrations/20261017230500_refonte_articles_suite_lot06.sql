-- Refonte des guides garde de chien et de chat à Lyon, autorisée le 17/10/2026.
-- Les URL, auteurs, dates de publication et couvertures sont conservés.
BEGIN;
CREATE TABLE IF NOT EXISTS public._backup_articles_suite_lot06_20261017 AS SELECT * FROM public.articles WHERE false;
REVOKE ALL ON public._backup_articles_suite_lot06_20261017 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public._backup_articles_suite_lot06_20261017 TO service_role;
ALTER TABLE public._backup_articles_suite_lot06_20261017 ENABLE ROW LEVEL SECURITY;
SELECT id FROM public.articles WHERE id IN ('df402e8f-eb39-41be-b0af-f67a3b623fa0'::uuid,'1ff88d5e-4a48-4f3d-9bed-4e20f7c2b43e'::uuid) ORDER BY id FOR UPDATE;

DO $guide_0$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_0_20261017$# Garde de chat à domicile à Lyon : visites ou gardien hébergé ?

**Pour faire garder votre chat à domicile à Lyon, vous pouvez organiser des visites ou accueillir une personne qui séjourne chez vous.** Le choix dépend des soins, des habitudes de votre chat et de la présence nécessaire. Demandez un planning concret : qui vient, à quelle fréquence, combien de temps et que se passe-t-il si la personne est empêchée ?

Le domicile évite un déplacement, mais ne suffit pas à garantir le bien-être. Une pension ou un accueil ailleurs peuvent aussi être envisagés selon le chat et la prise en charge proposée. Ce guide compare les organisations et les dépenses ; le [guide général de garde de chat](/actualites/garde-chat-domicile-house-sitting) développe les besoins à transmettre.

**Dans ce guide**

- [Visites ou séjour : les différences](#solutions)
- [Fréquence, soins et présence](#besoins)
- [Exemples de tarifs à Lyon et autour](#budget)
- [Accès et logement lyonnais](#logement)
- [Préparer une garde sur Guardiens](#guardiens)
- [Questions fréquentes](#faq)

## <a id="solutions"></a>Visites et gardien hébergé : quelle différence ?

| Organisation | Ce qui est prévu | À clarifier |
| --- | --- | --- |
| Visites par un proche | Passages acceptés selon ses disponibilités. | Jours, durée, tâches et relais. |
| Visites par un professionnel | Interventions définies dans une prestation. | Zone desservie, horaires, soins inclus et prix total. |
| Gardien hébergé | Une personne vit dans votre logement pendant la garde. | Présence en journée, conditions de séjour et expérience utile. |
| Pension ou accueil extérieur | Votre chat séjourne dans un autre lieu. | Conditions d’admission, hébergement, cohabitation et soins. |

Dans les deux premières options, vérifiez la prise en charge entre les passages. Dans la troisième, dormir sur place ne signifie pas rester au domicile toute la journée. Le planning doit correspondre à votre chat, sans lui attribuer un nombre d’heures de compagnie « idéal » valable pour tous.

Si votre absence concerne aussi un chien, organisez ensemble les sorties, les interactions et les espaces de repos. Notre [guide de garde de chien à Lyon pendant les vacances](/actualites/ou-faire-garder-chien-lyon-vacances) aide à comparer les contraintes.

## <a id="besoins"></a>Combien de passages et quels soins pour votre chat ?

La [Cats Protection recommande au moins deux visites quotidiennes](https://www.cats.org.uk/help-and-advice/caring-for-your-cat/home-and-environment/going-on-holiday) quand une personne s’occupe d’un chat à domicile pendant les vacances. C’est un repère de préparation, à adapter aux besoins individuels ; un chaton, un chat malade ou un traitement peuvent demander une organisation différente. Demandez au vétérinaire ce qui convient si vous avez un doute.

Les passages doivent permettre de renouveler l’eau et la nourriture, entretenir la litière, vérifier que le chat va bien et lui proposer des interactions qu’il accepte. Une réserve de croquettes ou un distributeur ne remplace pas cette prise en charge.

Transmettez les informations utiles :

- Alimentation, quantités, horaires et rangement des produits.
- Litières, nettoyage et élimination des déchets.
- Cachettes habituelles et façon de vérifier la présence du chat sans le forcer.
- Jeux, contacts qu’il apprécie et comportements à signaler.
- Traitement prescrit, matériel, vétérinaire et transport si nécessaire.

Ne concluez pas qu’un chat âgé préfère la solitude ou qu’un chat sociable accepte tout le monde. Décrivez votre animal plutôt qu’une catégorie supposée de chats. Un changement préoccupant de comportement ou de santé demande un avis vétérinaire ; il ne doit pas être automatiquement attribué au stress de votre absence.

## <a id="budget"></a>Quel budget pour une garde de chat à Lyon ?

Pour comparer, faites préciser le nombre de passages, leur durée, les frais de déplacement, les soins et le tarif des week-ends. Les exemples suivants sont des tarifs affichés par les prestataires, consultés le **17 octobre 2026** ; ils ne constituent pas une moyenne du marché.

| Exemple | Tarif affiché | Point à vérifier |
| --- | --- | --- |
| [Pauline Lesne, visites pour chat à Lyon et Grand Lyon](https://zootherapie-lyon.fr/dishes/visite-pour-chat/) | 18 € du lundi au vendredi ; 23 € les week-ends et jours fériés. | Faire préciser la durée, le nombre de passages compris et le devis pour votre adresse. |
| [La Maison d’Hôtes des Chats, à Mionnay](https://www.lamaisondhotesdeschats.fr/tarifs) | Formule Essentielle : 20 € par jour pour un chat. | Journées facturées, conditions d’accueil et options ; c’est une pension, pas une visite. |
| Guardiens, gardien hébergé chez vous | Plateforme actuellement 100 % gratuite pour les deux rôles. | Logement proposé, disponibilité et dépenses convenues. |

Ne multipliez pas un prix annoncé « par jour » par le nombre de visites souhaitées sans confirmation. Pour une pension, ajoutez si nécessaire le transport et les options. Pour toute formule, préparez les dépenses d’alimentation, de litière et de santé.

Sur Guardiens, le gardien est hébergé sans rémunération. La gratuité de la plateforme ne signifie pas que les fournitures et soins de votre chat sont pris en charge par le gardien. Une participation aux frais de fonctionnement pourra être mise en place au plus tôt au second semestre 2027, avec trente jours de préavis. Les conditions actuelles figurent sur la [page des tarifs](/tarifs).

## <a id="logement"></a>À Lyon, quels détails du logement faut-il transmettre ?

### L’accès à l’immeuble et à l’appartement

Pensez à la porte de rue, à la seconde porte, à l’étage et aux clés réellement nécessaires. Testez les accès et organisez un contact qui peut aider si une clé ne fonctionne pas. Pour des visites, un problème d’accès peut empêcher les soins même lorsque la personne est arrivée à l’heure.

Indiquez le quartier et les contraintes utiles dans l’annonce, puis transmettez les codes et les informations d’accès en privé. Une boîte à clés ne doit pas être décrite avec son emplacement et son code sur une page publique.

### Les fenêtres, le balcon et les sorties

Expliquez les ouvertures autorisées et les protections en place. Ne demandez pas au gardien de choisir seul s’il peut ouvrir une fenêtre ou laisser sortir le chat. S’il sort habituellement, convenez des règles et des éléments à signaler ; sa présence ne peut pas être surveillée en permanence.

Prévoyez aussi où se trouvent la caisse de transport et les informations d’identification. Le [guide des imprévus](/actualites/gerer-imprevu-pendant-garde) explique comment préparer les contacts en cas de perte ou de problème de santé.

### Le séjour de la personne accueillie

Pour un gardien hébergé, décrivez le couchage, les équipements, les pièces accessibles et les contraintes de l’immeuble. Signalez les caméras et respectez sa vie privée. Les conditions doivent lui permettre d’habiter chez vous comme convenu.

L’arrondissement ne prédit pas le caractère du chat ni la disponibilité d’un gardien. Les guides [Presqu’île](/actualites/garde-chat-presquile-lyon) et [Croix-Rousse](/actualites/garde-animaux-croix-rousse-lyon) complètent la préparation de proximité ; ils ne constituent pas une promesse de candidats dans chaque quartier.

## <a id="guardiens"></a>Comment préparer une garde de chat sur Guardiens ?

Publiez les dates, le logement et les besoins de chaque animal, puis échangez avec les personnes intéressées par un séjour chez vous. Comparez les disponibilités et l’expérience utile. Consultez les avis lorsqu’il y en a ; l’écusson « Identité vérifiée » signifie qu’une pièce d’identité a été contrôlée, sans certifier compétence ni fiabilité.

Une rencontre est possible si les deux le souhaitent. Après confirmation, un accord de garde est proposé, avec signature facultative. Le [guide pour choisir un gardien](/actualites/choisir-gardien-bons-criteres) aide à préparer les échanges ; la [checklist avant le départ](/actualites/checklist-partir-vacances-animaux) sert à vérifier les clés, les consignes et le relais.

Si votre chat a besoin d’un geste prescrit, vérifiez avec le vétérinaire les conditions nécessaires et la capacité de la personne à le réaliser. Convenez aussi du transport, des dépenses et de la personne à joindre si vous êtes indisponible.

La [page house-sitting à Lyon](/house-sitting/lyon) présente le séjour à domicile. Une personne peut venir d’un autre secteur ; aucune disponibilité ni réponse dans un délai donné n’est garantie. Prévoyez une autre solution pour vos dates tant que la garde n’est pas confirmée.

Jérémie et Elisa ont créé Guardiens après cinq ans de house-sitting pour développer un réseau de confiance. Vos retours sur le service nous aident à l’améliorer.

## <a id="faq"></a>Questions fréquentes sur la garde de chat à Lyon

:::faq
### Vaut-il mieux des visites ou une personne qui dort chez moi ?
Cela dépend des soins, des habitudes du chat et des horaires réellement assurés. Des visites doivent couvrir les besoins aux moments utiles ; une personne hébergée peut aussi s’absenter. Discutez d’un planning concret avant de choisir.

### Une visite quotidienne suffit-elle pendant mes vacances ?
Cats Protection recommande au moins deux visites par jour pour un chat gardé à domicile pendant les vacances. La fréquence et la durée sont à adapter ; un chaton, un chat malade ou un traitement peuvent demander une autre organisation. Demandez conseil au vétérinaire si besoin.

### Combien coûtent les visites de chat à Lyon ?
Demandez un devis pour votre adresse, les dates et le nombre de passages. À titre d’exemple, Pauline Lesne affiche 18 € en semaine et 23 € les week-ends et jours fériés sur sa page de visites, consultée le 17 octobre 2026. Le contenu et le nombre de passages compris sont à confirmer.

### Puis-je confier un chat qui prend un traitement ?
Il faut vérifier les consignes prescrites, les conditions de réalisation et la capacité de la personne à assurer les gestes. Demandez au vétérinaire une organisation adaptée et indiquez clairement les besoins avant toute confirmation.

### Trouverai-je forcément un gardien dans mon arrondissement ?
Non. La disponibilité dépend des personnes et des dates, et un gardien peut venir d’ailleurs pour séjourner chez vous. Publiez les informations utiles et prévoyez une autre solution tant que la garde n’est pas confirmée.

### Le service Guardiens est-il gratuit pour faire garder mon chat ?
La plateforme est actuellement 100 % gratuite pour les propriétaires et les gardiens. Le séjour se fait sans rémunération, en échange de l’hébergement. Les fournitures et autres dépenses restent à convenir. Une contribution au fonctionnement pourra évoluer au plus tôt au second semestre 2027, avec trente jours de préavis.
:::$suite_content_0_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='df402e8f-eb39-41be-b0af-f67a3b623fa0'::uuid AND slug='garde-chat-domicile-lyon';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/garde-chat-domicile-lyon' THEN
    RAISE EXCEPTION 'Guide suite 0 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Garde de chat à domicile à Lyon : visites ou gardien hébergé ?'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Votre chat reste à Lyon pendant votre absence ? Comparez les visites et le séjour d’un gardien, puis préparez les soins, les accès et les dépenses.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Garde de chat à domicile à Lyon : un gardien chez vous'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Faire garder son chat à Lyon : visites ou gardien hébergé, exemples de tarifs locaux, accès au logement et soins à préparer avant votre absence.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Une personne caresse un chat roux et blanc près d’une fenêtre.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"guide général de garde de chat","url":"/actualites/garde-chat-domicile-house-sitting"},{"text":"guide de garde de chien à Lyon pendant les vacances","url":"/actualites/ou-faire-garder-chien-lyon-vacances"},{"text":"page des tarifs","url":"/tarifs"},{"text":"guide des imprévus","url":"/actualites/gerer-imprevu-pendant-garde"},{"text":"Presqu’île","url":"/actualites/garde-chat-presquile-lyon"},{"text":"Croix-Rousse","url":"/actualites/garde-animaux-croix-rousse-lyon"},{"text":"guide pour choisir un gardien","url":"/actualites/choisir-gardien-bons-criteres"},{"text":"checklist avant le départ","url":"/actualites/checklist-partir-vacances-animaux"},{"text":"page house-sitting à Lyon","url":"/house-sitting/lyon"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-14 13:59:17.121368+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 0 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot06_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 0 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot06_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot06_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Garde de chat à domicile à Lyon : visites ou gardien hébergé ?',
    excerpt='Votre chat reste à Lyon pendant votre absence ? Comparez les visites et le séjour d’un gardien, puis préparez les soins, les accès et les dépenses.',
    meta_title='Garde de chat à domicile à Lyon : un gardien chez vous',
    meta_description='Faire garder son chat à Lyon : visites ou gardien hébergé, exemples de tarifs locaux, accès au logement et soins à préparer avant votre absence.',
    hero_image_alt='Une personne caresse un chat roux et blanc près d’une fenêtre.',
    internal_links='[{"text":"guide général de garde de chat","url":"/actualites/garde-chat-domicile-house-sitting"},{"text":"guide de garde de chien à Lyon pendant les vacances","url":"/actualites/ou-faire-garder-chien-lyon-vacances"},{"text":"page des tarifs","url":"/tarifs"},{"text":"guide des imprévus","url":"/actualites/gerer-imprevu-pendant-garde"},{"text":"Presqu’île","url":"/actualites/garde-chat-presquile-lyon"},{"text":"Croix-Rousse","url":"/actualites/garde-animaux-croix-rousse-lyon"},{"text":"guide pour choisir un gardien","url":"/actualites/choisir-gardien-bons-criteres"},{"text":"checklist avant le départ","url":"/actualites/checklist-partir-vacances-animaux"},{"text":"page house-sitting à Lyon","url":"/house-sitting/lyon"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='garde-chat-domicile-lyon' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 0 : % ligne au lieu de 1',affected; END IF;
END;
$guide_0$;

DO $guide_1$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_1_20261017$# Où faire garder son chien à Lyon pendant les vacances ?

**À Lyon, vous pouvez confier votre chien à un proche, à une pension, à une personne qui l’accueille chez elle ou à un gardien qui séjourne chez vous.** Des visites sont aussi possibles si leur organisation couvre ses sorties, ses soins et ses besoins de compagnie. Pour choisir, comparez le quotidien prévu pour votre chien, les dates et le trajet jusqu’au lieu de garde.

Vous cherchez surtout une personne qui habite chez vous pendant vos vacances ? La [page house-sitting à Lyon](/house-sitting/lyon) présente cette formule. Ce guide vous aide à décider si elle convient à votre chien et à préparer votre recherche.

**Dans ce guide**

- [Comparer les solutions](#solutions)
- [Prévoir le budget des vacances](#budget)
- [Choisir selon les besoins du chien](#besoins)
- [Organiser la garde dans la métropole](#lyon)
- [Préparer le départ et le retour](#preparation)
- [Questions fréquentes](#faq)

## <a id="solutions"></a>Quelles solutions pour une garde de chien à Lyon ?

| Solution | Où reste votre chien ? | Ce qu’il faut vérifier |
| --- | --- | --- |
| Un proche | Chez vous ou chez lui, selon votre accord. | Disponibilité, expérience et organisation des sorties. |
| Une pension canine | Dans une structure d’accueil. | Hébergement, cohabitation, sorties, soins et conditions d’admission. |
| Un accueil chez un particulier | Dans un autre foyer. | Autres animaux, occupants, accès extérieurs et horaires d’absence. |
| Des visites ou promenades | Chez vous entre les passages. | Fréquence et durée des interventions, temps seul et prise en charge de nuit. |
| Un gardien hébergé | Chez vous avec une personne qui y séjourne. | Planning réel, logement proposé et capacité à assurer les tâches convenues. |

Une pension ne propose pas forcément un box et un accueil chez un particulier ne garantit pas une présence permanente. Demandez comment se déroule une journée, où dort le chien et qui s’en occupe si l’intervenant habituel est empêché.

Le [comparatif des alternatives à la pension](/actualites/pension-chien-alternatives-guide) développe ces différences. Évitez de choisir une formule seulement sur une photo de jardin ou un prix d’appel.

## <a id="budget"></a>Combien coûte la garde pendant les vacances ?

Les professionnels et les structures fixent leurs tarifs et leurs conditions. Comparez le total pour vos dates, pas seulement un prix par jour : alimentation, traitement, transport, jours d’arrivée et de départ peuvent modifier le montant.

**Exemple local consulté le 17 octobre 2026 :** la pension [Au 4’Pat Hôtel](https://au4pathotel.com/), à Savigny, affiche 30 € par jour pour un chien, avec sa nourriture fournie par le propriétaire. Elle indique aussi un supplément de 2 € par jour pour l’administration d’un traitement vétérinaire. Ce tarif concerne cet établissement et ne représente pas une moyenne lyonnaise. Confirmez le devis et l’acceptation de votre chien directement auprès de la pension.

Pour quatorze journées facturées au tarif de base affiché, cela représente 420 €, hors suppléments. Le nombre de journées facturées dépend des conditions du prestataire : faites-le préciser avant de réserver.

**Guardiens est actuellement 100 % gratuit pour les propriétaires et les gardiens.** Le gardien séjourne dans votre logement sans rémunération. Nourriture, consommables, soins et autres dépenses convenues restent à prévoir. Une participation aux frais de fonctionnement pourra être mise en place au plus tôt au second semestre 2027, avec trente jours de préavis ; voir les [conditions actuelles](/tarifs).

Le coût ne suffit pas à départager les options. Une solution moins chère mais incompatible avec les soins ou les horaires de votre chien doit être revue.

## <a id="besoins"></a>Quels besoins doivent guider votre choix ?

### Les sorties et les périodes seul

Décrivez les horaires habituels, les sorties nécessaires et la façon dont votre chien vit les absences. Une personne qui dort dans le logement peut travailler ou sortir en journée. Vérifiez la compatibilité des emplois du temps, sans déduire une durée de solitude acceptable de la seule race ou de l’âge.

Pour une difficulté connue liée à la séparation, demandez conseil au vétérinaire avant d’arrêter l’organisation. Un gardien ne remplace pas un accompagnement adapté.

### Les rencontres et la cohabitation

Signalez les situations difficiles : autres chiens, passages étroits, vélos, enfants ou visiteurs, selon ce que vous avez observé. Demandez comment le gardien compte organiser les sorties. Une personne doit pouvoir refuser une prise en charge qu’elle ne sait pas assurer.

Notre [guide pour un chien réactif](/actualites/chien-reactif-agressif-garde-solutions) détaille les questions à aborder. Une race ou une présentation de profil ne permet pas de conclure à la compétence d’un candidat.

### Les soins et le confort

Transmettez les consignes prescrites, l’alimentation, les équipements et les difficultés de mobilité. Un escalier peut compter davantage qu’un grand jardin pour un chien qui se déplace difficilement. Vérifiez la capacité de la personne à effectuer les gestes nécessaires, avec l’avis du vétérinaire si besoin.

Si vous avez aussi un chat, précisez les besoins de chacun dans la même organisation. Le [guide de garde de chat à domicile à Lyon](/actualites/garde-chat-domicile-lyon) complète ces points.

## <a id="lyon"></a>À Lyon, pensez aussi aux accès et aux trajets

Pour des visites, demandez si votre adresse est dans la zone d’intervention et si les horaires proposés sont tenables aux dates de vos vacances. Pour un accueil à l’extérieur de Lyon, organisez le dépôt et la récupération du chien, notamment si vous n’avez pas de voiture ou si votre retour est tardif.

Pour un gardien hébergé, décrivez le logement : étage, ascenseur, accès à l’immeuble, couchage et équipements. Indiquez les parcours que votre chien connaît et les endroits où les croisements sont difficiles. Le [guide des promenades à Lyon](/actualites/parcs-chiens-lyon-guide-complet) aide à préparer les sorties ; vérifiez les règles affichées sur place.

La proximité peut faciliter un échange, mais une personne intéressée par un séjour chez vous peut venir d’une autre ville. Sur Guardiens, aucune disponibilité n’est garantie dans un arrondissement donné. Publiez vos dates et les contraintes utiles ; élargir les origines des candidats ne doit pas conduire à relâcher les besoins de votre chien.

Pour un séjour de plusieurs semaines, préparez aussi la continuité des fournitures et du relais avec le [guide des gardes longues](/actualites/vacances-longues-garde-animal-2-semaines).

## <a id="preparation"></a>Comment préparer une garde à domicile sur Guardiens ?

1. **Décrivez le séjour.** Dates, logement, besoins du chien, sorties, soins et contraintes de présence. Gardez les codes, les clés et les informations personnelles hors de l’annonce publique.
2. **Échangez avec les candidats.** Disponibilités, expérience utile, horaires et personnes accompagnantes. Consultez les avis lorsqu’il y en a. L’écusson « Identité vérifiée » indique le contrôle d’une pièce, sans certifier compétence ni fiabilité.
3. **Confirmez ce que chacun accepte.** Une rencontre est possible si les deux le souhaitent. Après confirmation, un accord de garde est proposé, avec signature facultative.
4. **Organisez le passage de relais.** Clés utilisables, consignes, contacts, dépenses et solution si le gardien est empêché. Vérifiez l’assurance et prévoyez une autre organisation si votre retour est décalé.

La [checklist avant les vacances](/actualites/checklist-partir-vacances-animaux) reprend ces vérifications. Si le chien paraît malade ou blessé pendant la garde, le premier interlocuteur est un vétérinaire ; ses coordonnées et la possibilité de transport doivent être préparées. Le [guide des urgences vétérinaires à Lyon](/actualites/veterinaire-urgence-lyon-guide) aide à organiser ce contact.

Commencez la recherche dès que vos dates sont connues. Il n’existe pas de délai qui garantisse une candidature ou une garde confirmée. Jérémie et Elisa ont créé Guardiens après cinq ans de house-sitting pour construire ce réseau ; vos retours nous aident à le faire progresser.

## <a id="faq"></a>Questions fréquentes sur la garde de chien à Lyon

:::faq
### Où faire garder mon chien à Lyon si je ne souhaite pas accueillir quelqu’un chez moi ?
Un proche, un accueil chez un particulier ou une pension peuvent convenir. Vérifiez les conditions d’accueil, les autres animaux, les sorties et les soins. Le séjour proposé par Guardiens suppose d’héberger le gardien dans votre logement.

### Quel budget prévoir pour deux semaines en pension ?
Demandez un devis pour les dates exactes. À titre d’exemple, Au 4’Pat Hôtel affiche 30 € par jour pour un chien, soit 420 € pour quatorze journées facturées au tarif de base consulté le 17 octobre 2026. Nourriture fournie par le propriétaire et suppléments éventuels sont à vérifier ; ce n’est pas une moyenne du marché.

### Le gardien doit-il habiter dans mon quartier ?
Non. Une personne peut venir d’ailleurs pour séjourner chez vous. Vérifiez surtout ses disponibilités, son trajet d’arrivée et la compatibilité du planning avec les besoins du chien. Aucun quartier ne garantit une candidature.

### Puis-je demander plusieurs sorties par jour ?
Décrivez les sorties nécessaires et les horaires utiles dans l’annonce. Le gardien doit pouvoir les accepter et les assurer. Le fait de loger chez vous ne signifie pas une disponibilité permanente.

### Que faire si personne n’est disponible pour mes dates ?
Préparez une autre solution avec votre entourage ou des prestataires, et vérifiez leurs disponibilités directement. Une annonce Guardiens ne garantit ni candidature ni remplacement. Ne confirmez pas une garde incompatible avec les besoins du chien faute d’autre candidat.

### Guardiens est-il gratuit à Lyon ?
Oui, la plateforme est actuellement 100 % gratuite pour les deux rôles. Le gardien est hébergé sans rémunération ; les dépenses de l’animal et du séjour restent à convenir. Une contribution au fonctionnement pourra évoluer au plus tôt au second semestre 2027, avec trente jours de préavis.
:::

## Sources pour préparer votre choix

Tarif du prestataire cité consulté le 17 octobre 2026. Les recommandations générales de préparation s’appuient sur la [RSPCA : organiser la garde pendant les vacances](https://www.rspca.org.uk/adviceandwelfare/pets/general/holiday/leavingyourpet). Les règles britanniques ne sont pas transposées au droit français. Pour les garanties du logement, consultez [Service Public : assurance et home-sitting](https://www.service-public.gouv.fr/particuliers/vosdroits/F21509).$suite_content_1_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='1ff88d5e-4a48-4f3d-9bed-4e20f7c2b43e'::uuid AND slug='ou-faire-garder-chien-lyon-vacances';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/ou-faire-garder-chien-lyon-vacances' THEN
    RAISE EXCEPTION 'Guide suite 1 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Où faire garder son chien à Lyon pendant les vacances ?'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Quelle garde choisir pour un chien à Lyon pendant les vacances ? Comparez les lieux d’accueil, les horaires, le budget et la préparation d’un séjour à domicile.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Faire garder son chien à Lyon pendant les vacances'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Pension, accueil chez un particulier ou garde à domicile à Lyon : comparez les formules, un tarif local et les points à vérifier avant vos vacances.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Un chien est allongé près d’une table basse, dans un salon avec un canapé bleu.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"page house-sitting à Lyon","url":"/house-sitting/lyon"},{"text":"comparatif des alternatives à la pension","url":"/actualites/pension-chien-alternatives-guide"},{"text":"conditions actuelles","url":"/tarifs"},{"text":"guide pour un chien réactif","url":"/actualites/chien-reactif-agressif-garde-solutions"},{"text":"guide de garde de chat à domicile à Lyon","url":"/actualites/garde-chat-domicile-lyon"},{"text":"guide des promenades à Lyon","url":"/actualites/parcs-chiens-lyon-guide-complet"},{"text":"guide des gardes longues","url":"/actualites/vacances-longues-garde-animal-2-semaines"},{"text":"checklist avant les vacances","url":"/actualites/checklist-partir-vacances-animaux"},{"text":"guide des urgences vétérinaires à Lyon","url":"/actualites/veterinaire-urgence-lyon-guide"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 13:40:17.69473+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 1 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot06_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 1 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot06_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot06_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Où faire garder son chien à Lyon pendant les vacances ?',
    excerpt='Quelle garde choisir pour un chien à Lyon pendant les vacances ? Comparez les lieux d’accueil, les horaires, le budget et la préparation d’un séjour à domicile.',
    meta_title='Faire garder son chien à Lyon pendant les vacances',
    meta_description='Pension, accueil chez un particulier ou garde à domicile à Lyon : comparez les formules, un tarif local et les points à vérifier avant vos vacances.',
    hero_image_alt='Un chien est allongé près d’une table basse, dans un salon avec un canapé bleu.',
    internal_links='[{"text":"page house-sitting à Lyon","url":"/house-sitting/lyon"},{"text":"comparatif des alternatives à la pension","url":"/actualites/pension-chien-alternatives-guide"},{"text":"conditions actuelles","url":"/tarifs"},{"text":"guide pour un chien réactif","url":"/actualites/chien-reactif-agressif-garde-solutions"},{"text":"guide de garde de chat à domicile à Lyon","url":"/actualites/garde-chat-domicile-lyon"},{"text":"guide des promenades à Lyon","url":"/actualites/parcs-chiens-lyon-guide-complet"},{"text":"guide des gardes longues","url":"/actualites/vacances-longues-garde-animal-2-semaines"},{"text":"checklist avant les vacances","url":"/actualites/checklist-partir-vacances-animaux"},{"text":"guide des urgences vétérinaires à Lyon","url":"/actualites/veterinaire-urgence-lyon-guide"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='ou-faire-garder-chien-lyon-vacances' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 1 : % ligne au lieu de 1',affected; END IF;
END;
$guide_1$;

COMMIT;
