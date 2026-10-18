-- Refonte des guides premiers pas et fonctionnement de Guardiens, autorisée le 17/10/2026.
-- Les URL, auteurs, dates de publication et indexabilité sont conservés.
BEGIN;
CREATE TABLE IF NOT EXISTS public._backup_articles_suite_lot23_20261017 AS SELECT * FROM public.articles WHERE false;
REVOKE ALL ON public._backup_articles_suite_lot23_20261017 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public._backup_articles_suite_lot23_20261017 TO service_role;
ALTER TABLE public._backup_articles_suite_lot23_20261017 ENABLE ROW LEVEL SECURITY;
SELECT id FROM public.articles WHERE id IN ('4b0e630d-5f5b-45a4-9291-9ec1ffb482c3'::uuid,'45f7dd7b-f720-4924-b51d-4ca670e38664'::uuid) ORDER BY id FOR UPDATE;

DO $guide_0$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_0_20261017$# Comment fonctionne Guardiens et le house-sitting entre particuliers ?

**Guardiens permet à un propriétaire absent et à un gardien d’organiser un séjour dans le logement pour veiller sur la maison et les éventuels animaux.** Le gardien est hébergé sans rémunération. Les deux personnes définissent les tâches, les dates et les conditions, puis choisissent si elles souhaitent confirmer la garde.

Avec Elisa, qui est argentine, nous avons pratiqué le house-sitting pendant cinq ans avant de créer Guardiens. Nous voulions développer cette entraide et faciliter la création d’un réseau de confiance. La plateforme apporte des outils pour se présenter, échanger et préparer le séjour ; la décision de confier sa maison ou d’accepter une garde reste celle des membres.

**Repères :** [comprendre l’échange](#echange), [suivre les étapes](#etapes), [évaluer la compatibilité](#confiance), [comprendre la gratuité](#tarifs), [choisir le bon usage](#usages), [préparer les imprévus](#imprevus), [questions fréquentes](#faq).

## <a id="echange"></a>Qu’échangent le propriétaire et le gardien ?

Le propriétaire met son logement à disposition pendant l’absence. Le gardien y séjourne et assure les tâches convenues : présence dans les lieux, routines d’un animal s’il y en a, arrosage de plantes ou courrier, par exemple. Il ne s’agit pas d’une promesse de présence permanente ni de tout l’entretien technique d’une maison.

Cette organisation convient lorsque les besoins du logement et les possibilités du gardien sont compatibles. Un hébergement peut permettre de découvrir un lieu, mais les responsabilités du séjour passent dans l’organisation quotidienne. Une garde peut aussi concerner une maison **sans animaux**.

Le house-sitting sur Guardiens est distinct d’une prestation professionnelle rémunérée. Si vous cherchez des visites payantes, une pension ou des soins particuliers, comparez les conditions de ces solutions. Le [guide des alternatives à la pension](/actualites/pension-chien-alternatives-guide) aide à choisir selon le besoin, sans déclarer une formule meilleure pour tous les animaux.

## <a id="etapes"></a>Quelles sont les étapes d’une garde ?

| Étape | Ce que les personnes préparent |
| --- | --- |
| Présenter le besoin | Le propriétaire décrit les dates, le logement, les tâches et les éventuels animaux. |
| Proposer sa participation | Le gardien lit l’annonce et explique sa disponibilité ainsi que son expérience adaptée. |
| Échanger | Les deux personnes clarifient les responsabilités, la présence, les dépenses et les conditions du séjour. Une rencontre est possible si les deux le souhaitent. |
| Confirmer | Chacun confirme sa participation selon le parcours proposé. L’accord de garde est ensuite proposé à signature facultative. |
| Préparer et vivre le séjour | Clés, consignes, contacts et rythme des nouvelles sont convenus ; le guide de la maison aide lorsqu’il est disponible. |
| Terminer la garde | Restitution des clés, bilan pratique et retour d’expérience honnête. |

Une annonce ne garantit pas des candidatures, et une candidature ne vaut pas accord. Prenez le temps nécessaire à l’échange avant de réserver un trajet ou de compter sur une solution. Le [guide des premiers pas](/actualites/premiers-pas-sur-guardiens) détaille les premières actions dans votre espace.

## <a id="confiance"></a>Comment se construit la confiance ?

Un profil donne du contexte : expérience, possibilités, limites et avis lorsqu’ils existent. Les échanges permettent de vérifier la compatibilité avec **cette garde**. Posez des questions concrètes sur les animaux, les horaires, les accès et les tâches, plutôt que de déduire une aptitude d’une photo ou d’une note.

Le contrôle d’un document d’identité peut donner lieu à un écusson. Il ne certifie ni la compétence, ni la fiabilité, ni l’assurance d’une personne. Les formations affichées dans le profil sont déclaratives. Le [guide de sécurité et de confiance](/actualites/securite-confiance-house-sitting) précise les informations utiles à examiner.

La rencontre reste facultative, en personne comme en visio. Elle peut aider à présenter le logement ou l’animal si vous la souhaitez tous les deux. Elle ne garantit pas davantage qu’un échange écrit que toutes les situations seront simples pendant le séjour.

Les assurances doivent être vérifiées pour les responsabilités convenues. Ne supposez pas qu’un contrat habitation ou une responsabilité civile couvre automatiquement tout dommage dans une maison confiée. Le [guide du cadre juridique en France](/actualites/house-sitting-cadre-juridique-france) apporte des repères à compléter selon la situation.

## <a id="tarifs"></a>Pourquoi Guardiens est-il gratuit actuellement ?

**La plateforme est actuellement 100 % gratuite pour les propriétaires et les gardiens.** Notre priorité est de construire le réseau et d’améliorer le service grâce aux retours des personnes qui l’utilisent. Si vous essayez Guardiens, un avis sur ce qui vous aide ou vous manque nous est utile.

À mesure que le réseau grandit, son infrastructure et son fonctionnement ont aussi un coût. Une participation pourra évoluer **au plus tôt au second semestre 2027**, avec **au moins trente jours de préavis**. Aucun montant futur n’est annoncé ici. La [page tarifs](/tarifs) présente les conditions actuelles et les informations sur leur évolution.

La gratuité de la plateforme ne supprime pas le coût du transport, de l’alimentation, des assurances ou des dépenses convenues. Distinguez ce que chacun prend en charge avant la confirmation. Le gardien reste hébergé sans rémunération dans le cadre de la garde Guardiens.

## <a id="usages"></a>Garde de maison ou entraide ponctuelle : où publier ?

**Pour un séjour avec hébergement**, décrivez la garde de maison, les dates et les tâches dans une annonce de garde. Le gardien reste sur place selon les conditions convenues ; les animaux sont éventuels.

**Pour un coup de main ponctuel sans nuitée**, utilisez l’entraide : arrosage de plantes, aide dans le jardin ou autre besoin compatible avec ce cadre. Les personnes conviennent de l’échange de temps ou de service, sans paiement. Le [guide des petites missions d’entraide](/actualites/petites-missions-entraide-guardiens) explique ce fonctionnement.

Un passage ponctuel ne suffit pas automatiquement aux besoins d’un animal pendant toute une absence. Décrivez l’ensemble de l’organisation nécessaire, puis choisissez la solution compatible. Il ne faut pas réduire une garde complète à quelques passages simplement pour la faire entrer dans une rubrique.

## <a id="imprevus"></a>Que se passe-t-il si l’organisation change ?

Préparez un relais local qui a accepté son rôle et les contacts utiles avant le départ. Si une personne ne peut plus assurer ce qui a été convenu, elle prévient l’autre au plus tôt et coordonne une solution effective. Un message envoyé ne garantit pas qu’un remplaçant est trouvé.

Le réseau de [gardiens d’urgence](/actualites/devenir-gardien-urgence-guardiens) est un **projet à venir**, pas une garantie actuelle d’intervention ou de remplacement. Le [guide des imprévus pendant une garde](/actualites/gerer-imprevu-pendant-garde) aide à préparer le relais et la communication.

Si l’état d’un animal inquiète, demandez un avis vétérinaire et informez le propriétaire, sans attendre sa réponse pour solliciter cet avis. Convenez avant le séjour des coordonnées, des informations à transmettre et de l’organisation des frais.

## <a id="faq"></a>Questions fréquentes

:::faq
### À quoi sert Guardiens ?
À mettre en relation un propriétaire absent et un gardien qui séjourne dans le logement sans rémunération pour assurer les tâches convenues. La plateforme propose des outils de présentation, de candidature, de messagerie et de préparation ; les membres choisissent leur échange.

### Peut-on faire garder une maison sans animaux ?
Oui. Les animaux sont éventuels ; le besoin peut concerner le logement et des tâches courantes définies avec le gardien. Décrivez précisément ce que vous attendez.

### Guardiens est-il gratuit pour les propriétaires et les gardiens ?
Oui, la plateforme est actuellement 100 % gratuite pour les deux rôles. Une évolution ne pourra intervenir au plus tôt qu’au second semestre 2027, avec au moins trente jours de préavis. Les dépenses du séjour restent distinctes ; consultez la page tarifs.

### Faut-il rencontrer le gardien avant de confirmer ?
La rencontre est facultative, si les deux personnes la souhaitent. Dans tous les cas, clarifiez les dates, les tâches, les conditions d’accueil et les dépenses avant de confirmer.

### Un document d’identité contrôlé garantit-il une bonne garde ?
Non. Ce contrôle ne certifie pas les compétences, la fiabilité ou la compatibilité avec un séjour précis. Le profil, les avis éventuels, les échanges et les vérifications pratiques restent utiles.

### Un gardien d’urgence peut-il remplacer quelqu’un aujourd’hui ?
Le réseau d’urgence est un projet à venir. Ne comptez pas sur ce dispositif comme solution actuelle garantie ; préparez un relais local accepté et une autre organisation adaptée au besoin.
:::$suite_content_0_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='4b0e630d-5f5b-45a4-9291-9ec1ffb482c3'::uuid AND slug='comment-fonctionne-guardiens-et-le-house-sitting-entre-particuliers';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/comment-fonctionne-guardiens-et-le-house-sitting-entre-particuliers' THEN
    RAISE EXCEPTION 'Guide suite 0 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Comment fonctionne Guardiens et le house-sitting entre particuliers ?'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Un propriétaire confie son logement pendant son absence ; un gardien y séjourne et assure les tâches convenues. Comprenez le rôle de chacun avant de vous lancer.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Comment fonctionne Guardiens ? Le house-sitting expliqué'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Guardiens met en relation propriétaires et gardiens pour un séjour sans rémunération. Découvrez les étapes, les responsabilités et la gratuité actuelle.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Un chat est couché sur un fauteuil, près d’une table avec un ordinateur portable devant une fenêtre.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"guide des alternatives à la pension","url":"/actualites/pension-chien-alternatives-guide"},{"text":"guide des premiers pas","url":"/actualites/premiers-pas-sur-guardiens"},{"text":"guide de sécurité et de confiance","url":"/actualites/securite-confiance-house-sitting"},{"text":"guide du cadre juridique en France","url":"/actualites/house-sitting-cadre-juridique-france"},{"text":"page tarifs","url":"/tarifs"},{"text":"guide des petites missions d’entraide","url":"/actualites/petites-missions-entraide-guardiens"},{"text":"gardiens d’urgence","url":"/actualites/devenir-gardien-urgence-guardiens"},{"text":"guide des imprévus pendant une garde","url":"/actualites/gerer-imprevu-pendant-garde"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-14 13:59:17.121368+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 0 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot23_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 0 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot23_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot23_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Comment fonctionne Guardiens et le house-sitting entre particuliers ?',
    excerpt='Un propriétaire confie son logement pendant son absence ; un gardien y séjourne et assure les tâches convenues. Comprenez le rôle de chacun avant de vous lancer.',
    meta_title='Comment fonctionne Guardiens ? Le house-sitting expliqué',
    meta_description='Guardiens met en relation propriétaires et gardiens pour un séjour sans rémunération. Découvrez les étapes, les responsabilités et la gratuité actuelle.',
    hero_image_alt='Un chat est couché sur un fauteuil, près d’une table avec un ordinateur portable devant une fenêtre.',
    internal_links='[{"text":"guide des alternatives à la pension","url":"/actualites/pension-chien-alternatives-guide"},{"text":"guide des premiers pas","url":"/actualites/premiers-pas-sur-guardiens"},{"text":"guide de sécurité et de confiance","url":"/actualites/securite-confiance-house-sitting"},{"text":"guide du cadre juridique en France","url":"/actualites/house-sitting-cadre-juridique-france"},{"text":"page tarifs","url":"/tarifs"},{"text":"guide des petites missions d’entraide","url":"/actualites/petites-missions-entraide-guardiens"},{"text":"gardiens d’urgence","url":"/actualites/devenir-gardien-urgence-guardiens"},{"text":"guide des imprévus pendant une garde","url":"/actualites/gerer-imprevu-pendant-garde"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='comment-fonctionne-guardiens-et-le-house-sitting-entre-particuliers' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 0 : % ligne au lieu de 1',affected; END IF;
END;
$guide_0$;

DO $guide_1$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_1_20261017$# Premiers pas sur Guardiens : créer son compte et préparer une garde

**Pour commencer sur Guardiens, choisissez ce que vous souhaitez faire : confier votre maison, proposer d’y séjourner comme gardien, ou les deux.** Préparez ensuite les informations utiles à ce besoin. Vous pourrez échanger avec d’autres membres avant de décider ensemble d’une garde.

La plateforme est **actuellement 100 % gratuite pour les propriétaires et les gardiens**. Une garde repose sur un hébergement sans rémunération, pour veiller sur le logement et les éventuels animaux selon les tâches convenues. Trajet et dépenses restent distincts ; les [conditions tarifaires](/tarifs) précisent le fonctionnement.

**Les étapes :** [choisir son rôle](#compte), [préparer les informations](#profil), [comprendre l’identité contrôlée](#identite), [faire sa première démarche](#premiere-demarche), [confirmer et préparer l’arrivée](#preparation), [questions fréquentes](#faq).

## <a id="compte"></a>1. Choisir votre rôle et créer votre compte

Le propriétaire souhaite faire garder son logement pendant une absence. Le gardien propose d’y séjourner et d’assurer les tâches convenues. Vous pouvez aussi utiliser les deux rôles depuis le même compte si vos besoins évoluent.

Suivez les étapes et les champs demandés à l’inscription. L’accès est réservé aux personnes majeures de 18 ans révolus et juridiquement capables, selon les [conditions d’utilisation](/cgu). Il n’y a pas de durée universelle de création de compte ou de préparation d’un profil : prenez le temps de donner des informations exactes.

Si vous voulez d’abord comprendre le principe, le [guide du fonctionnement de Guardiens](/actualites/comment-fonctionne-guardiens-et-le-house-sitting-entre-particuliers) présente l’échange, les responsabilités et les outils.

## <a id="profil"></a>2. Préparer les informations utiles à votre rôle

| Vous souhaitez confier votre logement | Vous souhaitez proposer des gardes |
| --- | --- |
| Décrivez le logement, ses accès et les conditions du séjour. | Présentez votre situation, votre expérience réelle et vos limites. |
| Précisez les dates et les tâches courantes à assurer. | Indiquez vos possibilités de dates, de déplacement et de présence. |
| Décrivez les éventuels animaux, leurs habitudes et besoins. | Mentionnez les espèces et gestes que vous connaissez. |
| Préparez les consignes et les contacts pour la passation. | Précisez qui vous accompagnera, si vous ne venez pas seul. |

La garde d’une maison peut se faire **avec ou sans animaux**. Des photos utiles et des descriptions précises aident à comprendre le séjour ; elles ne garantissent pas des candidatures ou un accord.

Gardien, le [guide pour préparer votre profil](/actualites/creer-profil-gardien-attractif) vous aide à rédiger la bio et à choisir les photos. Le réglage « Je suis disponible » indique une disponibilité générale, pas un engagement pour toutes les dates d’une annonce. Si le site demande de compléter votre profil avant une action, suivez les indications de votre espace.

## <a id="identite"></a>3. Comprendre la vérification du document d’identité

Un parcours de vérification est proposé dans l’espace prévu à cet effet. Suivez les instructions affichées, sans publier votre pièce d’identité dans la bio, les photos ou une annonce. Les modalités de traitement des documents sont décrites dans la [politique de confidentialité](/confidentialite).

L’écusson indique qu’un document a été contrôlé. **Il ne certifie ni compétences, ni fiabilité, ni aptitude à une garde précise.** Le profil, les avis lorsqu’ils existent et les échanges complètent votre appréciation. Le [guide de confiance](/actualites/securite-confiance-house-sitting) précise les points à vérifier des deux côtés.

## <a id="premiere-demarche"></a>4. Publier une annonce ou choisir une garde

**Propriétaire :** préparez l’annonce avec les dates, le logement, les tâches, les éventuels animaux et les conditions d’accueil. Signalez les contraintes qui comptent : accès, besoin de véhicule, présence attendue ou soin particulier. Le [guide de rédaction d’une annonce](/actualites/rediger-bonne-annonce-house-sitting) vous aide à formuler la demande.

**Gardien :** consultez les annonces disponibles, lisez le besoin et proposez votre aide lorsque les dates et responsabilités peuvent vous convenir. Expliquez ce qui correspond à votre organisation et ce qui reste à clarifier. Une candidature n’est pas encore une garde confirmée.

Pour un coup de main ponctuel **sans nuitée**, utilisez la rubrique d’entraide adaptée au besoin, plutôt qu’une annonce de séjour. Une intervention ponctuelle ne remplace pas à elle seule une organisation complète de garde d’animal ; le [guide de l’entraide](/actualites/petites-missions-entraide-guardiens) détaille ce cadre.

## <a id="preparation"></a>5. Échanger, confirmer puis préparer l’arrivée

Avant de confirmer, convenez des tâches, des dates, des personnes accueillies, des dépenses et de la présence possible. Vérifiez vos assurances avec les assureurs concernés. Une rencontre peut avoir lieu **si les deux personnes le souhaitent**.

Après confirmation, un accord de garde est proposé ; sa signature est facultative. Le guide de la maison complète les consignes lorsqu’il est disponible. Préparez la remise des clés, les équipements, les habitudes des animaux et les contacts, dont un relais local qui a accepté d’aider si nécessaire.

Décidez du rythme des nouvelles et de la restitution des clés. Après le séjour, un retour honnête peut aider les échanges futurs ; ne comptez pas sur un statut ou un classement automatiquement obtenu avec un certain nombre d’avis. Les [conseils pour une première garde](/actualites/reussir-premiere-garde-house-sitting) accompagnent la suite.

## <a id="faq"></a>Questions fréquentes

:::faq
### Peut-on être propriétaire et gardien avec le même compte ?
Oui, vous pouvez utiliser les deux rôles selon vos besoins. Vérifiez les informations de votre profil et les possibilités de présence avant chaque séjour, quel que soit le rôle choisi.

### Dois-je avoir des animaux pour publier une annonce de garde ?
Non, le besoin peut porter sur le logement et les tâches courantes convenues. S’il y a des animaux, décrivez leurs habitudes et leurs besoins dans l’annonce.

### Un profil complet garantit-il une première garde ?
Non. Il aide les autres membres à comprendre votre proposition. Une réponse ou un accord dépend notamment des dates, des besoins et du choix des personnes concernées.

### La rencontre est-elle obligatoire ?
Non, elle est possible si les deux personnes le souhaitent. Les échanges doivent dans tous les cas permettre de clarifier les engagements avant la confirmation.

### Quand l’accord de garde est-il proposé ?
Après confirmation de la garde. La signature est facultative. Cet outil complète les échanges et la préparation des consignes, sans remplacer la vérification des assurances.

### Est-ce gratuit pour les deux rôles ?
La plateforme est actuellement 100 % gratuite pour les propriétaires et les gardiens. Les frais de trajet, de vie sur place et les dépenses convenues restent distincts. Consultez la page tarifs pour les conditions actuelles.
:::$suite_content_1_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='45f7dd7b-f720-4924-b51d-4ca670e38664'::uuid AND slug='premiers-pas-sur-guardiens';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/premiers-pas-sur-guardiens' THEN
    RAISE EXCEPTION 'Guide suite 1 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Premiers pas sur Guardiens : créer son compte et préparer une garde'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Propriétaire, gardien ou les deux : partez de votre besoin, préparez votre profil et faites votre première démarche sur Guardiens.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Premiers pas sur Guardiens : compte, profil et garde'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Commencez sur Guardiens : choisissez votre rôle, complétez votre profil, publiez une annonce ou cherchez une garde. Les étapes utiles avant de confirmer.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Une personne tient un sac de voyage dans un salon, près d’un chien roux et d’un sac à dos.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"conditions tarifaires","url":"/tarifs"},{"text":"conditions d’utilisation","url":"/cgu"},{"text":"guide du fonctionnement de Guardiens","url":"/actualites/comment-fonctionne-guardiens-et-le-house-sitting-entre-particuliers"},{"text":"guide pour préparer votre profil","url":"/actualites/creer-profil-gardien-attractif"},{"text":"politique de confidentialité","url":"/confidentialite"},{"text":"guide de confiance","url":"/actualites/securite-confiance-house-sitting"},{"text":"guide de rédaction d’une annonce","url":"/actualites/rediger-bonne-annonce-house-sitting"},{"text":"guide de l’entraide","url":"/actualites/petites-missions-entraide-guardiens"},{"text":"conseils pour une première garde","url":"/actualites/reussir-premiere-garde-house-sitting"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 14:55:16.684657+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 1 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot23_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 1 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot23_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot23_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Premiers pas sur Guardiens : créer son compte et préparer une garde',
    excerpt='Propriétaire, gardien ou les deux : partez de votre besoin, préparez votre profil et faites votre première démarche sur Guardiens.',
    meta_title='Premiers pas sur Guardiens : compte, profil et garde',
    meta_description='Commencez sur Guardiens : choisissez votre rôle, complétez votre profil, publiez une annonce ou cherchez une garde. Les étapes utiles avant de confirmer.',
    hero_image_alt='Une personne tient un sac de voyage dans un salon, près d’un chien roux et d’un sac à dos.',
    internal_links='[{"text":"conditions tarifaires","url":"/tarifs"},{"text":"conditions d’utilisation","url":"/cgu"},{"text":"guide du fonctionnement de Guardiens","url":"/actualites/comment-fonctionne-guardiens-et-le-house-sitting-entre-particuliers"},{"text":"guide pour préparer votre profil","url":"/actualites/creer-profil-gardien-attractif"},{"text":"politique de confidentialité","url":"/confidentialite"},{"text":"guide de confiance","url":"/actualites/securite-confiance-house-sitting"},{"text":"guide de rédaction d’une annonce","url":"/actualites/rediger-bonne-annonce-house-sitting"},{"text":"guide de l’entraide","url":"/actualites/petites-missions-entraide-guardiens"},{"text":"conseils pour une première garde","url":"/actualites/reussir-premiere-garde-house-sitting"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='premiers-pas-sur-guardiens' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 1 : % ligne au lieu de 1',affected; END IF;
END;
$guide_1$;

COMMIT;
