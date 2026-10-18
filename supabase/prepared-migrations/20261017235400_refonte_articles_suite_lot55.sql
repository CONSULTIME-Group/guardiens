-- Refonte des guides cohérence juridique et promenades lyonnaises, autorisée le 17/10/2026.
-- Les URL, auteurs, dates de publication et indexabilité sont conservés.
BEGIN;
CREATE TABLE IF NOT EXISTS public._backup_articles_suite_lot55_20261017 AS SELECT * FROM public.articles WHERE false;
REVOKE ALL ON public._backup_articles_suite_lot55_20261017 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public._backup_articles_suite_lot55_20261017 TO service_role;
ALTER TABLE public._backup_articles_suite_lot55_20261017 ENABLE ROW LEVEL SECURITY;
SELECT id FROM public.articles WHERE id IN ('25bbd1ca-5cce-48b6-8d5b-e8d76a5bb8e8'::uuid,'e2f7c52d-ad81-4aa9-82b3-9d3f74e7d3b3'::uuid) ORDER BY id FOR UPDATE;

DO $guide_0$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_0_20261017$# House-sitting en France : contrat, assurance et responsabilités

**Avant de confier un logement en house-sitting en France, vérifiez votre droit de l’accueillir, les assurances des deux parties et les conditions de la garde.** Le nom de la pratique, l’absence de rémunération ou un accord téléchargé ne suffisent pas à déterminer toutes les responsabilités.

Le gardien séjourne dans le logement pendant votre absence et assure la présence et les tâches acceptées, avec ou sans animaux. Ce guide aide à préparer les questions et les documents ; une situation particulière ou un litige demande une analyse de ses faits et contrats.

**Repères :** [qualification et logement](#cadre), [accord écrit](#accord), [assurances](#assurances), [animaux](#animaux), [frais et imprévus](#imprevus), [fin de garde](#fin), [questions fréquentes](#faq).

## <a id="cadre"></a>Le house-sitting est-il automatiquement un prêt à usage ?

Le prêt à usage, aussi appelé commodat, est une référence à examiner pour une mise à disposition de logement. Les [articles 1875 et 1876 du Code civil](https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070721/LEGISCTA000006150308/) décrivent une mise à disposition avec restitution et un prêt essentiellement gratuit.

Cela ne permet pas de classer automatiquement toute garde de maison dans ce seul régime. Les engagements réels, les services attendus et les contreparties doivent être examinés. Un intitulé « commodat » ne résout pas à lui seul une difficulté de qualification, d’assurance ou de rémunération.

Sur Guardiens, le gardien est hébergé **sans rémunération**. La plateforme est **actuellement 100 % gratuite** pour les propriétaires et les gardiens. Les dépenses convenues restent distinctes. Une participation aux frais d’infrastructure pourrait être envisagée au plus tôt au second semestre 2027, avec au moins trente jours d’information préalable ; consultez les [conditions tarifaires](/tarifs). Aucun montant ou changement certain n’est annoncé ici.

## Ai-je le droit de confier ce logement ?

Le propriétaire vérifie les contraintes applicables à son logement, notamment les assurances, les accès et les règles du bâtiment. Si plusieurs personnes ont des droits sur le bien, clarifiez l’accord nécessaire avant d’organiser une occupation temporaire.

Pour un locataire, la [fiche Service Public consacrée au home-sitting](https://www.service-public.gouv.fr/particuliers/vosdroits/F21509) indique d’obtenir l’autorisation écrite du bailleur et d’informer son assureur. Vérifiez votre situation et votre bail ; ne supposez pas qu’une occupation sans paiement écarte toute condition.

Un départ à l’étranger ou une résidence secondaire ne supprime pas ces vérifications. Ce guide porte sur un logement en France ; pour une garde dans un autre pays, vérifiez les règles locales et la portée territoriale des assurances.

## <a id="accord"></a>Que mettre dans l’accord de garde ?

Service Public recommande un écrit signé pour préciser les conditions, sans présenter un contrat écrit comme une obligation générale du home-sitting. Sur Guardiens, l’accord de garde se prépare **après confirmation** ; sa signature est facultative. Son intérêt est de rendre les attentes compréhensibles, pas de garantir une indemnisation ou l’absence de litige.

| Sujet | Ce qu’il faut convenir |
| --- | --- |
| Occupation | Personnes accueillies, dates, remise et restitution des clés. |
| Présence | Nuitées, absences possibles et limites de surveillance. |
| Tâches | Animaux éventuels, plantes, courrier et gestes acceptés. |
| Dépenses | Achats autorisés, justificatifs, avance et remboursement. |
| Imprévus | Contacts, relais accepté, interruption et information de l’autre. |
| Assurances | Contrats interrogés, garanties confirmées et documents utiles. |

Être logé sur place ne signifie pas assurer une présence permanente. Une rencontre préalable est possible **si vous le souhaitez tous les deux**. Elle ne remplace ni les consignes ni la vérification des capacités. La [checklist de préparation de la maison](/actualites/preparer-maison-avant-garde) aide à organiser la passation.

## <a id="assurances"></a>Quelles assurances faire confirmer avant la garde ?

Informez votre assureur habitation de la présence du gardien, des dates et des tâches. Demandez une réponse écrite portant sur cette situation précise. La fiche Service Public F21509 aborde la clause de villégiature du propriétaire et la responsabilité civile du home-sitter ; l’intitulé d’une garantie ne suffit pas à connaître toutes ses conditions.

Le gardien interroge aussi son assureur sur le séjour chez un tiers, les dommages au logement, les biens confiés et les animaux éventuels. Une attestation de responsabilité civile ne prouve pas que chaque dommage ou chaque activité est couvert. Si une extension est nécessaire, réglez ce point avant le départ.

Posez notamment ces questions :

- Les personnes, la durée, le logement et les tâches décrits sont-ils couverts ?
- Quelles exclusions, franchises et limites d’indemnisation s’appliquent ?
- Que se passe-t-il pour les biens confiés, les clés, l’animal ou une blessure du gardien ?
- Quelles démarches et pièces seront nécessaires en cas de sinistre ?

La [fiche sur la responsabilité civile habitation](https://www.service-public.gouv.fr/particuliers/vosdroits/F2123) distingue les garanties et leurs exclusions. Sur Guardiens, aucune assurance de plateforme n’est présentée comme incluse. Un accord entre membres ne lie pas automatiquement un assureur ou une victime.

## <a id="animaux"></a>Qui répond des dommages causés par l’animal ?

L’[article 1243 du Code civil](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000032041553/) vise le propriétaire ou la personne qui se sert de l’animal pendant son usage. Ne déduisez pas de la seule présence d’un gardien que toute responsabilité lui est automatiquement transférée.

Décrivez à vos assureurs les conditions réelles de prise en charge. La [fiche Service Public sur l’assurance des animaux](https://www.service-public.gouv.fr/particuliers/vosdroits/F17603) rappelle la responsabilité liée aux dommages et les règles particulières des chiens catégorisés. Vérifiez les garanties applicables à l’animal confié, plutôt qu’une responsabilité supposée unique pour tous les incidents.

Transmettez les réactions connues, les antécédents et les situations à éviter. Un document d’identité contrôlé ne certifie pas une compétence. Les avis, lorsqu’ils existent, ne remplacent pas l’échange sur les capacités et les limites. Le [guide de choix d’un gardien](/actualites/choisir-gardien-bons-criteres) aide à poser ces questions.

## <a id="imprevus"></a>Soins vétérinaires, casse ou panne : que prévoir ?

Pour l’animal, laissez le contact du vétérinaire, l’ordonnance éventuelle, le transport prévu et les consignes d’urgence. Convenez des achats et frais qui peuvent être engagés, de l’avance et du remboursement. **Une urgence vétérinaire ne doit pas attendre une réponse du propriétaire** : contactez le vétérinaire et suivez ses instructions.

Un accord préalable facilite l’organisation, sans décider à lui seul de tout remboursement litigieux. Ne rattachez pas automatiquement les frais vétérinaires à une disposition sur les dépenses de conservation d’une chose prêtée. En cas de désaccord, conservez les consignes, justificatifs et échanges pour une analyse adaptée.

Pour un dommage ou une panne, protégez les personnes, appelez le professionnel utile et informez l’autre partie. Documentez les faits et contactez les assureurs concernés selon leurs consignes. L’origine du problème, les engagements et les contrats comptent : une casse, une usure et un défaut d’entretien ne produisent pas nécessairement les mêmes conséquences.

## <a id="fin"></a>Annulation ou refus de départ : quelle préparation utile ?

Convenez des dates, de la restitution des clés et du relais en cas d’interruption. Une plateforme ou une nouvelle annonce ne garantit pas un remplacement ; le propriétaire conserve une autre organisation possible.

Si un désaccord sur l’occupation survient, gardez les documents et demandez rapidement conseil à un professionnel du droit. La [fiche Service Public sur le squat](https://www.service-public.gouv.fr/particuliers/vosdroits/F35254) distingue notamment le cas d’une personne initialement hébergée. Ne promettez pas une procédure accélérée, un délai unique ou l’application systématique de la trêve hivernale à partir du seul mot « house-sitting ». N’organisez pas vous-même une expulsion par la force.

## <a id="faq"></a>Questions fréquentes

:::faq
### Un contrat écrit est-il obligatoire pour un house-sitting ?
Service Public recommande un écrit signé sans en faire une obligation générale. Sur Guardiens, l’accord se prépare après confirmation et sa signature est facultative. Dates, présence, tâches, frais et relais gagnent à être explicités.

### Une assurance habitation suffit-elle toujours ?
Non. Décrivez la garde à l’assureur et faites confirmer les garanties pour le logement, les personnes et les tâches. Le gardien vérifie aussi sa couverture ; une extension peut être nécessaire.

### Le gardien devient-il automatiquement responsable de l’animal ?
Ne présumez pas d’un transfert automatique. Les conditions réelles, les règles de responsabilité et les garanties doivent être examinées selon les faits. Informez les assureurs de l’organisation prévue.

### Un locataire peut-il organiser une garde dans son logement ?
La fiche Service Public sur le home-sitting indique d’obtenir l’autorisation écrite du bailleur et d’informer l’assureur. Vérifiez votre bail et les conditions propres à votre situation avant de confirmer.

### Qui avance les frais vétérinaires ?
Convenez avant le départ des dépenses autorisées, de l’avance, des justificatifs et du remboursement. En urgence, contactez d’abord le vétérinaire et suivez ses consignes sans attendre la réponse du propriétaire.

### Que faire si le gardien ne quitte pas le logement à la date prévue ?
Conservez les échanges et l’accord, puis demandez rapidement conseil à un professionnel du droit. La qualification et la procédure dépendent des faits ; ne tentez pas une expulsion par la force.
:::$suite_content_0_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='25bbd1ca-5cce-48b6-8d5b-e8d76a5bb8e8'::uuid AND slug='house-sitting-cadre-juridique-france';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS DISTINCT FROM false
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/house-sitting-cadre-juridique-france' THEN
    RAISE EXCEPTION 'Guide suite 0 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'House-sitting en France : contrat, assurance et responsabilités'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Avant de confier un logement, clarifiez le droit d’accueil, les assurances et les conditions de garde. Des repères concrets pour préparer vos questions.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'House-sitting : contrat, assurance et responsabilités'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Prêt à usage, accord écrit, assurances, animaux et imprévus : les vérifications utiles avant une garde de maison en France, avec les sources officielles.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Deux personnes se serrent la main à une table avec des documents, des clés et une laisse dans un salon.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"conditions tarifaires","url":"/tarifs"},{"text":"checklist de préparation de la maison","url":"/actualites/preparer-maison-avant-garde"},{"text":"guide de choix d’un gardien","url":"/actualites/choisir-gardien-bons-criteres"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 14:55:16.673503+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 0 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot55_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 0 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot55_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot55_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='House-sitting en France : contrat, assurance et responsabilités',
    excerpt='Avant de confier un logement, clarifiez le droit d’accueil, les assurances et les conditions de garde. Des repères concrets pour préparer vos questions.',
    meta_title='House-sitting : contrat, assurance et responsabilités',
    meta_description='Prêt à usage, accord écrit, assurances, animaux et imprévus : les vérifications utiles avant une garde de maison en France, avec les sources officielles.',
    hero_image_alt='Deux personnes se serrent la main à une table avec des documents, des clés et une laisse dans un salon.',
    internal_links='[{"text":"conditions tarifaires","url":"/tarifs"},{"text":"checklist de préparation de la maison","url":"/actualites/preparer-maison-avant-garde"},{"text":"guide de choix d’un gardien","url":"/actualites/choisir-gardien-bons-criteres"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='house-sitting-cadre-juridique-france' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 0 : % ligne au lieu de 1',affected; END IF;
END;
$guide_0$;

DO $guide_1$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_1_20261017$# Parcs pour chiens à Lyon : accès, laisse et aires de liberté

Pour promener votre chien à Lyon, repérez les parcs de la Tête d'Or, de Parilly ou les berges du Rhône, puis choisissez selon les règles d'accès et les besoins de l'animal. Détachez-le uniquement dans un espace où cela est autorisé : un parc ouvert aux chiens et une aire de liberté sont deux choses distinctes.

Les informations ci-dessous ont été vérifiées dans les sources institutionnelles citées le 1er octobre 2026. Les fermetures temporaires et les consignes affichées sur place restent à consulter avant la sortie.

**Dans ce guide :** [lieux à repérer](#lieux), [règles de Parilly](#parilly), [balades urbaines](#balades), [préparer la sortie](#preparation).

## <a id="lieux"></a>Quels parcs et espaces canins repérer à Lyon ?

| Lieu | Repère utile | Règle à retenir |
|---|---|---|
| Tête d'Or, Lyon 6e | Aire près du vélodrome | Laisse hors aire autorisée |
| Blandan, Lyon 7e | Derrière les sports | Accès à vérifier |
| Parilly, Bron et Vénissieux | Deux aires canines | Restrictions par zone |
| Feyssine, Villeurbanne | Parc naturel urbain | Laisse |
| Miribel Jonage | Grand Parc | Laisse et règlement |
| Lacroix-Laval | Plateau Varennes | Liberté dans l'aire dédiée |

L'[Office du tourisme de Lyon](https://www.visiterlyon.com/lyon-pratique/bons-plans/lyon-avec-un-chien) indique les espaces de la Tête d'Or et de Blandan, ainsi que l'accès en laisse à la Feyssine et à Miribel Jonage. Ces repères ne constituent pas une autorisation de circuler dans toutes les zones d'un parc.

### Tête d'Or et Blandan

À la Tête d'Or, dirigez-vous vers l'espace canin identifié près du vélodrome si vous recherchez une aire dédiée. Pour le reste de la promenade, respectez les zones autorisées et la signalétique. Consultez aussi la [page de la Ville consacrée au parc](https://www.lyon.fr/sortir-et-decouvrir/profiter-de-la-nature-en-ville/le-parc-de-la-tete-dor) pour préparer votre visite.

L'aire de Blandan a fait l'objet d'un projet de réaménagement en 2026. La [page municipale du projet](https://oye.participer.lyon.fr/processes/airecanineblandan) permet d'en consulter les informations. Une date de travaux prévue ne suffit pas à garantir que tous les équipements sont accessibles le jour de votre venue.

Un espace clôturé n'est pas forcément adapté à un chien inquiet face à ses congénères. Observez l'occupation et les interactions avant d'entrer ; vous pouvez choisir une promenade plus calme.

## <a id="parilly"></a>Quelles sont les règles au parc de Parilly ?

Le [règlement officiel de Parilly](https://www.grandlyon.com/fileadmin/user_upload/media/pdf/environnement/parcs/20170217_gl_parcparilly_reglement.pdf) distingue le parc, les zones interdites et les espaces canins :

- les chiens doivent être tenus en laisse dans les espaces autorisés du parc ;
- les aires de jeux pour enfants ne leur sont pas accessibles ;
- deux parcs canins permettent la liberté, côté avenue Charles-de-Gaulle et au parc Alpestre ;
- les chiens de première catégorie sont interdits dans le parc ; ceux de deuxième catégorie doivent être muselés et tenus en laisse ;
- les deux catégories sont exclues des espaces canins de liberté.

Consultez la [fiche de la Métropole sur Parilly](https://www.grandlyon.com/parc/parc-de-parilly) pour les informations d'accès et les alertes ponctuelles. Les règles générales du parc ne doivent pas être confondues avec celles d'un caniparc.

### Et au domaine de Lacroix-Laval ?

Le [règlement du domaine](https://www.grandlyon.com/fileadmin/user_upload/media/pdf/environnement/parcs/20170217_gl_domainelacroixlaval_reglement.pdf) prévoit une aire de liberté à l'entrée du plateau Varennes, avec des restrictions pour les chiens catégorisés. Consultez les conditions d'accès et les panneaux avant d'utiliser cet espace.

### Et à Miribel Jonage ?

Préparez l'itinéraire à partir de la [rubrique pratique du Grand Parc](https://www.grand-parc.fr/pratique/) et consultez son [règlement](https://www.grand-parc.fr/pratique/reglementation-reglement-interieur-grand-parc). N'assimilez pas un secteur peu fréquenté à une zone de liberté, ni la présence d'un lac à une autorisation de baignade pour le chien.

## <a id="balades"></a>Où marcher en ville avec son chien ?

Les berges du Rhône offrent une promenade urbaine, mais ce sont des espaces partagés. La [fiche officielle des berges](https://www.visiterlyon.com/sortir/parcs-jardins-et-lieux-de-balade/les-berges-du-rhone) rappelle l'obligation de tenir le chien en laisse.

Choisissez une durée adaptée à l'animal et restez attentif aux vélos, aux coureurs et aux accès à l'eau. Si les croisements sont difficiles, prévoyez un trajet de repli plutôt que de forcer la rencontre.

Les [règles nationales sur la promenade sans laisse](https://www.service-public.gouv.fr/particuliers/vosdroits/F35062) expliquent aussi pourquoi des restrictions locales peuvent s'appliquer. Pour un chien réactif, notre [guide de préparation d'une garde adaptée](/actualites/chien-reactif-agressif-garde-solutions) aide à transmettre les déclencheurs et les consignes.

## <a id="preparation"></a>Que vérifier avant une sortie avec un chien gardé ?

Demandez au propriétaire l'itinéraire habituel, la durée de sortie, les rencontres à éviter et le matériel à utiliser. Gardez en laisse un chien que vous connaissez peu, même dans une zone où la liberté est permise.

Emportez de l'eau et de quoi ramasser les déjections. Vérifiez les fermetures, la météo et les conditions du trajet. La disponibilité d'une fontaine ne doit pas être votre seule solution pour l'eau.

Pour une sortie en transports, vérifiez les conditions actuelles de l'opérateur avant le départ, notamment celles applicables au gabarit du chien et aux chiens catégorisés. En cas de problème de santé, appelez un vétérinaire et suivez ses instructions avant de vous déplacer.

Vous préparez aussi une absence ? Consultez les [solutions de garde de chien à Lyon](/actualites/ou-faire-garder-chien-lyon-vacances), la [checklist de remise de la maison](/actualites/preparer-maison-avant-garde) et le [guide du house sitting](/actualites/c-est-quoi-le-house-sitting). Pour une recherche locale, retrouvez [Guardiens à Lyon](/house-sitting/lyon).


## <a id="consignes-garde"></a>Comment transmettre les promenades à un gardien ?

Avant de confirmer une garde, décrivez le parcours connu, le matériel, les croisements difficiles et la possibilité de changer d’itinéraire. La proximité du gardien ne garantit pas sa connaissance des règlements ou des réactions du chien. Une rencontre est possible si vous le souhaitez tous les deux ; elle ne constitue pas une épreuve à organiser dans une aire collective.

Préparez aussi la présence et les tâches de la maison. Sur Guardiens, le gardien est hébergé sans rémunération et la plateforme est actuellement gratuite pour les propriétaires et les gardiens. Les dépenses restent distinctes : consultez les [conditions tarifaires](/tarifs). Une candidature ou un remplacement n’est pas garanti.

## <a id="faq"></a>Questions fréquentes

:::faq
**Où détacher son chien à Lyon ?**

Dans une aire de liberté où cela est expressément autorisé, en respectant ses conditions d'accès. L'autorisation des chiens dans un parc ne signifie pas qu'ils peuvent y circuler sans laisse.

**Les chiens sont-ils admis à Parilly ?**

Ils sont admis en laisse dans les zones autorisées, avec des règles particulières pour les chiens catégorisés. Les aires de liberté ont leurs propres restrictions.

**Peut-on laisser son chien libre à Miribel Jonage ?**

Ne le présumez pas. Préparez votre visite avec le règlement du Grand Parc et respectez la signalétique. La faible fréquentation d'un chemin n'est pas une autorisation.

**Quel parc choisir pour un chien réactif ?**

Le choix dépend de ses déclencheurs, de l'affluence et des possibilités de garder une distance adaptée. Une aire canine collective n'est pas automatiquement un bon choix.
:::$suite_content_1_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='e2f7c52d-ad81-4aa9-82b3-9d3f74e7d3b3'::uuid AND slug='parcs-chiens-lyon-guide-complet';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS DISTINCT FROM false
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/parcs-chiens-lyon-guide-complet' THEN
    RAISE EXCEPTION 'Guide suite 1 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Parcs pour chiens à Lyon : accès, laisse et aires de liberté'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Choisissez un parcours selon les règles du lieu et les besoins de votre chien. Repères de parcs lyonnais, aires dédiées et consignes à transmettre au gardien.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Parcs pour chiens à Lyon : laisse et espaces de liberté'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Tête d’Or, Parilly, Feyssine et autres balades : distinguez accès en laisse et aires de liberté à Lyon, avec les sources et les vérifications avant la sortie.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Un chien tenu en laisse marche sur une allée arborée près d’un plan d’eau, avec des promeneurs en arrière-plan.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"guide de préparation d''une garde adaptée","url":"/actualites/chien-reactif-agressif-garde-solutions"},{"text":"solutions de garde de chien à Lyon","url":"/actualites/ou-faire-garder-chien-lyon-vacances"},{"text":"checklist de remise de la maison","url":"/actualites/preparer-maison-avant-garde"},{"text":"guide du house sitting","url":"/actualites/c-est-quoi-le-house-sitting"},{"text":"Guardiens à Lyon","url":"/house-sitting/lyon"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 14:10:21.08414+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 1 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot55_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 1 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot55_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot55_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Parcs pour chiens à Lyon : accès, laisse et aires de liberté',
    excerpt='Choisissez un parcours selon les règles du lieu et les besoins de votre chien. Repères de parcs lyonnais, aires dédiées et consignes à transmettre au gardien.',
    meta_title='Parcs pour chiens à Lyon : laisse et espaces de liberté',
    meta_description='Tête d’Or, Parilly, Feyssine et autres balades : distinguez accès en laisse et aires de liberté à Lyon, avec les sources et les vérifications avant la sortie.',
    hero_image_alt='Un chien tenu en laisse marche sur une allée arborée près d’un plan d’eau, avec des promeneurs en arrière-plan.',
    internal_links='[{"text":"guide de préparation d''une garde adaptée","url":"/actualites/chien-reactif-agressif-garde-solutions"},{"text":"solutions de garde de chien à Lyon","url":"/actualites/ou-faire-garder-chien-lyon-vacances"},{"text":"checklist de remise de la maison","url":"/actualites/preparer-maison-avant-garde"},{"text":"guide du house sitting","url":"/actualites/c-est-quoi-le-house-sitting"},{"text":"Guardiens à Lyon","url":"/house-sitting/lyon"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='parcs-chiens-lyon-guide-complet' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 1 : % ligne au lieu de 1',affected; END IF;
END;
$guide_1$;

COMMIT;
