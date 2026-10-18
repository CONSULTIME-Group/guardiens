-- Refonte des guides cohérence définition et Clermont-Ferrand, autorisée le 17/10/2026.
-- Les URL, auteurs, dates de publication et indexabilité sont conservés.
BEGIN;
CREATE TABLE IF NOT EXISTS public._backup_articles_suite_lot57_20261017 AS SELECT * FROM public.articles WHERE false;
REVOKE ALL ON public._backup_articles_suite_lot57_20261017 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public._backup_articles_suite_lot57_20261017 TO service_role;
ALTER TABLE public._backup_articles_suite_lot57_20261017 ENABLE ROW LEVEL SECURITY;
SELECT id FROM public.articles WHERE id IN ('6c52710a-3130-49dd-8856-47ec9233feae'::uuid,'5b3956a3-61f9-4e17-a093-794e4a6663d5'::uuid) ORDER BY id FOR UPDATE;

DO $guide_0$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_0_20261017$# House sitting : définition, prix et fonctionnement d'un home sitter

**En bref**

- Le house sitting, ou home sitting, est un échange : une personne loge chez vous pendant votre absence et veille sur la maison et les animaux éventuels.
- Cette personne s'appelle un home sitter, un house sitter ou un gardien.
- Sur Guardiens, la plateforme est actuellement 100 % gratuite pour les deux rôles et le gardien est hébergé sans rémunération.
- Les frais qui restent se décident entre vous : nourriture des animaux, soins éventuels, trajets demandés.
- Une garde se prépare en cinq étapes : annonce, échange et confirmation, consignes et accord éventuel, garde, retour.

**Sommaire**

- [Définition](#definition)
- [Qu'est-ce qu'un home sitter ?](#home-sitter)
- [Fonctionnement en 5 étapes](#fonctionnement)
- [Prix : combien coûte un home sitter ?](#prix)
- [Devenir home sitter](#devenir-home-sitter)
- [House sitting, pet sitter ou pension](#comparatif)
- [À qui cela convient](#pour-qui)
- [Assurance, accord écrit et imprévus](#legislation)
- [Pourquoi nous avons créé Guardiens](#experience)
- [Exemple de préparation](#exemple)
- [Questions fréquentes](#faq)

## <a id="definition"></a>Définition : house sitting, home sitting et pet sitting

Le house sitting est la garde d'un logement par une personne qui y séjourne pendant l'absence de ses occupants. Le mot vient de l'anglais : *house* pour maison, *to sit* pour garder. En français, home sitting, homesitting et gardiennage de maison désignent la même pratique.

Sur Guardiens, le house sitting est un échange. Le gardien est hébergé sans rémunération ; la maison est habitée selon la présence convenue et les animaux éventuels conservent leur environnement. Ce que chacun apporte (présence, tâches, durée, frais) se fixe ensemble avant la garde.

Le pet sitting désigne surtout le soin des animaux : visites ponctuelles, accueil chez le pet sitter ou présence au domicile. Les deux pratiques se recoupent souvent, puisqu'une garde de maison inclut fréquemment des animaux.

Une garde de maison sans animaux est une garde à part entière : courrier, plantes, aération, présence pendant une longue absence.

## <a id="home-sitter"></a>Qu'est-ce qu'un home sitter ?

Un home sitter est la personne qui loge chez vous pendant votre absence pour veiller sur votre maison et, le plus souvent, sur vos animaux. On dit aussi house sitter, gardien de maison ou, sur Guardiens, gardien.

Son rôle tient en quelques gestes du quotidien, définis avec le propriétaire :

- nourrir et promener les animaux selon leurs habitudes, suivre les consignes vétérinaires prescrites uniquement si les gestes sont compris et acceptés ;
- arroser les plantes et le potager, relever le courrier, aérer ;
- donner à la maison un air habité pendant votre absence ;
- envoyer des nouvelles au rythme convenu.

Les profils sont variés : retraités, télétravailleurs, couples, étudiants, personnes en voyage. Consultez les informations renseignées dans les profils, les expériences décrites et les avis lorsqu’ils existent. Un document d’identité contrôlé ne certifie pas une compétence ou la fiabilité. Vous voyez les gardiens [à proximité de chez vous](/house-sitting).

## <a id="fonctionnement"></a>Comment fonctionne une garde, en 5 étapes

### 1. Publier une annonce détaillée

Le propriétaire décrit ses dates, son logement, ses animaux (habitudes, traitements, caractère) et les tâches attendues. Des photos du lieu de vie aident le gardien à se projeter. Décrire les contraintes aide les personnes intéressées à décider si elles peuvent assurer la garde : [préparer une annonce](/sits/create). Une candidature n’est pas garantie.

### 2. Échanger et choisir

Le propriétaire lit les profils et les avis, puis échange par messagerie avec les gardiens intéressés. Un appel vidéo ou une rencontre peuvent compléter cet échange, si vous le souhaitez tous les deux. C'est le moment de parler des attentes, des horaires de présence et des points délicats.

### 3. Préparer les consignes et l’accord après confirmation

Après confirmation, les deux parties préparent les consignes et peuvent établir un accord ; sa signature sur Guardiens est facultative. Elles notent les dates, les tâches, la présence, les contacts et la prise en charge des frais. Le jour de l'arrivée, le propriétaire montre les routines et remet les clés. Un guide de la maison répond aux questions avant qu'elles se posent.

### 4. Vivre la garde

Le gardien suit les routines prévues et donne des nouvelles au rythme décidé ensemble : un message par jour, quelques photos, ou un point en cas d'imprévu. Chacun sait à quoi s'attendre, et c'est ce qui rend la garde sereine.

### 5. Le retour et l'avis

Au retour : un tour du logement, les clés rendues et un point sur les dépenses. Chacun peut laisser un avis utile aux prochains membres, sans garantie d’une autre garde.

## <a id="prix"></a>Prix : combien coûte un home sitter ?

Sur Guardiens, la plateforme est actuellement 100 % gratuite pour les propriétaires et les gardiens. Le gardien est hébergé sans rémunération ; les dépenses restent distinctes. Notre priorité est de construire un réseau de confiance et d’améliorer le service grâce aux retours des membres. Une participation aux frais d’infrastructure pourrait être envisagée au plus tôt au second semestre 2027, avec au moins trente jours d’information préalable. Les conditions sont sur la page [tarifs](/tarifs).

Le mot home sitting désigne aussi des prestations payées, proposées par des professionnels ou des agences. Leur prix se fixe sur devis, selon la durée, le nombre d'animaux et les tâches demandées.

Dans un échange, quelques dépenses restent à prévoir et à écrire dans l'accord :

| Qui | Dépense | Comment la cadrer |
|---|---|---|
| Propriétaire | Nourriture, litière et produits des animaux | Laissés sur place avant le départ |
| Propriétaire | Soins vétérinaires éventuels | Un budget prévu, qui avance les frais et comment ils sont remboursés |
| Propriétaire | Trajets ou achats demandés au gardien | Remboursés sur justificatif, d'un commun accord |
| Gardien | Transport jusqu'au lieu de garde | À sa charge, sauf accord différent |
| Gardien | Sa propre alimentation | À sa charge, sauf accord différent |

## <a id="devenir-home-sitter"></a>Devenir home sitter : être logé en échange de la garde

Devenir home sitter, c'est loger dans une maison le temps d'une garde, en échange des soins apportés à la maison et aux animaux. C'est une façon de découvrir une région, de vivre au calme pour écrire ou télétravailler, ou de partager le quotidien d'animaux le temps d'un séjour.

Pour commencer sur Guardiens :

1. [Préparez votre profil](/profile) : une présentation sincère, vos expériences, vos disponibilités et vos limites.
2. Consultez les [annonces de garde](/annonces) et proposez-vous sur celles qui vous correspondent.
3. Choisissez une garde dont les besoins correspondent à vos capacités, éventuellement courte et proche. Un avis ou une candidature acceptée n’est pas garanti.
4. Répondez vite et précisément aux propriétaires : la qualité de l'échange fait souvent la différence.

Le guide complet est sur la page [devenir home sitter](/devenir-home-sitter).

## <a id="comparatif"></a>House sitting, pet sitter rémunéré ou pension : comparatif

| Critère | House sitting d'échange | Pet sitter rémunéré | Pension |
|---|---|---|---|
| Lieu | Chez vous | Chez vous (visites ou séjour), ou chez le pet sitter | Dans l'établissement |
| Présence | Gardien logé sur place, horaires selon l'accord | Selon la formule : visites ou nuits | Équipe de l'établissement, selon son organisation |
| Frais | Échange logement contre garde ; sur Guardiens, plateforme actuellement gratuite pour les deux rôles ; dépenses convenues | Prestation payée, sur devis | Prix de séjour, sur devis |
| Atouts | L'animal garde ses repères, la maison est habitée | Professionnel engagé sur une prestation définie | Encadrement par du personnel, accueil de plusieurs animaux |
| Points d'attention | Présence et capacités à vérifier, disponibilités à confirmer | Coût qui grandit avec la durée ; présence courte en formule visites | Changement d'environnement pour l'animal ; places limitées en période chargée |

Chaque formule répond à une situation. Le ministère de l'Agriculture présente plusieurs solutions de garde et rappelle de bien préparer l'animal et la personne qui s'en occupe ([agriculture.gouv.fr](https://agriculture.gouv.fr/comment-faire-garder-son-animal-de-compagnie)).

Pour aller plus loin : [les alternatives à la pension pour chien](/actualites/pension-chien-alternatives-guide), et notre guide de la [garde d'animaux à domicile](/actualites/garde-animaux-domicile-chien-chat) pour choisir entre visites et gardien sur place. Pour une maison sans animaux, voyez comment [faire garder sa maison pendant son absence](/actualites/confier-sa-maison-absence-risques).

## <a id="pour-qui"></a>À qui cela convient

Le house sitting convient bien quand votre animal est plus serein chez lui, quand le logement gagne à être habité (jardin, plantes, courrier) ou quand l'absence dure plusieurs jours, voire plusieurs semaines ([gardes de deux semaines et plus](/actualites/vacances-longues-garde-animal-2-semaines)).

Quatre points à caler avant de vous engager :

- **Le temps de présence.** Le gardien organise ses journées : courses, promenades, parfois du travail. Si votre animal a besoin de compagnie, fixez ensemble une durée d'absence maximale.
- **Le télétravail.** Vérifiez la connexion, l'espace de travail et la compatibilité avec les besoins de l'animal.
- **Les soins et comportements délicats.** Traitement quotidien, animal âgé, chien réactif : écrivez-le dans l'annonce et vérifiez l'expérience du gardien sur ce point précis.
- **Des tâches du quotidien.** Nourrir, promener, arroser, aérer, relever le courrier. Les gros travaux de jardin ou de ménage relèvent d'un autre cadre.

Le lieu du séjour change aussi la préparation. Pour [faire garder sa maison et ses animaux à Tahiti](/actualites/garde-maison-animaux-tahiti), notre guide détaille les solutions, les prix en F CFP, les déplacements et les consignes à prévoir avant de partir.

## <a id="legislation"></a>Assurance, accord écrit et imprévus

**Assurance.** Avant la garde, interrogez votre assureur habitation sur la présence d'une personne dans votre logement pendant votre absence : garanties, exclusions, durée d'inoccupation au-delà de laquelle certaines garanties changent. Le gardien vérifie de son côté son assurance responsabilité civile. Service Public explique l'assurance liée aux animaux de compagnie ([F17603](https://www.service-public.gouv.fr/particuliers/vosdroits/F17603)) et les démarches d’indemnisation en cas de préjudice ([F1422](https://www.service-public.gouv.fr/particuliers/vosdroits/F1422)).

**Accord écrit.** Notez les tâches, les horaires de présence attendus, les contacts (vétérinaire, personne relais avec un double des clés), les frais pris en charge et le rythme des nouvelles.

**Annulation.** Si l'un de vous doit annuler, prévenez l'autre le plus tôt possible. Le propriétaire garde en tête une solution de repli (un proche, une pension, un pet sitter) et peut republier son annonce à tout moment.

**Urgence vétérinaire.** Le gardien contacte le vétérinaire indiqué et suit ses consignes, sans attendre la réponse du propriétaire en cas d’urgence. Laissez par écrit le nom de la clinique, le carnet de santé et votre accord sur la conduite à tenir.

**Cadre.** Une garde qui comporte de lourdes tâches ou une contrepartie proche d'un salaire relève d'un autre cadre. Les repères sont détaillés dans [le cadre juridique du house sitting en France](/actualites/house-sitting-cadre-juridique-france), et les bonnes pratiques de confiance dans [sécurité et confiance en house sitting](/actualites/securite-confiance-house-sitting).

## <a id="experience"></a>Pourquoi nous avons créé Guardiens

Avec ma femme Elisa, qui est argentine, nous avons pratiqué la garde de maison pendant cinq ans avant de créer Guardiens. J’aurais aimé disposer de ce type d’application lorsque je vivais à l’étranger : un réseau francophone pour organiser une garde et trouver des occasions de s’entraider.

Le but est de construire ce réseau progressivement. Des besoins précis, des limites exprimées et les retours des membres nous aident à améliorer le service ; une inscription ne crée pas à elle seule la confiance.

Jérémie et Elisa

## <a id="exemple"></a>Exemple illustratif : préparer une garde de dix jours

Cet exemple est inventé pour illustrer la préparation.

Une propriétaire s’absente dix jours avec une maison, un chat et des plantes à confier. Elle décrit les accès, les habitudes du chat, la présence nécessaire et l’arrosage. Après échange, les deux personnes confirment ce qu’elles peuvent assurer. Elles préparent les consignes, le rythme des nouvelles, le contact du vétérinaire et un proche ayant accepté de servir de relais.

Ce qui aide : les besoins du logement sont écrits, les limites sont comprises et une autre organisation reste possible si la garde doit s’interrompre. La préparation ne garantit pas l’absence d’imprévu.

## <a id="faq"></a>Questions fréquentes sur le house sitting

:::faq
**Qu'est-ce que le house sitting ?**

Le house sitting est un échange : une personne loge chez vous pendant votre absence et veille sur votre maison et vos animaux, en contrepartie du logement.

**Qu'est-ce qu'un home sitter ?**

Un home sitter est la personne qui loge chez vous pendant votre absence pour prendre soin de la maison et des animaux. On dit aussi house sitter ou gardien.

**Le house sitting est-il gratuit ?**

La plateforme est actuellement gratuite pour les deux rôles et le gardien est hébergé sans rémunération. Les dépenses convenues restent distinctes. La page tarifs précise les conditions actuelles et l’évolution possible, sans gratuité permanente promise.

**Combien coûte un home sitter professionnel ?**

Un home sitter rémunéré fixe son prix sur devis, selon la durée, le nombre d'animaux et les tâches. Demandez plusieurs devis pour comparer.

**Comment devenir home sitter ?**

Présentez sincèrement vos expériences et limites, puis consultez les annonces dont les besoins correspondent à vos capacités. Une garde courte peut être une première expérience, sans avis ou acceptation garanti.

**Peut-on faire garder sa maison sans animaux ?**

Oui. Une garde sans animaux couvre la présence dans le logement, le courrier, les plantes et l'aération. Précisez les tâches dans l'annonce.

**Faut-il rencontrer le gardien avant la garde ?**

La rencontre est facultative. Vous pouvez échanger par messagerie ; un appel vidéo ou une rencontre peut compléter cet échange si vous le souhaitez tous les deux.

**Le gardien reste-t-il à la maison toute la journée ?**

Le gardien organise ses journées : courses, promenades, parfois du travail. Si votre animal a besoin de compagnie, fixez ensemble une durée d'absence maximale avant la garde.

**Le gardien peut-il venir avec son propre animal ?**

Oui, avec l'accord explicite du propriétaire et si les animaux s'entendent. Abordez la question dès le premier échange.

**Que se passe-t-il en cas d'annulation ?**

Prévenez l'autre personne le plus tôt possible et republiez votre annonce si besoin. Gardez en tête une solution de repli : un proche, une pension, un pet sitter.

**Que faire si l'animal tombe malade pendant la garde ?**

Le gardien appelle le vétérinaire et suit ses consignes, sans attendre une réponse du propriétaire en cas d’urgence. Il informe aussi le propriétaire. Le budget, l'avance et le remboursement des soins se conviennent dans l'accord avant la garde.

**Faut-il prévenir son assureur ?**

C'est recommandé. Demandez à votre assureur habitation ce qui est couvert quand une personne occupe votre logement pendant votre absence, et quelles exclusions s'appliquent.

**Combien de temps à l'avance chercher un gardien ?**

Présentez vos dates et besoins dès qu’ils sont connus, en gardant du temps pour échanger et préparer un relais. Aucun délai de réponse ou candidat disponible n’est garanti.
:::


Au-delà des gardes, Guardiens réunit aussi l'[entraide du quotidien](/petites-missions), jardinage, courses, trajets, une partie de belote, et des [chantiers et projets participatifs](/projets) à réaliser ensemble.$suite_content_0_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='6c52710a-3130-49dd-8856-47ec9233feae'::uuid AND slug='c-est-quoi-le-house-sitting';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS DISTINCT FROM false
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/c-est-quoi-le-house-sitting' THEN
    RAISE EXCEPTION 'Guide suite 0 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'House sitting : définition, prix et fonctionnement d''un home sitter'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Un home sitter séjourne dans votre logement et assure les tâches convenues pour la maison et les animaux éventuels. Fonctionnement, présence et frais à préparer.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'House-sitting : définition, prix et rôle du home sitter'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Le house-sitting permet à un gardien de séjourner chez vous pendant votre absence. Maison, animaux éventuels, présence, frais et étapes pour préparer une garde.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Deux personnes échangent des clés devant une maison en pierre, avec des bagages, un chien et un chat près de la porte.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"à proximité de chez vous","url":"/house-sitting"},{"text":"préparer une annonce","url":"/sits/create"},{"text":"tarifs","url":"/tarifs"},{"text":"Préparez votre profil","url":"/profile"},{"text":"annonces de garde","url":"/annonces"},{"text":"devenir home sitter","url":"/devenir-home-sitter"},{"text":"les alternatives à la pension pour chien","url":"/actualites/pension-chien-alternatives-guide"},{"text":"garde d''animaux à domicile","url":"/actualites/garde-animaux-domicile-chien-chat"},{"text":"faire garder sa maison pendant son absence","url":"/actualites/confier-sa-maison-absence-risques"},{"text":"gardes de deux semaines et plus","url":"/actualites/vacances-longues-garde-animal-2-semaines"},{"text":"faire garder sa maison et ses animaux à Tahiti","url":"/actualites/garde-maison-animaux-tahiti"},{"text":"le cadre juridique du house sitting en France","url":"/actualites/house-sitting-cadre-juridique-france"},{"text":"sécurité et confiance en house sitting","url":"/actualites/securite-confiance-house-sitting"},{"text":"entraide du quotidien","url":"/petites-missions"},{"text":"chantiers et projets participatifs","url":"/projets"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-17 10:26:56.058394+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 0 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot57_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 0 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot57_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot57_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='House sitting : définition, prix et fonctionnement d''un home sitter',
    excerpt='Un home sitter séjourne dans votre logement et assure les tâches convenues pour la maison et les animaux éventuels. Fonctionnement, présence et frais à préparer.',
    meta_title='House-sitting : définition, prix et rôle du home sitter',
    meta_description='Le house-sitting permet à un gardien de séjourner chez vous pendant votre absence. Maison, animaux éventuels, présence, frais et étapes pour préparer une garde.',
    hero_image_alt='Deux personnes échangent des clés devant une maison en pierre, avec des bagages, un chien et un chat près de la porte.',
    internal_links='[{"text":"à proximité de chez vous","url":"/house-sitting"},{"text":"préparer une annonce","url":"/sits/create"},{"text":"tarifs","url":"/tarifs"},{"text":"Préparez votre profil","url":"/profile"},{"text":"annonces de garde","url":"/annonces"},{"text":"devenir home sitter","url":"/devenir-home-sitter"},{"text":"les alternatives à la pension pour chien","url":"/actualites/pension-chien-alternatives-guide"},{"text":"garde d''animaux à domicile","url":"/actualites/garde-animaux-domicile-chien-chat"},{"text":"faire garder sa maison pendant son absence","url":"/actualites/confier-sa-maison-absence-risques"},{"text":"gardes de deux semaines et plus","url":"/actualites/vacances-longues-garde-animal-2-semaines"},{"text":"faire garder sa maison et ses animaux à Tahiti","url":"/actualites/garde-maison-animaux-tahiti"},{"text":"le cadre juridique du house sitting en France","url":"/actualites/house-sitting-cadre-juridique-france"},{"text":"sécurité et confiance en house sitting","url":"/actualites/securite-confiance-house-sitting"},{"text":"entraide du quotidien","url":"/petites-missions"},{"text":"chantiers et projets participatifs","url":"/projets"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='c-est-quoi-le-house-sitting' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 0 : % ligne au lieu de 1',affected; END IF;
END;
$guide_0$;

DO $guide_1$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_1_20261017$# Garde de maison et pet-sitting à Clermont-Ferrand : quelle organisation choisir ?

**Pour faire garder votre maison ou vos animaux à Clermont-Ferrand, comparez les solutions selon la présence et les tâches dont vous avez besoin.** Le house-sitting correspond à un séjour dans votre logement ; une visite, un accueil ailleurs ou une pension répondent à d’autres organisations.

Ce guide concerne Clermont-Ferrand et les communes proches, notamment Chamalières, Royat et Aubière. La [page de house-sitting à Clermont-Ferrand](/house-sitting/clermont-ferrand) permet de poursuivre votre recherche, sans garantir une personne disponible à vos dates.

**Repères :** [choisir la présence](#solutions), [décrire les accès](#acces), [préparer les sorties](#sorties), [comparer le budget](#budget), [confirmer la garde](#confirmation), [questions fréquentes](#faq).

## <a id="solutions"></a>Visites, accueil, pension ou gardien logé : que comparer ?

| Formule | Organisation | Question avant de choisir |
| --- | --- | --- |
| Visites | Passages dans votre logement | Quelle durée et quel temps sans présence sont compatibles ? |
| Accueil ailleurs | Animal hébergé chez une autre personne | Quels espaces, occupants et interactions sont prévus ? |
| Pension | Séjour dans un établissement | Quelle organisation réelle, de jour et de nuit ? |
| House-sitting | Gardien hébergé dans votre logement | Quelles nuitées, absences et tâches sont acceptées ? |

Pour un chien, décrivez les repas, les sorties, les réactions aux rencontres et les absences déjà bien vécues. Pour un chat, précisez les accès extérieurs, les portes et fenêtres à surveiller, la litière et les habitudes de contact. Un animal dit indépendant ne permet pas, à lui seul, de décider qu’une visite suffit.

Si un suivi est prescrit, vérifiez que la personne sait et accepte de suivre les consignes du vétérinaire. Une expérience générale avec les animaux ne garantit pas la capacité à assurer ce besoin précis. Le [guide du house-sitting](/actualites/c-est-quoi-le-house-sitting) explique la différence entre les formules.

Une maison sans animaux peut aussi être gardée : courrier, plantes, accès et gestes d’entretien convenus. Définissez alors le besoin de séjour, sans confondre présence dans le logement et simple passage d’arrosage.

## <a id="acces"></a>Quels détails donner pour Clermont et les communes proches ?

Précisez le secteur, le trajet réel, les horaires, le stationnement éventuel, l’étage et les modalités de remise des clés. Une personne qui passe entre deux communes doit pouvoir confirmer l’organisation aux heures concernées ; un temps de route sans adresse ni horaire n’est pas une garantie.

Si un véhicule est nécessaire pour l’accès, les courses ou un déplacement avec l’animal, dites-le avant confirmation. Un arrêt à proximité ne prouve pas que le transport convient à tous les horaires ou à toutes les situations. Vérifiez les conditions actuelles de l’opérateur si l’animal doit voyager.

Présentez aussi les règles du bâtiment et les équipements utilisables. Un gardien du secteur ne connaît pas votre installation et ne doit pas être supposé capable de réparer une panne. Laissez les consignes et le contact technique approprié.

## <a id="sorties"></a>Comment préparer les promenades et les imprévus ?

Montrez un parcours connu et une alternative plus courte. La Ville présente le [parc de Montjuzet](https://clermont-ferrand.fr/le-parc-de-montjuzet) et le [jardin Lecoq](https://clermont-ferrand.fr/le-jardin-lecoq) sur ses pages municipales. Consultez les règles et la signalétique avant la sortie : un lieu ouvert au public ne garantit pas l’accès avec un chien ou la liberté dans toutes ses zones.

Une sortie vers les volcans ne se décide pas sur la seule proximité du site. Convenez du trajet, du matériel, des conditions et de l’adaptation à l’animal. La garde n’est pas le moment d’imposer une randonnée nouvelle.

Adaptez les sorties aux conditions réelles. Le [ministère de l’Agriculture rappelle les précautions en période chaude](https://agriculture.gouv.fr/professionnels-particuliers-les-precautions-prendre-en-cas-de-vague-de-chaleur), dont l’accès à l’eau, un repos protégé et l’absence d’animal laissé seul dans une voiture.

Laissez les coordonnées du vétérinaire et vérifiez l’organisation des urgences avant le départ. En cas de problème urgent, appelez le vétérinaire et suivez ses consignes sans attendre une réponse du propriétaire. Préparez le transport et les dépenses, sans supposer une disponibilité permanente de toutes les cliniques.

## <a id="budget"></a>Combien coûte une garde à Clermont-Ferrand ?

Demandez un devis pour vos dates et les prestations souhaitées. Comparez durée et nombre des visites, nuits, déplacements, suivi et conditions d’annulation. Une visite et une nuitée ne couvrent pas le même besoin.

Sur Guardiens, le gardien est hébergé **sans rémunération** et la plateforme est **actuellement 100 % gratuite** pour les propriétaires et les gardiens. Les dépenses de l’animal, le transport et les autres frais convenus restent distincts. Les [conditions tarifaires](/tarifs) expliquent le cadre actuel et son évolution possible ; cette gratuité n’est pas une promesse permanente.

## <a id="confirmation"></a>Comment choisir et confirmer la personne ?

Décrivez les contraintes dans l’annonce, puis échangez sur les capacités et les limites. Les avis, lorsqu’ils existent, et un document d’identité contrôlé ne certifient ni une compétence ni la fiabilité. Une rencontre est possible **si vous le souhaitez tous les deux**.

Convenez des dates, de la présence, du rythme des nouvelles et des tâches avant confirmation. Préparez ensuite l’accord et les consignes ; la signature de l’accord reste facultative. La [checklist de préparation de la maison](/actualites/preparer-maison-avant-garde) aide à rassembler les accès, contacts et besoins.

Prévoyez un relais ayant accepté d’aider si la garde doit s’interrompre. Gardez aussi une autre organisation possible : aucune candidature, réponse à délai fixe ou solution de remplacement n’est garantie.

## <a id="faq"></a>Questions fréquentes

:::faq
### Pet-sitting et house-sitting désignent-ils la même chose ?
Le pet-sitting peut être une visite, une promenade ou un accueil. Le house-sitting implique un séjour dans le logement avec une présence et des tâches convenues, éventuellement sans animaux.

### Faut-il choisir quelqu’un de mon quartier ?
La proximité peut faciliter certains échanges. Vérifiez aussi le trajet réel, les horaires, l’expérience et les capacités nécessaires ; une adresse proche ne garantit pas une disponibilité.

### Le gardien peut-il emmener mon chien dans les volcans ?
Seulement dans une organisation convenue et adaptée à l’animal, après vérification du parcours, des règles et des conditions. Une garde ne nécessite pas automatiquement une randonnée.

### Comment comparer deux prix de garde ?
Comparez la durée réelle, le nombre de passages, les nuits, le suivi, les déplacements et les frais inclus. Des montants exprimés pour des prestations différentes ne se comparent pas directement.

### La plateforme Guardiens est-elle gratuite ?
Elle est actuellement gratuite pour les deux rôles. Le gardien est hébergé sans rémunération ; transport, alimentation et dépenses convenues restent distincts. Consultez la page tarifs pour les conditions.

### Que prévoir en cas d’interruption de la garde ?
Une personne relais ayant accepté ce rôle, les accès et les conditions d’information. Une nouvelle annonce ou la proximité de membres ne garantit pas un remplacement.
:::$suite_content_1_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='5b3956a3-61f9-4e17-a093-794e4a6663d5'::uuid AND slug='pet-sitting-clermont-ferrand';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS DISTINCT FROM false
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/pet-sitting-clermont-ferrand' THEN
    RAISE EXCEPTION 'Guide suite 1 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Garde de maison et pet-sitting à Clermont-Ferrand : quelle organisation choisir ?'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Choisissez une garde selon les besoins de votre maison et de vos animaux. Présence, trajets, budget, consignes et relais à préparer à Clermont-Ferrand.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Garde et pet-sitting à Clermont-Ferrand : solutions'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Visites, pension ou gardien logé à Clermont-Ferrand : comparez présence et budget, préparez les accès et les consignes avant de confirmer une garde.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Un chien doré allongé dans un jardin devant une maison en pierre et un paysage de reliefs.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"page de house-sitting à Clermont-Ferrand","url":"/house-sitting/clermont-ferrand"},{"text":"guide du house-sitting","url":"/actualites/c-est-quoi-le-house-sitting"},{"text":"conditions tarifaires","url":"/tarifs"},{"text":"checklist de préparation de la maison","url":"/actualites/preparer-maison-avant-garde"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 14:55:16.58223+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 1 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot57_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 1 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot57_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot57_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Garde de maison et pet-sitting à Clermont-Ferrand : quelle organisation choisir ?',
    excerpt='Choisissez une garde selon les besoins de votre maison et de vos animaux. Présence, trajets, budget, consignes et relais à préparer à Clermont-Ferrand.',
    meta_title='Garde et pet-sitting à Clermont-Ferrand : solutions',
    meta_description='Visites, pension ou gardien logé à Clermont-Ferrand : comparez présence et budget, préparez les accès et les consignes avant de confirmer une garde.',
    hero_image_alt='Un chien doré allongé dans un jardin devant une maison en pierre et un paysage de reliefs.',
    internal_links='[{"text":"page de house-sitting à Clermont-Ferrand","url":"/house-sitting/clermont-ferrand"},{"text":"guide du house-sitting","url":"/actualites/c-est-quoi-le-house-sitting"},{"text":"conditions tarifaires","url":"/tarifs"},{"text":"checklist de préparation de la maison","url":"/actualites/preparer-maison-avant-garde"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='pet-sitting-clermont-ferrand' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 1 : % ligne au lieu de 1',affected; END IF;
END;
$guide_1$;

COMMIT;
