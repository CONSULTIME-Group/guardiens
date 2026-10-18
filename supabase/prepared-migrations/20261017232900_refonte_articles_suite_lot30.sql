-- Refonte des guides projets participatifs, low-tech et cadre applicable, autorisée le 17/10/2026.
-- Les URL, auteurs, dates de publication et indexabilité sont conservés.
BEGIN;
CREATE TABLE IF NOT EXISTS public._backup_articles_suite_lot30_20261017 AS SELECT * FROM public.articles WHERE false;
REVOKE ALL ON public._backup_articles_suite_lot30_20261017 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public._backup_articles_suite_lot30_20261017 TO service_role;
ALTER TABLE public._backup_articles_suite_lot30_20261017 ENABLE ROW LEVEL SECURITY;
SELECT id FROM public.articles WHERE id IN ('066f3e6b-090b-4403-bea8-e73cd53cfa32'::uuid,'8f6b5e3f-b5e1-44b8-a955-36e263f6c5aa'::uuid) ORDER BY id FOR UPDATE;

DO $guide_0$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_0_20261017$# Chantier participatif et low-tech : comment choisir ou préparer un projet ?

**Un projet participatif permet de donner du temps et de partager des savoir-faire autour d’un objectif concret.** Pour y participer ou en proposer un, vérifiez les tâches, le niveau attendu, l’accompagnement et les conditions sur place avant de convenir de votre venue.

Vous pouvez vouloir découvrir le compostage, entretenir un potager à plusieurs ou apprendre à réparer un objet. L’intérêt du projet tient à ce que les personnes pourront réellement faire et transmettre, pas à une promesse d’apprendre un métier en un week-end.

**Repères :** [comprendre les termes](#definitions), [choisir un projet](#choisir), [participer comme débutant](#participer), [préparer l’accueil](#accueillir), [vérifier le cadre et les frais](#cadre), [questions fréquentes](#faq).

## <a id="definitions"></a>Chantier participatif, projet collectif et low-tech : quelles différences ?

Un chantier participatif désigne couramment une activité menée à plusieurs autour de travaux ou d’un aménagement. Un projet collectif peut aussi concerner un jardin, une réparation ou un partage de savoir-faire. Le nom employé ne dispense pas de vérifier le cadre du lieu et les conditions de participation.

Le [Low-tech Lab présente la low-tech](https://lowtechlab.org/fr/la-low-tech) autour de trois principes : répondre à un besoin utile, être accessible et durer. La démarche invite notamment à réfléchir à l’entretien, à la réparation et à l’usage des ressources. Ce n’est pas une garantie qu’un objet est sans risque à fabriquer ou utilisable sans compétences.

Sur Guardiens, les projets se mènent dans le cadre de l’entraide entre particuliers. Les règles de la plateforme et les activités exclues restent à respecter. Un atelier de découverte ne doit pas devenir, sous un autre nom, un chantier professionnel ou une tâche que les participants ne peuvent pas assurer.

## <a id="choisir"></a>Comment trouver un projet qui vous convient ?

Lisez l’objectif, les savoir-faire attendus et ceux que le porteur souhaite transmettre. Comparez-les à votre niveau, à vos disponibilités et au trajet possible. Un projet intéressant peut rester inadapté si vous ne pouvez pas venir aux dates convenues ou si l’encadrement n’est pas clair.

| Question | Ce qu’il faut savoir avant de venir |
| --- | --- |
| Qu’allons-nous faire ? | Les tâches concrètes, leur ampleur et ce qui ne fait pas partie du projet. |
| Qui accompagne ? | La personne présente pour expliquer, montrer et répondre aux difficultés. |
| Quel niveau est attendu ? | Les prérequis réels et ce qui peut être découvert sur place. |
| Que faut-il apporter ? | Vêtements, matériel et équipements à préciser avec le porteur. |
| Comment se passe l’accueil ? | Dates, trajet, repas et couchage éventuel selon ce qui est proposé. |

Aucun projet disponible près de chez vous ni place acceptée n’est garanti. Échangez avant de réserver un trajet ou de vous organiser. Si une information essentielle manque, demandez-la plutôt que de supposer que le porteur fournira tout.

## <a id="participer"></a>Peut-on participer quand on débute ?

Oui, lorsqu’un projet accueille réellement les débutants et que les activités sont adaptées. Le formulaire distingue « Ce qu’il faut savoir faire » et « Ce que vous transmettez ». Une annonce sans prérequis doit tout de même expliquer qui accompagne et quelles tâches sont prévues.

Présentez votre expérience honnêtement. Dites ce que vous souhaitez découvrir, ce que vous avez déjà pratiqué et vos limites. Vous pouvez avoir envie d’apprendre sans accepter un geste technique que vous ne savez pas réaliser.

Une fois sur place, faites expliquer le matériel et l’organisation avant de commencer. Si la tâche annoncée change ou dépasse vos possibilités, vous pouvez la refuser. Les pauses et le rythme sont à convenir ensemble ; il n’existe pas de nombre d’heures que tout participant devrait fournir pour mériter l’accueil.

Pour commencer par des ressources ou une pratique plus encadrée, le [guide d’apprentissage de la menuiserie, de la permaculture et de l’écoconstruction](/actualites/apprendre-menuiserie-permaculture-ecoconstruction-gratuitement) distingue cours en ligne, ateliers et projets. Les conditions d’un organisme extérieur peuvent différer de celles de Guardiens.

## <a id="accueillir"></a>Comment préparer un projet chez vous ?

Choisissez d’abord une activité admissible dans le cadre de la plateforme et limitée à ce que vous pouvez accueillir et accompagner. Décrivez le résultat recherché, les tâches et ce que les personnes pourront apprendre. Une photo réelle du lieu ou du matériel peut aider à comprendre le contexte, sans exposer des informations privées inutiles.

Précisez les prérequis et la façon de transmettre : démonstration, pratique accompagnée, répartition des gestes et personne à joindre. Le nombre de participants dépend de l’espace et de votre capacité d’accompagnement ; deux, huit ou dix personnes ne constituent pas un seuil universel d’efficacité.

Annoncez les conditions : période, horaires à discuter, accès, outils, équipements, repas et couchage éventuel. Ce qui n’est pas prévu doit aussi être clair. Vérifiez la faisabilité et les assurances avant d’inviter des personnes, puis confirmez leur venue par échange.

Publiez assez tôt pour pouvoir discuter et vous organiser, sans promettre qu’un délai d’un mois assurera des réponses. Si le besoin est un coup de main ponctuel plutôt qu’un projet collectif, le [guide des petites missions d’entraide](/actualites/petites-missions-entraide-guardiens) permet de choisir le parcours adapté.

## <a id="cadre"></a>Quelles limites et quels frais vérifier ?

Les [CGU](/cgu) excluent notamment de l’entraide Guardiens les travaux sur l’électricité, le gaz ou le chauffage, les travaux en hauteur ou de toiture, la construction, la démolition, l’élagage et l’abattage. Les activités réglementées ou professionnelles ne sont pas rendues admissibles par l’appellation « participatif ». Ces exclusions s’appliquent aussi aux projets.

Le porteur déclare être responsable du lieu et destinataire du projet, sur un lieu non destiné à la location ou à une activité commerciale, rester présent, ne prévoir aucun échange d’argent et avoir interrogé son assureur sur la couverture des participants. **Ces déclarations organisent le cadre de Guardiens ; elles ne constituent ni une validation juridique du projet ni une expertise technique.**

Les garanties d’assurance doivent correspondre à l’activité réelle et aux personnes présentes. Le [guide du cadre des projets participatifs](/actualites/chantier-participatif-projet-collectif-cadre-legal) détaille les questions de responsabilité, d’assurance et d’autorisations à préparer.

La plateforme est **actuellement 100 % gratuite**, selon les [conditions tarifaires](/tarifs). Sur un projet Guardiens, l’échange se fait sans paiement entre les personnes. Trajet, dépenses personnelles, matériel à apporter, repas et couchage éventuel sont à clarifier ; « gratuit » ne signifie pas que toutes ces dépenses sont prises en charge.

## <a id="faq"></a>Questions fréquentes

:::faq
### Comment participer à un chantier participatif ?
Choisissez une activité adaptée, lisez les conditions et échangez avec le porteur sur votre niveau, les tâches et l’accueil. Attendez la confirmation avant d’organiser votre déplacement.

### Peut-on venir sans savoir bricoler ?
Cela dépend des prérequis et de l’accompagnement du projet. L’accueil de débutants ne dispense pas de préciser les gestes, le matériel et la personne qui les expliquera.

### Un projet participatif permet-il d’apprendre gratuitement ?
Il peut permettre de découvrir des gestes et de partager des savoir-faire, sans maîtrise ou qualification garantie. Sur Guardiens, l’échange se fait sans paiement ; trajet, matériel et accueil restent à préciser.

### Le repas et le couchage sont-ils toujours inclus ?
Non. Lisez ce qui est proposé et confirmez les conditions avant de venir. Ne supposez ni un hébergement ni la prise en charge de toutes vos dépenses.

### Peut-on proposer n’importe quels travaux sur Guardiens ?
Non. Les exclusions des CGU s’appliquent aussi aux projets, notamment construction, toiture, hauteur et interventions sur l’électricité, le gaz ou le chauffage. Le mot « participatif » ne change pas ces limites.

### Comment préparer l’accueil de participants ?
Décrivez les tâches, les savoir-faire, l’accompagnement, le matériel et les conditions sur place. Vérifiez le cadre et les assurances avant de confirmer des venues ; aucun nombre de participants ou délai de réponse n’est garanti.
:::$suite_content_0_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='066f3e6b-090b-4403-bea8-e73cd53cfa32'::uuid AND slug='chantier-participatif-low-tech-participer-lancer-projet';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'Guide suite 0 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Chantier participatif et low-tech : comment choisir ou préparer un projet ?'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Participer pour apprendre ou accueillir un petit groupe : clarifiez les tâches, l’accompagnement et les conditions du projet avant de vous engager.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Chantier participatif : choisir et préparer un projet'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Débutant ou porteur de projet : découvrez comment préparer un chantier participatif, les savoir-faire, l’encadrement, les frais et les limites à vérifier.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Deux adultes marchent de dos sur un chemin bordé d’arbres, l’un avec un outil sur l’épaule.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"guide d’apprentissage de la menuiserie, de la permaculture et de l’écoconstruction","url":"/actualites/apprendre-menuiserie-permaculture-ecoconstruction-gratuitement"},{"text":"guide des petites missions d’entraide","url":"/actualites/petites-missions-entraide-guardiens"},{"text":"CGU","url":"/cgu"},{"text":"guide du cadre des projets participatifs","url":"/actualites/chantier-participatif-projet-collectif-cadre-legal"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 13:25:17.852592+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 0 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot30_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 0 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot30_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot30_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Chantier participatif et low-tech : comment choisir ou préparer un projet ?',
    excerpt='Participer pour apprendre ou accueillir un petit groupe : clarifiez les tâches, l’accompagnement et les conditions du projet avant de vous engager.',
    meta_title='Chantier participatif : choisir et préparer un projet',
    meta_description='Débutant ou porteur de projet : découvrez comment préparer un chantier participatif, les savoir-faire, l’encadrement, les frais et les limites à vérifier.',
    hero_image_alt='Deux adultes marchent de dos sur un chemin bordé d’arbres, l’un avec un outil sur l’épaule.',
    internal_links='[{"text":"guide d’apprentissage de la menuiserie, de la permaculture et de l’écoconstruction","url":"/actualites/apprendre-menuiserie-permaculture-ecoconstruction-gratuitement"},{"text":"guide des petites missions d’entraide","url":"/actualites/petites-missions-entraide-guardiens"},{"text":"CGU","url":"/cgu"},{"text":"guide du cadre des projets participatifs","url":"/actualites/chantier-participatif-projet-collectif-cadre-legal"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='chantier-participatif-low-tech-participer-lancer-projet' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 0 : % ligne au lieu de 1',affected; END IF;
END;
$guide_0$;

DO $guide_1$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_1_20261017$# Chantier participatif : responsabilité, assurance et cadre à vérifier

**Le mot « participatif » et l’absence de paiement ne suffisent pas à déterminer les règles d’un projet.** Avant d’accueillir ou de participer, clarifiez qui organise, quelles activités sont prévues, dans quel lieu, avec quelles assurances et quelles autorisations éventuelles.

Ce guide distingue les questions générales d’un chantier collectif des conditions propres aux projets Guardiens. Un accord entre personnes ne valide pas à lui seul une activité technique, une couverture d’assurance ou une situation au regard du droit du travail.

*La photo illustre un chantier de charpente. La construction et les travaux en hauteur sont exclus de l’entraide Guardiens.*

**Repères :** [identifier le cadre](#cadre), [comprendre la responsabilité](#responsabilite), [interroger les assureurs](#assurance), [vérifier les autorisations](#autorisations), [préparer un projet Guardiens](#guardiens), [distinguer le bénévolat associatif](#association), [questions fréquentes](#faq).

## <a id="cadre"></a>Quelles questions déterminent le cadre du projet ?

Décrivez la situation réelle : particulier ou structure organisatrice, usage privé ou activité économique, tâches, conditions d’accueil et engagements demandés. Les mots « bénévole », « entraide » ou « chantier participatif » ne permettent pas de conclure que toutes les règles seraient les mêmes.

| Question | Pourquoi la vérifier ?
| --- | --- |
| Qui reçoit l’aide ? | Un particulier pour son usage personnel, une association et une activité professionnelle ont des organisations distinctes. |
| Que fera chaque personne ? | La nature des gestes, les risques et les compétences nécessaires changent les précautions et obligations. |
| Qu’est-il demandé en échange ? | Paiement, avantages et conditions réelles doivent être examinés, pas seulement le titre de l’annonce. |
| Qui organise et accompagne ? | Les rôles, les consignes et la capacité d’encadrement doivent être compris avant de commencer. |
| Quels documents existent ? | Consignes, accord sur l’accueil, assurances et autorisations doivent correspondre au projet concerné. |

L’absence de versement en argent n’est pas un certificat d’absence de relation de travail. Si les conditions font hésiter sur cette qualification, faites examiner l’organisation par un professionnel compétent avant de la mettre en place. Les [CGU de Guardiens](/cgu) rappellent que la qualification dépend des conditions réelles et que la plateforme ne se substitue pas à cette analyse.

Il n’est pas davantage possible de conclure qu’un risque juridique serait inexistant parce qu’aucun litige n’aurait été trouvé sur un projet portant le même nom. La préparation doit partir de votre situation et des règles applicables.

## <a id="responsabilite"></a>Qui peut répondre d’un accident pendant une aide gratuite ?

**La gratuité ne supprime pas la responsabilité.** La jurisprudence sur la convention d’assistance bénévole peut créer des obligations entre celui qui reçoit l’aide et celui qui l’apporte. L’application à un accident dépend notamment des faits et des comportements des personnes concernées.

La [Cour de cassation, dans sa présentation d’un arrêt du 5 janvier 2022, n° 20-20.331](https://www.courdecassation.fr/publications/lettre-de-la-premiere-chambre-civile/ndeg5-janvier-2022/responsabilite-contractuelle), rappelle qu’une faute d’imprudence de la personne qui aide peut engager sa responsabilité pour le dommage causé à la personne aidée. Aider sans être payé ne rend donc pas ses gestes sans conséquence.

L’[arrêt du 5 mai 2021, n° 19-20.579](https://www.courdecassation.fr/en/decision/6093acc2ab4025311647a76c) illustre aussi la possibilité d’un partage de responsabilité entre plusieurs intervenants. Il ne faut pas transformer une décision en règle selon laquelle l’organisateur ou le participant indemniserait toujours seul tout accident.

En pratique, définissez les tâches, les limites et l’accompagnement. Une personne doit pouvoir refuser un geste qu’elle ne peut pas assurer. Une décharge ou une phrase générale dans un message ne remplace ni la prévention, ni l’examen des responsabilités, ni la vérification des assurances.

## <a id="assurance"></a>Que demander à votre assureur avant d’accueillir ?

Décrivez précisément l’activité, le lieu, les personnes et la durée. Demandez si votre contrat couvre les dommages que les participants pourraient causer ou subir, les blessures de la personne qui aide et les biens concernés. Faites préciser les exclusions, plafonds et éventuelles extensions nécessaires, par écrit si possible.

La [fiche de Service Public sur la responsabilité civile habitation](https://www.service-public.gouv.fr/particuliers/vosdroits/F2123) présente son champ et les exclusions contractuelles. La [fiche sur les accidents de la vie courante](https://www.service-public.gouv.fr/particuliers/vosdroits/F3077) distingue l’indemnisation selon les circonstances et les garanties personnelles éventuelles.

Une attestation de responsabilité civile ne prouve pas que toutes les activités du projet seront couvertes. Ne supposez pas non plus qu’un produit portant le nom « chantier » ou « individuelle accident » répondra automatiquement à l’ensemble des besoins : exposez la situation à l’assureur et faites confirmer la portée du contrat.

Pour le participant, la question est tout aussi concrète : suis-je couvert pour cette activité et pour mes propres blessures, dans quelles conditions ? Si l’organisateur annonce une assurance, demandez ce qu’elle couvre réellement. **Guardiens ne fournit pas d’assurance pour les participants ou les dommages du projet.**

## <a id="autorisations"></a>Un projet participatif dispense-t-il des autorisations de travaux ?

Non. Le fait de réaliser des travaux à plusieurs ne permet pas d’écarter les règles d’urbanisme, les droits sur le lieu ou les exigences propres à l’activité. Le porteur doit vérifier ce qu’il est autorisé à entreprendre avant d’inviter des personnes.

À titre d’exemple, [Service Public détaille les formalités d’un abri de jardin](https://www.service-public.gouv.fr/particuliers/vosdroits/F662) selon sa surface, son implantation et la localisation du terrain. La fiche recommande de consulter le plan local d’urbanisme et la mairie. Un tableau de seuils isolé ne permet pas de trancher tous les cas, notamment dans les secteurs protégés.

Pour un projet extérieur à Guardiens touchant à un bâtiment ou à un ouvrage, faites également examiner les responsabilités de construction et les assurances adaptées. Un ouvrage démontable, une clôture ou un aménagement extérieur ne peuvent pas être déclarés tous dispensés de règles à partir de leur seul nom.

Ces vérifications générales ne rendent pas une activité admissible sur la plateforme : les exclusions des CGU restent applicables même si une autorisation administrative existe.

## <a id="guardiens"></a>Quelles conditions s’appliquent aux projets Guardiens ?

Les projets Guardiens se déroulent dans le cadre de l’entraide entre particuliers. Les CGU excluent notamment les travaux sur l’électricité, le gaz et le chauffage, les travaux en hauteur ou de toiture, la construction, la démolition, l’élagage et l’abattage. Les activités réglementées, celles exercées professionnellement par un membre et les coups de main au service d’une activité professionnelle sont aussi exclus.

Le porteur déclare être responsable du lieu et destinataire du projet, sur un lieu non destiné à la location ou à une activité commerciale. Il déclare être présent pendant le projet, ne prévoir aucun échange d’argent et avoir vérifié auprès de son assureur la couverture des personnes accueillies.

**Ces déclarations définissent le cadre demandé par Guardiens. Elles ne sont pas une validation juridique ou technique du projet et ne remplacent pas l’accord de l’assureur.** Une activité exclue ne devient pas autorisée parce qu’un savoir-faire apparaît dans une présentation ou qu’un participant se dit expérimenté.

Le formulaire distingue les savoir-faire attendus et transmis. Clarifiez aussi l’accompagnement, le matériel, les horaires à convenir, les repas et le couchage éventuel, sans les supposer inclus. L’accueil ne doit pas être présenté comme une façon de rémunérer un travail. Les conditions réelles restent à vérifier avant d’organiser une venue.

La plateforme est **actuellement 100 % gratuite**, selon les [conditions tarifaires](/tarifs). Cela ne prend pas en charge trajet, dépenses personnelles ou fournitures et ne garantit aucun participant. Le [guide pratique des projets participatifs](/actualites/chantier-participatif-low-tech-participer-lancer-projet) aide ensuite à décrire les tâches et l’accueil.

## <a id="association"></a>Et si vous aidez dans une association ou un refuge ?

Renseignez-vous directement auprès de la structure sur les missions, la formation, la personne responsable et les garanties. Une tâche auprès d’animaux ou avec du matériel ne se choisit pas seulement selon votre envie d’aider ; les conditions de la structure et les compétences nécessaires comptent.

[Service Public précise les assurances des associations](https://www.service-public.gouv.fr/particuliers/vosdroits/F1124) : certaines activités imposent des assurances et la responsabilité civile ne couvre pas toujours les blessures des bénévoles eux-mêmes. Le ministère chargé de la vie associative présente aussi la [protection sociale et l’assurance des bénévoles](https://associations.gouv.fr/lassurance-et-la-protection-sociale-des-benevoles), dont les conditions doivent être vérifiées avec la structure.

Ne supposez donc ni que toute association est assurée de la même manière, ni qu’une participation ouvre automatiquement un droit social, une réduction fiscale ou une autorisation d’agir auprès d’animaux. Les justificatifs et règles éventuels dépendent du dispositif concerné. Pour un besoin de soin ou une activité réglementée, adressez-vous à la structure et aux professionnels compétents.

Si votre situation personnelle peut limiter une activité — arrêt de travail, recherche d’emploi, séjour depuis l’étranger — vérifiez-la auprès de l’organisme ou de l’autorité concernée avant de participer. La gratuité de l’échange ne permet pas à elle seule de conclure à une autorisation.

## <a id="faq"></a>Questions fréquentes

:::faq
### Les déclarations du formulaire suffisent-elles à rendre un projet légal ?
Non. Elles définissent le cadre demandé sur Guardiens. L’activité réelle, les assurances, les autorisations et les obligations applicables doivent être vérifiées séparément.

### Qui paie si une personne se blesse en aidant ?
Cela dépend des faits, des responsabilités et des contrats d’assurance. La gratuité n’efface pas la responsabilité ; il n’est pas possible de désigner à l’avance un payeur unique pour tout accident.

### Une assurance habitation couvre-t-elle automatiquement les participants ?
Ne le supposez pas. Décrivez le projet à l’assureur et demandez la couverture des dommages causés ou subis, des blessures, des biens, ainsi que les exclusions et extensions éventuelles.

### Peut-on demander une participation financière sur un projet Guardiens ?
Le cadre de publication demande qu’aucune somme d’argent ne soit échangée dans un sens ou dans l’autre. Une activité payante ou professionnelle ne doit pas être présentée comme un projet d’entraide Guardiens.

### Peut-on proposer un chantier de construction ou de toiture sur Guardiens ?
Non. La construction, la toiture et les travaux en hauteur font partie des exclusions des CGU, comme les interventions sur l’électricité, le gaz ou le chauffage. Une autorisation administrative ne supprime pas ces limites de plateforme.

### Faut-il une autorisation pour un petit aménagement ?
Cela dépend de l’ouvrage, du lieu et des règles applicables. Consultez la mairie et les informations officielles correspondant au projet ; ni sa petite taille ni son caractère démontable ne permettent de trancher tous les cas.

### Les bénévoles d’une association sont-ils toujours assurés ?
Les obligations et garanties varient selon la structure et l’activité. Demandez quelles assurances couvrent les missions et les blessures des bénévoles, sans déduire une couverture complète de la seule responsabilité civile.
:::$suite_content_1_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='8f6b5e3f-b5e1-44b8-a955-36e263f6c5aa'::uuid AND slug='chantier-participatif-projet-collectif-cadre-legal';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'Guide suite 1 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Chantier participatif : responsabilité, assurance et cadre à vérifier'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Un projet gratuit n’efface ni les responsabilités ni les démarches : les questions à poser sur l’assurance, les tâches, l’accueil et les autorisations.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Chantier participatif : cadre légal et assurance'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Qui répond d’un accident ? Quelle assurance et quelles autorisations vérifier ? Préparez le cadre d’un projet participatif et distinguez le cadre de Guardiens.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Plusieurs personnes travaillent sur la charpente en bois d’un bâtiment en construction.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"CGU de Guardiens","url":"/cgu"},{"text":"conditions tarifaires","url":"/tarifs"},{"text":"guide pratique des projets participatifs","url":"/actualites/chantier-participatif-low-tech-participer-lancer-projet"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 14:25:16.952988+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 1 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot30_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 1 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot30_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot30_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Chantier participatif : responsabilité, assurance et cadre à vérifier',
    excerpt='Un projet gratuit n’efface ni les responsabilités ni les démarches : les questions à poser sur l’assurance, les tâches, l’accueil et les autorisations.',
    meta_title='Chantier participatif : cadre légal et assurance',
    meta_description='Qui répond d’un accident ? Quelle assurance et quelles autorisations vérifier ? Préparez le cadre d’un projet participatif et distinguez le cadre de Guardiens.',
    hero_image_alt='Plusieurs personnes travaillent sur la charpente en bois d’un bâtiment en construction.',
    internal_links='[{"text":"CGU de Guardiens","url":"/cgu"},{"text":"conditions tarifaires","url":"/tarifs"},{"text":"guide pratique des projets participatifs","url":"/actualites/chantier-participatif-low-tech-participer-lancer-projet"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='chantier-participatif-projet-collectif-cadre-legal' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 1 : % ligne au lieu de 1',affected; END IF;
END;
$guide_1$;

COMMIT;
