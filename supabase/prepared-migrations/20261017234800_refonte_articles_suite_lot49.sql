-- Refonte des guides anciennes pages Grenoble et Lyon, autorisée le 17/10/2026.
-- Les URL, auteurs, dates de publication et indexabilité sont conservés.
BEGIN;
CREATE TABLE IF NOT EXISTS public._backup_articles_suite_lot49_20261017 AS SELECT * FROM public.articles WHERE false;
REVOKE ALL ON public._backup_articles_suite_lot49_20261017 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public._backup_articles_suite_lot49_20261017 TO service_role;
ALTER TABLE public._backup_articles_suite_lot49_20261017 ENABLE ROW LEVEL SECURITY;
SELECT id FROM public.articles WHERE id IN ('e9a8923c-2198-49f7-8311-e8b79d14e46e'::uuid,'85c53401-ae2b-443a-b952-f6f97cf13e67'::uuid) ORDER BY id FOR UPDATE;

DO $guide_0$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_0_20261017$# House-sitting à Grenoble : définir les besoins de votre logement

**À Grenoble, un house-sitting se prépare selon les besoins du logement, avec ou sans animaux, et la présence réellement acceptée par le gardien.** La [page locale de house-sitting à Grenoble](/house-sitting/grenoble) permet de poursuivre votre recherche. Les disponibilités se confirment directement.

## <a id="reperes"></a>Les informations qui rendent la demande concrète

| Point | À décrire avant confirmation |
| --- | --- |
| Accès | Trajet, stationnement, étage, clés et contraintes du bâtiment. |
| Présence | Dates, nuitées et absences compatibles avec les besoins. |
| Animaux éventuels | Repas, sorties, réactions et suivi prescrit. |
| Relais | Contact accepté en cas d’imprévu et accès prévu. |

Le quartier, le relief ou le métier d’un gardien ne prouvent pas qu’il connaît vos équipements ou votre animal. Expliquez les routines et vérifiez l’expérience sur les gestes réellement demandés. Un appareil en panne peut nécessiter un professionnel.

Pour un chien, préparez un parcours connu et une alternative adaptée aux conditions. Le [guide des parcs et promenades de Grenoble](/actualites/parcs-balades-chiens-grenoble-guide) distingue accès, laisse et restrictions. La taille du chien ne suffit pas à décider qu’une montée ou une randonnée lui convient.

Si la météo ou les conditions de déplacement compliquent l’accès au logement, convenez d’un relais plutôt que de promettre un trajet fixe. Les besoins médicaux particuliers se préparent avec le vétérinaire ; la personne qui garde ne les déduit pas de la saison.

Une rencontre est possible si vous le souhaitez tous les deux. Les avis disponibles et un document d’identité contrôlé complètent l’échange sans certifier les compétences. Aucun gardien dans votre rue, délai d’arrivée de quinze minutes ou remplacement automatique n’est garanti.

Guardiens est actuellement gratuit pour les propriétaires et les gardiens. L’hébergement du gardien se fait sans rémunération ; les dépenses convenues restent distinctes, selon les [conditions tarifaires](/tarifs).

## <a id="faq"></a>Questions fréquentes

:::faq
### Où poursuivre ma recherche de house-sitting à Grenoble ?
La page locale de Grenoble permet de préparer votre recherche. Décrivez les besoins du logement et confirmez disponibilité, présence et tâches avec les personnes concernées.

### Un gardien grenoblois connaît-il forcément les parcours adaptés à mon chien ?
Non. Présentez les promenades habituelles, les réactions de votre chien et les règles des lieux. Un nouveau parcours ou une randonnée doit être discuté et adapté à l’animal.
:::$suite_content_0_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='e9a8923c-2198-49f7-8311-e8b79d14e46e'::uuid AND slug='house-sitting-grenoble';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS DISTINCT FROM true
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/house-sitting/grenoble' THEN
    RAISE EXCEPTION 'Guide suite 0 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'House-sitting à Grenoble : définir les besoins de votre logement'
    AND before_row.excerpt IS NOT DISTINCT FROM 'La garde se prépare à partir du logement réel : présence, accès, entretien et animaux éventuels. Retrouvez les repères et la page de Grenoble pour poursuivre.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'House-sitting à Grenoble : présence, accès et préparation'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Préparez une garde de maison à Grenoble selon vos dates, les accès et les animaux éventuels. Retrouvez la page locale et les conditions à convenir.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Une maison aux volets bleus devant une ville et des montagnes, sous les branches d’un arbre.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"page locale de house-sitting à Grenoble","url":"/house-sitting/grenoble"},{"text":"guide des parcs et promenades de Grenoble","url":"/actualites/parcs-balades-chiens-grenoble-guide"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-04 12:55:18.214493+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 0 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot49_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 0 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot49_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot49_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='House-sitting à Grenoble : définir les besoins de votre logement',
    excerpt='La garde se prépare à partir du logement réel : présence, accès, entretien et animaux éventuels. Retrouvez les repères et la page de Grenoble pour poursuivre.',
    meta_title='House-sitting à Grenoble : présence, accès et préparation',
    meta_description='Préparez une garde de maison à Grenoble selon vos dates, les accès et les animaux éventuels. Retrouvez la page locale et les conditions à convenir.',
    hero_image_alt='Une maison aux volets bleus devant une ville et des montagnes, sous les branches d’un arbre.',
    internal_links='[{"text":"page locale de house-sitting à Grenoble","url":"/house-sitting/grenoble"},{"text":"guide des parcs et promenades de Grenoble","url":"/actualites/parcs-balades-chiens-grenoble-guide"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='house-sitting-grenoble' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 0 : % ligne au lieu de 1',affected; END IF;
END;
$guide_0$;

DO $guide_1$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_1_20261017$# House-sitting à Lyon : convenir des conditions avant de confier ses clés

**Le house-sitting à Lyon consiste à héberger un gardien pendant votre absence pour assurer les tâches et la présence convenues.** La garde peut inclure des animaux ou concerner seulement le logement. Retrouvez la [page locale de house-sitting à Lyon](/house-sitting/lyon) pour poursuivre votre recherche.

## <a id="reperes"></a>Préparer une demande adaptée à votre logement

| Point | Informations utiles |
| --- | --- |
| Présence | Dates, nuitées, sorties possibles et rythme des nouvelles. |
| Accès | Transports, stationnement, étage, clés et règles du bâtiment. |
| Maison | Plantes, courrier, équipements autorisés et limites d’entretien. |
| Animaux éventuels | Routines, réactions, sorties et suivi connu. |

Un quartier ne détermine pas les besoins du logement. Présentez les consignes de copropriété applicables et les usages des équipements ; un gardien lyonnais ne les connaît pas automatiquement. Le fait d’habiter à proximité ne garantit pas non plus une disponibilité immédiate.

Pour un chien, convenez des parcours et consultez le [guide des parcs et espaces canins de Lyon](/actualites/parcs-chiens-lyon-guide-complet). L’accès à un parc ne signifie pas une liberté partout. Choisissez un trajet compatible avec les réactions de l’animal et les conditions réelles, sans supposer un lieu toujours calme.

Décrivez les habitudes de ventilation et les points à surveiller dans votre logement, sans imposer un horaire valable pour tous les bâtiments. Les gestes et les limites doivent être compris avant la garde ; une panne technique peut nécessiter un professionnel.

Une rencontre est possible si vous le souhaitez tous les deux. Les avis, lorsqu’ils existent, et un document contrôlé ne remplacent pas l’échange sur les capacités. Préparez un relais ayant accepté ce rôle : aucun remplacement automatique, candidat ou délai d’arrivée n’est garanti.

Sur Guardiens, la plateforme est actuellement gratuite pour les deux rôles et le gardien est hébergé sans rémunération. Les dépenses restent distinctes : voir les [conditions tarifaires](/tarifs).

## <a id="faq"></a>Questions fréquentes

:::faq
### Où poursuivre ma recherche de house-sitting à Lyon ?
La page locale de Lyon aide à préparer la recherche. Précisez vos dates et vos besoins, puis confirmez directement la disponibilité et les conditions avec les personnes concernées.

### Un gardien logé sur place doit-il rester toute la journée ?
La présence se convient avant confirmation. Être hébergé ne signifie pas assurer une surveillance permanente : définissez les absences compatibles et le relais en cas d’imprévu.
:::$suite_content_1_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='85c53401-ae2b-443a-b952-f6f97cf13e67'::uuid AND slug='house-sitting-lyon';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS DISTINCT FROM true
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/house-sitting/lyon' THEN
    RAISE EXCEPTION 'Guide suite 1 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'House-sitting à Lyon : convenir des conditions avant de confier ses clés'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Une garde à Lyon repose sur des conditions explicites, adaptées au logement et aux animaux éventuels. Retrouvez les points à préparer et la page locale.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'House-sitting à Lyon : présence et conditions de garde'
    AND before_row.meta_description IS NOT DISTINCT FROM 'À Lyon, précisez présence, accès et tâches avant une garde de maison, avec ou sans animaux. Retrouvez la page locale pour poursuivre votre recherche.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Un chien doré allongé sur un tapis dans un salon lumineux, devant un canapé et une bibliothèque.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"page locale de house-sitting à Lyon","url":"/house-sitting/lyon"},{"text":"guide des parcs et espaces canins de Lyon","url":"/actualites/parcs-chiens-lyon-guide-complet"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-04 13:10:21.170327+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 1 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot49_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 1 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot49_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot49_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='House-sitting à Lyon : convenir des conditions avant de confier ses clés',
    excerpt='Une garde à Lyon repose sur des conditions explicites, adaptées au logement et aux animaux éventuels. Retrouvez les points à préparer et la page locale.',
    meta_title='House-sitting à Lyon : présence et conditions de garde',
    meta_description='À Lyon, précisez présence, accès et tâches avant une garde de maison, avec ou sans animaux. Retrouvez la page locale pour poursuivre votre recherche.',
    hero_image_alt='Un chien doré allongé sur un tapis dans un salon lumineux, devant un canapé et une bibliothèque.',
    internal_links='[{"text":"page locale de house-sitting à Lyon","url":"/house-sitting/lyon"},{"text":"guide des parcs et espaces canins de Lyon","url":"/actualites/parcs-chiens-lyon-guide-complet"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='house-sitting-lyon' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 1 : % ligne au lieu de 1',affected; END IF;
END;
$guide_1$;

COMMIT;
