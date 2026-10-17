-- Refonte des deux guides de garde autorisée par Jérémie le 17/10/2026.
-- URL, publication, auteur, couverture et indexabilité conservés.
BEGIN;
CREATE TABLE IF NOT EXISTS public._backup_articles_gardes_20261017 AS SELECT * FROM public.articles WHERE false;
REVOKE ALL ON public._backup_articles_gardes_20261017 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public._backup_articles_gardes_20261017 TO service_role;
ALTER TABLE public._backup_articles_gardes_20261017 ENABLE ROW LEVEL SECURITY;
SELECT id FROM public.articles WHERE id IN ('aa8f86e2-079a-4566-9d95-743e0b1e972b'::uuid,'4f0c9ffe-1ed1-4612-8f81-f7986aac1272'::uuid) ORDER BY id FOR UPDATE;

DO $guide_0$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $guide_content_0_20261017$# Alternatives à la pension pour chien : 5 solutions à comparer

La pension est complète, votre chien n’y est pas à l’aise ou vous cherchez une autre organisation pour vos vacances ? Vous pouvez faire appel à un proche, à une famille d’accueil, à des visites à domicile, à un pet-sitter qui séjourne chez vous ou au house-sitting. **Pour choisir, vérifiez surtout où votre chien va vivre, qui sera avec lui et combien de temps il restera seul.**

Avec le house-sitting, un gardien est hébergé chez vous en échange de la garde des animaux et des tâches convenues pour la maison. Sur Guardiens, vous publiez une annonce, échangez avec les personnes intéressées et choisissez votre gardien. **La plateforme est actuellement 100 % gratuite pour les propriétaires et les gardiens.** Ce fonctionnement suppose d’avoir un logement à proposer et d’être à l’aise avec l’idée d’accueillir quelqu’un.

**Dans ce guide**

- [Les cinq alternatives et leurs différences](#alternatives)
- [Pension ou garde à domicile : le comparatif](#comparatif)
- [Les besoins particuliers de votre chien](#profil)
- [Si un précédent séjour s’est mal passé](#signaux)
- [Le budget total à comparer](#budget)
- [Quand commencer les recherches](#anticiper)
- [Les points à confirmer avant le départ](#organisation)
- [Les questions fréquentes](#faq)

## <a id="alternatives"></a>Quelles sont les cinq alternatives à la pension pour chien ?

Ces solutions se distinguent par le lieu de garde et la relation avec la personne. Certaines se recoupent : une famille d’accueil peut exercer comme professionnelle, et un proche peut venir habiter chez vous. Le détail de l’accord compte davantage que son nom.

### 1. Un proche qui connaît votre chien

Un ami, un voisin ou un membre de la famille peut accueillir votre chien ou s’installer à la maison. Connaître la personne facilite les échanges ; cela ne dit pas si son emploi du temps correspond aux besoins du chien.

Confirmez les dates, les sorties et les périodes où elle sera absente. Si le chien va chez elle, vérifiez les clôtures, les autres animaux et la possibilité de lui aménager un espace de repos. Notez aussi les dépenses que vous prenez en charge et qui pourra aider si ce proche devient indisponible.

### 2. Une famille d’accueil ou une pension familiale

Le chien séjourne au domicile d’une autre personne. Cette formule évite le chenil, mais elle peut aussi être proposée sous le nom de « pension familiale » : **c’est un changement de cadre, pas nécessairement une solution extérieure à toute pension**.

Demandez combien d’animaux seront accueillis pendant vos dates, qui sera présent et comment les repas, sorties et nuits seront organisés. Une maison ne garantit ni une présence permanente ni une bonne entente entre chiens. Pour une prestation payante, demandez les conditions écrites, les justificatifs professionnels et l’assurance correspondant à l’activité.

### 3. Des visites et promenades à domicile

La personne passe à des horaires convenus pour sortir le chien, le nourrir ou lui tenir compagnie. Il reste chez lui, mais **entre deux passages, il est seul**. Une visite n’équivaut donc pas à une garde avec hébergement.

Comptez les heures sans présence, de jour comme de nuit, et vérifiez si cette organisation couvre réellement ses besoins sur toute votre absence. Le nombre de visites ne suffit pas à décider : leur durée, les sorties et la capacité du chien à rester seul comptent aussi. En cas de difficulté avec la solitude, préparez le choix avec votre vétérinaire.

### 4. Un pet-sitter rémunéré qui séjourne chez vous

Certains professionnels proposent de dormir au domicile du propriétaire et d’y prendre soin des animaux. Votre chien reste dans son environnement, selon une prestation définie et facturée.

Faites préciser les heures couvertes : « nuit à domicile » peut laisser une partie de la journée sans présence. Demandez ce qui est inclus, l’expérience avec les besoins de votre chien, les conditions d’annulation et la solution prévue si le professionnel ne peut pas assurer la garde. Les tâches pour la maison se discutent séparément si elles ne figurent pas dans l’offre.

### 5. Le house-sitting : un gardien hébergé en échange de la garde

Le gardien séjourne chez vous sans rémunération, en échange du logement et des tâches convenues : repas, promenades, soins acceptés, arrosage ou courrier. C’est la formule proposée sur Guardiens. Notre [guide du house-sitting](/actualites/c-est-quoi-le-house-sitting) explique cet échange.

Votre chien garde son lieu de vie et la maison est habitée. **Dormir sur place ne signifie pas rester à la maison toute la journée** : convenez des sorties du gardien et du temps de présence attendu. Les dépenses du chien restent à votre charge. Aucun nombre de candidatures ni remplacement n’est garanti ; prévoyez un relais que vous avez choisi.

## <a id="comparatif"></a>Pension ou garde à domicile : que faut-il comparer ?

Une pension peut convenir à votre chien, y compris si une autre expérience s’est mal passée. Les établissements et leurs conditions d’accueil varient. Comparez les organisations réelles, sans supposer qu’un mode de garde sera toujours meilleur.

| Solution | Où vit le chien ? | Le point à confirmer |
| --- | --- | --- |
| Pension en établissement | Dans les locaux de la pension. | Hébergement, sorties, repos, surveillance et soins acceptés. |
| Proche | Chez vous ou chez lui. | Disponibilité sur toutes les dates et expérience avec votre chien. |
| Famille d’accueil | Chez la personne qui l’accueille. | Autres animaux, sécurité du lieu et périodes sans présence. |
| Visites à domicile | Chez vous, seul entre les passages. | Durée des visites et besoins à couvrir entre elles, nuit comprise. |
| Pet-sitter qui séjourne chez vous | À la maison. | Heures couvertes et contenu exact du devis. |
| House-sitting | À la maison, avec un gardien hébergé. | Disponibilité, tâches et conditions de l’échange. |

La [RSPCA, association de protection animale](https://www.rspca.org.uk/adviceandwelfare/pets/dogs/environment/kennels), invite notamment à examiner le cadre d’accueil, le repos et le suivi de l’animal. Sa fiche décrit aussi des règles anglaises ; celles-ci ne constituent pas la réglementation française.

## <a id="profil"></a>Chien âgé, anxieux ou sous traitement : comment choisir ?

Partez de son quotidien plutôt que d’une étiquette « idéal pour les seniors » ou « adapté aux chiens anxieux ».

- **Il supporte mal la solitude :** décrivez ce qui se passe lorsque vous partez et demandez les horaires réels de la personne. Le seul fait de dormir chez vous ne règle pas cette difficulté.
- **Il est âgé ou a une mobilité réduite :** vérifiez les escaliers, les sorties nécessaires et la capacité du gardien à l’aider dans les gestes habituels.
- **Il suit un traitement :** transmettez les prescriptions, confirmez que la personne accepte et sait réaliser les soins prévus, et organisez la conduite à tenir avec le vétérinaire. Une garde ordinaire ne remplace pas une surveillance médicale.
- **Il réagit aux autres chiens ou a déjà mordu :** expliquez les situations concernées et les mesures habituelles, sans les minimiser. Notre guide pour [faire garder un chien réactif](/actualites/chien-reactif-agressif-garde-solutions) aide à préparer cet échange.

L’expérience avec une race ou un badge d’identité ne suffit pas à établir cette compatibilité. Posez des questions sur des situations concrètes : une sortie, un repas, un départ du logement ou l’administration d’un traitement.

## <a id="signaux"></a>Votre chien a mal vécu une précédente garde : que demander ?

Demandez à la personne qui l’a gardé ce qu’elle a observé : repas, repos, sorties, moments où il était seul ou en contact avec d’autres animaux. Décrivez à votre vétérinaire tout changement de santé ou de comportement qui vous inquiète, plutôt que d’en attribuer automatiquement la cause à la pension.

Vous pourrez ensuite préciser ce qui doit changer pour le prochain séjour : moins de contacts avec d’autres chiens, un espace de repos distinct, davantage de présence ou un suivi particulier. Si vous le souhaitez tous les deux, vous pouvez proposer une rencontre ou une courte garde d’essai, en convenant de ses conditions.

## <a id="budget"></a>Quelle alternative coûte le moins cher ?

Demandez le **total pour vos dates exactes**, pas seulement un prix d’appel. Faites préciser l’unité facturée, les horaires d’arrivée et de retour, les déplacements, les suppléments et les conditions d’annulation.

Exemple de calcul, avec un tarif fictif : **25 € par jour pendant 14 jours = 350 €**, avant suppléments. Deux visites facturées chaque jour représentent 28 visites sur la même période. Ces calculs illustrent la méthode ; ce ne sont pas des tarifs moyens du marché.

Sur Guardiens, le gardien n’est pas rémunéré et l’accès à la plateforme est actuellement entièrement gratuit pour les deux rôles. Prévoyez la nourriture, les soins et les éventuels frais convenus entre vous. Mettez-les par écrit, notamment les déplacements et l’utilisation d’un véhicule s’ils sont envisagés.

Derrière Guardiens, il y a Jérémie et Elisa : nous avons créé la plateforme après cinq ans de garde de maisons et d’animaux. Notre priorité est de construire un réseau de confiance et de l’améliorer grâce aux retours des membres. Une participation aux frais de fonctionnement pourra être mise en place **au plus tôt au second semestre 2027, avec 30 jours de préavis**. Les conditions à jour figurent sur la page [tarifs](/tarifs).

## <a id="anticiper"></a>Quand chercher une alternative pour les vacances ?

Commencez dès que vos dates sont connues, surtout pour les vacances scolaires et les fêtes. Cela laisse du temps pour échanger et préparer une autre solution si nécessaire, sans garantir qu’une personne sera disponible.

Pour deux semaines, trois semaines ou un mois, notre guide pour [faire garder son animal pendant une longue absence](/actualites/vacances-longues-garde-animal-2-semaines) détaille les réserves à prévoir, les nouvelles pendant le séjour et l’organisation du retour.

## <a id="organisation"></a>Que confirmer avant de confier votre chien ?

Avant de vous engager, reprenez ensemble ces cinq points :

1. **Les dates et la présence :** arrivée, départ, nuits sur place et absences en journée.
2. **Le quotidien du chien :** repas, sorties, repos, comportement et soins acceptés.
3. **Le lieu et les autres occupants :** couchage, accès, autres animaux et personnes présentes.
4. **Les imprévus :** vétérinaire, contact local qui a accepté d’aider, retard de retour et annulation.
5. **L’accord :** dépenses, assurances à vérifier et consignes écrites accessibles pendant la garde.

Sur Guardiens, décrivez ces besoins dans votre annonce puis échangez avec les personnes intéressées. Une rencontre est possible si vous le souhaitez tous les deux. Le [guide de préparation de la maison](/actualites/preparer-maison-avant-garde) aide à rassembler les consignes après votre choix. Si vous essayez la plateforme, [dites-nous ce qui vous a aidé et ce qui manque](/contact) : vos retours nous servent à l’améliorer.

## <a id="faq"></a>Questions fréquentes sur les alternatives à la pension

### Quelle est la meilleure alternative à la pension pour mon chien ?

Celle dont l’organisation correspond à ses besoins : lieu, présence réelle, sorties, soins et relations avec d’autres animaux. Un proche, une famille d’accueil, des visites, une garde professionnelle sur place ou le house-sitting peuvent convenir selon ces conditions.

### Peut-on faire garder son chien gratuitement ?

Un proche peut accepter de vous aider. Sur Guardiens, la garde se fait sans rémunération en échange de l’hébergement, et la plateforme est actuellement 100 % gratuite pour propriétaires et gardiens. Les dépenses de l’animal et les frais convenus restent à prévoir.

### Le gardien reste-t-il avec mon chien toute la journée ?

Cela doit être convenu avant la garde. Ni une nuit chez vous ni un séjour en famille d’accueil ne garantissent une présence toute la journée. Expliquez le temps de présence nécessaire et demandez les absences prévues.

### Deux visites par jour peuvent-elles remplacer une pension ?

Le nombre seul ne permet pas de répondre. Comptez le temps passé seul, les sorties et les besoins de votre chien sur l’ensemble du séjour. Si ces besoins ne sont pas couverts, cherchez une organisation avec davantage de présence ; demandez conseil à son vétérinaire en cas de difficulté particulière.

### Et si je ne trouve personne ou si la garde est annulée ?

Gardez une autre piste et confirmez un relais avant de partir. Guardiens met en relation des membres ; la plateforme ne garantit ni un gardien disponible pour vos dates ni un remplacement en urgence.

*Sources consultées le 17 octobre 2026 : [RSPCA, choisir une garde pendant son absence](https://www.rspca.org.uk/adviceandwelfare/pets/general/holiday/leavingyourpet) et [choisir un accueil pour son chien](https://www.rspca.org.uk/adviceandwelfare/pets/dogs/environment/kennels), en anglais. Les conseils d’organisation de Guardiens et les exemples de calcul sont distingués des prescriptions vétérinaires et des tarifs professionnels.*$guide_content_0_20261017$;
BEGIN
  SELECT * INTO before_row FROM public.articles WHERE id='aa8f86e2-079a-4566-9d95-743e0b1e972b'::uuid AND slug='pension-chien-alternatives-guide' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Guide 0 introuvable'; END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Alternatives à la pension pour chien : 5 solutions à comparer'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Votre chien reste chez vous ou séjourne ailleurs ? Comparez cinq alternatives à la pension, les horaires à vérifier et le coût total avant de confier votre chien.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Alternative à la pension pour chien : 5 solutions'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Proche, famille d’accueil, visites, pet-sitter sur place ou house-sitting : comparez 5 alternatives à la pension pour chien, leur budget et la présence prévue.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"guide du house-sitting","url":"/actualites/c-est-quoi-le-house-sitting"},{"text":"faire garder un chien réactif","url":"/actualites/chien-reactif-agressif-garde-solutions"},{"text":"faire garder son animal pendant une longue absence","url":"/actualites/vacances-longues-garde-animal-2-semaines"},{"text":"guide de préparation de la maison","url":"/actualites/preparer-maison-avant-garde"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 14:10:21.075742+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide 0 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_gardes_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 0 différente';
  END IF;
  INSERT INTO public._backup_articles_gardes_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_gardes_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Alternatives à la pension pour chien : 5 solutions à comparer',
    excerpt='Votre chien reste chez vous ou séjourne ailleurs ? Comparez cinq alternatives à la pension, les horaires à vérifier et le coût total avant de confier votre chien.',
    meta_title='Alternative à la pension pour chien : 5 solutions',
    meta_description='Proche, famille d’accueil, visites, pet-sitter sur place ou house-sitting : comparez 5 alternatives à la pension pour chien, leur budget et la présence prévue.',
    internal_links='[{"text":"guide du house-sitting","url":"/actualites/c-est-quoi-le-house-sitting"},{"text":"faire garder un chien réactif","url":"/actualites/chien-reactif-agressif-garde-solutions"},{"text":"faire garder son animal pendant une longue absence","url":"/actualites/vacances-longues-garde-animal-2-semaines"},{"text":"guide de préparation de la maison","url":"/actualites/preparer-maison-avant-garde"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='pension-chien-alternatives-guide' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte guide 0 : % ligne au lieu de 1',affected; END IF;
END;
$guide_0$;

DO $guide_1$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $guide_content_1_20261017$# Faire garder son animal pendant les vacances : deux semaines ou plus

Pour faire garder un chien ou un chat pendant deux semaines, trois semaines ou un mois, commencez par ses besoins quotidiens : présence, repas, sorties et soins. Un proche, une pension, une famille d’accueil, des visites ou un gardien qui séjourne chez vous peuvent convenir, selon l’organisation prévue. **Sur une longue absence, il faut aussi confirmer la couverture de toutes les dates, les dépenses et un relais si la garde s’interrompt.**

Avec le house-sitting, vous hébergez un gardien en échange de la garde des animaux et des tâches convenues pour la maison. Sur Guardiens, vous publiez votre annonce puis choisissez avec qui organiser cet échange. **La plateforme est actuellement 100 % gratuite pour les propriétaires et les gardiens.** Le gardien n’est pas rémunéré ; les dépenses de vos animaux restent à prévoir.

**Dans ce guide**

- [Ce qui change sur deux semaines ou un mois](#duree)
- [Les solutions possibles](#solutions)
- [Les points à comparer selon votre situation](#comparatif)
- [Le budget pour 14, 21 ou 30 jours](#budget)
- [Quand chercher et confirmer la garde](#calendrier)
- [Les erreurs à éviter](#erreurs)
- [La checklist pour organiser le départ](#organisation)
- [Le relais et le retour](#relais)
- [Les questions fréquentes](#faq)

## <a id="duree"></a>Deux semaines, trois semaines, un mois : qu’est-ce qui change ?

Une garde longue doit rester tenable au quotidien pour l’animal et pour la personne. Prévoyez qui achètera la nourriture si elle manque, comment transmettre de nouvelles consignes et ce qui se passe si votre retour est décalé. Pour un traitement, préparez les prescriptions et les questions pratiques avec le vétérinaire avant le départ.

La durée ne permet pas, à elle seule, de déterminer la bonne formule. Le temps passé seul chaque jour, les besoins de l’animal et les disponibilités réelles comptent aussi. Évitez donc de choisir uniquement sur l’idée qu’un chat est « autonome » ou qu’une personne qui dort à la maison sera toujours présente.

Derrière Guardiens, il y a Jérémie et Elisa : nous avons créé la plateforme après cinq ans de garde de maisons et d’animaux. Ce que nous cherchons à rendre plus simple, c’est cet accord concret : savoir qui fait quoi et pouvoir se parler clairement avant de confier ses clés.

## <a id="solutions"></a>Quelle solution pour faire garder son chien ou son chat longtemps ?

### Un gardien qui séjourne à la maison

Les animaux restent chez vous et la maison est habitée. Les repas, sorties, soins acceptés et petites tâches se conviennent ensemble. Cette organisation peut prendre la forme d’une prestation professionnelle rémunérée ou d’un échange de house-sitting, comme sur Guardiens.

**Confirmez les absences prévues du gardien en journée et la présence la nuit.** S’il travaille à distance, demandez aussi si le logement dispose de ce dont il a besoin. Télétravailler ne signifie pas être disponible à chaque instant. Notre [guide du house-sitting](/actualites/c-est-quoi-le-house-sitting) détaille le fonctionnement de l’échange.

### Un proche, chez vous ou à son domicile

Une personne connue peut être une bonne piste si elle est disponible sur toute la période et à l’aise avec les besoins des animaux. Vérifiez ses propres déplacements et contraintes ; un accord pour un week-end ne vaut pas automatiquement pour un mois.

Si l’animal change de logement, précisez les accès, les autres animaux et les règles de cohabitation. Préparez les consignes et le relais comme avec toute autre personne.

### Une pension, une chatterie ou une famille d’accueil

Votre animal séjourne ailleurs. Demandez les conditions exactes pour vos dates : hébergement, repos, sorties, contacts avec d’autres animaux, surveillance et soins acceptés. Confirmez les modalités de transport et de prolongation éventuelle.

Il n’existe pas de formule universellement adaptée à tous les chiens ou chats âgés, anxieux ou sous traitement. Discutez de leurs besoins avec le prestataire et, si nécessaire, le vétérinaire. Pour un chien, notre [comparatif des alternatives à la pension](/actualites/pension-chien-alternatives-guide) permet d’examiner les différences entre les solutions.

### Des visites à domicile

La personne vient pour les repas, les sorties ou la litière, et pour passer du temps avec l’animal. Il reste seul entre les visites. Vérifiez leur fréquence, leur durée et les horaires, y compris le week-end, plutôt que de retenir un simple nombre de passages.

Pour un chat, [Cats Protection](https://www.cats.org.uk/help-and-advice/caring-for-your-cat/home-and-environment/going-on-holiday) conseille au moins deux visites quotidiennes et précise que certains chats, notamment très jeunes, âgés ou malades, peuvent en nécessiter davantage. Ce repère ne garantit pas que deux visites suffiront à votre chat pendant trois semaines : adaptez l’organisation à ses besoins et demandez conseil à son vétérinaire si nécessaire.

## <a id="comparatif"></a>Quels points comparer selon votre situation ?

| Votre situation | Ce qu’il faut vérifier | Ce qu’il faut convenir |
| --- | --- | --- |
| Chien qui supporte mal la solitude | Horaires de présence réels. | Absences possibles et organisation compatible avec ses besoins. |
| Chat gardé à la maison | Repas, litière, interactions et observation quotidienne. | Durée et fréquence des passages, ou séjour sur place. |
| Plusieurs animaux | Soins, sorties et cohabitation de chacun. | Charge de travail et capacité de la personne à s’en occuper. |
| Animal sous traitement | Soins acceptés et compétences nécessaires. | Prescriptions accessibles et contact vétérinaire. |
| Absence d’un mois ou retour incertain | Disponibilité sur toute la période. | Réapprovisionnement, prolongation et relais. |

Pour une garde de maison loin de votre lieu de séjour, notre guide pour [faire garder sa maison en Nouvelle-Calédonie](/actualites/garde-maison-animaux-nouvelle-caledonie) détaille les prix en F CFP, les déplacements et le relais à prévoir quand vous partez du Caillou. Si vous vivez à l’étranger, le [guide des propriétaires expatriés](/actualites/expat-proprietaire-faire-garder-maison-etranger) traite aussi de la remise des clés et des échanges à distance.

## <a id="budget"></a>Quel budget pour faire garder un animal 14, 21 ou 30 jours ?

Comparez le coût total pour tous vos animaux et les dates complètes. Une journée, une nuit et une période de vingt-quatre heures ne couvrent pas toujours les mêmes horaires. Demandez aussi les conditions d’annulation, les déplacements, la nourriture et les suppléments.

**Exemples avec des tarifs fictifs, pour comprendre le calcul :**

| Hypothèse de facturation | 14 jours | 21 jours | 30 jours |
| --- | --- | --- | --- |
| 25 € par jour | 350 € | 525 € | 750 € |
| 2 visites par jour à 15 € la visite | 420 € | 630 € | 900 € |

Ces montants ne sont ni des prix moyens ni des devis. Le nombre de visites de l’exemple n’est pas une recommandation de garde. Pour plusieurs animaux, demandez un total détaillé plutôt que de supposer un tarif unique ou de multiplier sans vérifier.

**Sur Guardiens**, l’échange de garde se fait sans rémunération et la plateforme est actuellement 100 % gratuite pour les deux rôles. Vous prévoyez la nourriture, la litière, les soins et les éventuels frais convenus entre vous. Sur un mois, dites qui pourra réapprovisionner et comment les achats seront remboursés.

Notre priorité est de construire le réseau et d’améliorer le service avec les retours des membres. Une participation aux frais de fonctionnement pourra être mise en place **au plus tôt au second semestre 2027, avec 30 jours de préavis**. Consultez les conditions à jour sur la page [tarifs](/tarifs).

## <a id="calendrier"></a>Quand chercher et confirmer une garde longue ?

Commencez dès que vos dates sont connues, en particulier pour l’été et les fêtes. Plusieurs semaines d’avance laissent du temps pour échanger, vérifier les disponibilités et préparer une autre piste. Ce délai ne garantit pas de candidature ni de réservation.

Pour une garde avec hébergement, indiquez les **dates où le gardien doit être sur place**, qui peuvent différer de celles de votre voyage : remise des clés, départ tôt le matin ou retour tard le soir. Toute nuit supplémentaire se convient ensemble.

Avant de confirmer, reprenez les horaires, les soins acceptés et les frais par écrit. Un appel permet d’en discuter ; une rencontre est possible si vous le souhaitez tous les deux. Pour choisir, notre [guide des critères d’un gardien](/actualites/choisir-gardien-bons-criteres) aide à poser des questions concrètes. Un badge d’identité ne garantit pas la qualité d’une garde.

## <a id="erreurs"></a>Les erreurs à éviter sur une garde longue

- **Confondre séjour sur place et présence permanente.** Demandez les horaires plutôt que de les déduire du mode de garde.
- **Décrire seulement les animaux faciles à gérer.** Expliquez aussi les difficultés, les soins et le temps nécessaire chaque jour.
- **Découvrir un trou entre deux gardiens.** Si plusieurs personnes se succèdent, confirmez chaque transmission et qui est responsable à chaque moment.
- **Prévoir les réserves au jour près.** Gardez une marge adaptée à votre situation pour la nourriture et les consommables ; organisez les médicaments avec le vétérinaire.
- **Compter sur un remplacement automatique.** Identifiez vous-même un relais qui a accepté d’intervenir avant de partir.

## <a id="organisation"></a>Checklist : comment organiser le départ pour plusieurs semaines ?

<a id="checklist"></a>

Préparez un document simple, accessible à la personne pendant toute la garde. Le guide de la maison sur Guardiens peut rassembler ces informations.

**Pour chaque animal :** repas et quantités, sorties, litière, habitudes, difficultés connues, prescriptions et soins convenus. Ajoutez les coordonnées du vétérinaire et de son service de garde, l’emplacement du carnet de santé, de la caisse de transport et des accessoires.

**Pour le logement :** clés testées, double chez le relais, accès autorisés, couchage, alarme, courrier, collecte des déchets, plantes et fonctionnement des équipements utiles. Précisez ce qui est réellement attendu ; l’entretien courant convenu ne doit pas se transformer en nouveaux travaux pendant votre absence.

**Pour les échanges :** un canal principal, la fréquence des nouvelles et un contact local si vous êtes injoignable. Si vous partez à l’étranger, indiquez le décalage horaire et vos périodes sans réseau. Convenez des démarches pour joindre le vétérinaire et de la prise en charge des frais ; ne comptez pas sur une réponse instantanée à distance.

**Pour l’accord :** dates, tâches, frais, annulation, relais et conditions de prolongation. Vérifiez les assurances applicables à votre situation auprès des assureurs concernés. Le [guide juridique du house-sitting en France](/actualites/house-sitting-cadre-juridique-france) concerne le cadre français ; les règles peuvent différer à l’étranger.

Notre [checklist avant les vacances](/actualites/checklist-partir-vacances-animaux) et la [préparation de la maison avant une garde](/actualites/preparer-maison-avant-garde) permettent d’approfondir ces points sans tout ajouter à l’annonce publique.

## <a id="relais"></a>Que prévoir si le gardien doit partir ou si votre retour est retardé ?

Choisissez un contact local qui a **accepté d’intervenir**, peut accéder au logement et connaît les besoins des animaux. Précisez ce qu’il peut assurer et pendant combien de temps. Si ce n’est qu’un dépannage de quelques heures, préparez aussi la suite.

Si la garde s’interrompt, contactez ce relais et confirmez qui prend la responsabilité des animaux, à partir de quand et avec quelles consignes. Guardiens ne garantit pas de remplacement en urgence. Une annonce ou un message sans réponse ne constitue pas une solution confirmée.

Si votre retour est retardé, demandez au gardien s’il peut rester ; ne supposez pas sa disponibilité. À défaut, activez l’organisation convenue. Si plusieurs gardiens se succèdent, transmettez les clés, les consignes à jour et les observations utiles, sans laisser d’intervalle non couvert.

Au retour, faites un point sur les repas, les éventuels soins, les achats et les faits inhabituels. Les [retours des deux personnes](/contact) nous aident aussi à améliorer Guardiens pour les prochaines gardes.

## <a id="faq"></a>Questions fréquentes sur les gardes de longue durée

### Quelle solution pour faire garder mon chien deux semaines ?

Comparez un proche, un accueil extérieur et une garde à domicile selon les horaires, les sorties et les besoins de votre chien. Pour le house-sitting, le gardien est hébergé chez vous en échange des tâches convenues ; confirmez son temps de présence avant de choisir.

### Puis-je laisser mon chat seul deux ou trois semaines avec des visites ?

Il doit être pris en charge chaque jour par une personne responsable. Des visites peuvent faire partie de cette organisation, mais leur fréquence et leur durée doivent couvrir ses besoins. Ne vous contentez pas de réserves de nourriture ou d’un distributeur automatique pour toute l’absence. Préparez une solution adaptée avec le vétérinaire si votre chat a des besoins particuliers.

### Un gardien peut-il rester un mois chez moi ?

Oui, si vous convenez tous les deux de toute la période, des tâches et des conditions d’hébergement. Prévoyez les achats à renouveler, les absences du gardien, les échanges à distance et le relais éventuel. Guardiens ne garantit pas une personne disponible pour une durée donnée.

### Comment faire garder plusieurs animaux pendant les vacances ?

Décrivez chaque animal et le temps nécessaire pour tous les repas, sorties et soins. Confirmez que la personne peut assurer l’ensemble. À domicile, les animaux peuvent rester dans leur lieu de vie ; pour une prestation payante, demandez le tarif total du foyer.

### Combien coûte une garde de trois semaines ?

Avec un tarif fictif de 25 € par jour, le calcul donne 525 € pour 21 jours, avant suppléments. Sur Guardiens, la garde est un échange sans rémunération et la plateforme est actuellement gratuite pour les deux rôles ; restent les dépenses des animaux et les frais convenus.

### Qui prend la suite si le gardien annule ou doit partir plus tôt ?

La personne ou la solution de relais que vous avez confirmée avant le départ. Guardiens ne fournit pas de remplacement garanti. Reprenez l’organisation avec le relais et assurez-vous qu’une personne a effectivement accepté la prise en charge.

*Sources consultées le 17 octobre 2026 : [Cats Protection, organiser la garde de son chat pendant les vacances](https://www.cats.org.uk/help-and-advice/caring-for-your-cat/home-and-environment/going-on-holiday) et [RSPCA, préparer la garde d’un animal](https://www.rspca.org.uk/adviceandwelfare/pets/general/holiday/leavingyourpet), en anglais. Leurs conseils pratiques sont utilisés sans transposer les règles britanniques à la France ou aux territoires d’outre-mer.*$guide_content_1_20261017$;
BEGIN
  SELECT * INTO before_row FROM public.articles WHERE id='4f0c9ffe-1ed1-4612-8f81-f7986aac1272'::uuid AND slug='vacances-longues-garde-animal-2-semaines' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Guide 1 introuvable'; END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Faire garder son animal pendant les vacances : deux semaines ou plus'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Deux semaines, trois semaines ou un mois loin de chez vous : comparez les solutions de garde, calculez les dépenses et préparez le quotidien des animaux jusqu’à votre retour.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Garde d''animaux pendant les vacances : 2 semaines et plus'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Faire garder son chien ou son chat 2 semaines, 3 semaines ou un mois : solutions, budget total, consignes et relais pour préparer une longue absence.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"guide du house-sitting","url":"/actualites/c-est-quoi-le-house-sitting"},{"text":"comparatif des alternatives à la pension","url":"/actualites/pension-chien-alternatives-guide"},{"text":"faire garder sa maison en Nouvelle-Calédonie","url":"/actualites/garde-maison-animaux-nouvelle-caledonie"},{"text":"guide des propriétaires expatriés","url":"/actualites/expat-proprietaire-faire-garder-maison-etranger"},{"text":"guide des critères d’un gardien","url":"/actualites/choisir-gardien-bons-criteres"},{"text":"guide juridique du house-sitting en France","url":"/actualites/house-sitting-cadre-juridique-france"},{"text":"checklist avant les vacances","url":"/actualites/checklist-partir-vacances-animaux"},{"text":"préparation de la maison avant une garde","url":"/actualites/preparer-maison-avant-garde"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-17 10:50:29.713254+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide 1 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_gardes_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 1 différente';
  END IF;
  INSERT INTO public._backup_articles_gardes_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_gardes_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Faire garder son animal pendant les vacances : deux semaines ou plus',
    excerpt='Deux semaines, trois semaines ou un mois loin de chez vous : comparez les solutions de garde, calculez les dépenses et préparez le quotidien des animaux jusqu’à votre retour.',
    meta_title='Garde d''animaux pendant les vacances : 2 semaines et plus',
    meta_description='Faire garder son chien ou son chat 2 semaines, 3 semaines ou un mois : solutions, budget total, consignes et relais pour préparer une longue absence.',
    internal_links='[{"text":"guide du house-sitting","url":"/actualites/c-est-quoi-le-house-sitting"},{"text":"comparatif des alternatives à la pension","url":"/actualites/pension-chien-alternatives-guide"},{"text":"faire garder sa maison en Nouvelle-Calédonie","url":"/actualites/garde-maison-animaux-nouvelle-caledonie"},{"text":"guide des propriétaires expatriés","url":"/actualites/expat-proprietaire-faire-garder-maison-etranger"},{"text":"guide des critères d’un gardien","url":"/actualites/choisir-gardien-bons-criteres"},{"text":"guide juridique du house-sitting en France","url":"/actualites/house-sitting-cadre-juridique-france"},{"text":"checklist avant les vacances","url":"/actualites/checklist-partir-vacances-animaux"},{"text":"préparation de la maison avant une garde","url":"/actualites/preparer-maison-avant-garde"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='vacances-longues-garde-animal-2-semaines' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte guide 1 : % ligne au lieu de 1',affected; END IF;
END;
$guide_1$;
COMMIT;
