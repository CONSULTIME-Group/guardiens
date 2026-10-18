-- Refonte des guides débuter en France et garder une maison à l’étranger, autorisée le 17/10/2026.
-- Les URL, auteurs, dates de publication et indexabilité sont conservés.
BEGIN;
CREATE TABLE IF NOT EXISTS public._backup_articles_suite_lot21_20261017 AS SELECT * FROM public.articles WHERE false;
REVOKE ALL ON public._backup_articles_suite_lot21_20261017 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public._backup_articles_suite_lot21_20261017 TO service_role;
ALTER TABLE public._backup_articles_suite_lot21_20261017 ENABLE ROW LEVEL SECURITY;
SELECT id FROM public.articles WHERE id IN ('bf7fd4b6-8f74-4f12-b985-f65c30fd5868'::uuid,'76e35c45-fc49-41d1-8153-4e6decb07534'::uuid) ORDER BY id FOR UPDATE;

DO $guide_0$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_0_20261017$# Devenir home-sitter en France : les étapes pour débuter

**Pour devenir home-sitter, commencez par définir les gardes que vous pouvez réellement assurer, puis présentez votre expérience et échangez avec les propriétaires.** Vous n’avez pas besoin d’avoir déjà voyagé de maison en maison pour ouvrir la discussion. En revanche, il faut comprendre les tâches et pouvoir tenir vos engagements pendant tout le séjour.

Sur Guardiens, vous séjournez dans le logement d’un propriétaire absent pour veiller sur la maison et, **s’il y en a**, ses animaux. Vous êtes hébergé **sans rémunération**. La plateforme est **actuellement 100 % gratuite pour les propriétaires et les gardiens** ; transport, alimentation et dépenses convenues restent à organiser. Consultez les [conditions tarifaires actuelles](/tarifs).

**Les étapes :** [comprendre l’échange](#modele), [définir ses possibilités](#possibilites), [préparer son profil](#profil), [choisir une annonce](#annonce), [échanger et confirmer](#confirmation), [préparer l’arrivée](#arrivee), [questions fréquentes](#faq).

## <a id="modele"></a>1. Comprendre ce que vous acceptez

Le home-sitting, aussi appelé house-sitting, repose ici sur un séjour dans un logement et des tâches convenues avec son propriétaire. Il peut s’agir de nourrir un chat, sortir un chien, arroser quelques plantes ou relever le courrier. Chaque annonce décrit un besoin différent : la garde d’une maison ne suppose pas nécessairement un animal.

Le logement vous permet de vivre sur place ; les engagements déterminent vos journées. Si vous souhaitez partir toute la journée ou improviser vos déplacements, vérifiez que cela convient au propriétaire et aux éventuels animaux. Le [guide du house-sitting](/actualites/c-est-quoi-le-house-sitting) détaille le principe.

Le modèle de Guardiens est distinct d’une activité professionnelle rémunérée de garde ou d’entretien. Si votre projet est d’en faire un métier, renseignez-vous sur le cadre de l’activité envisagée plutôt que de déduire ses règles de cet échange entre particuliers.

## <a id="possibilites"></a>2. Définir les séjours qui vous conviennent

L’inscription sur Guardiens est réservée aux personnes majeures de 18 ans révolus et juridiquement capables, selon les [conditions d’utilisation](/cgu). Ensuite, ce sont surtout les besoins du séjour et vos possibilités qu’il faut rapprocher.

| À préciser pour vous-même | Pourquoi cela compte |
| --- | --- |
| Dates et transport | Être présent à la passation et pendant toute la période convenue. |
| Présence quotidienne | Vérifier la compatibilité avec votre travail, vos sorties et les besoins des animaux. |
| Expérience et limites | Accepter uniquement les gestes que vous comprenez et pouvez assurer. |
| Personnes et animaux qui vous accompagnent | Obtenir un accord explicite avant de préparer leur venue. |
| Budget | Prévoir le trajet, la vie sur place et une solution de repli. |

Une garde courte n’est pas forcément facile : un soin exigeant ou un chien difficile à conduire peut demander davantage qu’un séjour plus long dans un contexte connu. Pour débuter, cherchez une situation compatible avec votre expérience, sans vous fixer un délai arbitraire pour obtenir une première garde.

## <a id="profil"></a>3. Présenter votre expérience avec précision

Ajoutez une photo où l’on vous reconnaît, une présentation claire et les compétences que vous avez réellement pratiquées. Vous pouvez décrire la garde du chat d’un proche ou votre expérience avec votre propre chien, en expliquant ce que vous avez fait. Cela ne devient pas automatiquement une expérience de tous les animaux ou de tous les soins.

Dites aussi ce que vous ne pouvez pas assurer. Une bio précise facilite l’échange ; elle ne garantit pas une sélection. Le [guide pour créer son profil de gardien](/actualites/creer-profil-gardien-attractif) propose une trame et les informations utiles.

L’écusson d’identité indique qu’un document a été contrôlé dans le parcours prévu. Il ne certifie ni compétences ni fiabilité. Les avis, lorsqu’ils existent, sont une information complémentaire. Si le site vous demande de compléter votre profil pour candidater, suivez les indications de votre espace.

## <a id="annonce"></a>4. Lire une annonce avant de proposer votre aide

Regardez les dates, les animaux, les tâches, les conditions du logement et l’accès aux commerces ou aux transports. Ne choisissez pas uniquement sur les photos ou la destination. Une maison isolée peut nécessiter un véhicule ; une connexion annoncée ne suffit pas à confirmer vos besoins de télétravail.

Dans votre message, expliquez ce qui correspond à votre organisation et posez les questions encore ouvertes. Par exemple : quelles absences sont possibles en journée ? Qui intervient si vous ne pouvez plus assurer la garde ? Les dépenses éventuelles sont-elles définies ? Adaptez la candidature à l’annonce, sans promettre une disponibilité permanente si vous ne pouvez pas la tenir.

La présence d’une annonce ne garantit ni réponse, ni accord, ni disponibilité pour vos dates. Gardez le temps nécessaire aux échanges avant de réserver un transport.

## <a id="confirmation"></a>5. Clarifier les engagements avant de confirmer

Convenez ensemble des dates, des tâches, des personnes accueillies, des dépenses et des conditions de séjour. Pour un soin ou un équipement, demandez les explications nécessaires et dites si vous ne vous sentez pas capable de l’assurer. Une rencontre peut être organisée **si les deux personnes le souhaitent**.

Vérifiez également les assurances avec vos assureurs respectifs : décrivez le séjour, les animaux éventuels et les biens confiés. Une responsabilité civile couvre certains dommages causés à autrui selon le contrat ; elle ne permet pas de supposer que tout dommage dans le logement sera pris en charge. Les [repères de Service Public sur la responsabilité civile](https://www.service-public.gouv.fr/particuliers/vosdroits/F2123) expliquent cette distinction.

Après confirmation, un accord de garde est proposé sur Guardiens ; sa signature est facultative. Ce support aide à noter ce qui a été convenu. Le [guide de l’accord de garde](/actualites/commodat-garde-guardiens) complète ces points.

## <a id="arrivee"></a>6. Préparer la passation et le retour

Avant l’arrivée, convenez d’un créneau pour les clés et les consignes. Consultez le guide de la maison lorsqu’il est disponible, puis faites préciser les routines, les équipements utiles et les contacts. Pour un animal, prévoyez les coordonnées du vétérinaire et un relais local accepté par le propriétaire.

Décidez du rythme des nouvelles et de la marche à suivre en cas d’imprévu. Si une situation vous dépasse, signalez-la et organisez le relais ; si l’état d’un animal inquiète, demandez un avis vétérinaire sans attendre une réponse du propriétaire. Le [guide de première garde](/actualites/reussir-premiere-garde-house-sitting) vous accompagne pendant le séjour et jusqu’à la restitution des clés.

## <a id="faq"></a>Questions fréquentes

:::faq
### Peut-on devenir home-sitter sans expérience de garde ?
Oui, vous pouvez présenter votre situation et chercher une garde adaptée à vos possibilités. Décrivez votre expérience réelle, même personnelle, et vos limites. Le propriétaire reste libre de son choix ; aucune première mission n’est garantie.

### Faut-il avoir un diplôme pour s’inscrire sur Guardiens ?
L’inscription n’est pas présentée comme une qualification professionnelle. Suivez les conditions d’accès de la plateforme et ne proposez pas de gestes que vous ne pouvez pas assurer. Une activité rémunérée ou certaines tâches peuvent relever d’un autre cadre à vérifier.

### Est-on payé pour garder une maison ?
Sur Guardiens, le gardien est hébergé sans rémunération pour le séjour convenu. Cela ne décrit pas toutes les formes de gardiennage : des prestations professionnelles rémunérées existent dans d’autres cadres.

### Peut-on garder une maison sans animaux ?
Oui, si le besoin du propriétaire porte sur le logement et les tâches convenues. La présence d’animaux dépend de chaque annonce ; elle n’est pas une condition du house-sitting.

### Combien de temps faut-il pour trouver sa première garde ?
Il n’existe pas de délai garanti. Cela dépend notamment des annonces, des dates, de vos possibilités et du choix des propriétaires. Échangez avant de vous engager dans des frais de voyage.

### Est-ce gratuit pour un gardien débutant ?
La plateforme est actuellement 100 % gratuite pour les deux rôles. Le trajet et les dépenses de vie sur place restent distincts. Les conditions tarifaires actuelles précisent le fonctionnement et ses évolutions éventuelles.
:::$suite_content_0_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='bf7fd4b6-8f74-4f12-b985-f65c30fd5868'::uuid AND slug='comment-devenir-home-sitter-france-guide-debutant';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/comment-devenir-home-sitter-france-guide-debutant' THEN
    RAISE EXCEPTION 'Guide suite 0 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Devenir home-sitter en France : les étapes pour débuter'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Vous aimeriez garder une maison, mais vous ne savez pas par où commencer ? Voici les étapes pour comprendre l’échange et préparer une première candidature.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Devenir home-sitter en France : comment débuter ?'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Comment devenir home-sitter en France ? Comprenez l’échange, préparez votre profil et choisissez une première garde adaptée à vos disponibilités.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Une personne tient un chien roux et un chat dans ses bras, dans un salon lumineux.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"conditions tarifaires actuelles","url":"/tarifs"},{"text":"guide du house-sitting","url":"/actualites/c-est-quoi-le-house-sitting"},{"text":"conditions d’utilisation","url":"/cgu"},{"text":"guide pour créer son profil de gardien","url":"/actualites/creer-profil-gardien-attractif"},{"text":"guide de l’accord de garde","url":"/actualites/commodat-garde-guardiens"},{"text":"guide de première garde","url":"/actualites/reussir-premiere-garde-house-sitting"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 15:10:15.485422+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 0 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot21_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 0 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot21_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot21_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Devenir home-sitter en France : les étapes pour débuter',
    excerpt='Vous aimeriez garder une maison, mais vous ne savez pas par où commencer ? Voici les étapes pour comprendre l’échange et préparer une première candidature.',
    meta_title='Devenir home-sitter en France : comment débuter ?',
    meta_description='Comment devenir home-sitter en France ? Comprenez l’échange, préparez votre profil et choisissez une première garde adaptée à vos disponibilités.',
    hero_image_alt='Une personne tient un chien roux et un chat dans ses bras, dans un salon lumineux.',
    internal_links='[{"text":"conditions tarifaires actuelles","url":"/tarifs"},{"text":"guide du house-sitting","url":"/actualites/c-est-quoi-le-house-sitting"},{"text":"conditions d’utilisation","url":"/cgu"},{"text":"guide pour créer son profil de gardien","url":"/actualites/creer-profil-gardien-attractif"},{"text":"guide de l’accord de garde","url":"/actualites/commodat-garde-guardiens"},{"text":"guide de première garde","url":"/actualites/reussir-premiere-garde-house-sitting"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='comment-devenir-home-sitter-france-guide-debutant' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 0 : % ligne au lieu de 1',affected; END IF;
END;
$guide_0$;

DO $guide_1$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_1_20261017$# Devenir gardien de maison à l’étranger : préparer son séjour

**Pour garder une maison à l’étranger, il faut trouver un séjour compatible avec vos possibilités, vérifier votre droit d’y participer et préparer les responsabilités sur place.** Les photos et la destination donnent envie ; les dates, les tâches et les conditions d’accueil permettent de décider.

Sur Guardiens, le gardien séjourne chez un propriétaire absent pour veiller sur le logement et, s’il y en a, les animaux. Il est hébergé **sans rémunération**. La plateforme est **actuellement 100 % gratuite pour les deux rôles** ; cela ne rend pas gratuits le voyage, les assurances ou la vie sur place. Les [conditions tarifaires actuelles](/tarifs) précisent le modèle.

**Avant de partir :** [vérifier le droit au séjour](#sejour), [lire le besoin réel](#besoin), [clarifier les assurances](#assurances), [prévoir le budget](#budget), [organiser l’arrivée et les imprévus](#organisation), [questions fréquentes](#faq).

## <a id="sejour"></a>Le house-sitting est-il autorisé avec votre statut de séjour ?

**L’absence de rémunération ne suffit pas à déterminer les autorisations nécessaires.** Votre nationalité, votre résidence, la destination, la durée et les activités prévues comptent. Ne déduisez pas du mot « échange » ou « tourisme » que tout séjour de garde est automatiquement permis.

Avant de confirmer ou de réserver, consultez l’autorité d’immigration ou le consulat du pays concerné. Décrivez les faits : hébergement chez un particulier absent, tâches de garde, animaux éventuels, durée et absence de salaire. Demandez quel statut et quels documents correspondent à votre situation. L’accord du propriétaire ne remplace pas cette vérification.

Les [Conseils aux voyageurs de France Diplomatie](https://www.diplomatie.gouv.fr/fr/conseils-aux-voyageurs) constituent un point de départ pour les ressortissants français ; ils renvoient aux informations du pays. Pour une autre nationalité, utilisez les ressources officielles qui vous concernent également.

À titre d’exemple, le [régime britannique Standard Visitor](https://www.gov.uk/standard-visitor) distingue les activités autorisées et interdit notamment certains travaux même non rémunérés. Cette règle ne permet pas, à elle seule, de classer toute garde de maison : elle montre pourquoi il faut vérifier l’activité précise, et pas seulement l’existence d’un visa ou d’une dispense. Vérifiez aussi les conditions d’un télétravail éventuel avec les autorités et votre employeur.

## <a id="besoin"></a>Que faut-il regarder dans une annonce à l’étranger ?

Commencez par les responsabilités. Un séjour peut comprendre un chat, plusieurs chiens, des plantes ou simplement une présence dans le logement. Aucun profil de voyageur n’est adapté à toutes les maisons ; une expérience en France peut être utile à décrire, sans garantir un accord à l’étranger.

| Sujet | Question à poser au propriétaire |
| --- | --- |
| Présence et sorties | Quelles absences sont compatibles avec les besoins du logement et des animaux ? |
| Animaux et soins | Quelles routines et quels gestes faut-il assurer ? Puis-je les pratiquer correctement ? |
| Logement | Quels espaces, équipements et accès seront disponibles ? D’autres personnes interviendront-elles ? |
| Déplacements | Faut-il un véhicule ? Si un véhicule est proposé, quelles autorisations et assurances sont nécessaires ? |
| Communication | Dans quelle langue échanger avec le propriétaire, le relais local et le vétérinaire ? |
| Travail à distance | La connexion et l’organisation du séjour conviennent-elles à mes besoins réels ? |

Le réseau francophone facilite les premiers échanges lorsque vous partagez une langue. Il ne garantit ni des annonces dans chaque pays, ni une personne disponible, ni la connaissance des règles locales. Le [guide pour créer son profil de gardien](/actualites/creer-profil-gardien-attractif) aide à présenter votre expérience et vos limites.

Si vous êtes propriétaire expatrié et cherchez à faire garder votre logement, consultez plutôt le [guide de garde de maison pour expatriés](/actualites/expat-proprietaire-faire-garder-maison-etranger).

## <a id="assurances"></a>Quelles assurances vérifier pour une maison confiée à l’étranger ?

Distinguez **vos frais de santé et votre assistance**, **votre responsabilité civile** et **l’assurance du logement du propriétaire**. Un contrat de voyage ne couvre pas nécessairement les dommages à une maison confiée ; une responsabilité civile habituelle peut comporter des limites territoriales ou des exclusions.

Décrivez le séjour à votre assureur : pays, dates, hébergement sans rémunération, tâches et animaux éventuels. Demandez une réponse sur les garanties applicables, les biens confiés, les franchises, les exclusions et la déclaration d’un sinistre. Le propriétaire doit vérifier de son côté les conditions de son assurance habitation et l’accueil d’un gardien.

Les fiches de Service Public sur la [responsabilité civile](https://www.service-public.gouv.fr/particuliers/vosdroits/F2123) et les [assurances pendant les vacances](https://www.service-public.gouv.fr/particuliers/vosdroits/F2169) donnent des repères pour les contrats français ; elles ne prouvent pas que votre séjour précis est couvert. France Diplomatie distingue aussi [assurance médicale et assistance rapatriement](https://www.diplomatie.gouv.fr/fr/informations-pratiques/preparer-son-depart/la-prise-en-charge-medicale-et-les-assurances).

Conservez les coordonnées d’assistance utilisables depuis l’étranger et les modalités prévues pour les avances de frais. N’attendez pas un incident pour découvrir qui contacter.

## <a id="budget"></a>Quel budget prévoir si vous êtes hébergé ?

Le logement pendant la garde ne couvre pas tout le voyage. Chiffrez le transport, les formalités éventuelles, les assurances, l’alimentation, les déplacements locaux et une réserve pour une interruption ou un décalage. Les charges du logement et les dépenses liées aux animaux doivent être discutées, sans supposer qu’elles vous reviennent toutes ou qu’elles sont toutes incluses.

Gardez une solution d’hébergement avant ou après les dates convenues, ainsi qu’en cas d’annulation. Si vous comptez explorer la région, vérifiez d’abord les besoins de présence et le coût des déplacements. Le séjour ne doit pas dépendre d’une disponibilité que vous ne pourrez pas tenir.

## <a id="organisation"></a>Préparer la passation, les retards et le relais local

Convenez des heures d’arrivée et de départ, du temps de passation et de la remise des clés. Prévoyez ce qui se passe si votre trajet est retardé ou si le propriétaire rentre plus tard. Une visio peut servir à clarifier le besoin ; une rencontre en personne est possible **si les deux personnes le souhaitent** et peuvent l’organiser.

Préparez les contacts du propriétaire, d’un relais local qui a accepté d’intervenir et, pour les animaux, du vétérinaire et du service à joindre hors horaires. Notez l’adresse du logement et les informations utiles dans une forme que vous pouvez transmettre sur place. Convenez du financement des soins et de la marche à suivre : si l’état d’un animal inquiète, demandez un avis vétérinaire sans attendre une réponse du propriétaire.

Après confirmation, Guardiens propose un accord de garde à signature facultative ; le guide de la maison complète les consignes lorsqu’il est disponible. Ces outils ne règlent pas à eux seuls le droit au séjour, les assurances ou le droit local. Les [conseils pour réussir sa première garde](/actualites/reussir-premiere-garde-house-sitting) et le [guide des imprévus](/actualites/gerer-imprevu-pendant-garde) aident à préparer le quotidien.

## <a id="faq"></a>Questions fréquentes

:::faq
### Peut-on garder une maison à l’étranger avec un visa touristique ?
Cela dépend de votre situation, de la destination et de l’activité exacte. Vérifiez auprès de l’autorité d’immigration ou du consulat compétent avant de confirmer. L’absence de salaire et l’accord du propriétaire ne suffisent pas à établir une autorisation.

### Est-on payé pour ce type de séjour ?
Sur Guardiens, le gardien est hébergé sans rémunération pour les tâches convenues. Les dépenses doivent être clarifiées séparément. Une offre de gardiennage professionnel rémunéré relève d’un autre cadre à vérifier.

### Faut-il déjà avoir gardé une maison en France ?
Il n’existe pas de garantie d’accès à un séjour étranger après une garde en France. Décrivez votre expérience réelle et choisissez des responsabilités compatibles avec vos possibilités ; chaque propriétaire décide avec qui il souhaite organiser la garde.

### Une assurance voyage couvre-t-elle les dégâts dans la maison ?
Pas automatiquement. Faites vérifier les dommages aux biens confiés, la responsabilité civile, le pays, les activités et les exclusions par votre assureur. Le propriétaire doit aussi interroger son assureur habitation.

### Peut-on voyager en couple, en famille ou avec son animal ?
Seulement si la composition du séjour est acceptée explicitement par le propriétaire et compatible avec les lieux, les animaux et les règles applicables. Précisez qui viendra avant de confirmer ou de réserver.

### Le house-sitting à l’étranger est-il entièrement gratuit ?
La plateforme Guardiens est actuellement gratuite pour les propriétaires et les gardiens. L’hébergement sans rémunération ne supprime pas les frais de trajet, de séjour, d’assurance ou de formalités, ni les dépenses convenues entre les personnes.
:::$suite_content_1_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='76e35c45-fc49-41d1-8153-4e6decb07534'::uuid AND slug='devenir-gardien-maison-etranger';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/devenir-gardien-maison-etranger' THEN
    RAISE EXCEPTION 'Guide suite 1 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Devenir gardien de maison à l’étranger : préparer son séjour'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Un séjour de house-sitting à l’étranger se prépare avec le propriétaire, mais aussi avec les autorités et les assureurs concernés. Voici les vérifications utiles avant de partir.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Gardien de maison à l’étranger : préparer son séjour'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Garder une maison à l’étranger : vérifiez séjour, assurance, budget et tâches avant de confirmer. Préparez la passation et un relais local avec le propriétaire.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Une maison blanche avec des toits de tuiles et des terrasses, au-dessus d’un jardin.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"conditions tarifaires actuelles","url":"/tarifs"},{"text":"guide pour créer son profil de gardien","url":"/actualites/creer-profil-gardien-attractif"},{"text":"guide de garde de maison pour expatriés","url":"/actualites/expat-proprietaire-faire-garder-maison-etranger"},{"text":"conseils pour réussir sa première garde","url":"/actualites/reussir-premiere-garde-house-sitting"},{"text":"guide des imprévus","url":"/actualites/gerer-imprevu-pendant-garde"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 14:55:16.605002+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 1 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot21_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 1 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot21_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot21_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Devenir gardien de maison à l’étranger : préparer son séjour',
    excerpt='Un séjour de house-sitting à l’étranger se prépare avec le propriétaire, mais aussi avec les autorités et les assureurs concernés. Voici les vérifications utiles avant de partir.',
    meta_title='Gardien de maison à l’étranger : préparer son séjour',
    meta_description='Garder une maison à l’étranger : vérifiez séjour, assurance, budget et tâches avant de confirmer. Préparez la passation et un relais local avec le propriétaire.',
    hero_image_alt='Une maison blanche avec des toits de tuiles et des terrasses, au-dessus d’un jardin.',
    internal_links='[{"text":"conditions tarifaires actuelles","url":"/tarifs"},{"text":"guide pour créer son profil de gardien","url":"/actualites/creer-profil-gardien-attractif"},{"text":"guide de garde de maison pour expatriés","url":"/actualites/expat-proprietaire-faire-garder-maison-etranger"},{"text":"conseils pour réussir sa première garde","url":"/actualites/reussir-premiere-garde-house-sitting"},{"text":"guide des imprévus","url":"/actualites/gerer-imprevu-pendant-garde"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='devenir-gardien-maison-etranger' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 1 : % ligne au lieu de 1',affected; END IF;
END;
$guide_1$;

COMMIT;
