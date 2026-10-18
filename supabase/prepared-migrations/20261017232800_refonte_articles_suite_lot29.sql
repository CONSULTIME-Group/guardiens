-- Refonte des guides bricolage entre particuliers et Cavalier King Charles, autorisée le 17/10/2026.
-- Les URL, auteurs, dates de publication et indexabilité sont conservés.
BEGIN;
CREATE TABLE IF NOT EXISTS public._backup_articles_suite_lot29_20261017 AS SELECT * FROM public.articles WHERE false;
REVOKE ALL ON public._backup_articles_suite_lot29_20261017 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public._backup_articles_suite_lot29_20261017 TO service_role;
ALTER TABLE public._backup_articles_suite_lot29_20261017 ENABLE ROW LEVEL SECURITY;
SELECT id FROM public.articles WHERE id IN ('9ab49bd0-af00-40a0-bc19-6f91a30e2d53'::uuid,'8603173d-7991-4176-9a81-c249992c2c6c'::uuid) ORDER BY id FOR UPDATE;

DO $guide_0$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_0_20261017$# Bricolage et montage de meubles : demander un coup de main à Lyon ou Grenoble

**Vous pouvez demander une aide ponctuelle pour assembler un meuble ou réaliser une petite tâche de bricolage, à condition de préciser ce qu’il faut faire et de vérifier que chacun peut l’assurer.** Sur Guardiens, l’entraide se fait entre particuliers, sans rémunération. Elle ne remplace pas une intervention professionnelle lorsqu’elle est nécessaire.

À Lyon, Grenoble ou ailleurs, la bonne demande commence par le meuble et les conditions sur place : notice, matériel, espace disponible, accès au logement et gestes attendus. Une deuxième personne peut être utile, mais sa présence ne suffit pas à rendre toute opération sûre ou réalisable.

**Repères :** [choisir la tâche](#tache), [préparer le matériel et les accès](#preparer), [rédiger une demande](#demande), [comprendre l’échange](#echange), [vérifier l’assurance](#assurance), [questions fréquentes](#faq).

## <a id="tache"></a>Quels coups de main bricolage peut-on envisager ?

Définissez une tâche limitée, à votre domicile et hors activité professionnelle : lire une notice ensemble, trier les pièces, assembler un petit meuble ou ajuster une poignée, si ces gestes sont à la portée des personnes concernées. Dites ce qui est déjà fait et ce qui vous bloque.

Un meuble volumineux, une fixation au mur ou une charge lourde demande une évaluation particulière. Le nombre de personnes, l’état du support, les instructions du fabricant et le matériel peuvent changer ce qu’il est possible de faire. Ne présentez pas une fixation comme une simple formalité parce qu’elle concerne une étagère.

Les [CGU de Guardiens](/cgu) excluent de l’entraide les travaux sur les installations électriques, de gaz ou de chauffage, les travaux en hauteur ou de toiture, l’élagage, l’abattage, la construction et la démolition. Les activités réglementées, celles que le membre exerce professionnellement et les coups de main au service d’une activité professionnelle en sont aussi exclus. Pour un travail technique, risqué ou hors de vos compétences, cherchez un professionnel adapté.

## <a id="preparer"></a>Que vérifier avant de fixer un rendez-vous ?

| Point à préparer | Informations utiles à la personne qui aide |
| --- | --- |
| Meuble et notice | Référence, état des pièces, étapes déjà réalisées et instructions du fabricant. |
| Matériel | Outils réellement disponibles et besoin éventuel à clarifier, sans supposer leur prêt. |
| Espace | Place pour déballer, assembler et circuler, avec protection des surfaces si nécessaire. |
| Accès | Étage, ascenseur, dimensions utiles et présence d’une charge à transporter. |
| Limites | Opérations que vous ne savez pas évaluer ou que la personne ne souhaite pas assurer. |

Pour un meuble nécessitant une fixation, vérifiez les instructions et faites évaluer ce que vous ne savez pas déterminer. N’utilisez pas le meuble comme terminé si une étape de sécurité prévue par le fabricant reste à réaliser. Ce guide ne fournit pas de méthode de perçage ou de choix de fixation.

À Lyon comme à Grenoble, l’adresse seule ne permet pas de connaître les murs, les accès ou les règles d’un immeuble. Si vous êtes locataire, vérifiez les autorisations nécessaires au projet. Renseignez-vous aussi sur les consignes du lieu pour le bruit et les parties communes, sans supposer des horaires identiques partout.

## <a id="demande"></a>Comment rédiger une demande de montage de meubles ?

Donnez un titre précis, puis décrivez le meuble, la tâche, le matériel, les contraintes et vos disponibilités. Une estimation de durée peut aider à discuter, mais ne promettez pas de terminer une opération avant d’en connaître les conditions.

**Exemple à adapter à votre situation :**

« Besoin d’un coup de main pour assembler une petite commode à Grenoble. J’ai la notice et les pièces, mais je voudrais la monter avec quelqu’un qui a déjà suivi ce type de montage. Le matériel disponible et les éventuelles étapes de fixation sont à vérifier ensemble avant de convenir du rendez-vous. »

Gardez l’adresse exacte et les détails d’accès pour les échanges utiles avec la personne retenue, plutôt que de publier un code d’entrée. Si vous ajoutez une photo du meuble ou des pièces, évitez d’y faire apparaître des documents ou des personnes sans leur accord.

Consultez les réponses et posez des questions sur l’expérience, les outils et les limites de la personne. Aucun délai de réponse ni aide disponible dans un quartier donné n’est garanti. Si la tâche s’avère différente de ce qui était décrit, vous pouvez la réduire, la reporter ou y renoncer.

## <a id="echange"></a>Faut-il proposer un service en retour ?

Le formulaire rappelle un principe simple : vous convenez ensemble d’un merci, d’un moment partagé ou d’un coup de main une autre fois. Vous n’avez pas à calculer une équivalence entre des heures de montage et une autre prestation, ni à posséder un savoir-faire à offrir immédiatement.

L’entraide se fait **sans rémunération**. Un geste convivial ponctuel de faible valeur peut être convenu ; il ne doit pas devenir le prix du travail. Pour les fournitures, prévoyez plutôt de les acheter vous-même après avoir vérifié ce qui est nécessaire. Si une dépense est avancée pour vous, elle doit avoir été convenue et son remboursement se limite au montant exact sur justificatif, selon les CGU.

La plateforme est **actuellement 100 % gratuite**, selon les [conditions tarifaires](/tarifs). Cette gratuité ne signifie pas que les outils et matériaux sont fournis. Le [guide des petites missions d’entraide](/actualites/petites-missions-entraide-guardiens) explique le fonctionnement ; les [idées de coups de main](/actualites/idees-coups-de-main-entraide-pres-de-chez-soi) peuvent vous aider à décrire un autre besoin.

## <a id="assurance"></a>Qui est couvert si un objet casse ou si quelqu’un se blesse ?

**Ne supposez pas que l’absence de paiement assure automatiquement le coup de main.** Chaque personne vérifie sa responsabilité civile et les garanties adaptées à la tâche auprès de son assureur. Guardiens ne fournit pas d’assurance pour les dommages ou blessures.

[Service Public présente la garantie responsabilité civile](https://www.service-public.gouv.fr/particuliers/vosdroits/F2123) et les exclusions prévues par les contrats. Sa fiche sur les [accidents de la vie courante](https://www.service-public.gouv.fr/particuliers/vosdroits/F3077) distingue notamment la présence ou l’absence d’un tiers responsable et l’assurance personnelle éventuelle. Aider gratuitement ne permet pas de conclure à l’avance quel contrat couvrira un accident précis.

Expliquez donc à l’assureur la situation réelle : intervention bénévole chez un particulier, tâche, matériel et personnes concernées. Clarifiez les limites avant le rendez-vous. Si le geste dépasse ce que vous savez faire ou les conditions prévues, interrompre le montage est préférable à improviser.

## <a id="faq"></a>Questions fréquentes

:::faq
### Puis-je demander de l’aide pour monter un meuble sur Guardiens ?
Une aide ponctuelle entre particuliers peut être proposée si la tâche entre dans le cadre de l’entraide et si chacun peut l’assurer. Décrivez le meuble, les gestes attendus, le matériel et les accès.

### Le coup de main est-il payant ?
L’entraide se fait sans rémunération et la plateforme est actuellement gratuite. Les fournitures restent à organiser ; une dépense avancée doit être convenue et remboursée au montant exact sur justificatif selon les CGU.

### Dois-je promettre un autre service avant de publier ?
Le formulaire rappelle l’esprit d’entraide sans vous demander de chiffrer un échange équivalent. Vous voyez ensemble ce qui convient, sans paiement ni contrepartie de valeur servant de tarif.

### Peut-on demander des travaux électriques ou en hauteur ?
Ces travaux sont exclus de l’entraide Guardiens, comme les interventions sur le gaz ou le chauffage, la toiture, la construction et la démolition. Cherchez un professionnel adapté pour ces besoins.

### Une personne pourra-t-elle venir rapidement à Lyon ou Grenoble ?
La publication permet de présenter le besoin et d’échanger avec les personnes intéressées. Elle ne garantit ni disponibilité locale ni réponse dans un délai donné ; confirmez les conditions avant de vous organiser.

### Guardiens couvre-t-il les dégâts ou blessures ?
Guardiens ne fournit pas d’assurance. Chaque personne doit vérifier les garanties et exclusions de ses contrats pour la situation réelle ; la gratuité ne suffit pas à établir une couverture.
:::$suite_content_0_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='9ab49bd0-af00-40a0-bc19-6f91a30e2d53'::uuid AND slug='bricolage-montage-meubles-entraide-grenoble-lyon';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/petites-missions-entraide-guardiens' THEN
    RAISE EXCEPTION 'Guide suite 0 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Bricolage et montage de meubles : demander un coup de main à Lyon ou Grenoble'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Une notice difficile à suivre, un meuble à assembler à deux : préparez une demande précise et vérifiez que le coup de main est adapté aux personnes et au lieu.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Montage de meubles : entraide à Lyon et Grenoble'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Besoin d’aide pour monter un meuble à Lyon ou Grenoble ? Décrivez la tâche, le matériel et les accès pour préparer un coup de main gratuit entre particuliers.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Deux adultes assemblent un meuble en bois avec une notice et des outils dans un salon.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"CGU de Guardiens","url":"/cgu"},{"text":"conditions tarifaires","url":"/tarifs"},{"text":"guide des petites missions d’entraide","url":"/actualites/petites-missions-entraide-guardiens"},{"text":"idées de coups de main","url":"/actualites/idees-coups-de-main-entraide-pres-de-chez-soi"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 14:25:17.056086+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 0 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot29_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 0 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot29_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot29_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Bricolage et montage de meubles : demander un coup de main à Lyon ou Grenoble',
    excerpt='Une notice difficile à suivre, un meuble à assembler à deux : préparez une demande précise et vérifiez que le coup de main est adapté aux personnes et au lieu.',
    meta_title='Montage de meubles : entraide à Lyon et Grenoble',
    meta_description='Besoin d’aide pour monter un meuble à Lyon ou Grenoble ? Décrivez la tâche, le matériel et les accès pour préparer un coup de main gratuit entre particuliers.',
    hero_image_alt='Deux adultes assemblent un meuble en bois avec une notice et des outils dans un salon.',
    internal_links='[{"text":"CGU de Guardiens","url":"/cgu"},{"text":"conditions tarifaires","url":"/tarifs"},{"text":"guide des petites missions d’entraide","url":"/actualites/petites-missions-entraide-guardiens"},{"text":"idées de coups de main","url":"/actualites/idees-coups-de-main-entraide-pres-de-chez-soi"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='bricolage-montage-meubles-entraide-grenoble-lyon' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 0 : % ligne au lieu de 1',affected; END IF;
END;
$guide_0$;

DO $guide_1$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_1_20261017$# Faire garder un Cavalier King Charles : présence, traitements et passation

**Pour faire garder un Cavalier King Charles, décrivez son quotidien et les soins éventuels avant de choisir une personne.** Sa petite taille et sa réputation de chien affectueux ne permettent pas de savoir comment il vit les absences, accueille un inconnu ou supporte une promenade.

S’il suit un traitement ou une surveillance particulière, préparez la garde avec les recommandations de son vétérinaire. Le gardien doit comprendre ce qu’il accepte d’assurer et savoir qui joindre ; il n’a pas à diagnostiquer un changement ou à adapter lui-même une prescription.

**À préparer :** [le choix de la garde](#choix), [la présence et les sorties](#routine), [un suivi cardiaque éventuel](#coeur), [la douleur et les manipulations](#douleur), [la passation](#passation), [questions fréquentes](#faq).

## <a id="choix"></a>Quelle garde convient à votre Cavalier ?

Comparez les solutions selon leur organisation : temps de présence, lieu, autres animaux, promenades et capacité à suivre les consignes. Rester chez lui avec une personne qui séjourne sur place conserve son cadre de vie, sans garantir l’absence d’inquiétude ou une surveillance continue.

Une pension, des visites ou un accueil ailleurs ont d’autres conditions. Demandez comment se passent l’arrivée, les absences, les soins et les imprévus plutôt que de choisir sur une réputation de race « facile à garder ». Le [guide des solutions de garde de chien](/actualites/garde-chien-faire-garder-son-chien) aide à comparer ces points.

Si la situation nécessite des actes ou une surveillance que la personne ne peut pas assurer, ne confirmez pas une garde en comptant sur son adaptation sur place. Cherchez une solution compatible avec les besoins définis avec le vétérinaire.

## <a id="routine"></a>Combien de présence et quelles promenades prévoir ?

Décrivez une journée ordinaire : horaires des sorties, rythme, lieux de repos, repas et absences déjà vécues. Précisez les réactions observées et les situations à éviter, comme une rencontre avec un autre chien ou une manipulation qui le gêne.

| Besoin | Questions à discuter avec le gardien |
| --- | --- |
| Présence | Quelles sorties personnelles prévoit-il et sont-elles compatibles avec les absences habituelles du chien ? |
| Promenades | Quel rythme suit le chien, quels trajets et quelles adaptations ont été recommandés ? |
| Cohabitation | Comment se passent réellement les contacts avec les personnes et les autres animaux ? |
| Repas | Quels aliments, quantités et horaires sont habituels, avec quelles restrictions éventuelles ? |
| Repos | Où le chien s’installe-t-il et quelles conditions lui permettent de rester au calme ? |

Ni quatre heures de solitude ni deux promenades de vingt minutes ne sont des règles adaptées à tous les Cavaliers. Tenez compte de l’âge, de la santé et des habitudes du vôtre. Pour les conditions météorologiques, adaptez les sorties et le lieu de repos sans imposer une activité pour atteindre un quota.

Une perte d’appétit nouvelle ne doit pas être déclarée normale pendant vingt-quatre ou quarante-huit heures sous prétexte que le propriétaire est absent. Demandez un avis vétérinaire en cas de changement inquiétant et prévenez le propriétaire. Le gardien ne doit pas attendre qu’une durée générique soit écoulée pour poser la question.

## <a id="coeur"></a>Que transmettre si votre Cavalier a un suivi cardiaque ?

Le [Manuel vétérinaire Merck](https://www.merckvetmanual.com/dog-owners/heart-and-blood-vessel-disorders-of-dogs/acquired-heart-and-blood-vessel-disorders-in-dogs) présente la prédisposition du Cavalier King Charles à la maladie valvulaire dégénérative. Une prédisposition ne signifie pas que tous les chiens de la race sont malades, ni qu’un souffle permet au gardien de déterminer le stade d’une affection.

Si votre chien est suivi, laissez les coordonnées du vétérinaire et du cardiologue lorsqu’il y en a un, les ordonnances à jour et les consignes écrites. Faites montrer les gestes nécessaires, les horaires de prise et la conduite à tenir si une prise est oubliée, refusée ou vomie. **Le gardien demande conseil au vétérinaire plutôt que de doubler une dose ou de modifier le traitement.**

Si une surveillance a été prescrite, demandez au vétérinaire d’expliquer comment la réaliser et à quel moment le contacter. Il n’existe pas de protocole de suivi à improviser à partir d’un article de garde.

**Une difficulté respiratoire au repos ou un malaise appelle un contact vétérinaire immédiat.** Une toux nouvelle, une fatigue inhabituelle ou un autre changement inquiétant mérite également un avis ; ces signes ne permettent pas de poser à distance un diagnostic cardiaque. Le gardien vous informe sans attendre votre réponse pour demander un avis urgent. Le [guide des imprévus](/actualites/gerer-imprevu-pendant-garde) aide à préparer contacts, transport et relais.

## <a id="douleur"></a>Douleur, sensibilité au toucher : quelles consignes laisser ?

La [fiche neurologique du CHV Frégis sur la syringomyélie](https://www.fregis.com/infos-sante/syringomyelie-chez-le-chien/) décrit notamment des douleurs, des grattages inhabituels et des difficultés locomotrices possibles. Ces manifestations peuvent aussi avoir d’autres causes ; le gardien ne doit pas conclure à cette maladie parce qu’il garde un Cavalier.

Si un diagnostic ou une sensibilité sont connus, transmettez les recommandations de manipulation, le matériel habituel et les traitements prescrits. Montrez ce que le gardien peut faire et ce qu’il doit éviter. Une douleur nouvelle, des cris ou une difficulté à se déplacer justifient de demander conseil au vétérinaire, pas seulement d’attendre le retour du propriétaire.

N’ajoutez pas un médicament ou une méthode de manipulation trouvés en ligne. L’objectif de la passation est de suivre les consignes adaptées au chien et d’identifier un changement, sans transférer au gardien une décision médicale.

## <a id="passation"></a>Comment préparer l’annonce et le départ ?

Dans l’annonce, décrivez les dates, le lieu, les animaux, les sorties, la présence attendue et les contraintes importantes. Précisez qu’un traitement ou des gestes sont à assurer lorsqu’ils peuvent déterminer le choix de la personne, puis transmettez les documents utiles lors des échanges de préparation.

Une rencontre peut être organisée si vous la souhaitez tous les deux. Profitez des échanges pour vérifier la compréhension des consignes et les limites du gardien. Le [guide pour choisir un gardien](/actualites/choisir-gardien-bons-criteres) aide à poser ces questions ; un contrôle de document d’identité ne certifie pas la capacité à donner un traitement ou à reconnaître une urgence.

Laissez les consignes accessibles, l’alimentation, le matériel, les contacts et un relais qui a accepté d’aider si nécessaire. Le [guide de préparation de la maison](/actualites/preparer-maison-avant-garde) complète les points de logement et d’accès.

Sur Guardiens, le gardien séjourne dans le logement et assure les tâches convenues **sans rémunération**. La plateforme est **actuellement 100 % gratuite pour les propriétaires et les gardiens**, selon les [conditions tarifaires](/tarifs). Les dépenses sont à discuter séparément ; aucun candidat ou remplacement n’est garanti. L’accord proposé après confirmation reste à signature facultative.

## <a id="faq"></a>Questions fréquentes

:::faq
### Un Cavalier King Charles est-il forcément facile à faire garder ?
Sa race et sa taille ne permettent pas de le conclure. Décrivez son comportement observé, ses absences habituelles et ses soins éventuels, puis vérifiez la compatibilité avec le gardien.

### Peut-on faire garder un Cavalier sous traitement cardiaque ?
Préparez la situation avec le vétérinaire et vérifiez que la solution choisie peut assurer les consignes. Transmettez les ordonnances et la conduite à tenir en cas de difficulté, sans laisser le gardien modifier une prescription.

### Combien de temps peut-il rester seul ?
La réponse dépend du chien et de ses habitudes. Comparez les absences déjà vécues aux sorties personnelles prévues du gardien ; une durée universelle de quatre heures ne suffit pas à décider.

### Une perte d’appétit le premier soir est-elle normale ?
Ne l’attribuez pas automatiquement à votre absence. Un changement inquiétant doit être discuté avec un vétérinaire, sans imposer un délai d’attente de vingt-quatre ou quarante-huit heures.

### Que faire si le chien respire difficilement ou paraît douloureux ?
Le gardien demande un avis vétérinaire et vous informe. Une difficulté respiratoire au repos ou un malaise appelle un contact immédiat ; il n’attend pas votre réponse pour demander de l’aide urgente.

### La garde sur Guardiens est-elle payante ?
La plateforme est actuellement gratuite pour les deux rôles. Le gardien est hébergé sans rémunération pour les tâches convenues, les dépenses restent distinctes et aucune candidature n’est garantie.
:::$suite_content_1_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='8603173d-7991-4176-9a81-c249992c2c6c'::uuid AND slug='cavalier-king-charles-guide-race';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/cavalier-king-charles-guide-race' THEN
    RAISE EXCEPTION 'Guide suite 1 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Faire garder un Cavalier King Charles : présence, traitements et passation'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Présence, rythme quotidien et éventuelles consignes cardiaques ou neurologiques : préparez une garde adaptée à votre Cavalier, sans généraliser son comportement.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Garde du Cavalier King Charles : santé et consignes'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Préparez la garde de votre Cavalier King Charles : présence, routine, ordonnances et contacts vétérinaires. Choisissez selon ses besoins et les soins à assurer.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Un Cavalier King Charles est couché sur une couverture dans un canapé.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"guide des solutions de garde de chien","url":"/actualites/garde-chien-faire-garder-son-chien"},{"text":"guide des imprévus","url":"/actualites/gerer-imprevu-pendant-garde"},{"text":"guide pour choisir un gardien","url":"/actualites/choisir-gardien-bons-criteres"},{"text":"guide de préparation de la maison","url":"/actualites/preparer-maison-avant-garde"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 16:10:12.537158+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 1 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot29_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 1 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot29_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot29_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Faire garder un Cavalier King Charles : présence, traitements et passation',
    excerpt='Présence, rythme quotidien et éventuelles consignes cardiaques ou neurologiques : préparez une garde adaptée à votre Cavalier, sans généraliser son comportement.',
    meta_title='Garde du Cavalier King Charles : santé et consignes',
    meta_description='Préparez la garde de votre Cavalier King Charles : présence, routine, ordonnances et contacts vétérinaires. Choisissez selon ses besoins et les soins à assurer.',
    hero_image_alt='Un Cavalier King Charles est couché sur une couverture dans un canapé.',
    internal_links='[{"text":"guide des solutions de garde de chien","url":"/actualites/garde-chien-faire-garder-son-chien"},{"text":"guide des imprévus","url":"/actualites/gerer-imprevu-pendant-garde"},{"text":"guide pour choisir un gardien","url":"/actualites/choisir-gardien-bons-criteres"},{"text":"guide de préparation de la maison","url":"/actualites/preparer-maison-avant-garde"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='cavalier-king-charles-guide-race' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 1 : % ligne au lieu de 1',affected; END IF;
END;
$guide_1$;

COMMIT;
