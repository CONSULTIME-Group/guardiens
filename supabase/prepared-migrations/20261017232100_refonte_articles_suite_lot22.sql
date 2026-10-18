-- Refonte des guides professionnels animaliers et réseau d’urgence à venir, autorisée le 17/10/2026.
-- Les URL, auteurs, dates de publication et indexabilité sont conservés.
BEGIN;
CREATE TABLE IF NOT EXISTS public._backup_articles_suite_lot22_20261017 AS SELECT * FROM public.articles WHERE false;
REVOKE ALL ON public._backup_articles_suite_lot22_20261017 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public._backup_articles_suite_lot22_20261017 TO service_role;
ALTER TABLE public._backup_articles_suite_lot22_20261017 ENABLE ROW LEVEL SECURITY;
SELECT id FROM public.articles WHERE id IN ('db4b6975-6eec-45aa-9bab-2083780faa0e'::uuid,'df375802-4edd-415e-9163-51bfdc68cfb7'::uuid) ORDER BY id FOR UPDATE;

DO $guide_0$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_0_20261017$# Professionnel animalier sur Guardiens : déclarer son activité et ses formations

**Vous exercez un métier auprès des animaux ? Vous pouvez le déclarer dans votre profil Guardiens et y afficher jusqu’à trois formations ou certifications.** Ces informations servent à expliquer votre parcours. Elles restent déclaratives et ne constituent pas un agrément délivré par la plateforme.

Vous participez aux gardes dans les mêmes conditions que les autres membres : hébergement **sans rémunération**, selon les tâches convenues. Guardiens est **actuellement 100 % gratuit pour les deux rôles** ; les [conditions tarifaires](/tarifs) précisent le fonctionnement. Votre activité commerciale conserve son propre cadre, distinct de cet échange entre particuliers.

**Repères :** [déclarer son activité](#declaration), [choisir ses formations](#formations), [comprendre leur portée](#portee), [préparer une garde](#garde), [questions fréquentes](#faq).

## <a id="declaration"></a>Où déclarer votre activité professionnelle ?

Dans votre profil, ouvrez l’étape **« Ce que vous savez faire »**, cochez **« Je suis un professionnel de l’animalier »**, puis choisissez votre spécialité. Les choix proposés sont :

- Pet-sitter ou pension ;
- Vétérinaire ou auxiliaire ;
- Éducateur ou comportementaliste ;
- Toiletteur ;
- Ostéopathe ;
- Transport d’animaux ;
- Autre.

Choisissez l’intitulé qui décrit votre activité réelle. Si une spécialité regroupe plusieurs métiers, votre présentation peut préciser celui que vous exercez et ce qu’il recouvre. La fiche conserve la même présentation que celle des autres membres.

Vous pouvez modifier cette déclaration dans le même espace. Si votre activité change, actualisez-la. Pour une question sur les intitulés disponibles, utilisez la [page de contact](/contact).

## <a id="formations"></a>Comment afficher vos formations et certifications ?

Le bloc **« Formations et certifications »**, au même endroit, propose une liste d’intitulés classés par domaine. Vous pouvez en sélectionner **trois au maximum**. Ils apparaissent sur votre fiche publique avec la mention **« déclarées »**.

La liste couvre notamment les animaux, les secours et la santé, le jardin et l’agriculture, ainsi que la construction et l’artisanat. Pour les animaux, elle distingue par exemple les catégories d’ACACED, le métier vétérinaire, l’auxiliaire spécialisé vétérinaire et certaines formations d’éducation ou de premiers secours animaliers.

Sélectionnez uniquement les intitulés qui correspondent à votre parcours. Si votre formation n’est pas proposée, ne choisissez pas un titre voisin comme s’il était équivalent ; contactez-nous pour expliquer ce qui manque. La rubrique est une liste fermée, pas une saisie libre de diplômes.

Gardez les informations à jour et présentez votre expérience concrète dans votre bio. Une attestation de premiers secours et une qualification vétérinaire ne couvrent pas les mêmes actes. Le [guide du profil gardien](/actualites/creer-profil-gardien-attractif) aide à relier votre parcours aux tâches que vous pouvez assurer.

## <a id="portee"></a>Que signifient ces mentions pour un propriétaire ?

| Information visible | Comment la lire |
| --- | --- |
| Spécialité professionnelle | Activité déclarée par le membre, à préciser pendant l’échange. |
| Formation ou certification « déclarée » | Intitulé sélectionné par le membre ; pas une validation du diplôme par Guardiens. |
| Écusson d’identité | Contrôle d’un document dans le parcours prévu ; pas une preuve de compétence ou de fiabilité. |
| Expérience et avis éventuels | Éléments pour discuter du séjour, sans garantie d’aptitude à chaque situation. |

Demandez des précisions adaptées au besoin réel : espèce connue, geste déjà pratiqué, limites, disponibilité et documents utiles. Une déclaration professionnelle ne signifie pas que la personne accepte tous les soins ou pourra intervenir à toute heure.

Pour une activité réglementée, il faut vérifier les règles propres au métier et aux actes concernés. La [DRAAF explique les justificatifs de connaissances pour certaines activités liées aux animaux de compagnie](https://draaf.auvergne-rhone-alpes.agriculture.gouv.fr/comment-justifier-d-une-reconnaissance-professionnelle-a5195.html). Elle précise également que la [formation ACACED délivre une attestation de connaissances, pas un diplôme](https://draaf.auvergne-rhone-alpes.agriculture.gouv.fr/ou-effectuer-cette-formation-a5194.html). Cocher une mention dans un profil ne remplace pas ces démarches.

L’immatriculation d’une entreprise ne suffit donc pas, à elle seule, à établir toutes les qualifications, autorisations ou assurances nécessaires. Ce guide décrit l’utilisation de Guardiens ; il ne constitue pas un parcours complet d’installation professionnelle.

## <a id="garde"></a>Qu’est-ce qui reste à convenir avant une garde ?

Décrivez les tâches, les horaires de présence, les éventuels soins et les conditions du logement. Distinguez ce que vous savez faire de ce que vous acceptez d’assurer pendant ce séjour. Une expérience professionnelle peut aider à poser les bonnes questions ; elle ne remplace pas la passation des habitudes de l’animal et du logement.

Vérifiez avec vos assureurs la couverture du séjour et des responsabilités convenues, sans supposer qu’une assurance professionnelle couvre automatiquement un échange dans un cadre différent. Prévoyez les contacts du propriétaire, du vétérinaire et d’un relais local accepté.

Une rencontre est possible **si les deux personnes le souhaitent**. Après confirmation, un accord de garde est proposé à signature facultative ; le guide de la maison complète les consignes lorsqu’il est disponible. Le [guide de confiance](/actualites/securite-confiance-house-sitting) reprend les vérifications utiles des deux côtés.

La garde organisée sur Guardiens reste sans rémunération. Ne transformez pas une candidature en devis ou en prestation payante présentée comme faisant partie de cet échange.

## <a id="faq"></a>Questions fréquentes

:::faq
### Un professionnel animalier peut-il participer aux gardes Guardiens ?
Oui, il peut déclarer son activité et participer dans les mêmes conditions que les autres membres : hébergement sans rémunération pour les tâches convenues. Son activité commerciale reste distincte.

### Où indiquer ma spécialité ?
Dans le profil, à l’étape « Ce que vous savez faire », cochez « Je suis un professionnel de l’animalier », puis choisissez la spécialité correspondant à votre activité réelle. Vous pouvez la modifier dans ce même espace.

### Combien de formations peut-on afficher ?
Trois au maximum, choisies dans la liste du bloc « Formations et certifications ». Elles apparaissent sur la fiche publique avec la mention « déclarées ».

### Guardiens vérifie-t-il les diplômes cochés dans cette rubrique ?
Les intitulés de cette rubrique sont déclaratifs. Ils ne constituent pas une validation de diplôme ou un agrément par Guardiens. Demandez les précisions et documents utiles au besoin du séjour.

### L’ACACED permet-elle d’assurer tous les soins ?
Non. C’est une attestation de connaissances dans les catégories concernées, pas une qualification vétérinaire ni une autorisation générale d’effectuer tout acte. Vérifiez votre périmètre et les règles de l’activité envisagée.
:::$suite_content_0_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='db4b6975-6eec-45aa-9bab-2083780faa0e'::uuid AND slug='devenir-gardien-pro-animalier';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/devenir-gardien-pro-animalier' THEN
    RAISE EXCEPTION 'Guide suite 0 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Professionnel animalier sur Guardiens : déclarer son activité et ses formations'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Votre métier et vos formations peuvent aider à présenter votre expérience. Voici comment les indiquer sur Guardiens, et comment lire ces informations sur une fiche.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Professionnel animalier : profil et formations sur Guardiens'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Professionnel animalier sur Guardiens : indiquez votre spécialité et jusqu’à trois formations déclarées. Comprenez leur portée et les conditions de garde.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Deux petits chiens en harnais regardent une personne penchée vers eux sur une pelouse.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"conditions tarifaires","url":"/tarifs"},{"text":"page de contact","url":"/contact"},{"text":"guide du profil gardien","url":"/actualites/creer-profil-gardien-attractif"},{"text":"guide de confiance","url":"/actualites/securite-confiance-house-sitting"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 15:10:15.663021+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 0 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot22_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 0 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot22_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot22_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Professionnel animalier sur Guardiens : déclarer son activité et ses formations',
    excerpt='Votre métier et vos formations peuvent aider à présenter votre expérience. Voici comment les indiquer sur Guardiens, et comment lire ces informations sur une fiche.',
    meta_title='Professionnel animalier : profil et formations sur Guardiens',
    meta_description='Professionnel animalier sur Guardiens : indiquez votre spécialité et jusqu’à trois formations déclarées. Comprenez leur portée et les conditions de garde.',
    hero_image_alt='Deux petits chiens en harnais regardent une personne penchée vers eux sur une pelouse.',
    internal_links='[{"text":"conditions tarifaires","url":"/tarifs"},{"text":"page de contact","url":"/contact"},{"text":"guide du profil gardien","url":"/actualites/creer-profil-gardien-attractif"},{"text":"guide de confiance","url":"/actualites/securite-confiance-house-sitting"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='devenir-gardien-pro-animalier' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 0 : % ligne au lieu de 1',affected; END IF;
END;
$guide_0$;

DO $guide_1$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_1_20261017$# Gardien d’urgence sur Guardiens : où en est le projet ?

**Le réseau de gardiens d’urgence Guardiens est un projet à venir : il n’est pas encore ouvert.** Vous ne pouvez donc pas compter aujourd’hui sur ce dispositif pour obtenir une intervention immédiate ou un remplacement garanti. La [page du projet](/gardien-urgence) présente cette ouverture future, sans date annoncée dans ce guide.

L’idée est de faciliter un relais lorsqu’une garde est perturbée ou qu’un propriétaire doit s’absenter de façon imprévue. En attendant, les gardes classiques se préparent avec le propriétaire et un contact local qui a accepté d’intervenir si nécessaire.

**Repères :** [comprendre le projet](#projet), [préparer sa participation](#participation), [organiser un relais](#relais), [agir devant un besoin immédiat](#immediat), [questions fréquentes](#faq).

## <a id="projet"></a>Quel besoin le futur réseau cherche-t-il à couvrir ?

Un gardien peut ne plus pouvoir poursuivre un séjour ; une hospitalisation ou un changement de déplacement peut bouleverser l’organisation d’un propriétaire. Trouver quelqu’un rapidement ne suffit pas : il faut aussi que cette personne puisse assurer les tâches et accéder au logement avec un accord clair.

Le projet de réseau d’urgence vise ce besoin de relais. Les conditions et modalités applicables devront être confirmées lors de son ouverture. Ne préparez pas votre organisation sur la base d’un nombre de gardes, d’une note ou d’une invitation automatique supposés.

Ce guide ne vous promet ni intervention sous quinze minutes, ni priorité de classement, ni accès anticipé aux longs séjours. L’expérience et les avis éventuels servent à préparer les échanges ; ils ne garantissent pas une disponibilité ou une aptitude à toute situation.

## <a id="participation"></a>Que pouvez-vous préparer comme gardien aujourd’hui ?

Vous pouvez participer aux gardes classiques qui correspondent à vos possibilités et tenir votre profil à jour. Décrivez les animaux et tâches que vous connaissez, votre mobilité, votre présence possible et vos limites. Si vous exercez un métier animalier, le [guide de déclaration professionnelle](/actualites/devenir-gardien-pro-animalier) explique les rubriques dédiées.

Préparer sa participation à un éventuel relais, c’est aussi savoir répondre à des questions pratiques :

- Puis-je rejoindre le logement et rester pendant la durée demandée ?
- Ai-je compris les animaux, les soins et les contraintes de présence ?
- Qui me transmet les clés et les consignes ?
- Quels contacts peuvent m’aider si la situation évolue ?
- Quelles dépenses et assurances doivent être clarifiées ?

Le [guide du profil gardien](/actualites/creer-profil-gardien-attractif) vous aide à présenter ces informations. Compléter un profil n’active pas un service d’urgence et ne garantit pas un futur statut.

Sur Guardiens, les gardes actuelles reposent sur un hébergement **sans rémunération**. La plateforme est **actuellement 100 % gratuite pour les deux rôles** ; les dépenses convenues restent distinctes. Consultez les [conditions tarifaires](/tarifs), sans déduire des avantages ou tarifs futurs d’un réseau encore à ouvrir.

## <a id="relais"></a>Comment préparer un relais sans attendre l’ouverture ?

Avant chaque garde, le propriétaire et le gardien peuvent convenir d’un plan de continuité. Désignez une personne qui a accepté le rôle, connaît les besoins et peut accéder au logement selon les conditions prévues. Ne notez pas le nom d’un proche comme solution de repli sans lui en parler.

| Point à préparer | Ce qui doit être clair |
| --- | --- |
| Contact local | Qui accepte de répondre et dans quelles limites ? |
| Accès | Où sont les clés et qui peut autoriser leur remise ? |
| Animaux et maison | Quelles routines et consignes faut-il transmettre ? |
| Indisponibilité | Qui prévient qui, et comment confirmer que le relais est effectivement assuré ? |
| Soins et dépenses | Quel vétérinaire contacter et quelle organisation financière a été convenue ? |

Un relais prévu peut lui aussi devenir indisponible. Gardez une autre solution adaptée au besoin et vérifiez que toute nouvelle personne a compris et accepté les responsabilités. Le [guide des imprévus pendant une garde](/actualites/gerer-imprevu-pendant-garde) détaille la coordination.

## <a id="immediat"></a>Que faire si le besoin est immédiat ?

Si une garde est interrompue, prévenez le propriétaire et les contacts convenus, expliquez ce qui reste à assurer et confirmez ensemble une solution effective. Ne quittez pas une situation avec un animal dépendant de vos soins en supposant qu’une alerte ou un message a automatiquement trouvé quelqu’un.

Si l’état de l’animal inquiète, demandez un avis vétérinaire. Un besoin de soins ne se traite pas en attendant l’ouverture d’un réseau de gardiens, et il ne faut pas attendre une réponse du propriétaire pour solliciter cet avis. Les coordonnées du vétérinaire et du service hors horaires doivent figurer parmi les contacts préparés.

Pour une absence liée à une hospitalisation du propriétaire, le [guide de garde pendant une hospitalisation](/actualites/faire-garder-animal-pendant-hospitalisation) aide à préparer les consignes et la coordination avec les proches.

## <a id="faq"></a>Questions fréquentes

:::faq
### Le réseau de gardiens d’urgence est-il déjà ouvert ?
Non, il est annoncé comme un projet à venir. Ce guide ne donne pas de date d’ouverture. Consultez la page du projet pour les informations publiées sur son évolution.

### Peut-on demander une intervention sous quinze minutes ?
Le dispositif n’est pas ouvert et aucune intervention immédiate ne doit être présumée. Pour une situation actuelle, coordonnez une solution avec les contacts convenus ; si l’état d’un animal inquiète, demandez un avis vétérinaire.

### Compléter mon profil active-t-il un statut d’urgence ?
Non. Vous pouvez préparer votre présentation et participer aux gardes classiques adaptées à vos possibilités. Cela ne vaut pas activation du réseau ni garantie d’un statut futur.

### Les critères et avantages du futur statut sont-ils acquis ?
Les modalités applicables devront être confirmées à l’ouverture. Ne comptez pas sur une invitation automatique, une priorité de classement ou un accès réservé à des séjours pour organiser votre participation actuelle.

### Pourquoi prévoir un contact local pendant une garde ?
Il peut aider à coordonner un accès, une consigne ou un relais si le gardien ou le propriétaire rencontre un imprévu. Cette personne doit avoir accepté son rôle et ses limites ; sa disponibilité ne doit pas être supposée.
:::$suite_content_1_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='df375802-4edd-415e-9163-51bfdc68cfb7'::uuid AND slug='devenir-gardien-urgence-guardiens';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/devenir-gardien-urgence-guardiens' THEN
    RAISE EXCEPTION 'Guide suite 1 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Gardien d’urgence sur Guardiens : où en est le projet ?'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Le réseau d’urgence n’est pas encore ouvert. Voici ce que cela signifie aujourd’hui, comment préparer votre participation et pourquoi prévoir un relais reste nécessaire.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Gardien d’urgence Guardiens : projet et préparation'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Le réseau de gardiens d’urgence Guardiens est à venir. Comprenez le projet, préparez votre profil et organisez dès maintenant un relais pour les imprévus.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Une personne se tient à l’entrée éclairée d’une maison avec deux chiens, près de caisses de transport.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"page du projet","url":"/gardien-urgence"},{"text":"guide de déclaration professionnelle","url":"/actualites/devenir-gardien-pro-animalier"},{"text":"guide du profil gardien","url":"/actualites/creer-profil-gardien-attractif"},{"text":"conditions tarifaires","url":"/tarifs"},{"text":"guide des imprévus pendant une garde","url":"/actualites/gerer-imprevu-pendant-garde"},{"text":"guide de garde pendant une hospitalisation","url":"/actualites/faire-garder-animal-pendant-hospitalisation"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 15:55:11.099028+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 1 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot22_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 1 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot22_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot22_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Gardien d’urgence sur Guardiens : où en est le projet ?',
    excerpt='Le réseau d’urgence n’est pas encore ouvert. Voici ce que cela signifie aujourd’hui, comment préparer votre participation et pourquoi prévoir un relais reste nécessaire.',
    meta_title='Gardien d’urgence Guardiens : projet et préparation',
    meta_description='Le réseau de gardiens d’urgence Guardiens est à venir. Comprenez le projet, préparez votre profil et organisez dès maintenant un relais pour les imprévus.',
    hero_image_alt='Une personne se tient à l’entrée éclairée d’une maison avec deux chiens, près de caisses de transport.',
    internal_links='[{"text":"page du projet","url":"/gardien-urgence"},{"text":"guide de déclaration professionnelle","url":"/actualites/devenir-gardien-pro-animalier"},{"text":"guide du profil gardien","url":"/actualites/creer-profil-gardien-attractif"},{"text":"conditions tarifaires","url":"/tarifs"},{"text":"guide des imprévus pendant une garde","url":"/actualites/gerer-imprevu-pendant-garde"},{"text":"guide de garde pendant une hospitalisation","url":"/actualites/faire-garder-animal-pendant-hospitalisation"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='devenir-gardien-urgence-guardiens' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 1 : % ligne au lieu de 1',affected; END IF;
END;
$guide_1$;

COMMIT;
