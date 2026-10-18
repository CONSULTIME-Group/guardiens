-- Refonte des guides utile-siamois, autorisée le 17/10/2026.
-- Les URL, auteurs, dates de publication et indexabilité sont conservés.
BEGIN;
CREATE TABLE IF NOT EXISTS public._backup_articles_suite_lot38_20261017 AS SELECT * FROM public.articles WHERE false;
REVOKE ALL ON public._backup_articles_suite_lot38_20261017 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public._backup_articles_suite_lot38_20261017 TO service_role;
ALTER TABLE public._backup_articles_suite_lot38_20261017 ENABLE ROW LEVEL SECURITY;
SELECT id FROM public.articles WHERE id IN ('70052de6-d633-448f-b4e1-67848ec3694f'::uuid,'5473153c-efce-443e-a189-522e990f4e06'::uuid) ORDER BY id FOR UPDATE;

DO $guide_0$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_0_20261017$# Se sentir utile près de chez soi : choisir un coup de main à sa mesure

**Pour aider près de chez vous, commencez par une tâche que vous savez et souhaitez faire, avec une disponibilité que vous pouvez tenir.** Vous pouvez expliquer un outil, participer à des plantations ou récupérer une commande sans vous engager à répondre à tous les besoins du quartier.

Guardiens permet de présenter ses savoir-faire et de découvrir des demandes d’entraide entre particuliers. La plateforme est **actuellement 100 % gratuite** et le coup de main se fait sans rémunération. Une mise en relation peut ouvrir un échange, sans garantir des contacts, des avis ou une amitié.

**Repères :** [choisir une aide](#choix), [présenter ses savoir-faire](#profil), [poser ses limites](#limites), [trouver un cadre associatif](#association), [envisager une garde](#maison), [questions fréquentes](#faq).

## <a id="choix"></a>Quel coup de main choisir selon votre situation ?

Partez de vos capacités et de vos envies actuelles, pas d’une catégorie d’âge ou d’un rôle attendu. Être à la retraite ne signifie pas être disponible tous les jours ; étudier ne signifie pas pouvoir porter des meubles ou assurer toutes les promenades d’un chien.

| Votre situation | Une façon de commencer |
| --- | --- |
| Peu de temps disponible | Une tâche courte et délimitée, à un moment convenu. |
| Un savoir-faire à transmettre | Expliquer un geste ou un outil que vous maîtrisez, sans faire à la place de l’autre. |
| Un nouveau quartier | Découvrir les besoins ou une activité collective, puis choisir ce qui vous convient. |
| Des capacités physiques à préserver | Privilégier une aide compatible avec vos limites, sans charge ou déplacement imposé. |
| Une envie de participer régulièrement | Chercher aussi un cadre associatif et son organisation propre. |

Les [trente idées de coups de main](/actualites/idees-coups-de-main-entraide-pres-de-chez-soi) proposent des exemples. Vérifiez que la tâche est admissible et que vous pouvez l’assurer. Vous restez libre de refuser ce qui demande une compétence, un matériel ou une disponibilité que vous n’avez pas.

## <a id="profil"></a>Comment proposer votre aide sur Guardiens ?

Présentez vos compétences dans les **savoir-faire de votre profil**, avec ce que vous pratiquez et vos limites. Les nouvelles petites missions servent à publier un besoin ; vous n’avez pas à y créer une offre d’aide ou à proposer une contrepartie personnalisée.

**Exemple à adapter :** « Je peux aider à prendre en main les fonctions simples d’un téléphone. Je montre les étapes avec la personne présente, sans garder ses mots de passe ni intervenir sur ses comptes. Disponibilités à convenir avant chaque échange. »

Vous pouvez aussi consulter les [demandes d’entraide](/petites-missions) et répondre à celles qui vous conviennent. Une réponse ne remplace pas l’échange sur la tâche, le lieu, le créneau, le matériel et les conditions. Le [guide des petites missions](/actualites/petites-missions-entraide-guardiens) explique les accès et la confirmation.

Un profil décrivant une compétence n’est pas une certification. Le contrôle d’un document d’identité, lorsqu’il est affiché, ne garantit ni la fiabilité ni l’aptitude à une tâche. Les avis, lorsqu’ils existent, éclairent des échanges passés ; ils ne sont pas un résultat promis pour chaque aide proposée.

## <a id="limites"></a>Comment aider sans devenir disponible pour tout ?

Confirmez ce que vous acceptez et ce qui reste à organiser. Vous pouvez proposer un créneau sans promettre une intervention régulière, ou accepter une partie d’une tâche. Si votre disponibilité change après un engagement, prévenez rapidement pour que la personne prépare un relais.

Pour un besoin au domicile, convenez des espaces accessibles et de la présence des personnes concernées. Une rencontre préalable est possible **si vous le souhaitez tous les deux**. Gardez les informations privées hors des annonces et n’acceptez pas de gérer des moyens de paiement, codes bancaires ou procurations pour une personne vulnérable.

Les [CGU](/cgu) fixent les limites : notamment soins et aide corporelle, garde d’enfants non accompagnés, travaux en hauteur, élagage, construction ou interventions électriques exclus. L’aide aux devoirs demande la présence du représentant légal ou d’un adulte du foyer pendant toute la séance, à l’initiative du représentant. Les activités professionnelles ou réglementées ne deviennent pas admissibles parce que vous les proposez gratuitement.

L’entraide se fait sans rémunération. Une dépense avancée pour l’autre et convenue peut être remboursée au montant exact sur justificatif ; elle reste distincte du travail. Demandez à votre assureur ce qui est couvert pour l’aide envisagée : Guardiens ne fournit pas une assurance générale de l’échange.

## <a id="association"></a>Quand préférer un engagement associatif ?

Si vous cherchez une activité de groupe, un accompagnement organisé ou un engagement dans la durée, une association peut offrir un cadre adapté. [JeVeuxAider.gouv.fr, plateforme publique du bénévolat](https://www.jeveuxaider.gouv.fr/missions-benevolat), permet de rechercher des missions ; l’organisme précise ensuite ses conditions, son calendrier et l’accompagnement proposé.

Cette démarche est distincte d’un coup de main entre particuliers sur Guardiens. Ne supposez pas que les règles d’une plateforme valent pour l’autre, ou qu’une mission associative sera disponible sans échange préalable.

Aider peut être une occasion de rencontrer du monde, mais il n’existe pas un rythme de coups de main qui garantirait de ne plus s’ennuyer ou de se faire des amis. Choisissez un cadre qui vous convient et conservez la possibilité de demander de l’aide vous aussi. Le [guide du réseau de proximité](/actualites/reseau-entraide-quartier-lyon-aura) propose d’autres points de départ.

## <a id="maison"></a>Et si vous voulez ensuite garder une maison ?

Une première aide ne valide pas automatiquement toutes les compétences d’un gardien. Pour garder une maison, il faut un nouvel échange sur les dates, la présence, les animaux éventuels et les tâches. Les [conseils pour créer un profil de gardien](/actualites/creer-profil-gardien-attractif) vous aident à présenter votre expérience honnêtement.

Sur Guardiens, le gardien est hébergé pendant la garde sans rémunération ; il peut y avoir une maison avec ou sans animaux. La plateforme est actuellement gratuite pour les deux rôles, selon les [conditions tarifaires](/tarifs), et les frais restent distincts. Vous n’avez pas besoin de prévoir une garde pour participer à l’entraide ponctuelle.

## <a id="faq"></a>Questions fréquentes

:::faq
### Comment commencer à aider près de chez soi ?
Choisissez une tâche limitée, compatible avec vos capacités et vos disponibilités. Présentez vos savoir-faire ou découvrez les besoins, puis confirmez les conditions avec la personne intéressée avant de vous engager.

### Faut-il créer une offre dans les petites missions ?
Non. Les nouvelles petites missions servent à présenter un besoin. Pour proposer votre aide, renseignez les savoir-faire de votre profil et vos limites.

### Peut-on aider ponctuellement sans être disponible chaque semaine ?
Oui. Convenez du créneau et de la tâche à chaque échange, sans promettre un suivi que vous ne pouvez pas tenir. Prévenez rapidement si un engagement déjà convenu doit changer.

### Où trouver du bénévolat dans une association ?
La plateforme publique JeVeuxAider.gouv.fr permet de rechercher des missions. Contactez l’organisme pour connaître les conditions et l’accompagnement ; ce cadre est distinct de l’entraide entre particuliers sur Guardiens.

### Un coup de main apporte-t-il forcément un avis ou de nouveaux amis ?
Non. Il peut permettre un échange, mais les retours et les relations dépendent des personnes et de la situation. Aucun résultat social ou avis positif n’est promis.

### Faut-il payer pour proposer son aide ?
Guardiens est actuellement gratuit et le coup de main se fait sans rémunération. Les dépenses restent distinctes ; une avance convenue pour l’autre peut être remboursée au montant exact sur justificatif.
:::$suite_content_0_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='70052de6-d633-448f-b4e1-67848ec3694f'::uuid AND slug='se-sentir-utile-pres-de-chez-soi';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'Guide suite 0 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Se sentir utile près de chez soi : choisir un coup de main à sa mesure'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Aider ne demande pas une disponibilité permanente. Choisissez un geste que vous savez et souhaitez faire, puis convenez des conditions avec la personne concernée.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Se sentir utile près de chez soi : comment commencer ?'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Envie d’aider près de chez vous ? Choisissez une tâche, un rythme et des limites adaptés : entraide entre particuliers, savoir-faire ou engagement associatif.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Deux personnes jardinent dans un potager près d’un bâtiment en briques.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"trente idées de coups de main","url":"/actualites/idees-coups-de-main-entraide-pres-de-chez-soi"},{"text":"demandes d’entraide","url":"/petites-missions"},{"text":"guide des petites missions","url":"/actualites/petites-missions-entraide-guardiens"},{"text":"CGU","url":"/cgu"},{"text":"guide du réseau de proximité","url":"/actualites/reseau-entraide-quartier-lyon-aura"},{"text":"conseils pour créer un profil de gardien","url":"/actualites/creer-profil-gardien-attractif"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 14:40:17.143332+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 0 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot38_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 0 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot38_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot38_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Se sentir utile près de chez soi : choisir un coup de main à sa mesure',
    excerpt='Aider ne demande pas une disponibilité permanente. Choisissez un geste que vous savez et souhaitez faire, puis convenez des conditions avec la personne concernée.',
    meta_title='Se sentir utile près de chez soi : comment commencer ?',
    meta_description='Envie d’aider près de chez vous ? Choisissez une tâche, un rythme et des limites adaptés : entraide entre particuliers, savoir-faire ou engagement associatif.',
    hero_image_alt='Deux personnes jardinent dans un potager près d’un bâtiment en briques.',
    internal_links='[{"text":"trente idées de coups de main","url":"/actualites/idees-coups-de-main-entraide-pres-de-chez-soi"},{"text":"demandes d’entraide","url":"/petites-missions"},{"text":"guide des petites missions","url":"/actualites/petites-missions-entraide-guardiens"},{"text":"CGU","url":"/cgu"},{"text":"guide du réseau de proximité","url":"/actualites/reseau-entraide-quartier-lyon-aura"},{"text":"conseils pour créer un profil de gardien","url":"/actualites/creer-profil-gardien-attractif"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='se-sentir-utile-pres-de-chez-soi' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 0 : % ligne au lieu de 1',affected; END IF;
END;
$guide_0$;

DO $guide_1$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_1_20261017$# Faire garder son Siamois : présence, miaulements et repères

**Pour faire garder un Siamois, expliquez ses habitudes d’interaction, ses vocalises et la présence réellement nécessaire pour lui.** La réputation de chat bavard ne permet pas d’ignorer un miaulement inhabituel, et sa race ne fixe pas un nombre d’heures de compagnie valable pour tous.

Préparez les repas, les ressources, le jeu et les accès avec la personne qui le gardera. Le house-sitting conserve les repères du logement selon l’organisation convenue ; il ne garantit pas l’absence de stress ni une présence permanente.

**Repères :** [décrire les vocalises](#vocalises), [convenir de la présence](#presence), [préparer le quotidien](#routine), [transmettre le suivi](#sante), [choisir la personne](#gardien), [questions fréquentes](#faq).

## <a id="vocalises"></a>Quels miaulements faut-il expliquer au gardien ?

Décrivez les situations habituelles : avant un repas, devant une porte, pendant un jeu ou pour obtenir votre attention. Indiquez aussi ce que vous observez dans le reste du comportement. Un enregistrement déjà disponible peut aider à comprendre un son, sans provoquer une situation difficile pour le produire.

Les [explications de Cats Protection sur les vocalises](https://www.cats.org.uk/cats-blog/how-to-speak-cat-why-do-cats-meow) soulignent l’importance du contexte et des changements. Un nouveau son, une fréquence inhabituelle ou des signes associés doivent conduire à demander un avis vétérinaire, plutôt qu’à conclure que le chat « fait simplement son Siamois ».

Le gardien peut noter le moment, la situation, l’appétit, l’usage de la litière et les autres observations utiles. Cela aide à transmettre des faits ; ce n’est pas un moyen de diagnostiquer seul une douleur, un stress ou un besoin alimentaire. Ne changez pas systématiquement la ration pour faire cesser les miaulements.

## <a id="presence"></a>Comment définir la présence et les absences ?

Partez de la vie réelle du chat : quand cherche-t-il le contact, que fait-il pendant les absences déjà vécues et quels changements ont posé difficulté ? Convenez de la disponibilité du gardien et d’un relais si la présence nécessaire ne peut pas être assurée.

Ne déduisez pas de vocalises une anxiété de séparation. [Cats Protection distingue les changements liés à la routine des différentes causes de comportement pendant l’absence](https://www.cats.org.uk/cats-blog/can-cats-get-separation-anxiety). Si une difficulté existe, préparez-la avec le vétérinaire et, selon son avis, un professionnel du comportement ; une garde ne remplace pas cet accompagnement.

Une présence dans le logement peut permettre des interactions, sans imposer au chat un contact continu. Laissez la possibilité de se retirer, respectez les manipulations acceptées et transmettez les moments de repos. Parler au chat peut faire partie des habitudes du foyer ; cela ne constitue pas un traitement ou une garantie d’apaisement.

## <a id="routine"></a>Que préparer pour les repas, le jeu et le logement ?

| Point à transmettre | Informations utiles |
| --- | --- |
| Repas | Aliment habituel, quantité, horaires et récompenses autorisées. |
| Eau et litière | Emplacements, entretien et consommables disponibles. |
| Interactions | Jeux connus, matériel et contacts que le chat accepte. |
| Repos | Couchages, cachettes et espaces tranquilles. |
| Accès | Fenêtres, balcon, portes et conditions convenues de sortie. |

Montrez les jeux déjà utilisés et la façon dont le chat interagit. Adaptez les séances à ses réactions, sans durée obligatoire pour toute la race. Rangez les accessoires qui ne doivent pas rester accessibles sans surveillance et évitez de multiplier les nouveautés pendant la garde.

Vérifiez les protections des fenêtres et du balcon ; une fenêtre entrouverte n’est pas automatiquement un accès sûr. Les [conseils de préparation de la maison](/actualites/preparer-maison-avant-garde) aident à organiser les accès, le matériel et les consignes. Pour plusieurs animaux, décrivez aussi leurs relations et la répartition des ressources.

## <a id="sante"></a>Quelles consignes de santé transmettre ?

Indiquez les problèmes connus, l’ordonnance éventuelle et les gestes que la personne accepte réellement d’assurer. Laissez les instructions du vétérinaire en cas d’oubli ou de difficulté, sans modification de dose ou produit choisi de sa propre initiative.

Une modification d’appétit, de boisson, de litière ou de comportement demande un avis adapté au contexte. Ne fixez pas une attente systématique avant de contacter le vétérinaire. Une respiration difficile ou bouche ouverte, un malaise ou des efforts pour uriner avec peu ou pas d’urine justifient un appel immédiat ; une urgence n’attend pas de joindre d’abord le propriétaire.

Laissez les coordonnées du vétérinaire habituel, une solution d’urgence accessible, la caisse de transport et un relais. Le [guide de garde du chat à domicile](/actualites/garde-chat-domicile-house-sitting) complète ces préparatifs.

## <a id="gardien"></a>Comment choisir le gardien de votre Siamois ?

Décrivez les dates, la présence, les routines et les tâches liées à la maison. Demandez l’expérience de la personne avec les chats et ce qu’elle peut assurer. Un contrôle de document d’identité, lorsqu’un profil l’affiche, ne certifie ni la compétence ni la fiabilité ; les avis, lorsqu’ils existent, complètent l’échange.

Une rencontre préalable est possible **si vous le souhaitez tous les deux**. Montrez les consignes dans les conditions que le chat tolère et confirmez ce qui est accepté. Après confirmation, un accord de garde peut être préparé ; sa signature est facultative. Vérifiez les assurances avec votre assureur et prévoyez un relais, sans remplacement garanti.

Sur Guardiens, le gardien est hébergé pendant la garde sans rémunération. La plateforme est **actuellement 100 % gratuite** pour les deux rôles, selon les [conditions tarifaires](/tarifs). Nourriture, consommables, déplacements et frais éventuels restent distincts. Une annonce précise permet de discuter des conditions, sans garantir une candidature ou une adaptation parfaite du chat.

## <a id="faq"></a>Questions fréquentes

:::faq
### Combien de présence faut-il prévoir pour un Siamois ?
Définissez-la à partir des habitudes, des soins et des absences déjà vécues par le chat concerné. Il n’existe pas un nombre d’heures universel par race ; le gardien doit confirmer ce qu’il peut assurer.

### Faut-il ignorer ses miaulements parce que la race est bavarde ?
Non. Expliquez les vocalises habituelles et leur contexte. Un son, une fréquence ou un comportement inhabituel mérite un avis vétérinaire, sans conclure automatiquement à une réaction normale au départ.

### Des miaulements pendant l’absence prouvent-ils une anxiété de séparation ?
Non. Plusieurs causes sont possibles, dont un changement de routine ou un problème de santé. Décrivez les observations au vétérinaire plutôt que de poser un diagnostic par race.

### Le gardien doit-il le solliciter en permanence ?
Prévoyez les interactions et jeux adaptés à ses habitudes, avec la possibilité de se retirer et de se reposer. La présence ne doit pas devenir une manipulation ou un contact imposé.

### La garde à domicile est-elle toujours la meilleure solution ?
Elle conserve des repères du logement, mais le choix dépend de la présence, des soins et de l’organisation réellement possibles. Aucune solution ne garantit une adaptation parfaite pour tous les Siamois.

### La garde est-elle rémunérée sur Guardiens ?
Non. Le gardien est hébergé sans rémunération et la plateforme est actuellement gratuite pour les deux rôles. Nourriture, déplacements, consommables et dépenses éventuelles restent distincts.
:::$suite_content_1_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='5473153c-efce-443e-a189-522e990f4e06'::uuid AND slug='siamois-guide-race';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/siamois-guide-race' THEN
    RAISE EXCEPTION 'Guide suite 1 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Faire garder son Siamois : présence, miaulements et repères'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Décrivez les vocalises habituelles de votre Siamois, les moments d’interaction et ses routines. Un changement pendant la garde ne doit pas être écarté comme normal par race.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Garde du Siamois : présence, miaulements et habitudes'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Préparez la garde de votre Siamois : présence convenue, vocalises habituelles, jeux, repas et accès. Repérez les changements à signaler.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Un Siamois est couché sur une couverture posée sur un canapé clair.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"conseils de préparation de la maison","url":"/actualites/preparer-maison-avant-garde"},{"text":"guide de garde du chat à domicile","url":"/actualites/garde-chat-domicile-house-sitting"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 16:10:12.547578+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 1 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot38_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 1 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot38_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot38_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Faire garder son Siamois : présence, miaulements et repères',
    excerpt='Décrivez les vocalises habituelles de votre Siamois, les moments d’interaction et ses routines. Un changement pendant la garde ne doit pas être écarté comme normal par race.',
    meta_title='Garde du Siamois : présence, miaulements et habitudes',
    meta_description='Préparez la garde de votre Siamois : présence convenue, vocalises habituelles, jeux, repas et accès. Repérez les changements à signaler.',
    hero_image_alt='Un Siamois est couché sur une couverture posée sur un canapé clair.',
    internal_links='[{"text":"conseils de préparation de la maison","url":"/actualites/preparer-maison-avant-garde"},{"text":"guide de garde du chat à domicile","url":"/actualites/garde-chat-domicile-house-sitting"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='siamois-guide-race' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 1 : % ligne au lieu de 1',affected; END IF;
END;
$guide_1$;

COMMIT;
