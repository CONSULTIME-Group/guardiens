-- Refonte des guides confier sa maison et huit situations d’absence, autorisée le 17/10/2026.
-- Les URL, auteurs, dates de publication et couvertures sont conservés.
BEGIN;
CREATE TABLE IF NOT EXISTS public._backup_articles_suite_lot05_20261017 AS SELECT * FROM public.articles WHERE false;
REVOKE ALL ON public._backup_articles_suite_lot05_20261017 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public._backup_articles_suite_lot05_20261017 TO service_role;
ALTER TABLE public._backup_articles_suite_lot05_20261017 ENABLE ROW LEVEL SECURITY;
SELECT id FROM public.articles WHERE id IN ('ec936ed2-0b3a-4d0d-bc8e-bcfd32f9d574'::uuid,'74a5441b-86b4-460a-a06d-cd6d4256256b'::uuid) ORDER BY id FOR UPDATE;

DO $guide_0$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_0_20261017$# Faire garder sa maison pendant son absence : solutions et précautions

**Pour faire garder votre maison, partez des tâches à assurer : quelques passages, l’entretien du jardin ou le séjour d’une personne chez vous.** Un proche, un intervenant à domicile, une société d’intendance, un prestataire de sécurité ou un gardien hébergé répondent à des besoins différents. Comparez ce qui sera effectivement fait, aux dates où vous en avez besoin.

Confier ses clés pose aussi des questions très concrètes : qui entre dans le logement, que se passe-t-il en cas de fuite d’eau, quelles dépenses peuvent être engagées et comment récupère-t-on les clés ? Voici les points à éclaircir avant le départ, avec ou sans animaux.

**Dans ce guide**

- [Comparer cinq solutions](#solutions)
- [Ce qu’une présence peut apporter à la sécurité](#chiffres)
- [Les risques à préparer ensemble](#risques)
- [L’accord, l’assurance et la fin du séjour](#depart)
- [Choisir une personne pour habiter chez vous](#gardien)
- [La dernière vérification avant de partir](#avant)
- [Questions fréquentes](#faq)

## <a id="solutions"></a>Cinq solutions pour faire garder sa maison

| Solution | Ce qu’elle peut assurer | À vérifier avant de choisir |
| --- | --- | --- |
| Un proche ou un voisin | Passages ou séjour, selon ce qu’il accepte. | Dates, tâches, accès et disponibilité réelle. |
| Un intervenant à domicile | Visites pour les plantes, les animaux ou des contrôles convenus. | Fréquence, contenu des visites, devis et organisation des jours sans passage. |
| Une société d’intendance | Suivi du logement et coordination de prestations prévues au contrat. | Interlocuteur, déplacements inclus, interventions et facturation. |
| Un prestataire de sécurité | Rondes, surveillance ou intervention selon le service souscrit. | Périmètre exact ; entretien et soins aux animaux demandent un accord distinct. |
| Un gardien hébergé en house-sitting | Vie sur place et tâches convenues en échange du logement, sans rémunération sur Guardiens. | Conditions d’accueil, planning, expérience utile et limites de ce qui est accepté. |

Un appartement sans animaux peut ne demander que des passages. Une maison avec plusieurs animaux et un jardin peut appeler une autre organisation. Le séjour d’un gardien est une possibilité lorsque vous souhaitez accueillir quelqu’un chez vous ; il ne suppose pas une présence à chaque instant.

Si vous devez aussi organiser la garde d’un animal, notre [guide des huit situations d’absence](/actualites/s-absenter-avec-animal-guide-solutions-2026) aide à choisir selon la durée et l’urgence. Pour une maison qui reste vide, le [guide de préparation à une absence prolongée](/actualites/securiser-maison-absence-prolongee) complète ces options.

## <a id="chiffres"></a>Une maison habitée est-elle protégée contre les cambriolages ?

Une personne sur place peut repérer un problème, relever le courrier ou signaler un dégât, selon les tâches prévues. Cela ne garantit pas l’absence de cambriolage, de fuite ou de panne. Un gardien qui habite le logement continue aussi à sortir et à mener sa vie.

Il serait trompeur de transformer des statistiques générales de cambriolage en pourcentage de protection du house-sitting. Pour votre logement, les vérifications utiles portent plutôt sur les accès, les équipements et la façon de donner l’alerte.

Convenez notamment de la fermeture des portes et fenêtres, de l’usage éventuel de l’alarme, des espaces accessibles et de la personne à contacter si le gardien remarque une anomalie. La surveillance technique d’un dispositif de sécurité reste distincte de l’accueil d’un particulier.

## <a id="risques"></a>Quels risques faut-il anticiper avant de confier ses clés ?

### Une tâche nécessaire n’a pas été comprise

« S’occuper du jardin » peut désigner trois pots à arroser ou plusieurs heures de travail. Décrivez les tâches, leur fréquence et les outils à utiliser. Une intervention technique, un chantier ou un entretien lourd demande des compétences et une organisation spécifiques ; ce n’est pas une conséquence implicite du logement offert.

Pour les animaux, indiquez les sorties, les soins prescrits et les contraintes de présence. Distinguez ce qui est indispensable de ce qui peut attendre votre retour.

### Le gardien est empêché ou doit quitter le logement

Prévoyez un contact local qui a accepté ce rôle, une solution pour récupérer les clés et la prise en charge des tâches urgentes. Vérifiez que ce relais peut réellement accéder au logement. Un numéro conservé dans un téléphone ne suffit pas si personne n’a les clés.

Le [guide des imprévus pendant une garde](/actualites/gerer-imprevu-pendant-garde) détaille l’organisation des contacts et du relais. Une annonce publiée ne garantit pas qu’une autre personne pourra intervenir immédiatement.

### Une panne entraîne une dépense

Montrez les coupures d’eau et d’électricité utiles, laissez les coordonnées des intervenants habituels et précisez qui peut autoriser une réparation. Convenez des dépenses acceptables, des justificatifs et du remboursement. Les montants sont à discuter ensemble.

Si une situation menace une personne ou demande une intervention professionnelle urgente, la priorité est de contacter le service compétent. Le gardien n’a pas à réparer une installation qu’il ne maîtrise pas.

### Le séjour ne respecte pas la vie privée

Clarifiez les pièces accessibles, les visiteurs et les équipements connectés. Informez le gardien des caméras existantes et de leur fonctionnement, puis convenez d’une organisation qui respecte sa vie privée. La [CNIL explique les précautions relatives aux caméras chez soi](https://www.cnil.fr/fr/la-videosurveillance-videoprotection-chez-soi). Une caméra destinée aux animaux peut aussi filmer la personne hébergée.

Rangez les documents et objets personnels que vous ne souhaitez pas laisser accessibles. Transmettez uniquement les accès nécessaires au séjour, par un moyen adapté, sans publier de code d’entrée ni d’emplacement de clés dans l’annonce.

## <a id="depart"></a>Quel cadre prévoir pour l’assurance, le séjour et le retour ?

### Vérifier les garanties avant le départ

Expliquez à votre assureur qui sera hébergé, pour quelles dates et avec quelles tâches. Faites vérifier les garanties du logement, la responsabilité civile du gardien, les exclusions et la gestion d’une franchise éventuelle. L’assurance de la plateforme ou le simple fait d’être inscrit ne doivent pas être supposés couvrir un dommage.

La fiche [Service Public sur l’assurance du home-sitting](https://www.service-public.gouv.fr/particuliers/vosdroits/F21509) précise les vérifications à mener. Elle indique aussi qu’un locataire doit obtenir l’autorisation écrite de son propriétaire avant d’accueillir un home-sitter. Pour les autres questions, consultez notre [guide du cadre juridique du house-sitting en France](/actualites/house-sitting-cadre-juridique-france).

### Écrire les engagements réciproques

Précisez les dates, les personnes accueillies, les tâches, les espaces disponibles, les frais et la remise des clés au retour. Le logement doit aussi permettre au gardien de séjourner dans les conditions annoncées : couchage, équipements, chauffage et connexion si elle a été promise.

Sur Guardiens, un [accord de garde](/actualites/commodat-garde-guardiens) est proposé après confirmation ; sa signature est facultative. Le document aide à clarifier ce que chacun accepte. Il ne constitue ni une assurance ni une garantie de bonne exécution.

### Préparer la fin de la garde

Convenez de l’heure du départ, de la remise des clés et d’un point sur les dépenses ou incidents. Si votre retour est décalé, demandez l’accord du gardien pour toute prolongation et préparez une autre solution s’il n’est pas disponible.

En cas de désaccord sur l’occupation du logement, conservez les échanges et demandez un avis juridique adapté à la situation. La qualification du séjour et les démarches ne se déduisent pas d’un titre d’article ou du seul nom donné à l’accord.

## <a id="gardien"></a>Comment choisir la personne qui va habiter chez vous ?

Posez des questions liées au séjour : disponibilités, horaires d’absence, expérience des tâches prévues, personnes accompagnantes et réaction face à un imprévu. De son côté, le gardien doit pouvoir poser des questions sur le logement et refuser une tâche qu’il ne sait pas assurer.

Lisez les avis lorsqu’il y en a et les éléments concrets du profil. L’écusson « Identité vérifiée » indique le contrôle d’une pièce d’identité ; il ne certifie pas les compétences ni la fiabilité de la personne. Une rencontre peut avoir lieu si les deux le souhaitent.

Notre [guide pour choisir un gardien](/actualites/choisir-gardien-bons-criteres) propose des questions utiles. Une fois la garde confirmée, le [guide d’accueil](/actualites/accueillir-gardien-bonnes-pratiques) aide à organiser le passage de relais.

Sur Guardiens, vous publiez les dates, le logement et les besoins, puis échangez avec les personnes intéressées. Le séjour repose sur un hébergement sans rémunération. **La plateforme est actuellement 100 % gratuite pour les propriétaires et les gardiens.** Nourriture des animaux, consommables et dépenses convenues restent à organiser séparément.

Nous avons créé Guardiens, Jérémie et Elisa, après cinq ans de house-sitting. Notre priorité est de construire un réseau de confiance ; vos retours nous aident à améliorer le service. Une participation aux frais de fonctionnement pourra être mise en place au plus tôt au second semestre 2027, avec trente jours de préavis. Les conditions actuelles sont présentées sur la [page des tarifs](/tarifs).

## <a id="avant"></a>La dernière vérification avant de partir

Avant de confier les clés, assurez-vous que chacun dispose des mêmes informations :

- Dates, arrivée, départ et personnes accueillies confirmés.
- Clés testées et accès nécessaires transmis de façon privée.
- Tâches et planning compatibles avec les disponibilités du gardien.
- Contacts utiles, relais accepté et accès de secours organisés.
- Assurance vérifiée et règles de dépenses convenues.
- Conditions de séjour, équipements et vie privée clarifiés.

La [checklist avant les vacances](/actualites/checklist-partir-vacances-animaux) permet de reprendre ces points avec les besoins des animaux.

## <a id="faq"></a>Questions fréquentes sur la garde de maison

:::faq
### Peut-on faire garder une maison sans animaux ?
Oui. Le besoin peut concerner une présence dans le logement, les plantes, le jardin ou des tâches convenues. Décrivez-les précisément et vérifiez qu’elles correspondent à ce que la personne accepte.

### Le gardien doit-il rester chez moi toute la journée ?
Habiter chez vous ne signifie pas y rester en permanence. Discutez des horaires et des absences possibles avant de confirmer, en tenant compte des animaux et des tâches indispensables.

### Puis-je confier mon logement si je suis locataire ?
Service Public indique qu’une autorisation écrite du propriétaire est nécessaire pour accueillir un home-sitter. Vérifiez aussi le bail et l’assurance avant d’organiser le séjour.

### Qui paie si quelque chose est cassé pendant la garde ?
Cela dépend des faits et des garanties d’assurance applicables. Prévenez l’assureur concerné, conservez les justificatifs et clarifiez avant la garde les dépenses et la gestion d’une franchise. L’inscription sur Guardiens ne vaut pas couverture automatique.

### Peut-on laisser une caméra pour surveiller les animaux ?
Sa présence et son fonctionnement doivent être expliqués avant le séjour, en respectant la vie privée du gardien. La CNIL détaille les précautions pour les caméras chez soi ; filmer un animal peut aussi filmer une personne.

### Faire garder sa maison sur Guardiens est-il gratuit ?
La plateforme est actuellement 100 % gratuite pour les deux rôles. Le gardien est hébergé sans rémunération ; les dépenses de la maison et des animaux sont à convenir séparément. Une contribution au fonctionnement pourra évoluer au plus tôt au second semestre 2027, avec trente jours de préavis.
:::$suite_content_0_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='ec936ed2-0b3a-4d0d-bc8e-bcfd32f9d574'::uuid AND slug='confier-sa-maison-absence-risques';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'Guide suite 0 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Faire garder sa maison pendant son absence : solutions et précautions'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Qui peut veiller sur votre maison pendant votre absence ? Cinq solutions, les vérifications utiles et les points à convenir avant de confier vos clés.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Faire garder sa maison : 5 solutions, risques et cadre légal'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Proche, visites, intendance ou house-sitting : comparez cinq façons de faire garder votre maison et préparez les accès, l’assurance et le retour.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Une personne consulte son téléphone en caressant un chien dans un salon.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"guide des huit situations d’absence","url":"/actualites/s-absenter-avec-animal-guide-solutions-2026"},{"text":"guide de préparation à une absence prolongée","url":"/actualites/securiser-maison-absence-prolongee"},{"text":"guide des imprévus pendant une garde","url":"/actualites/gerer-imprevu-pendant-garde"},{"text":"guide du cadre juridique du house-sitting en France","url":"/actualites/house-sitting-cadre-juridique-france"},{"text":"accord de garde","url":"/actualites/commodat-garde-guardiens"},{"text":"guide pour choisir un gardien","url":"/actualites/choisir-gardien-bons-criteres"},{"text":"guide d’accueil","url":"/actualites/accueillir-gardien-bonnes-pratiques"},{"text":"page des tarifs","url":"/tarifs"},{"text":"checklist avant les vacances","url":"/actualites/checklist-partir-vacances-animaux"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 13:25:17.756607+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 0 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot05_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 0 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot05_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot05_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Faire garder sa maison pendant son absence : solutions et précautions',
    excerpt='Qui peut veiller sur votre maison pendant votre absence ? Cinq solutions, les vérifications utiles et les points à convenir avant de confier vos clés.',
    meta_title='Faire garder sa maison : 5 solutions, risques et cadre légal',
    meta_description='Proche, visites, intendance ou house-sitting : comparez cinq façons de faire garder votre maison et préparez les accès, l’assurance et le retour.',
    hero_image_alt='Une personne consulte son téléphone en caressant un chien dans un salon.',
    internal_links='[{"text":"guide des huit situations d’absence","url":"/actualites/s-absenter-avec-animal-guide-solutions-2026"},{"text":"guide de préparation à une absence prolongée","url":"/actualites/securiser-maison-absence-prolongee"},{"text":"guide des imprévus pendant une garde","url":"/actualites/gerer-imprevu-pendant-garde"},{"text":"guide du cadre juridique du house-sitting en France","url":"/actualites/house-sitting-cadre-juridique-france"},{"text":"accord de garde","url":"/actualites/commodat-garde-guardiens"},{"text":"guide pour choisir un gardien","url":"/actualites/choisir-gardien-bons-criteres"},{"text":"guide d’accueil","url":"/actualites/accueillir-gardien-bonnes-pratiques"},{"text":"page des tarifs","url":"/tarifs"},{"text":"checklist avant les vacances","url":"/actualites/checklist-partir-vacances-animaux"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='confier-sa-maison-absence-risques' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 0 : % ligne au lieu de 1',affected; END IF;
END;
$guide_0$;

DO $guide_1$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_1_20261017$# S’absenter quand on a un animal : 8 situations et leurs solutions

**Pour choisir une garde, regardez d’abord ce dont votre animal a besoin, les dates à couvrir et le temps dont vous disposez pour l’organiser.** Un proche, des visites, un accueil hors de chez vous, une pension ou le séjour d’un gardien à domicile peuvent convenir selon la situation. Aucune formule n’apporte à elle seule la disponibilité, les compétences et les soins nécessaires.

Votre animal est déjà seul à la suite d’une hospitalisation ou d’un départ imprévu ? Commencez par joindre une personne qui peut effectivement le prendre en charge et accéder au logement. Notre [guide hospitalisation](/actualites/faire-garder-animal-pendant-hospitalisation) détaille les premiers contacts. Une recherche sur une plateforme ne garantit pas une intervention immédiate.

**Dans ce guide**

- [Huit situations et les points à vérifier](#les-8-situations)
- [Comparer les principales formules](#comparatif-solutions)
- [Quand envisager un gardien hébergé](#home-sitting-guardiens)
- [Prévoir les dépenses](#combien-ca-coute)
- [Questions fréquentes](#faq)

## <a id="les-8-situations"></a>Huit situations d’absence : que faut-il organiser ?

### 1. Un week-end ou quelques jours de vacances

Une courte absence demande une prise en charge complète : repas, eau, propreté, sorties et attention. Pour un chien, vérifiez qui peut assurer les sorties aux horaires utiles. Pour un chat, choisissez la fréquence et le contenu des passages selon ses besoins ; « il est indépendant » ne suffit pas à définir un programme de garde.

Un proche disponible, un intervenant pour des visites ou une personne accueillie chez vous sont des possibilités. Comparez les horaires réels et la solution retenue si un passage devient impossible. Le [guide des courts séjours](/actualites/house-sitting-week-end-court-sejour-aura) aide à préparer une annonce quand vous proposez un logement.

### 2. Une ou plusieurs semaines de vacances

Vérifiez que la solution couvre toute la période, y compris les week-ends et le jour du retour. Préparez suffisamment de nourriture et de consommables, ainsi qu’un contact pouvant décider si vous êtes difficile à joindre.

Un animal peut rester chez lui avec une organisation adaptée ou être accueilli ailleurs. Visitez et questionnez les structures envisagées ; pour un séjour à domicile, discutez des absences du gardien. Le choix ne repose pas sur une opposition entre pension stressante et maison rassurante pour tous. Le [guide des gardes de deux semaines ou plus](/actualites/vacances-longues-garde-animal-2-semaines) développe les besoins des séjours longs.

### 3. Des déplacements professionnels répétés

Un planning de garde récurrent peut faciliter l’organisation. Demandez d’abord si la personne souhaite et peut couvrir ces dates ; une première garde réussie ne la rend pas disponible pour les suivantes.

Mettez à jour les consignes lorsque le traitement, l’alimentation ou les habitudes changent. Prévoyez un autre contact pour les périodes où votre gardien habituel ne peut pas venir. Le déplacement professionnel crée aussi des contraintes de communication : indiquez quand vous serez joignable et qui peut prendre le relais.

### 4. Une hospitalisation programmée

Organisez la garde avant l’entrée à l’hôpital, en tenant compte d’un retour qui peut évoluer. Demandez qui peut prolonger la prise en charge et qui accompagnera l’animal si une autre solution devient nécessaire.

Les soins et les sorties doivent aussi être assurés pendant votre convalescence. Si vous avez besoin d’aide pour organiser vos démarches, le service social de l’établissement peut vous orienter ; cela ne signifie pas qu’il fournisse ou finance une garde. Consultez le [guide dédié à l’hospitalisation](/actualites/faire-garder-animal-pendant-hospitalisation).

### 5. Une hospitalisation ou un départ imprévu

La priorité est une personne disponible maintenant, avec l’autorisation et les moyens d’accéder au logement. Transmettez les informations indispensables : animaux présents, alimentation, traitement prescrit, vétérinaire et clés.

Mobilisez votre entourage et les professionnels ou structures locales susceptibles d’accepter l’animal. Confirmez la prise en charge, son heure de début et sa durée. Évitez d’empiler des demandes sans savoir qui intervient réellement. Une fois le premier relais assuré, vous pourrez préparer une solution pour la suite. Guardiens n’annonce pas de délai garanti de réponse ou de remplacement.

### 6. Un mariage, un deuil ou un événement familial

Si les dates sont connues, préparez la garde comme une courte absence. Si le retour est incertain, expliquez ce point dès le premier échange et fixez une date à laquelle refaire le point.

Choisissez un interlocuteur de relais si vous ne pouvez pas gérer les messages pendant l’événement. La durée ne se déduit pas du motif du départ : confirmez les nuits à couvrir, le retour prévu et la solution si vous rentrez plus tard.

### 7. Une mission, une formation ou des travaux loin du domicile

Pour une absence prolongée, vérifiez l’ensemble des besoins sur la durée : fournitures, entretien, soins, disponibilité et éventuels rendez-vous vétérinaires. Si plusieurs personnes se relaient, chacune doit accepter ses dates et recevoir les consignes.

Évitez un intervalle sans prise en charge entre deux gardiens. Organisez qui remet les clés, comment les informations sont transmises et qui constate les incidents ou dépenses. L’[accord de garde](/actualites/commodat-garde-guardiens) peut aider à clarifier les engagements de chaque séjour.

### 8. Un déménagement

Distinguez la garde pendant le transport et les travaux de l’installation dans le nouveau logement. Un accueil temporaire, une pension ou la présence d’une personne dans un logement encore disponible peuvent être envisagés.

L’ancien domicile n’est une option que si vous avez toujours le droit de l’occuper et qu’il reste habitable et équipé. Si l’animal y reste, les cartons, les accès et le départ définitif doivent être compatibles avec sa prise en charge. Demandez au vétérinaire un conseil adapté si votre animal a des besoins particuliers ; il n’existe pas une durée de transition valable pour tous.

## <a id="comparatif-solutions"></a>Comment comparer les formules de garde ?

| Formule | Organisation possible | Question décisive |
| --- | --- | --- |
| Proche | Passages, accueil ou séjour chez vous selon son accord. | Peut-il assurer les tâches à toutes les dates nécessaires ? |
| Visites à domicile | Passages définis pour les soins et les tâches convenues. | Les horaires et le temps sur place correspondent-ils aux besoins ? |
| Accueil chez une personne | L’animal séjourne dans un autre logement. | Le lieu, les autres occupants et les animaux présents conviennent-ils ? |
| Pension | Prise en charge dans une structure selon ses conditions. | Quels soins, sorties, interactions et horaires sont réellement proposés ? |
| Gardien hébergé | Une personne vit chez vous pendant la garde. | Son planning et son expérience permettent-ils les soins attendus ? |

Le [comparatif des alternatives à la pension](/actualites/pension-chien-alternatives-guide) précise ces différences. Les guides [chien](/actualites/garde-chien-faire-garder-son-chien), [chat](/actualites/garde-chat-domicile-house-sitting) et [bien-être pendant l’absence](/actualites/bien-etre-animal-pendant-absence) permettent d’affiner les questions selon votre animal.

En cas de traitement ou de besoin de santé, vérifiez auprès du vétérinaire les gestes à assurer et les conditions nécessaires. Le choix d’une personne disponible ne remplace pas cette vérification.

## <a id="home-sitting-guardiens"></a>Quand envisager le séjour d’un gardien chez vous ?

Le house-sitting permet à une personne de loger chez vous et d’assurer les tâches convenues, sans rémunération sur Guardiens. Il peut répondre à votre besoin si vous souhaitez que l’animal reste au domicile et que vous pouvez proposer un logement adapté.

La personne hébergée ne reste pas nécessairement sur place en permanence. Décrivez les contraintes de présence, les soins et les sorties pour échanger sur un planning compatible. Notre [guide de garde à domicile](/actualites/garde-animaux-domicile-chien-chat) distingue passages et séjour.

Sur Guardiens, vous publiez les dates, le logement et les besoins, puis échangez avec les personnes intéressées. Vérifiez l’expérience utile et les avis lorsqu’il y en a. L’écusson « Identité vérifiée » indique le contrôle d’une pièce d’identité, sans certifier la compétence ni la fiabilité. Une rencontre est possible si les deux le souhaitent. Un accord est proposé après confirmation ; sa signature reste facultative.

La disponibilité dépend des personnes et de vos dates. Pour une maison à entretenir ou à garder, y compris sans animaux, le [guide pour confier sa maison](/actualites/confier-sa-maison-absence-risques) aborde les accès, l’assurance et le retour.

## <a id="combien-ca-coute"></a>Quel budget prévoir pour la garde ?

Demandez un devis ou un accord précis pour toute prestation payante : dates, animaux, soins, transport, supplément éventuel et annulation. Un prix par visite ne se compare pas directement à un prix par journée ou par nuit.

**Guardiens est actuellement 100 % gratuit pour les propriétaires et les gardiens.** Le gardien est hébergé sans rémunération. L’alimentation, les consommables, les frais vétérinaires et les autres dépenses convenues restent à organiser séparément. Définissez qui peut autoriser une dépense et comment elle sera remboursée.

Jérémie et Elisa ont créé Guardiens après cinq ans de house-sitting, avec l’envie de construire un réseau de confiance. Vos retours aident à améliorer le service. Une participation aux frais de fonctionnement pourra être mise en place au plus tôt au second semestre 2027, avec trente jours de préavis. Retrouvez les conditions sur la [page des tarifs](/tarifs).

## <a id="faq"></a>Questions fréquentes sur la garde pendant une absence

:::faq
### Quelle solution choisir si je dois partir aujourd’hui ?
Contactez d’abord une personne qui peut effectivement prendre en charge votre animal et accéder au logement. Vérifiez quand elle intervient et pour combien de temps. Une annonce ne garantit pas de réponse immédiate ; le guide hospitalisation explique comment organiser un premier relais.

### Le house-sitting convient-il à toutes les absences ?
Il faut un logement adapté, une personne disponible et un planning compatible avec les besoins. Une urgence immédiate, des soins particuliers ou l’absence de logement disponible peuvent demander une autre organisation.

### Combien de temps avant le départ faut-il chercher ?
Commencez dès que vos dates sont connues pour pouvoir échanger et préparer une solution de relais. Aucun délai ne garantit une candidature ni une confirmation ; la saison, le lieu et les contraintes du séjour comptent.

### Peut-on garder le même gardien pour plusieurs déplacements ?
Oui si les deux personnes le souhaitent et confirment chaque période. Vérifiez la disponibilité et actualisez les consignes entre les séjours. Prévoyez une autre solution si la personne ne peut pas revenir.

### Que faire si ma date de retour change ?
Contactez la personne qui assure la garde dès que possible. Une prolongation demande son accord. Si elle ne peut pas rester, organisez une autre prise en charge et la transmission des clés et des consignes.

### La garde sur Guardiens ne coûte-t-elle vraiment rien ?
La plateforme est actuellement 100 % gratuite pour les deux rôles et le gardien est hébergé sans rémunération. Les dépenses liées aux animaux et au séjour restent à convenir. Une contribution au fonctionnement pourra évoluer au plus tôt au second semestre 2027, avec trente jours de préavis.
:::

## Sources et préparation de la garde

Ressources consultées le 17 octobre 2026 : [RSPCA, organiser la garde pendant les vacances](https://www.rspca.org.uk/adviceandwelfare/pets/general/holiday/leavingyourpet), pour les besoins et les informations à transmettre, et [Assurance Maladie, hospitalisation et accompagnement](https://www.ameli.fr/assure/droits-demarches/maladie-accident-hospitalisation/hospitalisation), pour les démarches et l’orientation sociale. Les règles britanniques mentionnées par la RSPCA ne sont pas présentées comme des obligations françaises.

Quand la garde est confirmée, reprenez la [checklist avant le départ](/actualites/checklist-partir-vacances-animaux) avec la personne qui s’occupera de l’animal.$suite_content_1_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='74a5441b-86b4-460a-a06d-cd6d4256256b'::uuid AND slug='s-absenter-avec-animal-guide-solutions-2026';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/s-absenter-avec-animal-guide-solutions-2026' THEN
    RAISE EXCEPTION 'Guide suite 1 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'S’absenter quand on a un animal : 8 situations et leurs solutions'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Une absence prévue, un départ imprévu ou un retour incertain ne s’organisent pas de la même façon. Huit situations pour choisir une garde adaptée à votre animal.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Faire garder son animal : 8 situations et solutions'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Vacances, travail, hospitalisation ou déménagement : choisissez une garde selon votre absence, les besoins de votre animal et le temps pour l’organiser.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Un chien est assis à côté d’une valise brune dans un salon.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"guide hospitalisation","url":"/actualites/faire-garder-animal-pendant-hospitalisation"},{"text":"guide des courts séjours","url":"/actualites/house-sitting-week-end-court-sejour-aura"},{"text":"guide des gardes de deux semaines ou plus","url":"/actualites/vacances-longues-garde-animal-2-semaines"},{"text":"accord de garde","url":"/actualites/commodat-garde-guardiens"},{"text":"comparatif des alternatives à la pension","url":"/actualites/pension-chien-alternatives-guide"},{"text":"chien","url":"/actualites/garde-chien-faire-garder-son-chien"},{"text":"chat","url":"/actualites/garde-chat-domicile-house-sitting"},{"text":"bien-être pendant l’absence","url":"/actualites/bien-etre-animal-pendant-absence"},{"text":"guide de garde à domicile","url":"/actualites/garde-animaux-domicile-chien-chat"},{"text":"guide pour confier sa maison","url":"/actualites/confier-sa-maison-absence-risques"},{"text":"page des tarifs","url":"/tarifs"},{"text":"checklist avant le départ","url":"/actualites/checklist-partir-vacances-animaux"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 13:40:17.699269+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 1 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot05_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 1 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot05_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot05_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='S’absenter quand on a un animal : 8 situations et leurs solutions',
    excerpt='Une absence prévue, un départ imprévu ou un retour incertain ne s’organisent pas de la même façon. Huit situations pour choisir une garde adaptée à votre animal.',
    meta_title='Faire garder son animal : 8 situations et solutions',
    meta_description='Vacances, travail, hospitalisation ou déménagement : choisissez une garde selon votre absence, les besoins de votre animal et le temps pour l’organiser.',
    hero_image_alt='Un chien est assis à côté d’une valise brune dans un salon.',
    internal_links='[{"text":"guide hospitalisation","url":"/actualites/faire-garder-animal-pendant-hospitalisation"},{"text":"guide des courts séjours","url":"/actualites/house-sitting-week-end-court-sejour-aura"},{"text":"guide des gardes de deux semaines ou plus","url":"/actualites/vacances-longues-garde-animal-2-semaines"},{"text":"accord de garde","url":"/actualites/commodat-garde-guardiens"},{"text":"comparatif des alternatives à la pension","url":"/actualites/pension-chien-alternatives-guide"},{"text":"chien","url":"/actualites/garde-chien-faire-garder-son-chien"},{"text":"chat","url":"/actualites/garde-chat-domicile-house-sitting"},{"text":"bien-être pendant l’absence","url":"/actualites/bien-etre-animal-pendant-absence"},{"text":"guide de garde à domicile","url":"/actualites/garde-animaux-domicile-chien-chat"},{"text":"guide pour confier sa maison","url":"/actualites/confier-sa-maison-absence-risques"},{"text":"page des tarifs","url":"/tarifs"},{"text":"checklist avant le départ","url":"/actualites/checklist-partir-vacances-animaux"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='s-absenter-avec-animal-guide-solutions-2026' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 1 : % ligne au lieu de 1',affected; END IF;
END;
$guide_1$;

COMMIT;
