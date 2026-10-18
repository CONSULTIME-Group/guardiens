-- Refonte des guides profil gardien et première garde, autorisée le 17/10/2026.
-- Les URL, auteurs, dates de publication et indexabilité sont conservés.
BEGIN;
CREATE TABLE IF NOT EXISTS public._backup_articles_suite_lot20_20261017 AS SELECT * FROM public.articles WHERE false;
REVOKE ALL ON public._backup_articles_suite_lot20_20261017 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public._backup_articles_suite_lot20_20261017 TO service_role;
ALTER TABLE public._backup_articles_suite_lot20_20261017 ENABLE ROW LEVEL SECURITY;
SELECT id FROM public.articles WHERE id IN ('0e0f3398-8392-4c11-b65d-bb64c0a3fc38'::uuid,'d5a83947-081b-4561-9cb2-d50a942c4380'::uuid) ORDER BY id FOR UPDATE;

DO $guide_0$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_0_20261017$# Créer un profil de gardien clair : photo, bio et expérience

**Un bon profil de gardien permet au propriétaire de comprendre qui vous êtes, ce que vous savez faire et si le séjour peut vous convenir.** Photo, bio, expérience et disponibilités doivent raconter la même chose. Vous n’avez pas besoin de vous présenter comme capable de tout : des limites précises aident aussi à préparer une garde.

Sur Guardiens, le house-sitting consiste à séjourner chez une personne pour veiller sur son logement et, s’il y en a, ses animaux, selon les tâches convenues. Le gardien est hébergé **sans rémunération**. La plateforme est **actuellement 100 % gratuite pour les deux rôles** ; transport et dépenses convenues restent distincts. Les [conditions actuelles](/tarifs) précisent ce fonctionnement.

**Repères :** [choisir les photos](#photos), [rédiger la bio](#bio), [décrire l’expérience](#experience), [indiquer les disponibilités](#disponibilites), [comprendre l’identité contrôlée](#identite), [adapter la candidature](#candidature), [questions fréquentes](#faq).

## <a id="photos"></a>Quelles photos utiliser pour votre profil ?

Choisissez une photo nette où l’on vous reconnaît. Si vous proposez un séjour à plusieurs, expliquez qui participera ; une photo de groupe seule ne permet pas de comprendre qui écrit. Une image avec un animal peut illustrer votre quotidien, sans prouver une expérience de garde à elle seule.

Pour la galerie, privilégiez des images utiles à votre présentation. Utilisez des photos que vous pouvez partager et respectez l’accord des personnes concernées. Évitez les informations privées d’un logement, les documents d’identité et les coordonnées visibles. Les documents de vérification se transmettent dans l’espace prévu à cet effet, pas dans la bio ou la galerie publique.

Une photo facilite la présentation. Le propriétaire s’appuie aussi sur votre expérience, les échanges et la compatibilité du séjour pour faire son choix.

## <a id="bio"></a>Que dire dans une bio de gardien ?

Présentez votre situation avec ce qui compte pendant un séjour : votre organisation, les animaux ou tâches que vous connaissez et vos contraintes. Donnez suffisamment d’informations pour ouvrir la discussion, sans publier un récit complet de votre vie.

Une trame à adapter à votre expérience réelle :

- **Ma situation :** je propose des gardes seul, en couple ou avec les personnes indiquées dans mon profil.
- **Mon expérience :** je décris les animaux et les gestes dont je me suis réellement occupé.
- **Mon organisation :** je précise mes horaires de travail, mes déplacements et la présence que je peux envisager.
- **Mes limites :** je cite les tâches ou situations que je ne peux pas prendre en charge.

Remplacez les formules générales par des faits. Avoir déjà nourri le chat d’un proche et nettoyé sa litière est une expérience à décrire pour ce qu’elle est. Cela ne signifie pas que vous avez déjà assuré un séjour avec plusieurs animaux ou un traitement complexe.

## <a id="experience"></a>Comment présenter ses compétences sans les exagérer ?

Distinguez ce que vous avez fait seul, avec de l’aide et ce que vous découvrez encore. Vous pouvez débuter en house-sitting tout en ayant une expérience personnelle avec certains animaux ; dites précisément laquelle.

| Sujet du profil | Information utile |
| --- | --- |
| Animaux | Espèces, habitudes et gestes réellement connus ; situations que vous n’avez pas pratiquées. |
| Soins | Expérience d’un soin prescrit, si elle existe, et besoin d’explications avant de l’accepter. |
| Maison et plantes | Tâches courantes que vous savez assurer, sans proposer implicitement une réparation technique. |
| Formation | Intitulé réel et ce qu’elle couvre ; ne la présentez pas comme une autorisation universelle. |
| Mobilité | Déplacements possibles et conditions pratiques, sans supposer qu’un permis garantit un véhicule disponible. |

Les compétences de jardinage ou de bricolage servent à préparer l’échange, pas à promettre tout l’entretien d’un logement. Si vous débutez complètement, indiquez-le et cherchez une garde dont les besoins correspondent à vos possibilités. Le [guide pour devenir home-sitter](/actualites/comment-devenir-home-sitter-france-guide-debutant) reprend le parcours général.

## <a id="disponibilites"></a>Disponibilité affichée et présence pendant la garde

Tenez à jour vos zones de déplacement, vos préférences et vos disponibilités dans le profil. Le réglage **« Je suis disponible »** exprime une disponibilité générale : il ne confirme pas à lui seul votre présence pour toutes les dates d’une annonce.

Pour un séjour donné, discutez de vos horaires, de vos absences, du transport et des besoins de l’animal. Le télétravail n’est pas une disponibilité permanente pour sortir un chien ou interrompre une réunion. Notre [guide du house-sitting en télétravail](/actualites/boom-pet-sitting-lyon-2026) aide à vérifier cette compatibilité.

Ne promettez pas une présence précise uniquement pour rendre la bio plus rassurante. Vérifiez d’abord que vous pouvez la tenir pendant tout le séjour, avec les autres personnes concernées.

## <a id="identite"></a>Que signifie l’écusson d’identité ?

L’écusson indique qu’un document d’identité a été contrôlé dans le parcours prévu. **Il ne certifie ni les compétences, ni l’expérience, ni la fiabilité d’une personne.** Les avis, lorsqu’ils existent, complètent la lecture du profil sans remplacer l’échange.

Ne supposez pas un délai fixe de validation ou une première place dans les résultats après ce contrôle. Suivez les indications affichées dans votre espace. Si le site vous demande de compléter des éléments avant une candidature, utilisez le parcours proposé ; le score de complétion ne mesure pas votre valeur ni votre aptitude à toute garde.

Le [guide de confiance](/actualites/securite-confiance-house-sitting) précise les vérifications et les points à discuter des deux côtés.

## <a id="candidature"></a>Relier votre profil à l’annonce choisie

Le profil donne le contexte. Dans votre candidature, répondez au besoin de cette annonce : dates, tâches, présence et conditions de séjour. Signalez ce qui reste à clarifier plutôt que d’envoyer la même promesse à tout le monde.

Une rencontre est possible **si les deux personnes le souhaitent**. Ne confirmez pas un séjour dont les responsabilités dépassent vos moyens ; les [conseils de première garde](/actualites/reussir-premiere-garde-house-sitting) aident à préparer la suite. Un profil complet ne garantit pas de réponse ou de sélection.

## <a id="faq"></a>Questions fréquentes

:::faq
### Peut-on créer un profil gardien sans expérience de house-sitting ?
Oui. Décrivez honnêtement votre expérience réelle, y compris personnelle ou informelle, et vos limites. Cherchez ensuite une garde adaptée à vos possibilités, sans garantie de sélection.

### Faut-il avoir déjà possédé un animal ?
La possession d’un animal ne prouve pas à elle seule une compétence de garde, et une garde de maison peut ne pas comporter d’animaux. Présentez les gestes que vous savez réellement assurer.

### Le télétravail est-il un avantage à promettre dans la bio ?
Présentez vos horaires et contraintes réels. Être dans le logement ne signifie pas pouvoir répondre immédiatement à chaque besoin ; vérifiez l’organisation avec le propriétaire pour le séjour concerné.

### L’identité contrôlée garantit-elle l’obtention d’une garde ?
Non. Elle correspond à un contrôle de document et ne garantit ni compétence ni sélection. Les échanges et l’adéquation au besoin restent nécessaires.

### Que faut-il mettre à jour avant de postuler ?
Vos disponibilités, votre présentation, vos déplacements possibles et les informations devenues inexactes. Adaptez ensuite le message à l’annonce choisie.
:::$suite_content_0_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='0e0f3398-8392-4c11-b65d-bb64c0a3fc38'::uuid AND slug='creer-profil-gardien-attractif';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/creer-profil-gardien-attractif' THEN
    RAISE EXCEPTION 'Guide suite 0 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Créer un profil de gardien clair : photo, bio et expérience'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Un profil précis aide à comprendre ce que vous pouvez assurer pendant une garde. Présentez votre expérience, vos disponibilités et vos limites, même si vous débutez.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Profil gardien : photo, bio, expérience et disponibilités'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Préparez votre profil de gardien : photo, bio, expérience réelle et disponibilités. Des conseils pour échanger clairement avec les propriétaires.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Une personne assise sur un canapé avec un chien et un chat se trouve face à un appareil photo sur trépied.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"conditions actuelles","url":"/tarifs"},{"text":"guide pour devenir home-sitter","url":"/actualites/comment-devenir-home-sitter-france-guide-debutant"},{"text":"guide du house-sitting en télétravail","url":"/actualites/boom-pet-sitting-lyon-2026"},{"text":"guide de confiance","url":"/actualites/securite-confiance-house-sitting"},{"text":"conseils de première garde","url":"/actualites/reussir-premiere-garde-house-sitting"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 14:55:16.681954+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 0 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot20_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 0 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot20_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot20_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Créer un profil de gardien clair : photo, bio et expérience',
    excerpt='Un profil précis aide à comprendre ce que vous pouvez assurer pendant une garde. Présentez votre expérience, vos disponibilités et vos limites, même si vous débutez.',
    meta_title='Profil gardien : photo, bio, expérience et disponibilités',
    meta_description='Préparez votre profil de gardien : photo, bio, expérience réelle et disponibilités. Des conseils pour échanger clairement avec les propriétaires.',
    hero_image_alt='Une personne assise sur un canapé avec un chien et un chat se trouve face à un appareil photo sur trépied.',
    internal_links='[{"text":"conditions actuelles","url":"/tarifs"},{"text":"guide pour devenir home-sitter","url":"/actualites/comment-devenir-home-sitter-france-guide-debutant"},{"text":"guide du house-sitting en télétravail","url":"/actualites/boom-pet-sitting-lyon-2026"},{"text":"guide de confiance","url":"/actualites/securite-confiance-house-sitting"},{"text":"conseils de première garde","url":"/actualites/reussir-premiere-garde-house-sitting"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='creer-profil-gardien-attractif' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 0 : % ligne au lieu de 1',affected; END IF;
END;
$guide_0$;

DO $guide_1$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_1_20261017$# Première garde de house-sitting : préparer l’arrivée, le séjour et le retour

**Pour une première garde, choisissez un séjour dont vous comprenez les responsabilités et que vous pouvez réellement assurer.** Les dates et le logement ne suffisent pas : il faut convenir des tâches, des soins éventuels, des moments de présence et de la conduite à tenir si quelque chose change.

Vous n’avez pas à tout savoir dès le premier échange. Posez les questions nécessaires avant de confirmer et dites ce qui dépasse votre expérience. Si vous cherchez encore comment commencer, le [guide pour devenir home-sitter](/actualites/comment-devenir-home-sitter-france-guide-debutant) reprend les bases.

**Repères :** [avant confirmation](#confirmation), [préparer l’arrivée](#arrivee), [les premiers moments avec les animaux](#animaux), [donner des nouvelles](#nouvelles), [terminer la garde](#retour), [questions fréquentes](#faq).

## <a id="confirmation"></a>Quelles questions poser avant de confirmer ?

Commencez par les conditions qui peuvent rendre le séjour incompatible avec votre organisation :

- dates exactes, arrivée, départ et possibilité réelle d’adaptation si elles changent ;
- animaux, routines, soins prescrits, sorties et moments de présence nécessaires ;
- tâches de maison, plantes et entretien courant, avec ce qui n’est pas inclus ;
- chambre, pièces accessibles, connexion et conditions de séjour ;
- transport, courses et solution de déplacement vers le vétérinaire ;
- autres personnes ou animaux qui vous accompagneraient, à convenir avant le séjour.

Pour chaque geste inconnu, demandez une explication puis vérifiez si vous pouvez l’assurer. Une annonce agréable ne vous oblige pas à accepter une responsabilité technique ou un soin que vous ne maîtrisez pas. Le [guide des comportements difficiles pendant une garde](/actualites/gerer-animaux-difficiles-garde) aide aussi à préparer les limites et le recours à un professionnel.

Sur Guardiens, le gardien est **hébergé sans rémunération**. La plateforme est **actuellement 100 % gratuite pour les deux rôles** ; transport, nourriture des animaux, consommables et soins restent des dépenses distinctes à convenir. Consultez les [conditions actuelles](/tarifs). Le séjour doit convenir aux deux personnes.

## <a id="arrivee"></a>Comment préparer une arrivée qui laisse le temps de comprendre ?

Une rencontre peut être proposée **si les deux personnes le souhaitent**. Quelle que soit l’organisation choisie, convenez d’une passation permettant de comprendre le logement et les gestes nécessaires. Une visite n’est pas une condition systématique, et un appel seul ne garantit pas que toute question pratique est réglée.

| Avant le départ du propriétaire | Ce qu’il faut pouvoir retrouver ensuite |
| --- | --- |
| Clés et accès | Entrée, pièces autorisées, fermeture et restitution prévues. |
| Animaux, s’il y en a | Consignes individuelles, alimentation, prescriptions et équipement habituel. |
| Maison et plantes | Gestes convenus, matériel et notices utiles, sans réparation improvisée. |
| Contacts | Propriétaire, vétérinaire habituel, service de garde, transport et relais qui a accepté. |
| Dépenses et imprévus | Décisions à discuter, frais possibles et personne à prévenir. |

Consultez le guide de la maison lorsqu’il est disponible et complétez les informations manquantes avec le propriétaire. Notez les consignes dans un support accessible pendant le séjour ; ne supposez pas qu’un numéro ou une prescription se retrouvera au dernier moment.

Après confirmation sur Guardiens, un accord est proposé et **sa signature est facultative**. Il ne remplace pas les explications pratiques ni la vérification des assurances adaptées à la situation. Le [guide d’accueil du gardien](/actualites/accueillir-gardien-bonnes-pratiques) complète la préparation de la passation.

## <a id="animaux"></a>Le premier soir : observer sans tout attribuer au changement de gardien

Suivez les consignes convenues et laissez à l’animal la possibilité de garder ses repères. Ne forcez pas le contact ni une sortie plus ambitieuse pour faire connaissance. Il n’existe pas de délai de 24 ou 48 heures au terme duquel tous les animaux acceptent une nouvelle personne.

**Une baisse d’appétit, un animal qui se cache davantage ou un comportement inhabituel ne doivent pas être automatiquement considérés comme normaux.** Décrivez ce que vous observez, prévenez le propriétaire et demandez un avis vétérinaire selon la situation. [Cats Protection rappelle notamment qu’un chat qui se cache plus que d’habitude peut être malade](https://www.cats.org.uk/help-and-advice/cat-behaviour/cats-hiding) ; ne le faites pas sortir de force pour vérifier qu’il vous apprécie.

Si l’animal vomit, semble abattu, est blessé, convulse ou respire difficilement, contactez un vétérinaire pour être orienté. Le [service vétérinaire VetoAdom explique que l’évaluation de l’urgence se fait avec un vétérinaire régulateur](https://www.vetoadom-alpin.com/urgence-veterinaire.php). **N’attendez pas que le propriétaire réponde pour demander cet avis.** Préparez les informations observables et suivez les consignes reçues, sans médicament ni protocole improvisé.

Le [guide des imprévus pendant une garde](/actualites/gerer-imprevu-pendant-garde) aide à organiser contacts, accès et relais. Si vous ne pouvez plus assurer les soins ou la sécurité, demandez de l’aide et préparez une solution avec les personnes concernées ; un remplacement immédiat par la plateforme n’est pas garanti.

## <a id="nouvelles"></a>À quelle fréquence donner des nouvelles ?

Convenez avant le départ du rythme, du canal et du contenu attendus. Un message à l’arrivée puis des nouvelles aux moments choisis peuvent suffire à votre organisation ; il n’existe pas de fréquence universelle qui prouve à elle seule une bonne garde.

Distinguez les nouvelles habituelles d’un changement à signaler. Une difficulté de santé, d’accès au logement ou de présence ne doit pas attendre le prochain message prévu. Restez factuel : ce qui s’est passé, ce que vous avez observé et l’aide déjà sollicitée.

N’envoyez pas des images ou des informations privées du logement à d’autres personnes sans accord. Pour toute nouvelle tâche, visite ou absence imprévue de votre côté, échangez avant de modifier l’organisation convenue.

## <a id="retour"></a>Comment terminer la garde et faire un retour utile ?

Confirmez l’horaire de fin, la passation et la restitution des clés. Ne supposez pas que le retour du propriétaire sera à l’heure initiale : si cela change, vérifiez les disponibilités et le relais accepté avant de partir.

Rendez le logement dans l’état convenu, signalez un objet abîmé ou une difficulté et transmettez les informations utiles sur les animaux, les plantes et les dépenses. Un problème se décrit à la personne concernée avant de devenir seulement un commentaire public.

Lorsqu’un avis peut être laissé, racontez honnêtement l’organisation du séjour et les points utiles à une future garde. N’inventez pas de délai obligatoire de 48 heures, de récompense automatique ou de nombre de gardes futures conditionné par ce premier avis. Les retours servent à comprendre l’expérience, pas à obtenir une note promise.

## <a id="faq"></a>Questions fréquentes

:::faq
### Comment choisir une première garde de maison ?
Cherchez un séjour dont les dates, tâches, animaux éventuels et conditions de logement correspondent à vos possibilités. Clarifiez les points inconnus et refusez ou adaptez ce que vous ne pouvez pas assurer.

### Faut-il obligatoirement rencontrer le propriétaire avant la garde ?
La rencontre est possible si les deux personnes le souhaitent. Dans tous les cas, prévoyez une passation et des consignes suffisantes pour comprendre les responsabilités avant le départ.

### Faut-il attendre 24 à 48 heures si un animal mange moins ou se cache ?
Ne présentez pas ces changements comme automatiquement normaux. Signalez vos observations et demandez un avis vétérinaire adapté à la situation, sans attendre une réponse du propriétaire si l’état de l’animal inquiète.

### Quand donner des nouvelles pendant le séjour ?
Au rythme et par le canal convenus ensemble. Un changement de santé, de sécurité ou d’organisation se signale sans attendre le prochain message habituel.

### L’accord de garde doit-il être signé avant de pouvoir garder ?
Un accord est proposé après confirmation sur Guardiens, mais sa signature est facultative. Les responsabilités, consignes et conditions pratiques restent à convenir clairement.

### Le premier avis garantit-il de trouver d’autres gardes ?
Non. Un avis décrit une expérience lorsqu’il existe ; il ne garantit ni sélection future ni disponibilité d’autres séjours.
:::$suite_content_1_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='d5a83947-081b-4561-9cb2-d50a942c4380'::uuid AND slug='reussir-premiere-garde-house-sitting';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/reussir-premiere-garde-house-sitting' THEN
    RAISE EXCEPTION 'Guide suite 1 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Première garde de house-sitting : préparer l’arrivée, le séjour et le retour'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Une première garde se prépare avec des tâches claires, des consignes accessibles et un relais accepté. Les points à vérifier avant, pendant et après le séjour.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Première garde de house-sitting : les étapes à préparer'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Préparez votre première garde de maison : tâches, consignes, animaux, nouvelles et retour des clés. Les décisions à convenir avant de confirmer le séjour.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Une personne prépare un sac de voyage dans un salon, près d’un chien roux.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"guide pour devenir home-sitter","url":"/actualites/comment-devenir-home-sitter-france-guide-debutant"},{"text":"guide des comportements difficiles pendant une garde","url":"/actualites/gerer-animaux-difficiles-garde"},{"text":"conditions actuelles","url":"/tarifs"},{"text":"guide d’accueil du gardien","url":"/actualites/accueillir-gardien-bonnes-pratiques"},{"text":"guide des imprévus pendant une garde","url":"/actualites/gerer-imprevu-pendant-garde"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 15:10:15.650597+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 1 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot20_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 1 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot20_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot20_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Première garde de house-sitting : préparer l’arrivée, le séjour et le retour',
    excerpt='Une première garde se prépare avec des tâches claires, des consignes accessibles et un relais accepté. Les points à vérifier avant, pendant et après le séjour.',
    meta_title='Première garde de house-sitting : les étapes à préparer',
    meta_description='Préparez votre première garde de maison : tâches, consignes, animaux, nouvelles et retour des clés. Les décisions à convenir avant de confirmer le séjour.',
    hero_image_alt='Une personne prépare un sac de voyage dans un salon, près d’un chien roux.',
    internal_links='[{"text":"guide pour devenir home-sitter","url":"/actualites/comment-devenir-home-sitter-france-guide-debutant"},{"text":"guide des comportements difficiles pendant une garde","url":"/actualites/gerer-animaux-difficiles-garde"},{"text":"conditions actuelles","url":"/tarifs"},{"text":"guide d’accueil du gardien","url":"/actualites/accueillir-gardien-bonnes-pratiques"},{"text":"guide des imprévus pendant une garde","url":"/actualites/gerer-imprevu-pendant-garde"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='reussir-premiere-garde-house-sitting' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 1 : % ligne au lieu de 1',affected; END IF;
END;
$guide_1$;

COMMIT;
