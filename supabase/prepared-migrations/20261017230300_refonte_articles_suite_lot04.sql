-- Refonte des guides pages de house-sitting par ville, autorisée le 17/10/2026.
-- Les URL, auteurs, dates de publication et couvertures sont conservés.
BEGIN;
CREATE TABLE IF NOT EXISTS public._backup_articles_suite_lot04_20261017 AS SELECT * FROM public.articles WHERE false;
REVOKE ALL ON public._backup_articles_suite_lot04_20261017 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public._backup_articles_suite_lot04_20261017 TO service_role;
ALTER TABLE public._backup_articles_suite_lot04_20261017 ENABLE ROW LEVEL SECURITY;
SELECT id FROM public.articles WHERE id IN ('50c52ea5-2f6c-419d-a819-f207c4c6a4d2'::uuid,'ff6660e2-ac7c-4b6e-b8fe-939a41662a4e'::uuid) ORDER BY id FOR UPDATE;

DO $guide_0$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_0_20261017$# Bien-être animal pendant une absence : préparer une garde adaptée

**Pour préparer le bien-être de votre animal pendant votre absence, partez de ses besoins habituels et vérifiez qui pourra réellement les assurer.** Repas, eau, repos, sorties, interactions et soins éventuels comptent davantage qu’une formule annoncée comme idéale pour tous.

Si son état ou son comportement change de façon préoccupante, demandez conseil à votre vétérinaire. Un refus de manger, une gêne ou un comportement inhabituel ne doit pas être attribué automatiquement au stress du départ. Ce guide aide à préparer la garde ; il ne permet pas de poser un diagnostic.

**Dans ce guide :** [les besoins](#besoins) · [la formule](#formule) · [les habitudes](#habitudes) · [la présence](#presence) · [les observations](#observations) · [le retour](#retour) · [questions fréquentes](#faq).

## <a id="besoins"></a>Décrire les besoins de cet animal, sans partir d’un stéréotype

Un chien, un chat ou un autre animal a ses habitudes et ses contraintes propres. Son espèce, son âge ou sa race peuvent donner des points à examiner, mais ne permettent pas de déduire un planning de garde à eux seuls.

Préparez une description concrète : repas, repos, sorties, jeux ou interactions acceptés, temps sans présence déjà connu, réactions à de nouvelles personnes et soins prescrits. Avec plusieurs animaux, décrivez chacun et les règles de cohabitation.

| Besoin | Information à transmettre | Vérification avec la personne |
| --- | --- | --- |
| Soins quotidiens | Alimentation, eau, sorties ou litière. | Horaires et tâches réalisables. |
| Repos et environnement | Couchage, zones accessibles et situations à éviter. | Espaces et consignes compris. |
| Interactions | Contacts, jeux et manipulations acceptés. | Expérience et respect du rythme de l’animal. |
| Santé | Traitement prescrit et changements à signaler. | Capacité à suivre les consignes et contacts accessibles. |

## <a id="formule"></a>Rester chez lui ou être accueilli ailleurs ?

Le domicile peut préserver des repères si les soins et la présence nécessaires sont assurés. Il n’est pas automatiquement la meilleure solution. Un accueil ou une pension adaptée peut aussi convenir selon l’animal et la prise en charge proposée.

[Cats Protection présente plusieurs solutions pour une absence du propriétaire](https://www.cats.org.uk/help-and-advice/caring-for-your-cat/home-and-environment/going-on-holiday), en tenant compte notamment de la sensibilité du chat aux changements. Cela ne permet pas d’affirmer que tous les chats préfèrent la même formule.

Comparez le lieu, les personnes, les horaires, les interactions et les soins plutôt que le seul intitulé du service. Notre guide de [garde d’animaux à domicile](/actualites/garde-animaux-domicile-chien-chat) distingue les visites du séjour d’un gardien. Le [comparatif des alternatives à la pension](/actualites/pension-chien-alternatives-guide) élargit les possibilités.

## <a id="habitudes"></a>Transmettre les habitudes utiles avant de partir

Laissez l’alimentation habituelle et les consignes nécessaires, ainsi que les équipements adaptés. Expliquez les trajets ou accès, les couchages et les interactions connues. Les objets familiers peuvent faire partie de l’environnement ; ils ne garantissent pas à eux seuls l’absence d’inconfort.

Pour un chat discret, indiquez les cachettes et la manière de vérifier qu’il va bien. Pour un chien, décrivez les sorties et les situations à éviter. Ne demandez pas à la personne de forcer un contact pour prouver que l’animal l’a « accepté ».

Une rencontre est possible si vous le souhaitez tous les deux, sans être obligatoire sur Guardiens. Le but reste de vérifier que la personne comprend les besoins et peut assurer les tâches, sur place ou lors d’une transmission à distance.

## <a id="presence"></a>Vérifier le temps de présence et la qualité des interactions

Une personne qui dort dans votre logement peut sortir en journée. Une visite peut être longue ou très courte. Demandez le planning réel, puis vérifiez sa compatibilité avec votre animal : les intitulés ne disent pas tout.

Pour un chien qui supporte mal la solitude, [la RSPCA conseille un accompagnement adapté et un avis vétérinaire si nécessaire](https://www.rspca.org.uk/adviceandwelfare/pets/dogs/behaviour/separationrelatedbehaviour). Une nouvelle personne dans la maison ne constitue pas à elle seule un traitement des difficultés de séparation.

Prévoyez des interactions et du repos correspondant aux habitudes de l’animal. Le [guide de garde de chien](/actualites/garde-chien-faire-garder-son-chien) et celui de la [garde de chat à domicile](/actualites/garde-chat-domicile-house-sitting) aident à détailler ces besoins. Si l’organisation ne convient pas, adaptez la formule avant le départ.

## <a id="observations"></a>Dire ce qui est habituel et ce qui doit être signalé

Décrivez ce que le gardien peut observer sans diagnostiquer : repas, eau, déplacements, sorties, litière et interactions. Une observation factuelle aide le propriétaire et le vétérinaire à comprendre un changement.

**Exemple fictif à adapter :** « Notre chat se cache souvent lorsqu’une personne arrive, puis vient manger. Voici où vérifier sa présence et les habitudes à connaître. S’il ne se présente pas comme d’habitude ou si quelque chose vous préoccupe, contactez-nous et demandez conseil au vétérinaire. » Cet exemple doit être remplacé par les informations propres à votre animal.

Préparez le vétérinaire, le service de garde identifié, les documents, le transport et un relais ayant accepté son rôle. Convenez des nouvelles et des dépenses. Pour une situation préoccupante, ne demandez pas d’attendre un délai fixe ou votre réponse avant de solliciter un avis professionnel. Le [guide des imprévus pendant une garde](/actualites/gerer-imprevu-pendant-garde) complète cette préparation.

## <a id="retour"></a>Au retour : reprendre l’organisation et écouter les observations

Demandez ce qui a été observé pendant le séjour : repas, activités, soins et éventuelles difficultés. Ces éléments permettent de préparer une prochaine absence et d’en parler au vétérinaire si nécessaire.

Les réactions peuvent varier, mais un trouble ne doit pas être déclaré « normal et transitoire » sans examen de la situation. Si un changement de santé ou de comportement persiste ou vous inquiète, contactez votre vétérinaire.

Pour organiser une prochaine garde, la [liste de préparation de la maison](/actualites/preparer-maison-avant-garde) rassemble les informations à transmettre. Choisissez une personne capable de répondre à ces besoins ; un badge d’identité ou des avis favorables ne certifient pas toutes les compétences.

## <a id="faq"></a>Questions fréquentes sur le bien-être pendant une absence

:::faq
### Le domicile garantit-il moins de stress qu’une pension ?
Non. Rester chez lui peut préserver des repères, mais les soins, les horaires et la personne qui intervient doivent convenir à l’animal. Un accueil ou une pension adaptée peut aussi être une option. Comparez la prise en charge réelle plutôt qu’une promesse universelle.

### Un chat indépendant a-t-il besoin d’une personne pendant l’absence ?
Il faut organiser une personne responsable de ses soins, avec des passages ou une présence adaptés. L’étiquette « indépendant » ne définit pas les besoins en eau, alimentation, litière, observation et interactions. Précisez ces points et les soins particuliers éventuels.

### Que prévoir pour un chien qui vit mal la solitude ?
Décrivez ce qu’il vit déjà et préparez un planning compatible avec ses besoins. Demandez conseil à votre vétérinaire ou au professionnel qui le suit. La présence d’un gardien n’est pas à elle seule un traitement des difficultés de séparation.

### Faut-il conserver exactement tous les horaires habituels ?
Transmettez les habitudes utiles et les contraintes, en particulier les soins prescrits. Vérifiez que l’organisation peut être suivie et adaptez la garde si nécessaire. Les consignes médicales doivent être préparées avec le vétérinaire.

### Quand contacter le vétérinaire pendant ou après la garde ?
Lorsqu’un changement de santé ou de comportement vous préoccupe, demandez un avis vétérinaire plutôt que de le qualifier automatiquement de stress. Préparez les contacts et les informations utiles avant le départ et prévenez le propriétaire dès que possible.

### Un gardien doit-il rester dans la maison en permanence ?
Ce n’est pas une conséquence automatique de l’hébergement. Définissez les horaires et les périodes sans présence selon les besoins de votre animal. Vérifiez que la personne peut réellement assurer cette organisation avant de confirmer la garde.
:::

Sur Guardiens, la plateforme est actuellement 100 % gratuite pour les propriétaires et les gardiens, et le gardien est hébergé sans rémunération. Les soins et dépenses restent à convenir. Une participation aux frais d’infrastructure pourra être envisagée au plus tôt au second semestre 2027, avec un préavis de 30 jours ; les conditions à jour sont sur la [page des tarifs](/tarifs).$suite_content_0_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='50c52ea5-2f6c-419d-a819-f207c4c6a4d2'::uuid AND slug='bien-etre-animal-pendant-absence';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/bien-etre-animal-pendant-absence' THEN
    RAISE EXCEPTION 'Guide suite 0 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Bien-être animal pendant une absence : préparer une garde adaptée'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Le bien-être pendant une absence se prépare selon chaque animal : soins, présence adaptée, habitudes et personne capable de les assurer, à domicile ou ailleurs.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Bien-être animal pendant votre absence'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Présence, habitudes, soins et interactions : préparez le bien-être de votre animal pendant votre absence et repérez les changements à signaler au vétérinaire.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Une personne caresse un chien allongé sur un tapis, près d’une valise.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"garde d’animaux à domicile","url":"/actualites/garde-animaux-domicile-chien-chat"},{"text":"comparatif des alternatives à la pension","url":"/actualites/pension-chien-alternatives-guide"},{"text":"guide de garde de chien","url":"/actualites/garde-chien-faire-garder-son-chien"},{"text":"garde de chat à domicile","url":"/actualites/garde-chat-domicile-house-sitting"},{"text":"guide des imprévus pendant une garde","url":"/actualites/gerer-imprevu-pendant-garde"},{"text":"liste de préparation de la maison","url":"/actualites/preparer-maison-avant-garde"},{"text":"page des tarifs","url":"/tarifs"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 14:10:21.205068+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 0 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot04_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 0 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot04_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot04_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Bien-être animal pendant une absence : préparer une garde adaptée',
    excerpt='Le bien-être pendant une absence se prépare selon chaque animal : soins, présence adaptée, habitudes et personne capable de les assurer, à domicile ou ailleurs.',
    meta_title='Bien-être animal pendant votre absence',
    meta_description='Présence, habitudes, soins et interactions : préparez le bien-être de votre animal pendant votre absence et repérez les changements à signaler au vétérinaire.',
    hero_image_alt='Une personne caresse un chien allongé sur un tapis, près d’une valise.',
    internal_links='[{"text":"garde d’animaux à domicile","url":"/actualites/garde-animaux-domicile-chien-chat"},{"text":"comparatif des alternatives à la pension","url":"/actualites/pension-chien-alternatives-guide"},{"text":"guide de garde de chien","url":"/actualites/garde-chien-faire-garder-son-chien"},{"text":"garde de chat à domicile","url":"/actualites/garde-chat-domicile-house-sitting"},{"text":"guide des imprévus pendant une garde","url":"/actualites/gerer-imprevu-pendant-garde"},{"text":"liste de préparation de la maison","url":"/actualites/preparer-maison-avant-garde"},{"text":"page des tarifs","url":"/tarifs"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='bien-etre-animal-pendant-absence' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 0 : % ligne au lieu de 1',affected; END IF;
END;
$guide_0$;

DO $guide_1$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_1_20261017$# Garde d’animaux à domicile : visites, séjour et préparation

**La garde d’animaux à domicile permet à vos animaux de rester chez eux pendant votre absence.** Une personne vient assurer les soins lors de visites, ou séjourne dans votre logement pour s’en occuper selon les tâches convenues. Le choix dépend des besoins de chaque animal et des horaires réels de la personne, au-delà du nom de la formule.

Sur Guardiens, le gardien est hébergé chez vous sans rémunération, en échange de la garde du logement et des tâches acceptées. La plateforme est actuellement 100 % gratuite pour les propriétaires et les gardiens. Vous présentez votre besoin et échangez avec les personnes intéressées ; aucune candidature ni disponibilité n’est garantie.

**Dans ce guide :** [définition](#definition) · [formules](#formules) · [chien](#chien) · [chat](#chat) · [autres animaux](#autres) · [dépenses](#prix) · [fonctionnement](#fonctionnement) · [préparation](#preparer) · [recherche locale](#villes) · [questions fréquentes](#faq).

## <a id="definition"></a>Que recouvre la garde d’animaux à domicile ?

Elle se distingue d’un accueil chez une autre personne ou d’une pension : vos animaux restent dans leur environnement. Les termes pet-sitting ou gardiennage peuvent désigner des prestations différentes ; demandez précisément ce qui est assuré.

Le house-sitting, ou home-sitting, correspond ici au séjour d’une personne dans votre logement. Cette présence ne signifie pas qu’elle y reste sans interruption. Le [guide du house-sitting](/actualites/c-est-quoi-le-house-sitting) explique ce fonctionnement.

## <a id="formules"></a>Visites ou gardien qui séjourne chez vous ?

| Formule | Ce qu’elle permet | À vérifier avant de choisir |
| --- | --- | --- |
| Visites | Repas, sorties et autres tâches lors de passages convenus. | Horaires, durée des passages et intervalles sans personne. |
| Séjour d’un gardien | Une personne habite temporairement chez vous et assure les tâches acceptées. | Absences prévues, soins et hébergement adapté. |
| Aide d’un proche | Une organisation directe, en visites ou en séjour. | Disponibilité effective, accès et consignes comprises. |

Comparez aussi l’accueil hors du domicile si cette option convient aux animaux et permet une prise en charge adaptée. Notre [comparatif des alternatives à la pension](/actualites/pension-chien-alternatives-guide) aide à examiner les formules sans les classer de façon universelle.

## <a id="chien"></a>Pour un chien : sorties, interactions et temps sans présence

Décrivez les repas, les promenades, les trajets habituels et les situations à connaître. Précisez ce que votre chien vit déjà sans détresse lorsqu’il est seul. Un gardien qui dort chez vous peut avoir des activités en journée : vérifiez leur compatibilité avec ce besoin.

Si votre chien vit mal la solitude ou nécessite une prise en charge particulière, préparez l’organisation avec votre vétérinaire ou le professionnel qui le suit. Le [guide de garde de chien](/actualites/garde-chien-faire-garder-son-chien) détaille les critères de choix et les questions utiles.

## <a id="chat"></a>Pour un chat : des soins et des interactions adaptés

Le fait de rester chez lui ne suffit pas à organiser sa garde. Convenez des repas, de l’eau, de la litière, des interactions qu’il accepte et de la manière de vérifier son état. Les besoins d’un chat sous traitement ne se déduisent pas de ceux d’un autre chat du foyer.

La fréquence et la durée des passages ou le planning d’un gardien se définissent selon ces besoins. Le [guide de garde de chat à domicile](/actualites/garde-chat-domicile-house-sitting) distingue les visites d’un séjour et reprend les repères de préparation.

## <a id="autres"></a>Plusieurs animaux ou d’autres espèces : décrire chaque besoin

Avec plusieurs animaux, préparez une fiche pour chacun et les règles de cohabitation : repas distincts, espaces séparés si nécessaire, accès et interactions. Les tâches ne se résument pas à additionner des gamelles.

Pour des lapins, oiseaux, poissons, poules ou autres animaux, précisez l’espèce, l’installation, les soins et les gestes attendus. Vérifiez une expérience correspondant au besoin. Une expérience des chiens et des chats ne certifie pas la capacité à s’occuper de toutes les espèces.

Si des soins demandent une compétence particulière, faites préciser l’organisation par le vétérinaire compétent. Vous trouverez aussi une méthode de préparation dans le [guide du bien-être pendant une absence](/actualites/bien-etre-animal-pendant-absence).

## <a id="prix"></a>Quelles dépenses prévoir pour une garde à domicile ?

Pour une prestation payante, demandez un devis sur toute la période : nombre et durée des visites, nuits, animaux concernés, trajets et soins acceptés. Vérifiez les frais inclus et les conditions de modification ou d’annulation.

Sur Guardiens, la plateforme est actuellement 100 % gratuite pour les deux rôles et le gardien séjourne sans rémunération en échange de l’hébergement. Alimentation, litière, soins et autres dépenses restent à convenir séparément.

Notre priorité est de développer le réseau et d’améliorer le service avec vos retours. Une participation aux frais d’infrastructure pourra être envisagée au plus tôt au second semestre 2027, avec un préavis de 30 jours. Les conditions à jour figurent sur la [page des tarifs](/tarifs).

## <a id="fonctionnement"></a>Comment organiser un séjour avec Guardiens ?

1. **Présentez le besoin :** dates, logement, animaux, tâches et contraintes. Le guide pour [rédiger une annonce](/actualites/rediger-bonne-annonce-house-sitting) vous aide à être précis.
2. **Échangez avec les personnes intéressées :** expériences pertinentes, horaires et capacité à suivre les consignes. Un badge d’identité n’est pas une certification de compétences.
3. **Convenez de l’organisation :** présence, clés, nouvelles, dépenses et relais. Une rencontre est possible si vous le souhaitez tous les deux, sans être obligatoire.
4. **Confirmez et préparez le séjour :** le guide de la maison et l’[accord de garde](/actualites/commodat-garde-guardiens) permettent de regrouper les informations. La signature de l’accord est facultative.

Pour choisir, appuyez-vous sur les [critères de sélection d’un gardien](/actualites/choisir-gardien-bons-criteres). La confirmation d’une garde ne remplace pas la vérification des garanties auprès des assureurs concernés.

## <a id="preparer"></a>Les informations à transmettre avant le départ

Rassemblez les habitudes, les consignes prescrites, les documents utiles, l’identification, le vétérinaire et le service de garde identifié. Ajoutez le transport possible et un relais ayant accepté son rôle si vous êtes injoignable.

Convenez des décisions et dépenses autorisées, des justificatifs et du règlement des frais. Préparez aussi une solution si la personne doit interrompre la garde ou si votre retour est retardé. Aucun remplacement immédiat n’est garanti. La [préparation de la maison](/actualites/preparer-maison-avant-garde) complète ces consignes.

## <a id="villes"></a>Faut-il un gardien qui habite près de chez vous ?

Pour des visites régulières, le trajet et les horaires comptent. Pour un séjour chez vous, une personne peut venir d’une autre ville : vérifiez son arrivée et sa mobilité pour les sorties, les achats ou le vétérinaire.

Les [pages de house-sitting par ville](/house-sitting) permettent de situer la recherche. Elles ne garantissent pas qu’une personne sera disponible dans votre commune et à vos dates. Commencez dès que vos besoins sont connus et gardez une alternative tant que la garde n’est pas confirmée.

## <a id="faq"></a>Questions fréquentes sur la garde d’animaux à domicile

:::faq
### Quelle est la différence entre visites et house-sitting ?
Les visites sont des passages pour assurer les tâches convenues. En house-sitting, la personne séjourne dans votre logement. Dans les deux cas, précisez les horaires et les périodes sans présence ; l’hébergement ne signifie pas une disponibilité permanente.

### Comment choisir entre ces deux formules ?
Partez des soins de chaque animal, de ses sorties, de ses interactions et du temps sans présence adapté. Vérifiez que le planning de la personne répond à ces besoins. Une autre formule peut être préférable si les contraintes ne correspondent pas.

### Peut-on faire garder plusieurs animaux ensemble ?
Oui, si leurs besoins et leur cohabitation peuvent être assurés par la personne choisie. Décrivez chaque animal, les repas, les espaces et les interactions. Vérifiez les gestes ou soins particuliers plutôt que de supposer qu’une expérience générale suffit.

### Peut-on faire garder d’autres animaux que des chiens et des chats ?
Présentez précisément l’espèce, l’installation et les soins nécessaires, puis vérifiez l’expérience de la personne. Pour des soins particuliers, préparez la prise en charge avec le vétérinaire compétent. La présence dans le logement ne certifie pas cette capacité.

### La garde à domicile sur Guardiens est-elle gratuite ?
La plateforme est actuellement 100 % gratuite pour les propriétaires et les gardiens. Le gardien est hébergé sans rémunération. Les fournitures, soins et dépenses convenues restent distincts ; les conditions en vigueur figurent sur la page des tarifs.

### Faut-il rencontrer le gardien avant de confirmer ?
Une rencontre est possible si vous le souhaitez tous les deux, sans être obligatoire sur Guardiens. Vous pouvez aussi échanger à distance. Vérifiez les tâches, les horaires, les accès et les besoins des animaux avant de confirmer.

### Combien de temps à l’avance chercher une garde ?
Dès que vos dates et vos besoins sont connus, notamment si le séjour est long ou comporte des contraintes particulières. Aucun délai ne garantit une candidature. Gardez une autre solution possible tant que la prise en charge n’est pas confirmée.
:::$suite_content_1_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='ff6660e2-ac7c-4b6e-b8fe-939a41662a4e'::uuid AND slug='garde-animaux-domicile-chien-chat';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/garde-animaux-domicile-chien-chat' THEN
    RAISE EXCEPTION 'Guide suite 1 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Garde d’animaux à domicile : visites, séjour et préparation'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Vos animaux restent chez vous : comparez les visites et le séjour d’un gardien, puis définissez les horaires, les soins de chacun et le relais en cas d’imprévu.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Garde d''animaux à domicile : chien et chat gardés chez vous'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Visites ou gardien hébergé : organisez la garde de vos animaux à domicile selon leurs besoins, les horaires, les soins et les dépenses à prévoir.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Un chien tricolore est couché sur un canapé.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"guide du house-sitting","url":"/actualites/c-est-quoi-le-house-sitting"},{"text":"comparatif des alternatives à la pension","url":"/actualites/pension-chien-alternatives-guide"},{"text":"guide de garde de chien","url":"/actualites/garde-chien-faire-garder-son-chien"},{"text":"guide de garde de chat à domicile","url":"/actualites/garde-chat-domicile-house-sitting"},{"text":"guide du bien-être pendant une absence","url":"/actualites/bien-etre-animal-pendant-absence"},{"text":"page des tarifs","url":"/tarifs"},{"text":"rédiger une annonce","url":"/actualites/rediger-bonne-annonce-house-sitting"},{"text":"accord de garde","url":"/actualites/commodat-garde-guardiens"},{"text":"critères de sélection d’un gardien","url":"/actualites/choisir-gardien-bons-criteres"},{"text":"préparation de la maison","url":"/actualites/preparer-maison-avant-garde"},{"text":"pages de house-sitting par ville","url":"/house-sitting"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 15:40:12.583832+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 1 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot04_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 1 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot04_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot04_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Garde d’animaux à domicile : visites, séjour et préparation',
    excerpt='Vos animaux restent chez vous : comparez les visites et le séjour d’un gardien, puis définissez les horaires, les soins de chacun et le relais en cas d’imprévu.',
    meta_title='Garde d''animaux à domicile : chien et chat gardés chez vous',
    meta_description='Visites ou gardien hébergé : organisez la garde de vos animaux à domicile selon leurs besoins, les horaires, les soins et les dépenses à prévoir.',
    hero_image_alt='Un chien tricolore est couché sur un canapé.',
    internal_links='[{"text":"guide du house-sitting","url":"/actualites/c-est-quoi-le-house-sitting"},{"text":"comparatif des alternatives à la pension","url":"/actualites/pension-chien-alternatives-guide"},{"text":"guide de garde de chien","url":"/actualites/garde-chien-faire-garder-son-chien"},{"text":"guide de garde de chat à domicile","url":"/actualites/garde-chat-domicile-house-sitting"},{"text":"guide du bien-être pendant une absence","url":"/actualites/bien-etre-animal-pendant-absence"},{"text":"page des tarifs","url":"/tarifs"},{"text":"rédiger une annonce","url":"/actualites/rediger-bonne-annonce-house-sitting"},{"text":"accord de garde","url":"/actualites/commodat-garde-guardiens"},{"text":"critères de sélection d’un gardien","url":"/actualites/choisir-gardien-bons-criteres"},{"text":"préparation de la maison","url":"/actualites/preparer-maison-avant-garde"},{"text":"pages de house-sitting par ville","url":"/house-sitting"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='garde-animaux-domicile-chien-chat' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 1 : % ligne au lieu de 1',affected; END IF;
END;
$guide_1$;

COMMIT;
