-- Refonte des guides page des tarifs, autorisée le 17/10/2026.
-- Les URL, auteurs, dates de publication et couvertures sont conservés.
BEGIN;
CREATE TABLE IF NOT EXISTS public._backup_articles_suite_lot01_20261017 AS SELECT * FROM public.articles WHERE false;
REVOKE ALL ON public._backup_articles_suite_lot01_20261017 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public._backup_articles_suite_lot01_20261017 TO service_role;
ALTER TABLE public._backup_articles_suite_lot01_20261017 ENABLE ROW LEVEL SECURITY;
SELECT id FROM public.articles WHERE id IN ('9ed3b734-059c-4ab4-8b7a-e93626de5f0a'::uuid,'a6982d18-ae4b-4527-825a-beb78ba0914c'::uuid) ORDER BY id FOR UPDATE;

DO $guide_0$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_0_20261017$# Accord de garde Guardiens : contenu, signature et limites

**L’accord de garde Guardiens est un document proposé après la confirmation d’une garde pour préciser le séjour et les engagements de chacun.** Il sert de référence pour les dates, le logement, les animaux s’il y en a, les consignes et les décisions à préparer. Les deux personnes peuvent le lire et choisir de le signer : **la signature est facultative**.

Un écrit aide à éviter les malentendus. Il ne remplace ni les échanges, ni les assurances, ni un avis juridique lorsqu’une situation particulière le demande. Voici ce qu’il faut vérifier avant de partir, y compris si vous avez déjà convenu de l’essentiel par messagerie.

**Dans ce guide :** [l’accès au document](#fonctionnement) · [son contenu](#contenu) · [les frais](#frais) · [la signature](#signature) · [le commodat](#commodat) · [les assurances et limites](#limites) · [les questions fréquentes](#faq).

## <a id="fonctionnement"></a>Quand l’accord de garde est-il proposé ?

Le document est proposé dans les espaces des deux parties après confirmation de la garde. Il concerne le séjour convenu entre le propriétaire et le gardien. Une discussion, une candidature ou une intention de garde ne correspond pas à elle seule à une confirmation.

Avant de le signer, relisez les dates et le contenu avec l’autre personne. Une information reprise automatiquement doit correspondre à votre organisation réelle. Si un contact, une règle ou une précision manque, complétez la préparation et conservez ce que vous avez convenu par écrit.

Le guide de la maison complète l’accord avec les informations pratiques. Vous trouverez une méthode dans notre [liste de préparation avant une garde](/actualites/preparer-maison-avant-garde).

## <a id="contenu"></a>Les informations à vérifier dans le document

| Point | Ce qu’il faut clarifier | Exemple de question |
| --- | --- | --- |
| Période et accès | Dates de début et de fin, arrivée, départ et remise des clés. | Que prévoit-on si mon retour est retardé ? |
| Animaux et tâches | Soins convenus, présence nécessaire et consignes du guide de la maison. | Les horaires sont-ils compatibles avec le traitement prescrit ? |
| Vie dans le logement | Pièces réservées, invités, tabac et équipements utilisés. | Quelles pièces et quels accès sont à disposition ? |
| Contacts | Vétérinaire, relais, contact d’urgence et façon de se joindre. | Qui peut agir si le propriétaire est injoignable ? |
| Dépenses | Achats autorisés, montants à convenir et justificatifs. | Quelles dépenses peut-on engager sans attendre une réponse ? |
| Fin du séjour | Départ, clés, état du logement et éventuel changement de dates. | Comment confirme-t-on un prolongement accepté par les deux ? |

Les informations pratiques dépendent de ce que vous avez renseigné et convenu. Un champ vide n’est pas une autorisation implicite. Une règle affichée « à confirmer » demande un échange avant le départ.

L’accord peut concerner une garde de maison sans animaux. Le gardien assure alors les tâches acceptées pour le logement, les plantes ou l’entretien courant. Le [guide de la garde de maison sans animaux](/actualites/garder-une-maison-ce-n-est-pas-garder-un-animal) explique cette formule.

## <a id="frais"></a>Soins vétérinaires et dépenses : convenir des montants

**Guardiens n’impose pas un plafond universel de frais vétérinaires ou de dépannage.** Les montants et la marche à suivre doivent être discutés entre les deux parties avant la garde. Ne supposez pas qu’une limite a été préremplie pour votre situation.

Précisez qui contacter, quels achats sont autorisés, comment garder les justificatifs et comment les frais convenus seront réglés. Pour un animal, laissez le vétérinaire habituel, le service de garde identifié, les documents utiles et un moyen de transport possible. Les consignes médicales viennent du vétérinaire.

**Exemple fictif à adapter :** « Si nous sommes injoignables, contactez notre relais et le vétérinaire indiqué. Nous convenons par messagerie du montant des dépenses que vous pouvez engager et de la transmission des justificatifs. » Complétez cet exemple avec votre organisation ; ce n’est pas une clause prête à signer pour toutes les gardes.

Une limite financière ne doit pas servir à retarder une demande d’avis vétérinaire. Préparez avec le professionnel la conduite à tenir pour les besoins particuliers de votre animal.

## <a id="signature"></a>Comment fonctionne la signature facultative ?

Chaque partie peut consulter le document dans son espace. L’interface demande d’en parcourir le contenu avant de proposer la signature. Le fait de faire défiler un texte ne dispense pas de le lire et de vérifier ce qu’il contient.

Vous pouvez choisir de ne pas signer. Ce choix est enregistré et visible de l’autre partie ; il reste possible de changer d’avis et de signer ensuite. Une personne qui a signé et une autre qui ne l’a pas fait ne doivent pas supposer qu’elles ont pris la même décision : vérifiez les statuts affichés et échangez si nécessaire.

La signature de l’accord ne remplace pas la confirmation de la garde. Elle ne signifie pas non plus qu’un prochain séjour est réservé. En cas de modification de dates ou de tâches, reconvenez ensemble de l’organisation et gardez une trace claire de la version retenue.

## <a id="commodat"></a>Pourquoi parle-t-on de commodat ou de prêt à usage ?

Le Code civil appelle « prêt à usage » ou commodat la mise à disposition d’un bien avec obligation de le rendre après l’usage prévu. Cette définition figure à [l’article 1875](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000020616173/2026-04-19). Le terme est donc utile pour comprendre la mise à disposition temporaire d’un logement.

Il ne suffit toutefois pas d’appeler un document « commodat » pour déterminer toutes les conséquences d’un séjour. La qualification dépend de la situation et de ce qui est réellement convenu. Le présent article explique l’outil proposé par Guardiens ; il ne tranche pas un litige, un statut d’occupation ou une situation de travail.

Écrire une date de fin donne un repère commun. Cela ne constitue pas une procédure automatique pour obtenir le départ d’une personne en cas de désaccord. Si un conflit survient, conservez l’accord et les échanges, puis demandez conseil à un professionnel compétent. Notre [guide du cadre juridique du house-sitting](/actualites/house-sitting-cadre-juridique-france) permet de préparer les questions utiles.

## <a id="limites"></a>Ce qu’il reste à préparer en plus de l’accord

Vérifiez les assurances avec les organismes concernés. [Service Public rappelle les vérifications propres au home-sitting](https://www.service-public.gouv.fr/particuliers/vosdroits/F21509) : couverture du logement, garanties du gardien et conditions de l’accueil. Un document signé ne crée pas une garantie absente du contrat d’assurance. Décrivez votre situation et demandez confirmation écrite des conditions applicables.

Préparez aussi la remise des clés, les consignes, les horaires de nouvelles et un relais qui a accepté d’intervenir si la garde s’interrompt. Aucun accord ne garantit à lui seul un séjour sans incident ou un remplaçant immédiat. Notre [guide de la confiance sur Guardiens](/actualites/securite-confiance-house-sitting) distingue les informations utiles de ces garanties.

La plateforme est actuellement 100 % gratuite pour les propriétaires et les gardiens, et le séjour se fait sans rémunération du gardien en échange de l’hébergement. Les dépenses convenues restent distinctes. Une participation aux frais d’infrastructure pourra être envisagée au plus tôt au second semestre 2027, avec un préavis de 30 jours ; les conditions à jour figurent sur la [page des tarifs](/tarifs).

## <a id="faq"></a>Questions fréquentes sur l’accord de garde

:::faq
### Est-il obligatoire de signer l’accord de garde Guardiens ?
Non, la signature est facultative. Le choix de ne pas signer est enregistré et visible de l’autre partie. Vous pouvez ensuite changer d’avis et signer. Avant le séjour, vérifiez que chacun comprend l’organisation retenue et les informations du document.

### À quel moment puis-je consulter l’accord ?
Il est proposé dans les espaces des deux parties après confirmation de la garde. Il concerne ce séjour et complète les consignes pratiques du guide de la maison. Vérifiez les dates, les tâches et les informations manquantes avant de décider de le signer.

### Y a-t-il un plafond automatique de frais vétérinaires ?
Non, aucun montant universel n’est imposé. Convenez avant la garde des dépenses autorisées, des contacts, de la conduite à tenir si le propriétaire est injoignable et de l’organisation des justificatifs et du règlement des frais.

### L’accord remplace-t-il une assurance habitation ou une responsabilité civile ?
Non. Il documente l’organisation du séjour et les engagements, mais ne crée pas une couverture d’assurance. Vérifiez les garanties et leurs conditions avec les assureurs concernés avant la garde, y compris pour les animaux et les dommages éventuels.

### Un accord signé garantit-il que je récupère le logement sans difficulté ?
Non. Les dates écrites donnent une référence commune, mais ne constituent pas une procédure automatique de règlement d’un conflit ou de départ d’un occupant. En cas de désaccord, conservez les documents et les échanges et demandez un conseil adapté à la situation.

### Peut-on utiliser l’accord pour une maison sans animaux ?
La garde peut concerner une maison sans animaux. Définissez alors les tâches du logement et de ses extérieurs, les dates, les accès et les dépenses à convenir. Les rubriques relatives aux animaux ne remplacent pas la description de ce besoin de garde.
:::$suite_content_0_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='9ed3b734-059c-4ab4-8b7a-e93626de5f0a'::uuid AND slug='commodat-garde-guardiens';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'Guide suite 0 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Accord de garde Guardiens : contenu, signature et limites'
    AND before_row.excerpt IS NOT DISTINCT FROM 'L’accord de garde rassemble les informations du séjour et les engagements de chacun. Vérifiez les dates, les consignes et les dépenses ; la signature reste facultative.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Accord de garde et commodat : le document Guardiens'
    AND before_row.meta_description IS NOT DISTINCT FROM 'À quoi sert l’accord de garde Guardiens ? Dates, tâches, consignes, frais, signature facultative et assurances : les points à vérifier avant le départ.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Illustration de deux mains se transmettant un trousseau de clés devant une porte.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"liste de préparation avant une garde","url":"/actualites/preparer-maison-avant-garde"},{"text":"guide de la garde de maison sans animaux","url":"/actualites/garder-une-maison-ce-n-est-pas-garder-un-animal"},{"text":"guide du cadre juridique du house-sitting","url":"/actualites/house-sitting-cadre-juridique-france"},{"text":"guide de la confiance sur Guardiens","url":"/actualites/securite-confiance-house-sitting"},{"text":"page des tarifs","url":"/tarifs"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 13:10:17.550291+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 0 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot01_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide chien-chat 0 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot01_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot01_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Accord de garde Guardiens : contenu, signature et limites',
    excerpt='L’accord de garde rassemble les informations du séjour et les engagements de chacun. Vérifiez les dates, les consignes et les dépenses ; la signature reste facultative.',
    meta_title='Accord de garde et commodat : le document Guardiens',
    meta_description='À quoi sert l’accord de garde Guardiens ? Dates, tâches, consignes, frais, signature facultative et assurances : les points à vérifier avant le départ.',
    hero_image_alt='Illustration de deux mains se transmettant un trousseau de clés devant une porte.',
    internal_links='[{"text":"liste de préparation avant une garde","url":"/actualites/preparer-maison-avant-garde"},{"text":"guide de la garde de maison sans animaux","url":"/actualites/garder-une-maison-ce-n-est-pas-garder-un-animal"},{"text":"guide du cadre juridique du house-sitting","url":"/actualites/house-sitting-cadre-juridique-france"},{"text":"guide de la confiance sur Guardiens","url":"/actualites/securite-confiance-house-sitting"},{"text":"page des tarifs","url":"/tarifs"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='commodat-garde-guardiens' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 0 : % ligne au lieu de 1',affected; END IF;
END;
$guide_0$;

DO $guide_1$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_1_20261017$# Sécurité en house-sitting : construire la confiance avant une garde

**Pour confier votre maison à un gardien, combinez plusieurs éléments : un profil cohérent, des échanges précis, des expériences pertinentes, des avis lorsqu’il y en a et une organisation écrite.** Les vérifications de Guardiens apportent des informations utiles, mais aucun badge ne garantit à lui seul une garde réussie. Vous gardez le choix de la personne à qui vous confiez vos clés.

Sur Guardiens, une personne séjourne chez vous et assure les tâches convenues, avec ou sans animaux, en échange de l’hébergement et sans rémunération. La plateforme est actuellement 100 % gratuite pour les propriétaires et les gardiens. Avec ma femme Elisa, nous l’avons créée après cinq ans de garde de maisons et d’animaux, pour développer ce réseau de confiance.

**Dans ce guide :** [les vérifications](#verifications) · [l’identité](#identite) · [les avis](#avis) · [les échanges](#echanges) · [les consignes et assurances](#preparation) · [les imprévus](#imprevus) · [les signalements](#signalements) · [les questions fréquentes](#faq).

## <a id="verifications"></a>Ce que les dispositifs de confiance vous permettent de vérifier

| Élément | Information utile | Limite à garder en tête |
| --- | --- | --- |
| Identité vérifiée | Un document d’identité a été fourni et contrôlé dans le parcours de la plateforme. | Ce contrôle ne certifie ni les compétences ni le comportement futur. |
| Profil et expériences | La personne décrit ce qu’elle sait faire et les gardes qu’elle peut assurer. | Une description ne remplace pas un échange sur votre besoin. |
| Avis et écussons | D’autres membres partagent leur expérience d’une garde. | Le contexte peut différer du vôtre ; les avis ne sont pas une garantie. |
| Accord et guide de la maison | Les dates, les tâches et les consignes servent de référence commune. | Un document ne remplace pas les assurances et les relais à préparer. |

Pour comparer des candidatures, partez de la disponibilité réelle et des tâches à assurer. Le guide pour [choisir un gardien de maison](/actualites/choisir-gardien-bons-criteres) détaille ces critères, sans déduire la fiabilité de l’âge, du métier ou du lieu de résidence.

## <a id="identite"></a>Que signifie le badge « Identité vérifiée » ?

Le parcours demande une pièce d’identité et propose un selfie facultatif pour compléter le dossier. Le statut affiché indique le résultat du contrôle dans la plateforme. Tous les profils ne disposent pas nécessairement de ce badge.

Il s’agit d’un signal parmi d’autres. Il ne certifie pas que la personne possède une compétence animalière, qu’elle saura gérer votre installation ou qu’aucun incident ne surviendra. Continuez à échanger sur les expériences et les contraintes qui concernent votre garde.

Transmettez les documents nécessaires à la vérification dans le parcours prévu. Une annonce publique n’a pas à contenir de pièce d’identité, de numéro personnel, de code d’accès ou de localisation détaillée d’objets de valeur.

## <a id="avis"></a>Comment lire les avis et les écussons ?

Après une garde, propriétaire et gardien peuvent laisser un avis. La publication suit une règle commune : lorsque les deux avis ont été déposés, ou après le délai prévu de 14 jours lorsqu’un seul a été déposé. Ce fonctionnement limite la lecture de l’avis de l’autre avant d’écrire le sien ; il ne rend pas une évaluation impossible à influencer.

Lisez les commentaires pour comprendre ce qui a été apprécié : respect des consignes, nouvelles, soin du logement, relation avec les animaux. Les écussons expriment également le retour d’un membre après une garde ; ils ne constituent pas une certification professionnelle.

Un profil récent sans avis peut correspondre à quelqu’un qui découvre la plateforme. Demandez quelles expériences sont pertinentes et comment la personne organiserait votre séjour. À l’inverse, de nombreux avis favorables ne dispensent pas de vérifier les contraintes particulières de votre maison ou de votre animal.

## <a id="echanges"></a>Les questions à poser avant de confirmer

Convenez des dates exactes, des horaires d’arrivée et de départ, des tâches acceptées et des temps sans présence. Une personne hébergée chez vous n’y reste pas automatiquement en permanence. Décrivez les traitements prescrits, les difficultés avec un animal, les accès et les équipements qui demandent une explication.

**Exemple fictif à adapter :** « Notre chien supporte habituellement des absences de deux heures. Votre planning permet-il de respecter ce rythme ? Si vous devez partir plus longtemps, quelle organisation pouvons-nous prévoir ? » Une question concrète permet de vérifier la compatibilité sans demander une promesse générale de disponibilité.

Vous pouvez échanger par messagerie, par appel ou en vidéo. Une rencontre est possible **si vous le souhaitez tous les deux**, sans être obligatoire sur Guardiens. Si certains points restent flous, clarifiez-les avant de confirmer ou poursuivez vos recherches.

## <a id="preparation"></a>Préparer les accès, les consignes et les assurances

Avant le départ, convenez de la remise des clés, des espaces accessibles, des règles de vie et de la fréquence des nouvelles. Laissez les contacts du vétérinaire, les instructions utiles et un relais qui a accepté son rôle. Notre [liste de préparation de la maison](/actualites/preparer-maison-avant-garde) aide à regrouper ces informations.

Après confirmation, le guide de la maison permet de partager les consignes et un [accord de garde](/actualites/commodat-garde-guardiens) est disponible ; sa signature est facultative. Vérifiez les informations reprises et complétez les points manquants ensemble.

L’assurance n’est pas automatique du seul fait d’utiliser Guardiens. [Service Public recommande de vérifier les garanties du home-sitting](https://www.service-public.gouv.fr/particuliers/vosdroits/F21509). Décrivez la situation à votre assureur et vérifiez les garanties du gardien, les exclusions, les franchises et les démarches en cas de dommage. Demandez une réponse écrite adaptée à votre situation. Pour la protection courante du logement, consultez le guide pour [sécuriser sa maison pendant une absence](/actualites/securiser-maison-absence-prolongee).

## <a id="imprevus"></a>Que se passe-t-il si la garde doit changer ?

**Le réseau de gardiens d’urgence est un projet à venir, pas un remplacement garanti disponible en quelques minutes.** La [page Gardien d’urgence](/gardien-urgence) présente le dispositif envisagé. N’organisez pas votre départ en supposant qu’il pourra prendre immédiatement le relais.

Avant de confirmer, prévoyez qui peut intervenir si la personne annule, doit partir plus tôt ou si votre retour est retardé. Vérifiez les clés, les coordonnées et la disponibilité de ce relais. En cas de changement, échangez rapidement avec l’autre partie et gardez une trace de ce qui est convenu.

Pour un problème de santé animale, contactez le vétérinaire prévu ou son service de garde. Pour un danger immédiat concernant une personne, contactez les secours compétents. Un message à la plateforme ne remplace pas une intervention d’urgence.

## <a id="signalements"></a>Signaler un problème ou bloquer un contact

Utilisez les options de signalement proposées sur le profil, l’annonce ou les échanges selon la situation. Décrivez les faits et conservez les messages utiles. Un signalement et un blocage ont des fonctions différentes : alerter l’équipe sur une situation, ou limiter les échanges avec un membre.

Ne supposez pas qu’un signalement entraîne une intervention immédiate, une décision favorable ou une indemnisation. Si un litige persiste, gardez les éléments factuels et contactez votre assureur ou un professionnel compétent selon le problème.

## <a id="faq"></a>Questions fréquentes sur la sécurité en house-sitting

:::faq
### Comment évaluer un gardien qui n’a pas encore d’avis ?
Examinez la précision du profil et échangez sur les expériences pertinentes, le planning et les tâches de votre garde. L’absence d’avis ne prouve pas un manque de fiabilité. Une rencontre est possible si vous le souhaitez tous les deux. Confirmez lorsque les points nécessaires sont clairs pour chacun.

### Le badge d’identité garantit-il une garde sans risque ?
Non. Il indique qu’un document d’identité a été fourni et contrôlé dans le parcours de la plateforme. Il ne certifie pas les compétences, la qualité de la garde ou l’absence d’incident. Complétez ce signal par vos échanges et la préparation du séjour.

### Faut-il rencontrer le gardien avant de lui confier les clés ?
La rencontre est possible si les deux personnes le souhaitent. Elle n’est pas obligatoire sur Guardiens. Vous pouvez aussi échanger à distance et préparer la transmission des clés et des consignes. Le choix doit correspondre à votre situation et à celle du gardien.

### Guardiens fournit-il automatiquement un remplaçant si le gardien annule ?
Non, aucun remplacement immédiat n’est garanti. Le réseau de gardiens d’urgence est un projet à venir. Préparez un relais qui a accepté d’aider et conservez une autre solution tant que la garde n’est pas confirmée.

### Mes objets et mon logement sont-ils assurés par la plateforme ?
Ne déduisez pas une couverture d’assurance de votre inscription ou de la confirmation d’une garde. Vérifiez votre contrat habitation, les garanties du gardien et les conditions applicables avec les assureurs concernés. L’accord de garde n’est pas une assurance.

### Comment signaler un comportement inapproprié ?
Utilisez l’option de signalement correspondant au profil, à l’annonce ou aux échanges et décrivez les faits. Conservez les éléments utiles. Pour un danger immédiat ou une urgence animale, contactez les services compétents sans attendre la réponse de la plateforme.

### La gratuité change-t-elle les vérifications à faire ?
Non. La plateforme est actuellement 100 % gratuite pour les deux rôles, mais les besoins, les tâches, les assurances et les dépenses se préparent avant la garde. Les conditions en vigueur et leur éventuelle évolution figurent sur la page des tarifs.
:::

Notre priorité reste de construire le réseau et d’améliorer le service avec vos retours. Une participation aux frais d’infrastructure pourra être envisagée au plus tôt au second semestre 2027, avec un préavis de 30 jours. Les conditions à jour sont sur la [page des tarifs](/tarifs).$suite_content_1_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='a6982d18-ae4b-4527-825a-beb78ba0914c'::uuid AND slug='securite-confiance-house-sitting';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/securite-confiance-house-sitting' THEN
    RAISE EXCEPTION 'Guide suite 1 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Sécurité en house-sitting : construire la confiance avant une garde'
    AND before_row.excerpt IS NOT DISTINCT FROM 'La confiance se prépare : comprenez les vérifications, échangez sur les besoins réels et convenez des accès, des assurances et d’un relais avant la garde.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Sécurité en house-sitting : comment ça marche'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Identité, avis, consignes, assurances et relais : les points à vérifier pour confier votre maison sur Guardiens, avec les limites de chaque dispositif.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Un chien doré pose la tête sur une table près d’un trousseau de clés.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"choisir un gardien de maison","url":"/actualites/choisir-gardien-bons-criteres"},{"text":"liste de préparation de la maison","url":"/actualites/preparer-maison-avant-garde"},{"text":"accord de garde","url":"/actualites/commodat-garde-guardiens"},{"text":"sécuriser sa maison pendant une absence","url":"/actualites/securiser-maison-absence-prolongee"},{"text":"page Gardien d’urgence","url":"/gardien-urgence"},{"text":"page des tarifs","url":"/tarifs"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-14 13:59:17.121368+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 1 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot01_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide chien-chat 1 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot01_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot01_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Sécurité en house-sitting : construire la confiance avant une garde',
    excerpt='La confiance se prépare : comprenez les vérifications, échangez sur les besoins réels et convenez des accès, des assurances et d’un relais avant la garde.',
    meta_title='Sécurité en house-sitting : comment ça marche',
    meta_description='Identité, avis, consignes, assurances et relais : les points à vérifier pour confier votre maison sur Guardiens, avec les limites de chaque dispositif.',
    hero_image_alt='Un chien doré pose la tête sur une table près d’un trousseau de clés.',
    internal_links='[{"text":"choisir un gardien de maison","url":"/actualites/choisir-gardien-bons-criteres"},{"text":"liste de préparation de la maison","url":"/actualites/preparer-maison-avant-garde"},{"text":"accord de garde","url":"/actualites/commodat-garde-guardiens"},{"text":"sécuriser sa maison pendant une absence","url":"/actualites/securiser-maison-absence-prolongee"},{"text":"page Gardien d’urgence","url":"/gardien-urgence"},{"text":"page des tarifs","url":"/tarifs"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='securite-confiance-house-sitting' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 1 : % ligne au lieu de 1',affected; END IF;
END;
$guide_1$;

COMMIT;
