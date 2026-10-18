-- Refonte des guides Border collie et Bouledogue français, autorisée le 17/10/2026.
-- Les URL, auteurs, dates de publication et indexabilité sont conservés.
BEGIN;
CREATE TABLE IF NOT EXISTS public._backup_articles_suite_lot28_20261017 AS SELECT * FROM public.articles WHERE false;
REVOKE ALL ON public._backup_articles_suite_lot28_20261017 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public._backup_articles_suite_lot28_20261017 TO service_role;
ALTER TABLE public._backup_articles_suite_lot28_20261017 ENABLE ROW LEVEL SECURITY;
SELECT id FROM public.articles WHERE id IN ('932672b5-7188-45ac-86e8-36a2e96e275a'::uuid,'cb6ee5b7-bbdc-4479-8016-ac3474889ce6'::uuid) ORDER BY id FOR UPDATE;

DO $guide_0$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_0_20261017$# Faire garder un Border collie : routine, sorties et réactions au mouvement

**Pour faire garder un Border collie, présentez ses habitudes et les situations à anticiper, en particulier ses réactions aux vélos, coureurs, animaux ou véhicules s’il en a.** Le gardien doit pouvoir assurer les sorties et la présence convenues, tout en respectant ses temps calmes.

L’image de la « pile électrique » explique mal le quotidien d’un chien précis. Il n’existe pas de conversion entre quinze minutes de jeu et une heure de promenade, ni de durée de solitude valable pour tous les Borders. Voici comment préparer une garde à partir de ce que vous observez chez le vôtre.

**Repères :** [choisir le cadre](#cadre), [anticiper les mouvements](#mouvement), [activités et repos](#activites), [présence et santé](#presence), [préparer la passation](#passation), [questions fréquentes](#faq).

## <a id="cadre"></a>Quelle solution de garde convient à votre Border collie ?

Comparez les conditions réelles : lieu, présence, promenades, autres animaux et capacité à suivre les consignes. Le house-sitting permet au chien de rester chez lui avec une personne qui séjourne sur place. Cela conserve son cadre, sans garantir l’absence de stress ou une présence permanente.

Une pension, des visites ou un accueil chez une autre personne proposent d’autres organisations. Renseignez-vous sur chaque lieu plutôt que de supposer qu’une pension manque de sorties ou qu’un gardien à domicile saura forcément gérer votre chien. Le [comparatif des solutions de garde](/actualites/pension-chien-alternatives-guide) aide à identifier les questions utiles.

Demandez au gardien des exemples de situations qu’il a déjà rencontrées et ses limites. Si votre chien tire fortement, réagit à certains croisements ou demande des soins, expliquez-le avant la confirmation. Une expérience avec la race ne vaut pas connaissance de votre animal.

## <a id="mouvement"></a>Vélos, coureurs et autres animaux : que faut-il expliquer ?

Décrivez ce qui déclenche une réaction, ce que fait le chien et la façon dont vous organisez habituellement le passage. Par exemple : il se fige en voyant un vélo, tire pour suivre un véhicule ou poursuit le chat lorsqu’il court. Ces faits sont plus utiles que « instinct de troupeau, c’est normal ».

[Dogs Trust explique les comportements de poursuite](https://www.dogstrust.org.uk/dog-advice/training/unwanted-behaviours/chasing) : ils peuvent avoir plusieurs causes et poser un problème de sécurité. Le guide recommande notamment de choisir des lieux et moments plus calmes et d’éviter que le chien répète une poursuite dangereuse. La race ne permet pas à elle seule d’en déterminer la cause.

Pour la garde, montrez le matériel déjà utilisé et indiquez les itinéraires habituels, les croisements à éviter et la solution si le trajet prévu est trop fréquenté. Ne demandez pas au gardien de tester le rappel, de lâcher le chien dans un lieu inconnu ou de commencer un apprentissage au bord d’une piste cyclable.

Les règles d’accès et de tenue en laisse dépendent du lieu. Vérifiez les indications locales avant une sortie ; un grand parc ou un sentier de montagne n’est pas automatiquement un espace où laisser courir un chien. Si ses réactions rendent les sorties difficiles, faites préparer l’organisation avec un professionnel compétent avant le départ. Le [guide du chien réactif pendant une garde](/actualites/chien-reactif-agressif-garde-solutions) complète cette préparation.

## <a id="activites"></a>Comment transmettre les jeux sans oublier le repos ?

Présentez une journée ordinaire plutôt qu’un programme sportif conçu pour le séjour. Le gardien doit savoir ce que le chien connaît, apprécie et peut pratiquer dans les conditions prévues.

| Moment | Ce qu’il faut préciser |
| --- | --- |
| Promenades | Horaires habituels, rythme, pauses, matériel et parcours de repli. |
| Jeux ou exercices connus | Objets utilisés, façon de commencer et terminer, restrictions éventuelles. |
| Temps calmes | Lieux de repos et habitudes permettant au chien de ne pas être sollicité. |
| Changement de conditions | Adaptations déjà recommandées pour sa santé ou nécessaires selon la météo. |

Les [repères de Dogs Trust sur les émotions et les besoins du chien](https://www.dogstrust.org.uk/dog-advice/understanding-your-dog/signs-your-dog-may-be-stressed) associent activité adaptée, jeux et repos. Multiplier les lancers ou chercher à épuiser le chien n’est pas un objectif de garde.

N’improvisez pas un parcours d’agilité avec du mobilier urbain et ne faites pas d’un séjour l’occasion d’apprendre de nouvelles commandes. Le gardien peut suivre les activités connues, compatibles avec les consignes de santé et l’environnement. Pour une difficulté nouvelle, mieux vaut demander conseil que l’attribuer immédiatement à un manque de dépense.

## <a id="presence"></a>Présence, alimentation et santé : quelles limites convenir ?

Indiquez les absences déjà vécues, leur durée et les réactions observées, puis demandez quelles sorties personnelles la personne envisage. La présence au domicile se discute concrètement ; une limite universelle de trois heures ne permet pas de choisir pour tous les chiens.

Transmettez l’alimentation et les quantités habituelles, les friandises autorisées et les ordonnances lorsqu’il y en a. Si un résultat de test, un diagnostic ou une restriction de mobilité est utile à la prise en charge, laissez le document et les instructions du vétérinaire. Le gardien ne doit pas interpréter un résultat génétique ou choisir un médicament selon la race.

Notez les coordonnées du vétérinaire habituel, le moyen de joindre un service de garde, le transport possible et le relais accepté si le séjour est interrompu. Face à un changement inquiétant, la personne demande un avis vétérinaire et vous informe, sans attendre votre réponse pour une urgence. Le [guide des imprévus pendant une garde](/actualites/gerer-imprevu-pendant-garde) aide à préparer ces contacts.

## <a id="passation"></a>Que décrire dans votre annonce et avant le départ ?

Précisez les dates, le logement, les animaux, les sorties et les contraintes importantes. Une description comme « parcours calme à privilégier car il réagit aux vélos » aide davantage qu’une demande de gardien « sportif et passionné ».

Une rencontre peut être organisée si vous la souhaitez tous les deux. Profitez des échanges pour montrer le matériel et clarifier ce que chacun accepte. Une présentation réussie ne garantit pas toute la garde, et un contrôle de document d’identité n’est pas une certification en comportement canin. Le [guide pour choisir un gardien](/actualites/choisir-gardien-bons-criteres) permet de préparer la discussion.

Sur Guardiens, le gardien séjourne dans votre logement et réalise les tâches convenues **sans rémunération**. La plateforme est **actuellement 100 % gratuite pour les propriétaires et les gardiens**, selon les [conditions tarifaires](/tarifs). Les dépenses sont distinctes et aucune candidature n’est garantie. L’accord proposé après confirmation reste à signature facultative ; laissez dans tous les cas les consignes nécessaires au séjour.

## <a id="faq"></a>Questions fréquentes

:::faq
### Un Border collie doit-il obligatoirement courir plusieurs heures pendant la garde ?
Le programme dépend du chien, de ses habitudes et de sa santé. Décrivez les promenades, jeux connus et temps calmes plutôt qu’un quota d’effort fondé sur la race.

### Les jeux de réflexion remplacent-ils une promenade ?
Ils peuvent faire partie du quotidien, sans équivalence universelle en minutes. Transmettez les activités déjà connues et la routine réelle, en laissant aussi du repos.

### Que dire au gardien si mon chien poursuit les vélos ?
Décrivez les situations observées, les trajets et le matériel utilisés, ainsi que les consignes professionnelles existantes. Le gardien ne doit pas improviser un apprentissage ou tester le chien près de la circulation.

### Le house-sitting est-il toujours préférable à une pension ?
Il conserve le cadre du logement, mais son adéquation dépend de la personne, de la présence et des tâches convenues. Comparez les conditions de chaque solution sans supposer le niveau de stress ou de surveillance.

### Combien de temps peut-il rester seul ?
Discutez des absences déjà vécues et des réactions du chien, puis comparez-les aux sorties prévues du gardien. Une durée identique pour tous les Borders ne permet pas de décider.

### La garde sur Guardiens est-elle gratuite ?
La plateforme est actuellement gratuite pour les deux rôles. Le gardien est hébergé sans rémunération pour les tâches convenues ; les dépenses doivent être discutées séparément, sans candidature garantie.
:::$suite_content_0_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='932672b5-7188-45ac-86e8-36a2e96e275a'::uuid AND slug='border-collie-guide-race-complet';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/border-collie-guide-race-complet' THEN
    RAISE EXCEPTION 'Guide suite 0 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Faire garder un Border collie : routine, sorties et réactions au mouvement'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Au-delà de l’image du chien infatigable, préparez une garde adaptée : réactions aux mouvements, jeux, repos, promenades et temps de présence à discuter.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Garde du Border collie : sorties, jeux et consignes'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Préparez la garde de votre Border collie : réactions aux vélos, sorties, jeux connus et repos. Choisissez un gardien compatible avec ses habitudes réelles.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Un Border collie noir et blanc en laisse auprès d’une personne dans un parc urbain.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"comparatif des solutions de garde","url":"/actualites/pension-chien-alternatives-guide"},{"text":"guide du chien réactif pendant une garde","url":"/actualites/chien-reactif-agressif-garde-solutions"},{"text":"guide des imprévus pendant une garde","url":"/actualites/gerer-imprevu-pendant-garde"},{"text":"guide pour choisir un gardien","url":"/actualites/choisir-gardien-bons-criteres"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 14:40:17.227159+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 0 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot28_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 0 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot28_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot28_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Faire garder un Border collie : routine, sorties et réactions au mouvement',
    excerpt='Au-delà de l’image du chien infatigable, préparez une garde adaptée : réactions aux mouvements, jeux, repos, promenades et temps de présence à discuter.',
    meta_title='Garde du Border collie : sorties, jeux et consignes',
    meta_description='Préparez la garde de votre Border collie : réactions aux vélos, sorties, jeux connus et repos. Choisissez un gardien compatible avec ses habitudes réelles.',
    hero_image_alt='Un Border collie noir et blanc en laisse auprès d’une personne dans un parc urbain.',
    internal_links='[{"text":"comparatif des solutions de garde","url":"/actualites/pension-chien-alternatives-guide"},{"text":"guide du chien réactif pendant une garde","url":"/actualites/chien-reactif-agressif-garde-solutions"},{"text":"guide des imprévus pendant une garde","url":"/actualites/gerer-imprevu-pendant-garde"},{"text":"guide pour choisir un gardien","url":"/actualites/choisir-gardien-bons-criteres"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='border-collie-guide-race-complet' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 0 : % ligne au lieu de 1',affected; END IF;
END;
$guide_0$;

DO $guide_1$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_1_20261017$# Faire garder un Bouledogue français : respiration, chaleur et préparation

**Pour faire garder un Bouledogue français, préparez les conditions de repos, les sorties et les consignes de santé avec une personne capable de les assurer.** Les difficultés respiratoires ne doivent pas être banalisées comme un simple trait de race ; demandez au vétérinaire les recommandations adaptées à votre chien avant le départ si ce point vous inquiète.

Le choix ne dépend pas seulement d’un petit gabarit ou d’un logement en ville. Présence, température réelle du lieu, accès, trajets et soins éventuels sont à discuter. Un gardien hébergé chez vous ne garantit ni une surveillance médicale ni un logement automatiquement frais.

**Dans ce guide :** [choisir la garde](#choix), [comprendre les points respiratoires](#respiration), [préparer les sorties et le logement](#conditions), [savoir qui appeler](#urgence), [organiser la passation](#passation), [questions fréquentes](#faq).

## <a id="choix"></a>Quelle garde choisir pour votre Bouledogue français ?

Le house-sitting permet au chien de rester chez lui avec une personne qui séjourne dans le logement. Ce cadre peut préserver ses habitudes, mais il faut vérifier la présence prévue, la capacité à suivre les consignes et les conditions concrètes du lieu.

Pour une pension, un accueil ailleurs ou des visites, posez les mêmes questions : qui assure les sorties, où se repose le chien, comment une difficulté est-elle repérée et qui intervient ? Ne supposez pas qu’une pension manque de surveillance ou qu’un particulier possède une formation aux chiens brachycéphales. Le [comparatif des solutions de garde de chien](/actualites/garde-chien-faire-garder-son-chien) aide à examiner les différentes organisations.

Si des soins ou une surveillance particulière sont nécessaires, faites préciser par le vétérinaire ce qu’ils impliquent et vérifiez que la solution choisie peut réellement les assurer. Une garde entre particuliers ne remplace pas une prise en charge médicale.

## <a id="respiration"></a>Pourquoi parler de sa respiration avant la garde ?

Le Bouledogue français fait partie des races à museau court, dites brachycéphales. Le [Centre hospitalier universitaire vétérinaire de Montréal](https://chuv.umontreal.ca/le-chuv/hopital-des-animaux-de-compagnie/ressources/le-syndrome-brachycephale/) explique que certaines conformations peuvent s’accompagner d’obstructions respiratoires. Bruits respiratoires, difficulté à supporter l’effort et malaises font partie des signes à faire évaluer, plutôt qu’à considérer automatiquement comme normaux.

Le [service de chirurgie OnlyVet](https://www.onlyvet.fr/la-prise-en-charge-du-syndrome-brachycephale/) décrit aussi l’effet de la chaleur, de l’effort et des difficultés de ventilation chez les chiens atteints. Il revient au vétérinaire de déterminer la situation de votre chien et ses besoins : l’apparence, le ronflement ou le nom de la race ne suffisent pas à poser un diagnostic.

Avant le départ, transmettez les antécédents utiles, les recommandations existantes et les éventuelles suites d’intervention. Ne demandez pas au gardien de décider seul si un nouveau bruit respiratoire est « habituel chez les bouledogues ».

## <a id="conditions"></a>Chaleur, sorties et logement : que préparer concrètement ?

Il n’existe pas de seuil de température garantissant que tous les chiens sont en sécurité, ni d’horaire valable partout. Saison, humidité, exposition du lieu et état du chien changent les conditions. Préparez les sorties et les possibilités de repli avec les recommandations adaptées au vôtre.

| Point à vérifier | Questions à résoudre avant le départ |
| --- | --- |
| Lieu de repos | Où le chien peut-il rester au calme, à l’abri du soleil, avec de l’eau et une aération adaptée ? |
| Conditions du logement | Quelle pièce reste la plus fraîche et que faire si elle devient trop chaude ? |
| Promenades | Quels parcours, rythmes et adaptations suivre selon le chien et les conditions du jour ? |
| Accès et trajets | Y a-t-il des escaliers, un véhicule ou un transport à prévoir, compatibles avec ses besoins ? |
| Soins habituels | Quels gestes sont prescrits ou déjà recommandés, avec quel matériel et quelles instructions ? |

Le [ministère de l’Agriculture rappelle les précautions en période de chaleur](https://agriculture.gouv.fr/professionnels-particuliers-les-precautions-prendre-en-cas-de-vague-de-chaleur), notamment l’accès à l’eau et la protection des animaux contre la chaleur. Ne laissez jamais le chien dans une voiture en stationnement. Adapter les sorties ne consiste pas à maintenir coûte que coûte leur durée en les décalant simplement à une heure fixe.

Montrez le matériel habituel et les accès au gardien. Ne prévoyez pas automatiquement un nettoyage des yeux ou des plis avec un produit nouveau : transmettez les soins réellement nécessaires et les instructions existantes. Pour les transports en commun, vérifiez les règles de l’opérateur et l’adéquation du trajet ; un petit chien n’est pas accepté partout dans les mêmes conditions.

## <a id="urgence"></a>Quels signes doivent conduire à appeler un vétérinaire ?

**Une difficulté à respirer, un malaise, un effondrement ou une coloration bleutée de la langue ou des gencives impose un contact vétérinaire immédiat.** N’attendez pas l’apparition de tous ces signes, ni une température extérieure donnée, pour demander de l’aide si la respiration devient inquiétante.

En cas de surchauffe suspectée, arrêtez l’activité, mettez le chien à l’abri de la chaleur et contactez immédiatement un vétérinaire pour être guidé sur les premiers gestes et le transport. Ne vous contentez pas de le ramener et d’attendre que cela passe. Le [service de régulation VetoAdom Alpin](https://www.vetoadom-alpin.com/urgence-veterinaire.php) cite les difficultés respiratoires et l’abattement parmi les motifs d’appel.

Laissez au gardien les coordonnées du vétérinaire habituel, le moyen de joindre le service de garde, les documents utiles et une solution de transport. Il vous informe, sans attendre votre réponse pour demander un avis urgent. Le [guide des imprévus pendant une garde](/actualites/gerer-imprevu-pendant-garde) permet d’organiser ces contacts et un relais accepté avant l’absence.

## <a id="passation"></a>Que mettre dans l’annonce et les consignes ?

Présentez les dates, le logement, les sorties, la présence attendue et les contraintes importantes. Distinguez une habitude d’un besoin médical : « il aime rester près de nous » ne décrit pas le temps d’absence possible, et « il ronfle » ne remplace pas une consigne vétérinaire.

Pour la passation, préparez l’alimentation habituelle, les quantités, les ordonnances lorsqu’il y en a et les gestes que le gardien accepte d’assurer. Une rencontre peut être organisée si vous la souhaitez tous les deux. Le [guide pour choisir un gardien](/actualites/choisir-gardien-bons-criteres) aide à vérifier les expériences et limites de chacun ; un contrôle de document d’identité ne certifie pas une compétence de soin.

Sur Guardiens, le gardien séjourne dans le logement et assure les tâches convenues **sans rémunération**. La plateforme est **actuellement 100 % gratuite pour les propriétaires et les gardiens**, selon les [conditions tarifaires](/tarifs). Les dépenses sont à convenir séparément. Aucun candidat, délai de réponse ou remplacement n’est garanti. L’accord proposé après confirmation reste à signature facultative.

## <a id="faq"></a>Questions fréquentes

:::faq
### Le house-sitting convient-il à tout Bouledogue français ?
Il conserve le cadre du logement, mais sa pertinence dépend des besoins du chien et de ce que la personne peut assurer. Des soins ou une surveillance particulière doivent être discutés avec le vétérinaire et la solution de garde.

### À partir de quelle température faut-il s’inquiéter ?
Un seuil unique ne garantit pas la sécurité de tous les chiens. Tenez compte des conditions réelles et des recommandations du vétérinaire ; demandez de l’aide sans attendre un chiffre donné si le chien paraît en difficulté.

### Les ronflements sont-ils forcément normaux pour la race ?
Non. Une respiration bruyante ou une difficulté à l’effort peut justifier une évaluation vétérinaire. Le gardien ne doit pas attribuer automatiquement un changement respiratoire à la race.

### Combien de minutes faut-il le promener ?
Transmettez la routine de votre chien et les adaptations recommandées. Une durée par saison, identique pour tous les Bouledogues français, ne permet pas de préparer des sorties adaptées.

### Le gardien doit-il attendre de me joindre en cas de difficulté respiratoire ?
Il contacte immédiatement un vétérinaire pour être guidé et vous prévient. Une urgence ne doit pas attendre votre réponse ni l’apparition de plusieurs signes à la fois.

### Les gardiens Guardiens sont-ils formés aux soins des Bouledogues ?
La plateforme ne garantit pas une formation liée à une race. Échangez sur l’expérience et les gestes nécessaires ; la gratuité actuelle et un contrôle de document d’identité ne certifient pas une compétence médicale.
:::$suite_content_1_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='cb6ee5b7-bbdc-4479-8016-ac3474889ce6'::uuid AND slug='bouledogue-francais-guide-race-complet';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/bouledogue-francais-guide-race-complet' THEN
    RAISE EXCEPTION 'Guide suite 1 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Faire garder un Bouledogue français : respiration, chaleur et préparation'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Choisir un cadre de garde, transmettre les habitudes et anticiper une difficulté respiratoire : les points à préparer pour votre Bouledogue français.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Garde du Bouledogue français : chaleur et respiration'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Respiration, chaleur, sorties et soins : préparez la garde de votre Bouledogue français et les contacts vétérinaires, avec des consignes propres à votre chien.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Un Bouledogue français est assis sur un tapis dans un salon, devant une fenêtre ouverte.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"comparatif des solutions de garde de chien","url":"/actualites/garde-chien-faire-garder-son-chien"},{"text":"guide des imprévus pendant une garde","url":"/actualites/gerer-imprevu-pendant-garde"},{"text":"guide pour choisir un gardien","url":"/actualites/choisir-gardien-bons-criteres"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 13:40:17.574877+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 1 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot28_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 1 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot28_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot28_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Faire garder un Bouledogue français : respiration, chaleur et préparation',
    excerpt='Choisir un cadre de garde, transmettre les habitudes et anticiper une difficulté respiratoire : les points à préparer pour votre Bouledogue français.',
    meta_title='Garde du Bouledogue français : chaleur et respiration',
    meta_description='Respiration, chaleur, sorties et soins : préparez la garde de votre Bouledogue français et les contacts vétérinaires, avec des consignes propres à votre chien.',
    hero_image_alt='Un Bouledogue français est assis sur un tapis dans un salon, devant une fenêtre ouverte.',
    internal_links='[{"text":"comparatif des solutions de garde de chien","url":"/actualites/garde-chien-faire-garder-son-chien"},{"text":"guide des imprévus pendant une garde","url":"/actualites/gerer-imprevu-pendant-garde"},{"text":"guide pour choisir un gardien","url":"/actualites/choisir-gardien-bons-criteres"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='bouledogue-francais-guide-race-complet' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 1 : % ligne au lieu de 1',affected; END IF;
END;
$guide_1$;

COMMIT;
