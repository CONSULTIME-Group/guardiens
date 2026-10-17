-- Refonte des guides France à distance et échange réciproque, autorisée le 17/10/2026.
-- Les URL, auteurs, dates de publication et couvertures sont conservés.
BEGIN;
CREATE TABLE IF NOT EXISTS public._backup_articles_expatries_echange_20261017 AS SELECT * FROM public.articles WHERE false;
REVOKE ALL ON public._backup_articles_expatries_echange_20261017 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public._backup_articles_expatries_echange_20261017 TO service_role;
ALTER TABLE public._backup_articles_expatries_echange_20261017 ENABLE ROW LEVEL SECURITY;
SELECT id FROM public.articles WHERE id IN ('cbabc950-1059-456f-a15f-f22e7d8165a9'::uuid,'396a1800-2617-4cdb-b47f-5cf055b02169'::uuid) ORDER BY id FOR UPDATE;

DO $guide_0$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $expatries_echange_content_0_20261017$# Garde de maison entre expatriés : organiser un échange réciproque

**La garde réciproque consiste à convenir de prendre soin du logement de l’autre, chacun à son tour ou selon une organisation compatible.** Elle n’est pas nécessaire pour faire du house-sitting : vous pouvez accueillir un gardien sans devoir ensuite garder sa maison. Avant de parler de retour de service, vérifiez que chaque séjour répond aux besoins réels des deux foyers.

Sur Guardiens, vous pouvez présenter votre besoin de garde et échanger avec les personnes intéressées. **La plateforme est actuellement 100 % gratuite pour les propriétaires et les gardiens.** Une garde hébergée se fait sans rémunération du gardien. Si vous envisagez ensuite une garde en retour, elle reste à organiser et à confirmer séparément : publier une annonce ne réserve pas automatiquement ce second séjour.

Je suis Elisa, cofondatrice de Guardiens. Argentine installée en France, j’ai gardé des maisons et des animaux avec Jérémie pendant cinq ans avant la création de la plateforme. Partager une langue et l’expérience de l’expatriation peut faciliter les échanges ; cela ne remplace pas la discussion sur les tâches et les disponibilités.

Ce guide traite l’organisation d’un **retour de garde entre deux foyers**. Pour un seul séjour, consultez plutôt le guide pour [faire garder sa maison à l’étranger](/actualites/expat-proprietaire-faire-garder-maison-etranger) ou celui consacré à [votre maison restée en France](/actualites/francais-etranger-garde-maison-france).

À parcourir : [distinguer les formules](#formules), [vérifier la compatibilité](#compatibilite), [décrire les engagements](#accord), [convenir des dépenses](#depenses), [vérifier les règles](#regles), [présenter son besoin](#plateforme), [prévoir une annulation](#annulation) et [questions fréquentes](#faq).

## <a id="formules"></a>Garde réciproque, échange de logements ou entraide : quelle différence ?

Commencez par préciser ce qui sera échangé. Habiter chez quelqu’un pendant son absence et venir arroser ses plantes une fois ne demandent pas la même organisation. Un échange de logements destiné au voyage n’implique pas non plus les mêmes tâches qu’une garde de maison et d’animaux.

| Organisation | Ce que vous convenez | Point à clarifier |
| --- | --- | --- |
| Deux gardes hébergées à des dates différentes | Une personne séjourne chez vous, puis vous séjournez chez elle | Dates, tâches et conditions de chaque garde |
| Échange de logements simultané | Chacun habite le logement de l’autre sur une période compatible | Disponibilité des deux maisons et soins réellement attendus |
| Passages réciproques sur place | Chacun rend des services ponctuels à l’autre sans y séjourner | Accès, déplacements, fréquence et limites de l’aide |

Le house-sitting classique n’impose aucune réciprocité entre les mêmes personnes : le logement et les tâches acceptées constituent l’échange du séjour. Si vous cherchez seulement un gardien, vous n’avez pas à promettre une future garde ailleurs.

Pour des passages locaux, examinez une organisation d’[entraide ponctuelle](/petites-missions) adaptée au besoin. Ne présentez pas de simples visites comme un logement proposé pour un séjour. À l’inverse, une garde hébergée suppose un lieu habitable et des conditions de vie convenues.

## <a id="compatibilite"></a>Comment savoir si les deux gardes sont compatibles ?

Comparez les dates, les trajets, les conditions de séjour et les tâches. Une maison avec un animal demandant une présence importante ne s’organise pas comme un logement sans animaux avec quelques plantes. L’équilibre ne se déduit pas du nombre de nuits ou de la surface des logements.

Parlez aussi des accompagnants, des animaux de la personne qui vient, des pièces disponibles, du télétravail et des sorties possibles. Les gardes peuvent avoir des durées différentes si les deux foyers l’acceptent, mais chacun doit pouvoir décider à partir d’informations précises.

Le fait de vivre dans la même ville peut simplifier certains trajets. Il ne garantit ni disponibilité immédiate, ni artisan commun, ni connaissance des animaux de l’autre. Deux expatriés n’ont pas nécessairement des calendriers complémentaires. Ne déduisez pas la fiabilité d’une personne de son statut d’expatrié ou de sa nationalité.

Une rencontre est possible si les deux le souhaitent ; les échanges peuvent aussi commencer à distance. Présentez les besoins et les lieux par le moyen qui vous convient, sans considérer qu’un appel d’une durée donnée suffit à établir la confiance. Notre guide pour [choisir un gardien](/actualites/choisir-gardien-bons-criteres) aide à examiner les compétences et les disponibilités.

## <a id="accord"></a>Que mettre par écrit pour chaque séjour ?

Décrivez séparément les deux périodes : qui accueille, qui vient, dates et horaires, pièces accessibles, tâches acceptées, présence attendue et modalités de départ. Précisez les visites autorisées, les dépenses et les personnes à joindre si un problème survient.

Si le retour de garde est prévu plusieurs mois plus tard, distinguez une date confirmée d’une simple intention. Changement d’emploi, déménagement ou besoin nouveau : le second séjour peut devenir impossible. Parlez de cette éventualité avant que le premier commence.

**Exemple fictif de points à compléter :**

> Premier séjour : dates, logement proposé, présence attendue et tâches décrites dans l’accord de cette garde. Second séjour : dates confirmées ou encore à convenir, logement et tâches à définir séparément. Nous précisons ce qui se passe si le second séjour ne peut pas avoir lieu. Chaque foyer conserve une autre solution possible pour sa propre absence.

Une formule vague comme « on vous rendra la pareille » ne précise ni ce qui est promis ni ce qui reste à décider. Ne considérez pas non plus qu’un nombre de pages garantit la qualité d’un accord. Les conditions doivent être compréhensibles et adaptées aux deux séjours.

## <a id="depenses"></a>Qui paie les consommations et les trajets ?

Il n’y a pas de règle automatique selon laquelle chacun devrait payer toute l’énergie du logement qu’il occupe. Convenez des consommations, du chauffage, des fournitures pour les animaux, des achats autorisés et des remboursements. Les trajets, repas et usages d’un véhicule se discutent également s’ils entrent dans votre organisation.

Les coûts peuvent différer fortement entre les deux séjours. Présentez-les avant confirmation et vérifiez que l’accord reste acceptable pour chacun. Si vous envisagez une participation financière, faites préciser ce qu’elle couvre et le cadre adapté ; l’expression « échange gratuit » ne règle pas toute question liée aux sommes ou avantages échangés.

**La gratuité actuelle de Guardiens concerne la plateforme.** Notre priorité est de créer le réseau et d’améliorer le service avec vos retours. Une participation aux frais de fonctionnement pourra être mise en place **au plus tôt au second semestre 2027, avec 30 jours de préavis**. Les conditions à jour sont indiquées sur la page [tarifs](/tarifs).

## <a id="regles"></a>Quelles assurances et règles vérifier dans chaque pays ?

Pour chaque logement, expliquez à l’assureur l’occupation prévue et les tâches confiées. Vérifiez les garanties de l’occupant, les limites territoriales, les responsabilités et les franchises. [Service Public présente les précautions d’assurance pour l’échange de logements et le home sitting](https://www.service-public.gouv.fr/particuliers/vosdroits/F21509), en distinguant aussi le contexte international. Un accord entre vous ne crée pas une garantie d’assurance.

Si vous êtes locataire, vérifiez les autorisations nécessaires avant de proposer le logement. Les conditions d’un bail, les règles locales et le statut d’occupation doivent être examinés pour chaque adresse. N’appliquez pas automatiquement le droit français à la maison située dans un autre pays.

En France, le code civil définit le [prêt à usage](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000020616173). Cette définition ne permet pas de qualifier automatiquement toute garde réciproque ni de conclure à l’absence de déclaration, d’impôt ou de relation de travail. Pour une organisation longue, des obligations importantes ou un doute sur des contreparties, faites vérifier le cadre approprié. Notre guide consacré à la maison en France précise aussi les [points d’occupation à examiner](/actualites/francais-etranger-garde-maison-france#regles).

Pour un séjour à l’étranger, vérifiez auprès des autorités du pays les conditions d’entrée, la durée autorisée et la compatibilité de votre statut avec les activités prévues, même sans rémunération. Les [Conseils aux voyageurs de France Diplomatie](https://www.diplomatie.gouv.fr/fr/conseils-aux-voyageurs) constituent un point de départ par destination. Ne présentez pas une garde comme automatiquement autorisée sous tout statut touristique.

## <a id="plateforme"></a>Comment présenter son besoin sur Guardiens ?

Commencez par votre maison et la garde recherchée : lieu, dates, logement, animaux éventuels et tâches courantes. Si vous êtes ouvert à un retour de garde, expliquez-le dans les échanges, en précisant s’il s’agit d’une possibilité ou d’un engagement déjà défini. Ne faites pas dépendre votre seule solution de l’existence d’un partenaire recherchant exactement l’inverse au même moment.

Un **exemple fictif à adapter** :

> Nous cherchons une personne pour séjourner chez nous à Lisbonne du 4 au 18 avril et s’occuper de notre chat selon les consignes à convenir. Nous sommes aussi ouverts à une garde chez cette personne à une autre période, si nos disponibilités et les besoins correspondent. Le premier séjour et cet éventuel retour seront définis et confirmés séparément.

Le guide pour [rédiger une annonce de garde](/actualites/rediger-bonne-annonce-house-sitting) aide à présenter les informations utiles. Le gardien choisit de candidater selon son intérêt pour le séjour ; Guardiens ne garantit ni candidature ni accord de réciprocité.

L’accord de garde disponible pour un séjour confirmé peut servir de référence commune, avec une signature facultative. Il ne réserve pas automatiquement un séjour en retour. Préparez les consignes et la remise des clés pour chaque garde, à l’aide du guide pour [préparer la maison](/actualites/preparer-maison-avant-garde). Transmettez les codes et accès détaillés en privé.

## <a id="annulation"></a>Que se passe-t-il si le retour de garde n’a pas lieu ?

Prévenez-vous dès qu’un engagement risque de ne plus pouvoir être tenu. Reprenez ce qui avait été convenu : les dates étaient-elles confirmées ? Le second séjour était-il une condition du premier ? Quelle autre organisation reste possible ? Un écrit aide à clarifier ces points, sans garantir leur exécution.

Ne comptez pas sur une future disponibilité comme sur un crédit de nuits acquis. Guardiens ne garantit pas le retour du service ni un remplacement immédiat. Le premier foyer doit pouvoir prévoir sa propre solution, et le second doit savoir à quoi il s’engage avant de partir.

Pour chaque maison, laissez un relais qui a accepté son rôle et les contacts utiles. Si une garde s’interrompt ou si un retour est retardé, organisez la transmission pour que les besoins nécessaires, notamment ceux des animaux, restent pris en charge. En cas de désaccord, appuyez-vous sur vos échanges et faites-vous accompagner selon le cadre applicable, sans supposer qu’un accord de plateforme résout automatiquement le litige.

## <a id="faq"></a>Questions fréquentes sur la garde réciproque entre expatriés

:::faq
### Doit-on garder la maison du gardien en retour ?

Non. Le house-sitting n’impose pas une garde réciproque entre les mêmes personnes. Un retour de garde est une organisation supplémentaire à discuter et à confirmer séparément.

### Faut-il que les deux séjours aient la même durée ?

Non. Vérifiez surtout que les dates, les tâches, les conditions de vie et les dépenses conviennent aux deux foyers. Le même nombre de nuits ne garantit pas un engagement équivalent.

### Peut-on s’entraider sans dormir dans la maison de l’autre ?

Oui, en organisant des passages ponctuels et les accès nécessaires. Cette entraide se distingue d’une garde hébergée : précisez les services, leur fréquence et les limites de disponibilité.

### Guardiens réserve-t-il automatiquement la garde en retour ?

Non. Présentez et confirmez chaque séjour séparément. L’accord d’une première garde ne vaut pas réservation du second séjour et ne crée pas un crédit de nuits.

### Un échange sans loyer dispense-t-il de toute vérification ?

Non. Vérifiez les assurances, les autorisations d’occupation et les règles applicables à chaque pays. L’absence de loyer ne suffit pas à conclure sur le cadre juridique, fiscal ou les conditions de séjour.

### Que prévoir si l’autre foyer annule sa part de l’échange ?

Clarifiez ce qui avait été confirmé, prévenez-vous rapidement et examinez une autre solution. Guardiens ne garantit pas le retour de garde ni un remplacement immédiat. Prévoyez les modalités d’annulation avant le premier séjour.
:::$expatries_echange_content_0_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='cbabc950-1059-456f-a15f-f22e7d8165a9'::uuid AND slug='echange-reciproque-garde-maison-expatries';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/echange-reciproque-garde-maison-expatries' THEN
    RAISE EXCEPTION 'Guide expatriés-échange 0 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Garde de maison entre expatriés : organiser un échange réciproque'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Se garder mutuellement sa maison suppose deux accords compatibles. Distinguez séjour de garde, échange de logements et passages ponctuels avant de vous engager.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Garde de maison entre expatriés : l''échange réciproque'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Deux foyers souhaitent se garder leur maison ? Clarifiez les séjours, les tâches, les frais et l’annulation. Un échange réciproque se prépare pour chaque garde.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Une main tient un trousseau de clés avec un porte-clés en forme de maison devant une porte ouverte.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"faire garder sa maison à l’étranger","url":"/actualites/expat-proprietaire-faire-garder-maison-etranger"},{"text":"votre maison restée en France","url":"/actualites/francais-etranger-garde-maison-france"},{"text":"entraide ponctuelle","url":"/petites-missions"},{"text":"choisir un gardien","url":"/actualites/choisir-gardien-bons-criteres"},{"text":"tarifs","url":"/tarifs"},{"text":"points d’occupation à examiner","url":"/actualites/francais-etranger-garde-maison-france#regles"},{"text":"rédiger une annonce de garde","url":"/actualites/rediger-bonne-annonce-house-sitting"},{"text":"préparer la maison","url":"/actualites/preparer-maison-avant-garde"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 14:10:21.078628+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide expatriés-échange 0 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_expatries_echange_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide expatriés-échange 0 différente';
  END IF;
  INSERT INTO public._backup_articles_expatries_echange_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_expatries_echange_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Garde de maison entre expatriés : organiser un échange réciproque',
    excerpt='Se garder mutuellement sa maison suppose deux accords compatibles. Distinguez séjour de garde, échange de logements et passages ponctuels avant de vous engager.',
    meta_title='Garde de maison entre expatriés : l''échange réciproque',
    meta_description='Deux foyers souhaitent se garder leur maison ? Clarifiez les séjours, les tâches, les frais et l’annulation. Un échange réciproque se prépare pour chaque garde.',
    hero_image_alt='Une main tient un trousseau de clés avec un porte-clés en forme de maison devant une porte ouverte.',
    internal_links='[{"text":"faire garder sa maison à l’étranger","url":"/actualites/expat-proprietaire-faire-garder-maison-etranger"},{"text":"votre maison restée en France","url":"/actualites/francais-etranger-garde-maison-france"},{"text":"entraide ponctuelle","url":"/petites-missions"},{"text":"choisir un gardien","url":"/actualites/choisir-gardien-bons-criteres"},{"text":"tarifs","url":"/tarifs"},{"text":"points d’occupation à examiner","url":"/actualites/francais-etranger-garde-maison-france#regles"},{"text":"rédiger une annonce de garde","url":"/actualites/rediger-bonne-annonce-house-sitting"},{"text":"préparer la maison","url":"/actualites/preparer-maison-avant-garde"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='echange-reciproque-garde-maison-expatries' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte expatriés-échange 0 : % ligne au lieu de 1',affected; END IF;
END;
$guide_0$;

DO $guide_1$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $expatries_echange_content_1_20261017$# Français de l’étranger : faire garder sa maison en France

**Vous pouvez faire garder votre maison en France pendant que vous vivez à l’étranger en accueillant un gardien qui y séjourne pendant les dates convenues.** Il assure la présence et les tâches que vous avez définies ensemble : courrier, plantes, entretien courant et soins des animaux s’il y en a. À distance, l’enjeu est surtout de préparer l’arrivée, les contacts et les décisions à prendre si vous êtes injoignable.

Sur Guardiens, vous publiez une annonce et échangez avec les personnes intéressées pour choisir votre gardien. Le séjour se fait en échange de l’hébergement, sans rémunération du gardien. **La plateforme est actuellement 100 % gratuite pour les propriétaires et les gardiens.** Les consommations et les autres dépenses du séjour se conviennent séparément.

Avec ma femme Elisa, qui est argentine, nous avons gardé des maisons et des animaux pendant cinq ans avant de créer Guardiens. Quand je vivais à l’étranger, j’aurais aimé pouvoir m’appuyer sur un réseau francophone de ce type. La confiance commence par des échanges clairs sur ce que chacun peut prendre en charge.

Ce guide concerne **votre logement situé en France**. Si c’est votre maison dans votre pays d’accueil que vous souhaitez confier, consultez plutôt le guide pour [faire garder sa maison à l’étranger](/actualites/expat-proprietaire-faire-garder-maison-etranger).

Vos questions : [choisir la formule](#solution), [prévoir les dates](#dates), [choisir le gardien](#gardien), [organiser les clés](#arrivee), [gérer à distance](#distance), [convenir des frais](#budget), [vérifier les règles](#regles) et [questions fréquentes](#faq).

## <a id="solution"></a>Une garde sur place est-elle adaptée à votre maison en France ?

Le house-sitting peut convenir si vous souhaitez que quelqu’un habite le logement pendant une période définie et assure des tâches courantes acceptées. La maison doit être habitable, avec les pièces, équipements et accès annoncés. **Vous pouvez proposer une garde sans animaux.**

Si vous avez seulement besoin de relever le courrier ou d’arroser quelques pots, examinez des passages convenus avec un proche ou un prestataire. Pour des travaux, une gestion locative ou une surveillance technique, choisissez un service adapté. Un gardien hébergé n’assure pas automatiquement ces prestations.

Ne lui demandez pas une présence permanente : discutez des nuits sur place, des sorties possibles et des besoins des animaux. Sa présence ne garantit pas qu’aucun cambriolage ou sinistre ne surviendra. Les précautions du logement restent à préparer ; notre guide sur la [maison pendant une absence prolongée](/actualites/securiser-maison-absence-prolongee) détaille ces points.

## <a id="dates"></a>Quelles dates annoncer si vous revenez plusieurs fois en France ?

Décrivez la période pendant laquelle le logement est réellement disponible. Si vous revenez pour une semaine, si un proche doit y séjourner ou si vous prévoyez des travaux, parlez-en avant de confirmer. Le gardien doit savoir s’il disposera du logement pendant tout le séjour annoncé et si des espaces seront partagés.

Pour plusieurs mois, prévoyez les conditions de départ et de retour, les besoins saisonniers et ce qui se passera entre deux gardes. Une succession de séjours demande une transmission à chaque changement ; elle ne se résume pas à trouver une personne pour la première période.

Publiez lorsque vos dates et les conditions sont suffisamment définies pour permettre une décision. Anticiper laisse du temps pour échanger et préparer le logement, sans garantir davantage de candidats. Il n’existe pas de délai qui assure de trouver un gardien, ni de profil automatiquement disponible pour une longue durée. Pour ce cas, poursuivez avec le guide des [gardes de plusieurs semaines](/actualites/vacances-longues-garde-animal-2-semaines).

## <a id="gardien"></a>Comment choisir un gardien depuis l’étranger ?

Partez de la garde réelle : durée, présence nécessaire, animaux, accès, jardin et équipements. Demandez à la personne ce qu’elle sait faire et comment le séjour s’articulera avec ses autres activités. Une profession, un âge ou une envie de découvrir la région ne suffisent pas à établir ses compétences.

Consultez le profil, les expériences décrites et les avis disponibles, puis posez vos questions. **Un badge d’identité indique un contrôle d’identité ; il ne garantit pas les compétences ni la fiabilité.** Ne supposez pas non plus que chaque personne inscrite dispose de ce badge.

La messagerie permet de commencer les échanges ; un appel audio ou vidéo peut aider à présenter les lieux et les besoins si vous le souhaitez. Une rencontre est possible si les deux le souhaitent. Le guide pour [choisir un gardien](/actualites/choisir-gardien-bons-criteres) propose des critères concrets pour comparer les candidatures.

## <a id="arrivee"></a>Comment organiser la remise des clés sans être en France ?

Choisissez une méthode avec la personne retenue et vérifiez qu’elle fonctionne avant son arrivée. Un proche peut assurer la transmission s’il a accepté ce rôle. Un accès autonome demande lui aussi des consignes précises, un essai et une solution si le gardien n’arrive pas à entrer. Vérifiez sa compatibilité avec les conditions de votre assurance.

| Point à préparer | À convenir avant l’arrivée | Relais à prévoir |
| --- | --- | --- |
| Clés et accès | Méthode, horaire, remise et restitution | Personne acceptant d’aider en cas d’échec |
| Présentation du logement | Pièces utilisables, commandes et consignes | Contact capable d’expliquer un point resté flou |
| Animaux éventuels | Routine, présence et soins acceptés | Contact local et vétérinaire prévus |
| Départ du gardien | Heure, état du logement et retour des clés | Transmission si vous ne rentrez pas à cette date |

L’adresse détaillée, les codes et l’emplacement des clés se transmettent en privé à la personne retenue. Ne les ajoutez pas à l’annonce publique. Laissez un document de consignes utilisable sur place et vérifiez que le gardien sait le retrouver.

Sur Guardiens, le guide de la maison permet de préparer les informations pratiques. L’accord de garde disponible après confirmation peut servir de référence commune ; sa signature reste un choix. Ces outils aident la transmission, sans remplacer les vérifications propres à votre situation. Notre guide pour [préparer sa maison avant une garde](/actualites/preparer-maison-avant-garde) complète cette étape.

## <a id="distance"></a>Comment gérer la garde avec le décalage horaire ?

Convenez d’un rythme de nouvelles et de créneaux qui fonctionnent pour vous deux. Précisez ce qui peut attendre votre réponse et ce qui doit être signalé immédiatement au contact approprié. « Je répondrai quand je pourrai » ne suffit pas si une décision locale est nécessaire.

Le relais en France doit avoir accepté son rôle, connaître ses disponibilités et disposer des informations utiles. Il peut s’agir d’un proche ou d’un professionnel selon le besoin. Définissez qui peut autoriser une intervention, un achat ou un transport de l’animal si vous êtes injoignable. Le gardien ne doit pas improviser une réparation ou prendre en charge des soins qu’il n’a pas acceptés.

Si le gardien doit partir plus tôt, organisez avec lui la transmission et une autre solution adaptée aux besoins. Guardiens ne garantit pas un remplacement immédiat. De même, si votre retour est retardé, une prolongation suppose son accord et sa disponibilité. Gardez une solution de repli pour les périodes où la prise en charge nécessaire ne serait plus assurée.

## <a id="budget"></a>Quels frais restent à prévoir malgré la gratuité ?

La gratuité de la plateforme ne rend pas toutes les dépenses du séjour gratuites. Clarifiez les fournitures des animaux, l’eau, l’énergie, le bois ou le chauffage, les consommables et les achats autorisés. Si vous envisagez une participation à certaines dépenses, convenez de son calcul avant confirmation et vérifiez que les conditions sont adaptées à votre situation.

Prévoyez aussi la façon de rembourser un achat accepté et les frais qui ne doivent pas être engagés sans votre accord. N’oubliez pas le coût d’un professionnel ou d’un relais rémunéré si votre organisation le nécessite. Aucun budget universel ne peut être déduit de la seule durée de la garde.

Notre priorité est de construire le réseau et d’améliorer le service avec vos retours. Une participation aux frais de fonctionnement de Guardiens pourra être mise en place **au plus tôt au second semestre 2027, avec 30 jours de préavis**. Les conditions à jour figurent sur la page [tarifs](/tarifs).

## <a id="regles"></a>Quelles vérifications faire pour un logement en France ?

**Assurance.** Décrivez à votre assureur l’occupation prévue, sa durée et les tâches confiées, puis faites confirmer les garanties et précautions applicables. Les [conseils de Service Public sur le home sitting](https://www.service-public.gouv.fr/particuliers/vosdroits/F21509) précisent les vérifications des deux parties et l’intérêt d’un accord écrit. Ni la présence du gardien ni un courriel envoyé sans réponse ne garantissent la couverture.

**Absences entre deux gardes.** Vérifiez comment le contrat définit l’inhabitation et les moyens de protection à utiliser. [France Assureurs rappelle que certaines garanties dépendent de ces conditions](https://www.franceassureurs.fr/lassurance-protege-finance-et-emploie/lassurance-protege/lassurance-en-pratique-pour-les-particuliers/sejour-etranger-assurances-et-assistance). Des passages ponctuels ne sont pas à considérer automatiquement comme une occupation suffisante.

**Fiscalité et déclaration d’occupation.** Vivre à l’étranger ne permet pas, à lui seul, de conclure sur toute votre situation fiscale. La DGFiP explique les [changements d’occupation à déclarer dans « Biens immobiliers »](https://www.impots.gouv.fr/particulier/questions/quelles-sont-les-informations-declarer-le-service-en-ligne-biens-immobiliers), y compris les situations d’occupation gratuite. En cas de doute sur un séjour temporaire, interrogez votre service gestionnaire plutôt que de supposer qu’aucune démarche n’est nécessaire. Les [impôts locaux d’un bien en France](https://www.impots.gouv.fr/particulier/questions/je-suis-non-resident-suis-je-concerne-par-les-impots-locaux) restent à examiner selon votre situation.

**Conditions de l’occupation.** Précisez les dates, les tâches, les dépenses, les pièces accessibles et la fin du séjour par écrit. L’absence de loyer ne suffit pas à régler toutes les questions juridiques d’une occupation ou d’un échange de services. Pour un montage long ou particulier, faites vérifier le cadre adapté ; une plateforme ne transforme pas automatiquement tout accord en prêt à usage sans autre conséquence.

Si vous cherchez également à garder une maison à votre tour, notre guide sur [l’échange réciproque entre expatriés](/actualites/echange-reciproque-garde-maison-expatries) distingue cette organisation de la simple recherche d’un gardien.

## <a id="faq"></a>Questions fréquentes des Français de l’étranger

:::faq
### Puis-je organiser la garde de ma maison en France depuis l’étranger ?

Oui. Présentez le logement et les dates, échangez avec les candidats et préparez la transmission à distance. La remise des clés, un relais local accepté et les décisions à prendre si vous êtes injoignable doivent être organisés avant l’arrivée.

### Peut-on faire garder sa maison en France sans animaux ?

Oui. Un séjour peut porter sur la présence et les tâches courantes convenues, comme les plantes ou le courrier. Pour quelques interventions seulement, des passages peuvent être plus adaptés qu’un séjour complet.

### Dois-je revenir en France pour rencontrer le gardien ?

La rencontre est possible si les deux le souhaitent. Vous pouvez échanger à distance, présenter les lieux et organiser une transmission avec un relais. Choisissez une organisation qui permet aux deux personnes de comprendre les besoins et les conditions avant de confirmer.

### Puis-je utiliser ma maison au milieu d’une longue garde ?

Précisez-le avant confirmation : dates, pièces partagées, présence de proches et disponibilité du logement. Le gardien ne doit pas découvrir pendant le séjour une interruption ou un partage qui n’avait pas été convenu.

### Qui prend le relais si le gardien doit partir ?

Prévoyez une solution avec des personnes ayant accepté ce rôle et les accès utiles. Guardiens ne garantit pas un remplacement immédiat. Organisez la transmission pour que les besoins de la maison et des animaux restent pris en charge.

### La garde est-elle gratuite pour un propriétaire vivant à l’étranger ?

La plateforme est actuellement 100 % gratuite pour les propriétaires et les gardiens. Le gardien est hébergé sans rémunération. Les consommations, fournitures et autres dépenses éventuelles du séjour se conviennent séparément.
:::$expatries_echange_content_1_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='396a1800-2617-4cdb-b47f-5cf055b02169'::uuid AND slug='francais-etranger-garde-maison-france';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/francais-etranger-garde-maison-france' THEN
    RAISE EXCEPTION 'Guide expatriés-échange 1 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Français de l’étranger : faire garder sa maison en France'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Votre maison reste en France pendant que vous vivez à l’étranger ? Préparez une garde sur place, avec des dates claires et un relais pour l’arrivée et les imprévus.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Français de l''étranger : faire garder votre maison en France'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Vous vivez à l’étranger ? Organisez la garde de votre maison en France : dates, clés, relais local, dépenses et assurances, même à distance.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Une maison en pierre avec des volets en bois et un escalier extérieur.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"faire garder sa maison à l’étranger","url":"/actualites/expat-proprietaire-faire-garder-maison-etranger"},{"text":"maison pendant une absence prolongée","url":"/actualites/securiser-maison-absence-prolongee"},{"text":"gardes de plusieurs semaines","url":"/actualites/vacances-longues-garde-animal-2-semaines"},{"text":"choisir un gardien","url":"/actualites/choisir-gardien-bons-criteres"},{"text":"préparer sa maison avant une garde","url":"/actualites/preparer-maison-avant-garde"},{"text":"tarifs","url":"/tarifs"},{"text":"l’échange réciproque entre expatriés","url":"/actualites/echange-reciproque-garde-maison-expatries"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 13:55:16.441629+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide expatriés-échange 1 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_expatries_echange_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide expatriés-échange 1 différente';
  END IF;
  INSERT INTO public._backup_articles_expatries_echange_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_expatries_echange_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Français de l’étranger : faire garder sa maison en France',
    excerpt='Votre maison reste en France pendant que vous vivez à l’étranger ? Préparez une garde sur place, avec des dates claires et un relais pour l’arrivée et les imprévus.',
    meta_title='Français de l''étranger : faire garder votre maison en France',
    meta_description='Vous vivez à l’étranger ? Organisez la garde de votre maison en France : dates, clés, relais local, dépenses et assurances, même à distance.',
    hero_image_alt='Une maison en pierre avec des volets en bois et un escalier extérieur.',
    internal_links='[{"text":"faire garder sa maison à l’étranger","url":"/actualites/expat-proprietaire-faire-garder-maison-etranger"},{"text":"maison pendant une absence prolongée","url":"/actualites/securiser-maison-absence-prolongee"},{"text":"gardes de plusieurs semaines","url":"/actualites/vacances-longues-garde-animal-2-semaines"},{"text":"choisir un gardien","url":"/actualites/choisir-gardien-bons-criteres"},{"text":"préparer sa maison avant une garde","url":"/actualites/preparer-maison-avant-garde"},{"text":"tarifs","url":"/tarifs"},{"text":"l’échange réciproque entre expatriés","url":"/actualites/echange-reciproque-garde-maison-expatries"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='francais-etranger-garde-maison-france' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte expatriés-échange 1 : % ligne au lieu de 1',affected; END IF;
END;
$guide_1$;

COMMIT;
