-- Refonte des guides cohérence réactivité et Haute-Savoie, autorisée le 17/10/2026.
-- Les URL, auteurs, dates de publication et indexabilité sont conservés.
BEGIN;
CREATE TABLE IF NOT EXISTS public._backup_articles_suite_lot56_20261017 AS SELECT * FROM public.articles WHERE false;
REVOKE ALL ON public._backup_articles_suite_lot56_20261017 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public._backup_articles_suite_lot56_20261017 TO service_role;
ALTER TABLE public._backup_articles_suite_lot56_20261017 ENABLE ROW LEVEL SECURITY;
SELECT id FROM public.articles WHERE id IN ('a0413726-3373-446d-9724-a35bcb69864a'::uuid,'ab3ab827-3af5-4dbb-a099-186ac1843269'::uuid) ORDER BY id FOR UPDATE;

DO $guide_0$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_0_20261017$# Faire garder un chien réactif ou agressif : préparer une solution adaptée

**Pour faire garder un chien réactif, décrivez les situations concrètes, les antécédents et les conditions nécessaires avant de choisir une personne ou une structure.** Une garde à domicile peut conserver des repères, mais elle ne garantit ni l’absence de réaction ni l’adaptation à tout gardien.

Si le comportement change brusquement, si une douleur est possible ou si la situation ne peut pas être gérée, contactez le vétérinaire avant d’organiser la garde. Le [Manuel vétérinaire Merck](https://www.merckvetmanual.com/dog-owners/behavior-of-dogs/behavior-problems-in-dogs) rappelle que des causes médicales peuvent contribuer aux comportements agressifs. Un article ou un profil de membre ne permet pas de les diagnostiquer.

**Repères :** [décrire les réactions](#situations), [comparer les solutions](#solutions), [préparer les conditions](#conditions), [éviter les mises à l’épreuve](#rencontre), [choisir et confirmer](#confirmation), [questions fréquentes](#faq).

## <a id="situations"></a>Que veut dire « réactif » pour votre chien ?

Le mot ne décrit pas à lui seul le risque ou les capacités nécessaires. [Dogs Trust explique la réactivité](https://www.dogstrust.org.uk/dog-advice/training/unwanted-behaviours/reactive-dog) comme une réponse émotionnelle qui peut notamment être liée à la peur, à la frustration ou à l’excitation. Deux chiens portant cette étiquette peuvent avoir des réactions très différentes.

Décrivez ce que vous avez observé, sans atténuer un antécédent de pincement, de morsure, de fuite ou de poursuite. Précisez aussi ce qui est inconnu. Une absence d’incident dans une situation jamais rencontrée ne prouve pas qu’elle sera facile avec une autre personne.

| Situation | Informations à transmettre |
| --- | --- |
| Croisements | Personnes ou animaux concernés, distance habituelle et possibilité de s’éloigner. |
| Maison | Visiteurs, portes, livraisons et personnes autorisées. |
| Ressources | Repas, objets ou lieux de repos à ne pas approcher. |
| Manipulations | Gestes acceptés, limites et suivi prescrit éventuel. |
| Absence | Durée déjà vécue et réactions connues, sans essai improvisé. |

Transmettez le plan établi avec les professionnels qui suivent le chien, s’il en existe un. Le gardien doit comprendre les gestes attendus et pouvoir refuser ce qui dépasse ses capacités.

## <a id="solutions"></a>Garde à domicile, accueil ou pension : que comparer ?

Ne choisissez pas uniquement selon « peureux », « sportif » ou « territorial ». Demandez comment chaque solution assure les conditions nécessaires à cet animal.

Une garde dans votre logement conserve l’environnement mais introduit une autre personne et parfois d’autres habitudes. Un accueil ailleurs change les lieux et peut ajouter des interactions. Une pension dispose de son organisation propre : renseignez-vous sur les espaces, les croisements, le repos et les capacités du personnel, sans supposer qu’un établissement collectif convient ou ne convient jamais.

Comparez la présence réelle, la gestion des accès, les contacts évitables et le relais. Un gardien hébergé ou en télétravail n’est pas automatiquement présent en continu. Si un besoin de présence ou une difficulté ne peut pas être assuré, préparez une autre organisation avec le professionnel qui connaît le chien. Le [comparatif des pensions et alternatives](/actualites/pension-chien-alternatives-guide) aide à poser les mêmes questions à chaque solution.

## <a id="conditions"></a>Quelles conditions écrire avant la garde ?

Définissez les routines connues, les parcours possibles et les situations à éviter. Expliquez les portes, clôtures et interactions avec les autres occupants ou animaux. Une personne doit pouvoir appliquer les consignes sans se mettre au milieu d’une situation qu’elle ne maîtrise pas.

Pour les promenades, convenez du matériel déjà utilisé, des distances et d’un itinéraire de repli. Évitez les rencontres forcées et les nouvelles activités pendant la garde. Les règles d’accès et de laisse restent à respecter, même si le propriétaire obtient habituellement un bon rappel.

Pour les repas et objets protégés, transmettez les précautions déjà établies. Les [conseils de Dogs Trust sur la protection de ressources](https://www.dogstrust.org.uk/dog-advice/training/unwanted-behaviours/resource-guarding-food-and-toys) recommandent notamment de ne pas retirer de force un objet et de préserver une distance adaptée. Le gardien ne doit pas improviser une rééducation ou punir un avertissement.

Un matériel de protection ou une séparation physique ne garantit pas à lui seul la sécurité. Toute utilisation doit être adaptée, comprise et préparée ; n’imposez pas un équipement inconnu au dernier moment.

## <a id="rencontre"></a>Faut-il tester le chien avec le futur gardien ?

Une rencontre préalable est possible **si vous le souhaitez tous les deux**, dans des conditions compatibles avec le chien et les personnes. Elle ne doit pas provoquer volontairement une réaction pour « voir comment il se comporte ».

Ne demandez pas au candidat d’approcher une gamelle, reprendre un jouet, forcer un contact ou multiplier les croisements pour évaluer le risque. Une rencontre calme ne prouve pas non plus que toutes les situations seront faciles ensuite. Si une évaluation particulière est nécessaire, préparez-la avec le professionnel compétent.

Il n’existe pas de nombre universel de rencontres ou de durée d’essai permettant de valider une garde. L’important est de savoir si les conditions nécessaires peuvent réellement être assurées, et de garder la possibilité de ne pas confirmer.

## <a id="confirmation"></a>Comment choisir une personne et prévoir un relais ?

Posez des questions sur des expériences précises : gérer un croisement, respecter une séparation, reconnaître qu’il faut s’éloigner ou demander de l’aide. Le goût des chiens ou une expérience avec la même race ne suffit pas à décrire ces capacités.

Un document d’identité contrôlé ne certifie pas une compétence comportementale ou la fiabilité. Consultez les avis lorsqu’ils existent, puis vérifiez les points particuliers de cette garde. La [préparation de l’annonce](/actualites/rediger-bonne-annonce-house-sitting) aide à décrire les contraintes sans les dissimuler.

Après confirmation, préparez les consignes, les contacts du vétérinaire et du relais ayant accepté, les dépenses et les conditions d’interruption. Un accord peut être établi ; sa signature est facultative. Vérifiez les assurances selon l’organisation réelle, avec les [repères juridiques de la garde](/actualites/house-sitting-cadre-juridique-france).

Sur Guardiens, le gardien est hébergé sans rémunération et la plateforme est **actuellement 100 % gratuite** pour les deux rôles, selon les [conditions tarifaires](/tarifs). Les dépenses restent distinctes. Une candidature spécialisée, une présence permanente ou un remplacement n’est pas garanti ; publier une demande ne valide pas sa faisabilité.

## <a id="faq"></a>Questions fréquentes

:::faq
### Peut-on faire garder un chien réactif à domicile ?
Cela dépend des réactions, des accès, de la présence et des capacités disponibles. Le domicile conserve des repères sans garantir l’absence de difficulté. Préparez les conditions avec le professionnel qui suit le chien si nécessaire.

### Faut-il signaler une morsure ou un pincement passé ?
Oui, avant toute confirmation. Décrivez la situation, les personnes ou animaux concernés et les mesures déjà établies. Le candidat doit pouvoir décider en connaissant les contraintes réelles.

### Faut-il tester la réaction du chien autour de sa gamelle ?
Non. Ne provoquez pas une situation de protection de ressources pour évaluer la garde. Transmettez les consignes établies et faites appel au professionnel compétent si une évaluation est nécessaire.

### Une rencontre est-elle obligatoire avant la garde ?
Elle est possible si vous le souhaitez tous les deux. Elle ne remplace pas les informations et ne prouve pas l’absence de risque ; son organisation ne doit pas mettre les personnes ou le chien à l’épreuve.

### Un gardien en télétravail assure-t-il une présence continue ?
Non. Définissez les horaires, les absences possibles et les conditions réellement assurées. Si le besoin ne peut pas être couvert, prévoyez une autre solution.

### Que faire si les difficultés augmentent pendant la garde ?
Suivez les consignes préparées, évitez les situations qui dépassent les capacités disponibles et contactez le propriétaire et le professionnel adapté. Un changement inhabituel peut nécessiter un avis vétérinaire ; prévoyez aussi les conditions de relais ou d’interruption.
:::$suite_content_0_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='a0413726-3373-446d-9724-a35bcb69864a'::uuid AND slug='chien-reactif-agressif-garde-solutions';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS DISTINCT FROM false
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/chien-reactif-agressif-garde-solutions' THEN
    RAISE EXCEPTION 'Guide suite 0 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Faire garder un chien réactif ou agressif : préparer une solution adaptée'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Décrivez les situations concrètes et vérifiez les capacités avant de confirmer. Comparaison des solutions, consignes et relais pour un chien réactif.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Garde de chien réactif ou agressif : préparer les conditions'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Réactions, antécédents, présence et relais : préparez une garde adaptée à votre chien réactif, sans mise à l’épreuve ni compétence supposée du gardien.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Illustration d’un chien assis avec une laisse et d’une personne près d’un canapé dans un salon.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"comparatif des pensions et alternatives","url":"/actualites/pension-chien-alternatives-guide"},{"text":"préparation de l’annonce","url":"/actualites/rediger-bonne-annonce-house-sitting"},{"text":"repères juridiques de la garde","url":"/actualites/house-sitting-cadre-juridique-france"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 14:25:17.052292+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 0 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot56_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 0 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot56_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot56_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Faire garder un chien réactif ou agressif : préparer une solution adaptée',
    excerpt='Décrivez les situations concrètes et vérifiez les capacités avant de confirmer. Comparaison des solutions, consignes et relais pour un chien réactif.',
    meta_title='Garde de chien réactif ou agressif : préparer les conditions',
    meta_description='Réactions, antécédents, présence et relais : préparez une garde adaptée à votre chien réactif, sans mise à l’épreuve ni compétence supposée du gardien.',
    hero_image_alt='Illustration d’un chien assis avec une laisse et d’une personne près d’un canapé dans un salon.',
    internal_links='[{"text":"comparatif des pensions et alternatives","url":"/actualites/pension-chien-alternatives-guide"},{"text":"préparation de l’annonce","url":"/actualites/rediger-bonne-annonce-house-sitting"},{"text":"repères juridiques de la garde","url":"/actualites/house-sitting-cadre-juridique-france"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='chien-reactif-agressif-garde-solutions' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 0 : % ligne au lieu de 1',affected; END IF;
END;
$guide_0$;

DO $guide_1$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_1_20261017$# Faire garder ses animaux en Haute-Savoie : présence, accès et solutions

**Pour faire garder vos animaux en Haute-Savoie, définissez la présence nécessaire, les accès au logement et les capacités requises avant de comparer les solutions.** Une adresse proche d’Annecy, d’Annemasse ou de Chamonix ne suffit pas à garantir un trajet, une disponibilité ou une compétence.

Ce guide aide à préparer une visite, un accueil ou une garde avec séjour dans votre logement. Le [guide des séjours en Haute-Savoie](/actualites/house-sitting-haute-savoie-annecy-megeve) complète les questions liées à la maison et à l’organisation de l’absence.

**Repères :** [choisir une formule](#solutions), [préparer les trajets](#acces), [organiser les sorties](#sorties), [comparer le budget](#budget), [confirmer la garde](#confirmation), [questions fréquentes](#faq).

## <a id="solutions"></a>Visites, accueil ou house-sitting : quelle présence faut-il ?

| Formule | Organisation | Point à vérifier |
| --- | --- | --- |
| Visites | Passages dans le logement | Durée, fréquence et temps sans présence compatibles avec l’animal. |
| Accueil ailleurs | Animal hébergé dans un autre foyer | Accès, repos, autres occupants et animaux. |
| Pension | Séjour dans un établissement | Organisation réelle, suivi et conditions d’accueil. |
| House-sitting | Gardien hébergé dans votre logement | Nuitées, absences possibles et tâches acceptées. |

Ne déduisez pas la formule d’un chat dit indépendant ou d’un chien sportif. Décrivez les habitudes, la santé, les réactions et la présence déjà bien vécue. Si un traitement est prescrit, vérifiez que la personne possède les capacités nécessaires et accepte les consignes ; les besoins particuliers se préparent avec le vétérinaire.

Une maison sans animaux peut aussi faire l’objet d’une garde. Définissez alors les plantes, le courrier, les accès et les gestes d’entretien, sans assimiler un passage d’arrosage à un séjour.

## <a id="acces"></a>Quels accès et déplacements décrire en Haute-Savoie ?

Donnez les informations utiles au trajet réel : commune et secteur, horaires, stationnement, marches, distance à pied depuis l’arrêt et matériel à transporter. Confirmez la remise des clés et les conditions d’accès ; la distance sur une carte ne suffit pas à établir un délai d’arrivée.

Pour un logement en altitude ou difficile d’accès, prévoyez une solution si les conditions changent. Le [Département de la Haute-Savoie présente les informations routières et Inforoute74](https://hautesavoie.fr/en-pratique/routes/connaitre-letat-des-routes-haute-savoie/) pour préparer les déplacements. Vérifiez aussi le dernier accès privé au logement : il n’est pas nécessairement décrit par une carte du réseau routier.

Si un véhicule est nécessaire pour les courses, l’animal ou un accès particulier, dites-le avant confirmation. Un gardien qui connaît le département ne dispose pas automatiquement du véhicule ou des capacités requis. Ne présentez pas toutes les communes comme soumises aux mêmes contraintes ou aux mêmes temps de route.

## <a id="sorties"></a>Quelles promenades et consignes transmettre ?

Présentez les parcours habituels, une solution plus courte et les interactions à éviter. La proximité d’un lac, d’un alpage ou d’une forêt ne garantit pas l’accès, la liberté ou la baignade du chien. Vérifiez les règles du site et les consignes temporaires.

Pour Annecy, les [repères de parcs et promenades](/actualites/parcs-balades-chiens-annecy-guide) distinguent les règles selon les lieux. Une randonnée nouvelle doit être convenue et compatible avec l’animal ; la race ou le goût du gardien pour la montagne ne suffit pas.

Pour un chat, précisez les portes et fenêtres à surveiller, les sorties autorisées, les cachettes et les routines de litière. Pour les autres animaux, décrivez l’espèce, les gestes et le matériel nécessaires plutôt que de supposer une expérience générale suffisante.

Laissez le contact du vétérinaire et vérifiez l’organisation des urgences avant le départ. Le [guide des contacts vétérinaires d’Annecy et de Haute-Savoie](/actualites/veterinaire-urgence-annecy-haute-savoie) aide à préparer ces informations ; appelez la structure concernée avant un déplacement selon ses consignes.

## <a id="budget"></a>Combien coûte une garde en Haute-Savoie ?

Demandez un devis pour vos dates et vos besoins. Comparez le nombre de visites, leur durée, les nuitées, les déplacements, le suivi et les conditions d’annulation. Une visite, une journée d’accueil et un séjour dans le logement ne couvrent pas la même présence.

Sur Guardiens, la plateforme est **actuellement 100 % gratuite** pour les propriétaires et les gardiens. Le gardien est hébergé sans rémunération ; les dépenses de l’animal, le transport et les autres frais convenus restent distincts. Consultez les [conditions tarifaires](/tarifs), sans supposer une gratuité permanente ou un voyage intégralement financé.

## <a id="confirmation"></a>Comment choisir une personne et préparer la garde ?

Décrivez vos dates, les besoins et les difficultés dans l’annonce. Demandez des expériences précises et les limites de la personne. Les avis, lorsqu’ils existent, et un document d’identité contrôlé complètent l’échange sans certifier une compétence ou la fiabilité.

Une rencontre est possible **si vous le souhaitez tous les deux**. Elle peut aider à présenter les routines, sans constituer une épreuve ni garantir la suite. Convenez de la présence, du rythme des nouvelles et des tâches avant confirmation.

Après confirmation, préparez l’[accord et la passation](/actualites/preparer-maison-avant-garde) ; la signature de l’accord reste facultative. Vérifiez les assurances et prévoyez un relais ayant accepté d’aider si la garde doit être interrompue.

Gardez du temps pour ces échanges et une autre organisation possible. Aucune candidature, réponse à délai fixe ou solution de remplacement n’est garantie. La saison et la commune ne permettent pas d’annoncer une disponibilité ou un niveau de demande sans données.

## <a id="faq"></a>Questions fréquentes

:::faq
### Quelle solution choisir pour un chat pendant une absence ?
Définissez ses routines, son état de santé et la présence nécessaire. Des visites et un séjour ne couvrent pas le même besoin ; l’étiquette de chat indépendant ne permet pas de choisir seule.

### Faut-il un gardien de ma commune ?
La proximité peut faciliter certains échanges, mais vérifiez le trajet réel, les horaires et les capacités. Une adresse proche ne garantit pas une disponibilité ou une compétence.

### Faut-il prévoir un véhicule ?
Selon le logement et les déplacements nécessaires. Décrivez les accès et les trajets avant confirmation, y compris la possibilité d’un accès compliqué par les conditions réelles.

### Le gardien peut-il emmener mon chien en montagne ?
Seulement dans une organisation convenue et adaptée au chien, après vérification du parcours et des règles du lieu. Une garde ne nécessite pas automatiquement une randonnée.

### La garde est-elle gratuite sur Guardiens ?
La plateforme est actuellement gratuite pour les deux rôles et le gardien est hébergé sans rémunération. Les dépenses de l’animal, le transport et les frais convenus restent à prévoir séparément.

### Que prévoir si la garde s’interrompt ?
Une personne relais ayant accepté ce rôle, les accès et les conditions d’information. Ni une nouvelle annonce ni la proximité d’autres membres ne garantissent un remplacement.
:::$suite_content_1_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='ab3ab827-3af5-4dbb-a099-186ac1843269'::uuid AND slug='garde-animaux-haute-savoie-guide';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS DISTINCT FROM false
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/garde-animaux-haute-savoie-guide' THEN
    RAISE EXCEPTION 'Guide suite 1 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Faire garder ses animaux en Haute-Savoie : présence, accès et solutions'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Comparez les solutions selon les besoins de vos animaux et les accès réels au logement. Présence, budget, promenades et relais à préparer en Haute-Savoie.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Garde d’animaux en Haute-Savoie : solutions et préparation'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Visites, pension ou séjour à domicile : préparez présence, trajets et consignes pour une garde en Haute-Savoie, avec les questions à poser avant le départ.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Une personne avec un chien tricolore et un chat roux et blanc sur une terrasse en bois, devant des montagnes.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"guide des séjours en Haute-Savoie","url":"/actualites/house-sitting-haute-savoie-annecy-megeve"},{"text":"repères de parcs et promenades","url":"/actualites/parcs-balades-chiens-annecy-guide"},{"text":"guide des contacts vétérinaires d’Annecy et de Haute-Savoie","url":"/actualites/veterinaire-urgence-annecy-haute-savoie"},{"text":"conditions tarifaires","url":"/tarifs"},{"text":"accord et la passation","url":"/actualites/preparer-maison-avant-garde"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 14:40:17.222122+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 1 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot56_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 1 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot56_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot56_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Faire garder ses animaux en Haute-Savoie : présence, accès et solutions',
    excerpt='Comparez les solutions selon les besoins de vos animaux et les accès réels au logement. Présence, budget, promenades et relais à préparer en Haute-Savoie.',
    meta_title='Garde d’animaux en Haute-Savoie : solutions et préparation',
    meta_description='Visites, pension ou séjour à domicile : préparez présence, trajets et consignes pour une garde en Haute-Savoie, avec les questions à poser avant le départ.',
    hero_image_alt='Une personne avec un chien tricolore et un chat roux et blanc sur une terrasse en bois, devant des montagnes.',
    internal_links='[{"text":"guide des séjours en Haute-Savoie","url":"/actualites/house-sitting-haute-savoie-annecy-megeve"},{"text":"repères de parcs et promenades","url":"/actualites/parcs-balades-chiens-annecy-guide"},{"text":"guide des contacts vétérinaires d’Annecy et de Haute-Savoie","url":"/actualites/veterinaire-urgence-annecy-haute-savoie"},{"text":"conditions tarifaires","url":"/tarifs"},{"text":"accord et la passation","url":"/actualites/preparer-maison-avant-garde"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='garde-animaux-haute-savoie-guide' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 1 : % ligne au lieu de 1',affected; END IF;
END;
$guide_1$;

COMMIT;
