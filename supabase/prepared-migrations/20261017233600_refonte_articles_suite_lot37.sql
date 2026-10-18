-- Refonte des guides missions-reseau, autorisée le 17/10/2026.
-- Les URL, auteurs, dates de publication et indexabilité sont conservés.
BEGIN;
CREATE TABLE IF NOT EXISTS public._backup_articles_suite_lot37_20261017 AS SELECT * FROM public.articles WHERE false;
REVOKE ALL ON public._backup_articles_suite_lot37_20261017 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public._backup_articles_suite_lot37_20261017 TO service_role;
ALTER TABLE public._backup_articles_suite_lot37_20261017 ENABLE ROW LEVEL SECURITY;
SELECT id FROM public.articles WHERE id IN ('6ea0dd2c-64f5-48e2-ab78-ce8ab20b8e4f'::uuid,'3c6d8b50-89d1-4e3c-9c5e-85d6c753a5fe'::uuid) ORDER BY id FOR UPDATE;

DO $guide_0$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_0_20261017$# Petites missions Guardiens : demander ou proposer un coup de main

**Les petites missions Guardiens servent à organiser un coup de main ponctuel entre particuliers, sans rémunération.** Vous publiez un besoin, échangez avec les personnes intéressées et convenez des conditions avant de commencer. Si vous voulez proposer votre aide, présentez plutôt vos savoir-faire dans votre profil.

La plateforme est **actuellement 100 % gratuite**. Les achats ou déplacements éventuels restent distincts ; une réponse, une compétence ou un remplacement ne sont pas garantis. Le but est de rendre possible un échange de proximité, à partir de ce que chacun peut réellement assurer.

**Repères :** [choisir le bon parcours](#parcours), [décrire le besoin](#publication), [répondre et convenir](#reponse), [comprendre la gratuité](#frais), [connaître les limites](#limites), [gérer un imprévu](#imprevu), [questions fréquentes](#faq).

## <a id="parcours"></a>Demander, aider ou faire garder sa maison : par où passer ?

| Ce que vous souhaitez faire | Le parcours adapté |
| --- | --- |
| Présenter un besoin ponctuel | Publier une petite mission en décrivant la tâche et ses conditions. |
| Proposer ce que vous savez faire | Compléter les savoir-faire de votre profil et vos limites. |
| Aider sur un besoin publié | Lire la mission puis y répondre si elle correspond à vos capacités et disponibilités. |
| Faire occuper votre maison pendant une absence | Préparer une annonce de house-sitting avec la présence et les tâches convenues. |

Les [petites missions publiques](/petites-missions) permettent de découvrir les besoins. La publication demande un compte connecté, sans seuil de complétion de profil. Pour répondre au besoin d’une autre personne, le profil doit actuellement atteindre **40 % de complétion** ; suivez les informations affichées si l’accès n’est pas encore ouvert. L’écusson de contrôle d’un document d’identité n’est pas un prérequis de réponse.

L’entraide s’adresse aux adultes dans les conditions des [CGU](/cgu). Une mission ponctuelle et une garde avec hébergement suivent des parcours différents : le [guide du fonctionnement de Guardiens](/actualites/comment-fonctionne-guardiens-et-le-house-sitting-entre-particuliers) explique la garde de maison, avec ou sans animaux.

## <a id="publication"></a>Comment publier un besoin compréhensible ?

Décrivez une tâche délimitée : préparer des plantations, récupérer une commande déjà payée ou assembler un meuble selon sa notice, si les conditions sont adaptées. Pour un animal, détaillez les gestes et la présence nécessaires ; une simple visite ne convient pas automatiquement à tous les chiens ou chats.

Préparez le secteur, les dates ou créneaux, la durée envisagée, les accès et le matériel. Ajoutez une illustration utile en respectant les personnes et la confidentialité. Gardez l’adresse exacte, les codes d’accès et les documents hors de la publication publique.

Le formulaire vous fait décrire le besoin puis son organisation. **Il ne vous demande pas de rédiger une offre de service ni une contrepartie personnalisée.** Le rappel commun porte sur un merci, un café ou un coup de main à convenir ensemble. Vous n’avez pas à calculer une équivalence d’heures à rendre.

Les [idées de coups de main](/actualites/idees-coups-de-main-entraide-pres-de-chez-soi) aident à choisir une première tâche ; les [conseils pour demander simplement](/actualites/oser-demander-coup-de-main-pres-de-chez-soi) proposent un exemple de message. Une annonce précise facilite la compréhension sans garantir un délai de réponse.

## <a id="reponse"></a>Comment proposer son aide et confirmer les conditions ?

Pour rendre visibles vos compétences, utilisez les [savoir-faire du profil](/profile?section=savoir-faire). Expliquez ce que vous savez faire, le matériel dont vous disposez éventuellement et ce que vous préférez refuser. Ce profil ne constitue pas une certification professionnelle.

Sur une demande qui vous convient, vous pouvez indiquer que vous pouvez aider ou répondre avec un mot, selon les actions affichées. Une première réponse ouvre l’échange ; elle ne règle pas à elle seule toutes les conditions de l’intervention. Certaines demandes peuvent être temporairement fermées aux nouvelles réponses lorsqu’il y en a déjà en attente.

Avant de convenir de l’aide, confirmez la tâche, les personnes présentes, le créneau, les accès, le matériel, les frais éventuels et les limites. Demandez les précisions manquantes et dites ce que vous ne pouvez pas assurer. Une personne qui reçoit une réponse reste libre de ne pas la retenir.

Une rencontre préalable est possible **si vous le souhaitez tous les deux**. Un contrôle de document d’identité, lorsqu’un profil l’affiche, ne garantit ni la fiabilité ni une compétence. Les avis, lorsqu’ils existent, complètent la discussion ; une aide réussie sur une tâche ne prouve pas que la personne peut assurer toutes les autres.

## <a id="frais"></a>Gratuit signifie-t-il qu’aucune dépense n’est possible ?

La [gratuité actuelle de la plateforme](/tarifs) et l’absence de rémunération du service sont deux points à distinguer des dépenses. Les plants, les courses ou les consommables doivent être prévus ; ils ne sont pas offerts automatiquement par la personne qui aide.

Les CGU permettent le remboursement **au montant exact sur justificatif d’une dépense avancée pour l’autre et convenue**. Cela ne rémunère ni le temps ni le travail. N’utilisez pas un forfait ou un remboursement inventé pour payer le service. Pour un trajet, vérifiez ensemble les conditions et les frais réels admissibles.

L’absence de paiement ne dispense pas automatiquement de toutes les obligations juridiques, fiscales ou d’assurance. Une activité régulière, professionnelle ou réglementée ne devient pas une petite mission admissible en supprimant simplement un prix. Pour une situation qui dépasse l’entraide ponctuelle, demandez l’avis de l’interlocuteur compétent.

## <a id="limites"></a>Quelles tâches ne relèvent pas de cette entraide ?

Les CGU excluent notamment la garde ou le transport d’enfants non accompagnés de leur représentant légal, les soins médicaux ou paramédicaux et l’aide corporelle, les travaux électriques, de gaz ou de chauffage, la hauteur, l’élagage, l’abattage, la construction et la démolition. Elles excluent aussi les activités réglementées et certaines activités professionnelles. Consultez le cadre complet avant de publier.

L’aide aux devoirs suit des conditions précises : le représentant légal présente la demande et reste l’interlocuteur ; lui-même ou un adulte du foyer est présent pendant toute la séance, y compris à distance. Ne publiez pas le nom, la photo, l’école ou l’adresse d’un enfant.

Pour un proche, préparez la demande avec son accord et restez l’interlocuteur. Des conditions particulières s’appliquent aux personnes sous protection juridique. Le [guide d’aide aux courses et aux proches](/actualites/courses-aide-domicile-entraide-senior-lyon) explique aussi les limites concernant argent, documents et moyens de paiement.

Demandez à votre assureur ce que couvre votre contrat pour la tâche envisagée, les personnes et les dommages. **Guardiens ne fournit pas une assurance générale de l’échange.** Ne présumez pas qu’une multirisque habitation couvrira automatiquement un accident, vos propres blessures ou un objet confié.

## <a id="imprevu"></a>Et si l’aide ne peut plus avoir lieu ou si un incident survient ?

Prévenez rapidement si une condition change. Pour une tâche essentielle, notamment des soins ou une présence animale convenue, prévoyez un relais avant de compter sur une réponse éventuelle. Confirmez ce relais avec la personne concernée ; la plateforme ne garantit pas un remplacement.

En cas d’urgence, contactez les secours ou le professionnel adapté ; une urgence vétérinaire ne doit pas attendre de joindre d’abord le propriétaire. Le [guide des imprévus pendant une garde](/actualites/gerer-imprevu-pendant-garde) aide à préparer les contacts et l’organisation.

Pour un dommage, conservez les éléments utiles, prévenez la personne concernée et contactez les assureurs selon la situation. La responsabilité ne se règle pas automatiquement par un geste symbolique ou à la charge d’une seule personne. Signalez à la plateforme les comportements contraires aux règles, sans attendre d’elle une prise en charge d’assurance ou un résultat de médiation garanti.

Après une mission terminée, vous pouvez laisser le retour proposé dans le parcours. Restez factuel sur l’échange réalisé et préservez les informations privées ; aucun avis positif ne doit être exigé à l’avance. Pour aller plus loin, le [guide du réseau d’entraide de proximité](/actualites/reseau-entraide-quartier-lyon-aura) propose des étapes pour renouveler les échanges librement.

## <a id="faq"></a>Questions fréquentes

:::faq
### Qui peut publier ou répondre à une petite mission ?
Un membre connecté peut publier un besoin sans seuil de complétion du profil. Pour répondre au besoin d’une autre personne, le profil doit actuellement atteindre 40 % de complétion. L’entraide s’adresse aux adultes dans le cadre des CGU.

### Où publier une offre d’aide ?
Les nouvelles petites missions servent à présenter un besoin. Pour proposer ce que vous savez faire, renseignez les savoir-faire de votre profil puis échangez sur les demandes adaptées à vos capacités et disponibilités.

### Faut-il proposer une contrepartie personnalisée ?
Non. Le formulaire rappelle un merci, un café ou un coup de main à convenir ensemble. Il ne demande pas de calculer une prestation ou un nombre d’heures équivalents.

### Peut-on rembourser une dépense ?
Une dépense avancée pour l’autre et convenue peut être remboursée au montant exact sur justificatif. Ce remboursement reste distinct de la rémunération du travail, interdite dans ce cadre.

### Les petites missions sont-elles assurées par Guardiens ?
Guardiens ne fournit pas une assurance générale de l’échange. Vérifiez avec votre assureur la couverture de la tâche, des personnes et des dommages envisagés avant de commencer.

### Une petite mission garantit-elle un gardien pour mes vacances ?
Non. Une aide ponctuelle peut permettre de faire connaissance, mais une garde de maison demande un nouvel échange sur la présence, les animaux et les tâches. Aucune candidature, compétence ou solution de remplacement n’est garantie.
:::$suite_content_0_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='6ea0dd2c-64f5-48e2-ab78-ce8ab20b8e4f'::uuid AND slug='petites-missions-entraide-guardiens';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/petites-missions-entraide-guardiens' THEN
    RAISE EXCEPTION 'Guide suite 0 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Petites missions Guardiens : demander ou proposer un coup de main'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Un besoin se publie dans les petites missions ; une proposition d’aide se présente dans les savoir-faire du profil. Voici le parcours et les conditions à préparer.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Petites missions Guardiens : comment fonctionne l’entraide'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Publier un besoin, proposer ses savoir-faire ou répondre à une mission : découvrez le parcours d’entraide Guardiens, les frais et les limites à connaître.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Plusieurs adultes plantent des fleurs dans un massif au pied d’un bâtiment.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"petites missions publiques","url":"/petites-missions"},{"text":"CGU","url":"/cgu"},{"text":"guide du fonctionnement de Guardiens","url":"/actualites/comment-fonctionne-guardiens-et-le-house-sitting-entre-particuliers"},{"text":"idées de coups de main","url":"/actualites/idees-coups-de-main-entraide-pres-de-chez-soi"},{"text":"conseils pour demander simplement","url":"/actualites/oser-demander-coup-de-main-pres-de-chez-soi"},{"text":"savoir-faire du profil","url":"/profile?section=savoir-faire"},{"text":"gratuité actuelle de la plateforme","url":"/tarifs"},{"text":"guide d’aide aux courses et aux proches","url":"/actualites/courses-aide-domicile-entraide-senior-lyon"},{"text":"guide des imprévus pendant une garde","url":"/actualites/gerer-imprevu-pendant-garde"},{"text":"guide du réseau d’entraide de proximité","url":"/actualites/reseau-entraide-quartier-lyon-aura"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 13:10:17.561495+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 0 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot37_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 0 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot37_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot37_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Petites missions Guardiens : demander ou proposer un coup de main',
    excerpt='Un besoin se publie dans les petites missions ; une proposition d’aide se présente dans les savoir-faire du profil. Voici le parcours et les conditions à préparer.',
    meta_title='Petites missions Guardiens : comment fonctionne l’entraide',
    meta_description='Publier un besoin, proposer ses savoir-faire ou répondre à une mission : découvrez le parcours d’entraide Guardiens, les frais et les limites à connaître.',
    hero_image_alt='Plusieurs adultes plantent des fleurs dans un massif au pied d’un bâtiment.',
    internal_links='[{"text":"petites missions publiques","url":"/petites-missions"},{"text":"CGU","url":"/cgu"},{"text":"guide du fonctionnement de Guardiens","url":"/actualites/comment-fonctionne-guardiens-et-le-house-sitting-entre-particuliers"},{"text":"idées de coups de main","url":"/actualites/idees-coups-de-main-entraide-pres-de-chez-soi"},{"text":"conseils pour demander simplement","url":"/actualites/oser-demander-coup-de-main-pres-de-chez-soi"},{"text":"savoir-faire du profil","url":"/profile?section=savoir-faire"},{"text":"gratuité actuelle de la plateforme","url":"/tarifs"},{"text":"guide d’aide aux courses et aux proches","url":"/actualites/courses-aide-domicile-entraide-senior-lyon"},{"text":"guide des imprévus pendant une garde","url":"/actualites/gerer-imprevu-pendant-garde"},{"text":"guide du réseau d’entraide de proximité","url":"/actualites/reseau-entraide-quartier-lyon-aura"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='petites-missions-entraide-guardiens' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 0 : % ligne au lieu de 1',affected; END IF;
END;
$guide_0$;

DO $guide_1$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_1_20261017$# Créer un réseau d’entraide près de chez soi : commencer à Lyon et alentour

**Pour commencer un réseau d’entraide dans votre quartier, choisissez une première occasion concrète et limitée : un besoin à présenter, un savoir-faire à partager ou une activité associative.** Inutile de confier vos clés dès le premier contact. Chacun doit pouvoir participer selon ses capacités, ses disponibilités et ses limites.

Guardiens propose une porte d’entrée par les coups de main entre particuliers et la garde de maison. La plateforme est **actuellement 100 % gratuite** ; elle facilite la mise en relation, sans garantir une personne disponible à proximité ou une relation de confiance immédiate.

**Repères :** [choisir un premier contact](#debut), [construire sans obligation](#confiance), [trouver les relais à Lyon](#lyon), [préparer une garde de maison](#maison), [garder ses limites](#limites), [questions fréquentes](#faq).

## <a id="debut"></a>Quel premier échange choisir ?

Partez de ce que vous pouvez expliquer et organiser sans difficulté excessive. Une aide pour quelques plantations, une commande à récupérer ou un partage de connaissance peut être plus simple à préparer qu’un besoin large ou régulier. La proximité réduit parfois les déplacements ; elle ne suffit pas à rendre toutes les disponibilités compatibles.

| Votre point de départ | Première démarche possible |
| --- | --- |
| Vous avez besoin d’une aide limitée | Décrire la tâche, le secteur, le moment et les contraintes utiles. |
| Vous souhaitez aider | Présenter vos savoir-faire et ce que vous pouvez réellement assurer. |
| Vous cherchez une activité régulière avec un groupe | Contacter une association ou un jardin collectif selon vos envies. |
| Vous préparez une absence | Définir les passages ou la présence nécessaires avant de chercher une personne. |

Le [guide pour demander un coup de main](/actualites/oser-demander-coup-de-main-pres-de-chez-soi) aide à écrire une première demande. Pour proposer votre aide, les [savoir-faire du profil](/profile?section=savoir-faire) permettent de préciser vos compétences et vos limites. Vous n’avez pas à vous présenter comme disponible pour tout.

## <a id="confiance"></a>Comment construire une relation sans la précipiter ?

Convenez d’abord d’une tâche et de ses conditions : qui vient, où, quand, avec quel matériel et quels accès ? Chacun doit pouvoir poser ses questions, refuser une condition ou ne pas poursuivre. Un échange réussi peut donner envie de recommencer, sans créer une obligation d’être disponible ensuite.

Un contrôle de document d’identité, lorsqu’un profil l’affiche, vérifie un document ; il ne certifie pas une compétence ni la fiabilité. Les avis, lorsqu’ils existent, apportent un éclairage sur des échanges passés. Une rencontre est possible **si vous le souhaitez tous les deux** et ne remplace pas la discussion sur la tâche.

Dans l’[étude Solitudes 2025 du CRÉDOC et du CERLIS pour la Fondation de France](https://www.credoc.fr/download/pdf/Sou/Sou2026-5061.pdf), 54 % des personnes interrogées déclarent des échanges avec leurs voisins au moins plusieurs fois par mois, au-delà de la simple politesse. L’enquête quantitative a été menée en juillet 2025 auprès de 3 000 personnes de 15 ans et plus en France. Ce résultat décrit des relations de voisinage ; il ne mesure pas l’effet de Guardiens ni la disponibilité d’aide dans un quartier lyonnais.

## <a id="lyon"></a>Où chercher d’autres occasions de participer à Lyon ?

L’[annuaire des associations de la Ville de Lyon](https://www.lyon.fr/demarche/associations/consulter-lannuaire-des-associations) permet de rechercher un collectif selon vos critères. Contactez l’association pour connaître son activité actuelle, ses conditions et les possibilités de participation. Une inscription dans l’annuaire ne signifie pas qu’elle recherche des bénévoles ou qu’une place est disponible.

Pour jardiner avec d’autres, la [Ville présente les jardins collectifs et leurs interlocuteurs](https://www.lyon.fr/vie-pratique/nature-en-ville/la-nature-senracine-lyon). Le [guide d’entraide jardinage à Lyon](/actualites/jardinage-entraide-quartier-lyon) distingue le coup de main ponctuel d’une participation dans un jardin partagé. L’accord du gestionnaire et les règles du lieu restent à vérifier.

Dans les communes alentour, renseignez-vous auprès de votre mairie et des structures locales, sans supposer que les ressources lyonnaises couvrent leur territoire. Si le besoin relève d’un accompagnement durable, de l’autonomie ou de soins, cherchez le service compétent : une relation entre voisins ne remplace pas cette organisation.

## <a id="maison"></a>Quand peut-on envisager de confier sa maison ?

Une personne qui a aidé au jardin ne connaît pas forcément les besoins d’une garde de maison. Avant une absence, reprenez les questions à partir de cette nouvelle situation : dates, présence, clés, courrier, entretien et animaux éventuels. Avoir déjà échangé est un point de départ, pas une validation de toutes les compétences.

Le house-sitting consiste à héberger un gardien pendant la garde, sans rémunération, selon les conditions convenues. Il peut concerner une maison **avec ou sans animaux**. Il ne garantit pas une présence permanente, la prévention de tout incident ou un remplacement au dernier moment.

Les [critères pour choisir son gardien](/actualites/choisir-gardien-bons-criteres) et les [conseils de préparation de la maison](/actualites/preparer-maison-avant-garde) aident à préciser les attentes. Après confirmation, un accord peut être établi ; sa signature est facultative. Vérifiez les assurances avec votre assureur et prévoyez un relais joignable.

## <a id="limites"></a>Comment rester libre de demander et d’aider ?

Convenez des accès nécessaires pour chaque échange, sans laisser un double de clés par principe ou pour une durée indéfinie. Gardez les coordonnées privées, codes et documents hors de l’annonce publique. Si vous présentez un besoin pour un proche, faites-le avec son accord et restez l’interlocuteur.

Sur Guardiens, l’entraide ponctuelle se fait sans rémunération et dans les limites des [CGU](/cgu). Vous n’avez pas à rendre immédiatement un service équivalent. Les achats sont distincts ; une avance convenue peut être remboursée au montant exact sur justificatif. La [page des tarifs](/tarifs) précise la gratuité actuelle de la plateforme.

Vous pouvez réduire votre disponibilité ou arrêter une relation qui ne vous convient plus. Prévenez pour les engagements déjà convenus et aidez à organiser un relais lorsqu’une personne ou un animal dépend de cette organisation. Le [guide des petites missions](/actualites/petites-missions-entraide-guardiens) détaille le parcours et les tâches exclues.

## <a id="faq"></a>Questions fréquentes

:::faq
### Comment commencer un réseau d’entraide dans un nouveau quartier ?
Choisissez une demande ou un savoir-faire limité, puis échangez sur les conditions avec une personne intéressée. Une association ou un jardin collectif peut aussi offrir un cadre de participation régulière.

### Faut-il confier ses clés dès le premier échange ?
Non. Convenez des accès nécessaires à la tâche et de leur durée. Un premier coup de main ne nécessite pas de laisser un double de clés pour de futurs besoins indéfinis.

### Un avis ou un document contrôlé garantit-il la confiance ?
Non. Un document contrôlé ne certifie pas une compétence ni la fiabilité. Les avis, lorsqu’ils existent, complètent la discussion sur les conditions de chaque nouvel échange.

### Où chercher une association à Lyon ?
L’annuaire municipal permet une recherche selon vos critères. Contactez la structure pour connaître son activité et ses conditions actuelles ; une place ou une mission bénévole n’est pas garantie.

### Un coup de main réussi suffit-il pour confier ensuite ma maison ?
Il peut permettre de faire connaissance, mais une garde demande un nouvel échange sur les dates, la présence, les animaux et les tâches. Prévoyez les consignes, les assurances et un relais avant de confirmer.

### Faut-il payer pour utiliser le réseau Guardiens ?
La plateforme est actuellement gratuite. L’entraide se fait sans rémunération ; pour une garde de maison, le gardien est hébergé sans rémunération. Achats, déplacements et dépenses éventuelles restent distincts.
:::$suite_content_1_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='3c6d8b50-89d1-4e3c-9c5e-85d6c753a5fe'::uuid AND slug='reseau-entraide-quartier-lyon-aura';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/petites-missions-entraide-guardiens' THEN
    RAISE EXCEPTION 'Guide suite 1 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Créer un réseau d’entraide près de chez soi : commencer à Lyon et alentour'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Un réseau de proximité se construit avec des échanges choisis. Voici par où commencer à Lyon, comment préserver ses limites et préparer une éventuelle garde de maison.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Réseau d’entraide de quartier : commencer à Lyon'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Nouveau quartier ou envie de contacts utiles : commencez un réseau d’entraide à Lyon, avec une tâche limitée, des échanges libres et des relais associatifs.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Six adultes échangent autour d’une table avec des courses, des fleurs et une boîte à outils, dans une cour avec un chien en laisse.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"guide pour demander un coup de main","url":"/actualites/oser-demander-coup-de-main-pres-de-chez-soi"},{"text":"savoir-faire du profil","url":"/profile?section=savoir-faire"},{"text":"guide d’entraide jardinage à Lyon","url":"/actualites/jardinage-entraide-quartier-lyon"},{"text":"critères pour choisir son gardien","url":"/actualites/choisir-gardien-bons-criteres"},{"text":"conseils de préparation de la maison","url":"/actualites/preparer-maison-avant-garde"},{"text":"CGU","url":"/cgu"},{"text":"page des tarifs","url":"/tarifs"},{"text":"guide des petites missions","url":"/actualites/petites-missions-entraide-guardiens"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 13:40:17.689304+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 1 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot37_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 1 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot37_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot37_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Créer un réseau d’entraide près de chez soi : commencer à Lyon et alentour',
    excerpt='Un réseau de proximité se construit avec des échanges choisis. Voici par où commencer à Lyon, comment préserver ses limites et préparer une éventuelle garde de maison.',
    meta_title='Réseau d’entraide de quartier : commencer à Lyon',
    meta_description='Nouveau quartier ou envie de contacts utiles : commencez un réseau d’entraide à Lyon, avec une tâche limitée, des échanges libres et des relais associatifs.',
    hero_image_alt='Six adultes échangent autour d’une table avec des courses, des fleurs et une boîte à outils, dans une cour avec un chien en laisse.',
    internal_links='[{"text":"guide pour demander un coup de main","url":"/actualites/oser-demander-coup-de-main-pres-de-chez-soi"},{"text":"savoir-faire du profil","url":"/profile?section=savoir-faire"},{"text":"guide d’entraide jardinage à Lyon","url":"/actualites/jardinage-entraide-quartier-lyon"},{"text":"critères pour choisir son gardien","url":"/actualites/choisir-gardien-bons-criteres"},{"text":"conseils de préparation de la maison","url":"/actualites/preparer-maison-avant-garde"},{"text":"CGU","url":"/cgu"},{"text":"page des tarifs","url":"/tarifs"},{"text":"guide des petites missions","url":"/actualites/petites-missions-entraide-guardiens"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='reseau-entraide-quartier-lyon-aura' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 1 : % ligne au lieu de 1',affected; END IF;
END;
$guide_1$;

COMMIT;
