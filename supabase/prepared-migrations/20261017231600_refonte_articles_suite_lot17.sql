-- Refonte des guides promenades et parcs à Annecy et Grenoble, autorisée le 17/10/2026.
-- Les URL, auteurs, dates de publication et indexabilité sont conservés.
BEGIN;
CREATE TABLE IF NOT EXISTS public._backup_articles_suite_lot17_20261017 AS SELECT * FROM public.articles WHERE false;
REVOKE ALL ON public._backup_articles_suite_lot17_20261017 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public._backup_articles_suite_lot17_20261017 TO service_role;
ALTER TABLE public._backup_articles_suite_lot17_20261017 ENABLE ROW LEVEL SECURITY;
SELECT id FROM public.articles WHERE id IN ('7c970d8e-1b4d-4888-b5ee-13f0c905bdc7'::uuid,'d7e944f1-0b67-4289-ab2e-0930171bf613'::uuid) ORDER BY id FOR UPDATE;

DO $guide_0$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_0_20261017$# Où promener son chien à Annecy : choisir la balade et vérifier les règles

**À Annecy, choisissez la promenade selon votre chien, le trajet depuis le logement et le règlement du lieu.** Une portion des Glaisins ou du Thiou, une sortie au Roc de Chère et un accès au lac ne relèvent pas tous des mêmes règles. Une autorisation sans laisse ne concerne pas automatiquement tout le parc ou toute la rive.

Ce guide aide à choisir entre plusieurs types de sorties et à préparer les consignes d’une garde. Le [guide local d’Annecy](/guides/annecy) complète les informations sur les lieux et leurs règles. Sources consultées le **17 octobre 2026** ; vérifiez les mesures temporaires avant de partir.

**Repères :** [comparer les sorties](#sorties), [promener sans laisse](#liberte), [distinguer les réserves](#reserves), [accéder au lac](#lac), [transmettre le parcours](#garde), [questions fréquentes](#faq).

## <a id="sorties"></a>Quelle promenade choisir avec votre chien ?

| Sortie envisagée | Repère utile | À vérifier avant le départ |
| --- | --- | --- |
| Parcours des Glaisins | Une portion figure parmi les secteurs admettant les chiens sans laisse sous conditions. | Plan annexé à l’arrêté, période et maîtrise du chien ; pas de caniparc clôturé supposé sur tout le parcours. |
| Promenade du Thiou | Une portion est également désignée par l’arrêté municipal. | Périmètre exact, passages partagés et itinéraire de retour. |
| Prairie de Sainte-Catherine ou Fier Erbe | Les secteurs concernés sont délimités sur les plans municipaux. | Accès depuis le logement et limites de la partie autorisée. |
| Roc de Chère | Le gestionnaire prévoit un accueil des chiens avec des consignes spécifiques. | Parcours, laisse selon la période, terrain et capacité du chien. |
| Accès au lac vers Doussard | La plage municipale et la plage de Glière ont des règles différentes. | Lieu exact, signalisation et conditions actuelles d’accès à l’eau. |

Ne choisissez pas un endroit uniquement parce qu’il est annoncé « calme » ou « idéal pour les chiens réactifs ». La fréquentation et les rencontres varient. Pour une sortie quotidienne, prévoyez aussi un parcours plus court compatible avec les habitudes de votre animal.

## <a id="liberte"></a>Où peut-on promener sans laisse à Annecy ?

L’[arrêté municipal CN-2025-281, article 8 et plans annexés](https://www.annecy.fr/fileadmin/mediatheque_annecy/Actes_administratifs/Arretes-municipaux/2025/2025_juillet/CN_2025_281.pdf), désigne **quatre secteurs** : une portion du parcours gymnique des Glaisins, la prairie à côté du parking de Sainte-Catherine, une portion de la promenade du Thiou et une portion de la prairie Fier Erbe.

Dans ces secteurs, le chien doit rester à portée de regard et de voix, à moins de 100 mètres et revenir à l’appel. **L’exception ne s’applique pas du 15 avril au 30 juin** : la laisse est alors obligatoire dans les espaces naturels couverts par l’arrêté, y compris sur les allées forestières. Consultez les plans et les panneaux ; la liste ne transforme pas l’ensemble des Glaisins ou du Thiou en zone de liberté.

L’Office de tourisme du lac recommande de [tenir son chien en laisse en ville, en balade et en randonnée](https://www.lac-annecy.com/idees-de-sejour/que-faire-au-lac-d-annecy-avec-un-chien/). Gardez la laisse si vous ne maîtrisez pas le rappel ou si la personne qui promène ne connaît pas encore bien le chien. Vérifiez aussi les règles propres au lieu : tous les parcs n’accueillent pas les animaux.

## <a id="reserves"></a>Roc de Chère et Bout du Lac : deux situations à distinguer

Le [dépliant du gestionnaire du Roc de Chère](https://www.cen-haute-savoie.org/wp-content/uploads/2025/11/depliant-roc-de-chere.pdf) précise notamment la tenue en laisse **du 15 avril au 30 juin**. Pour préparer cette promenade, lisez les consignes du parcours et gardez le chien attaché lorsque les conditions ou sa maîtrise le demandent. Un sentier boisé avec un belvédère n’est pas une garantie de terrain facile ni de fréquentation faible.

À l’inverse, la [réserve naturelle du Bout du Lac d’Annecy interdit les chiens, même en laisse](https://rando.nature-haute-savoie.fr/trek/1037-La-reserve-naturelle-du-Bout-du-Lac-d-Annecy). Un accès autorisé au chien à proximité du lac ne permet pas de prolonger la sortie à travers la réserve. Repérez les limites avant de partir.

Pour le Semnoz ou une autre sortie en montagne, préparez un itinéraire précis avec ses accès, les éventuelles restrictions pastorales et les conditions du jour. La fin de l’été ne garantit ni l’absence de troupeaux ni un chemin praticable sans équipement.

## <a id="lac"></a>Peut-on aller à la plage avec son chien ?

Évitez une réponse valable pour toutes les rives. La [page des plages de l’office Sources du lac d’Annecy](https://www.sources-lac-annecy.com/decouvrir/la-destination/doussard/plages/) distingue **Douss’plage, plage municipale interdite aux chiens**, de **la plage de Glière à Doussard**, où elle indique une possibilité de baignade avec son animal. Vérifiez le site exact et les panneaux avant le déplacement.

Cette information ne constitue pas une autorisation pour toutes les plages ni pour les espaces protégés voisins. Ne présentez pas non plus le Fier ou le Chéran comme des baignades sans contrainte : accès, courant, état de l’eau et éventuelles interdictions doivent être vérifiés pour le lieu et le jour envisagés. Vous pouvez choisir une promenade sans accès à l’eau.

## <a id="garde"></a>Quelle balade transmettre à la personne qui garde votre chien ?

Donnez votre parcours habituel, un trajet de repli et ce qu’il faut éviter : rencontres, escaliers, traversées, accès à l’eau ou sortie trop longue. Convenez du transport éventuel et des horaires. La personne n’a pas forcément la même expérience du chien ni la même connaissance d’Annecy que vous.

Ne demandez pas de détacher l’animal pour reproduire une habitude si le rappel ou le lieu ne s’y prête pas. Prévoyez laisse, matériel habituel et contacts utiles. En cas de problème de santé ou de comportement inhabituel, contactez le vétérinaire ; les [contacts d’urgence autour d’Annecy](/actualites/veterinaire-urgence-annecy-haute-savoie) complètent la préparation.

Pour une absence, le [guide de garde en Haute-Savoie](/actualites/garde-animaux-haute-savoie-guide) aide à comparer les formules. Sur Guardiens, le gardien est hébergé pour veiller sur la maison et les animaux selon les tâches convenues, **sans rémunération**. La plateforme est **actuellement 100 % gratuite pour les deux rôles** ; les dépenses convenues restent distinctes. Consultez les [conditions actuelles](/tarifs).

Échangez sur les capacités réelles de la personne et les besoins du chien. Un écusson d’identité ne garantit pas une compétence ; une rencontre est possible **si les deux personnes le souhaitent**. Après confirmation, l’accord proposé est à signature facultative. Préparez une autre solution si personne ne convient à vos dates : la plateforme ne garantit ni disponibilité ni remplacement immédiat.

## <a id="faq"></a>Questions fréquentes

:::faq
### Où promener son chien sans laisse à Annecy ?
L’arrêté municipal désigne des portions précises des Glaisins, du Thiou, de Sainte-Catherine et de Fier Erbe, avec des conditions de contrôle. Consultez ses plans ; l’exception ne s’applique pas du 15 avril au 30 juin.

### Y a-t-il une autorisation sans laisse dans tous les Glaisins ?
Non : l’arrêté vise une portion du parcours gymnique. Vérifiez les limites sur le plan et les panneaux, ainsi que les conditions de période et de maîtrise du chien.

### Peut-on entrer au Bout du Lac avec un chien tenu en laisse ?
Non. Le gestionnaire précise que les chiens sont interdits sur l’ensemble de la réserve, même en laisse. Prévoyez une autre promenade.

### Peut-on se baigner avec un chien à Doussard ?
L’office de tourisme distingue la plage de Glière de la plage municipale Douss’plage, interdite aux chiens. Vérifiez l’accès exact, la signalisation et les conditions du jour avant d’y aller.

### Un gardien local connaît-il forcément la bonne promenade ?
Non. Transmettez le parcours, les règles et les habitudes du chien, puis vérifiez que la personne peut les suivre. La proximité du domicile ne garantit ni expérience ni disponibilité.
:::$suite_content_0_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='7c970d8e-1b4d-4888-b5ee-13f0c905bdc7'::uuid AND slug='parcs-balades-chiens-annecy-guide';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/parcs-balades-chiens-annecy-guide' THEN
    RAISE EXCEPTION 'Guide suite 0 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Où promener son chien à Annecy : choisir la balade et vérifier les règles'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Sortie quotidienne, secteur sans laisse ou balade près du lac : les lieux à distinguer et les règles à transmettre à la personne qui promène votre chien.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Où promener son chien à Annecy : parcs, sentiers et règles'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Glaisins, Thiou, Roc de Chère et plages près d’Annecy : choisissez une promenade avec votre chien et vérifiez laisse, périmètres et restrictions locales.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Une personne promène un chien roux en laisse au bord d’un lac, devant des montagnes.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"guide local d’Annecy","url":"/guides/annecy"},{"text":"contacts d’urgence autour d’Annecy","url":"/actualites/veterinaire-urgence-annecy-haute-savoie"},{"text":"guide de garde en Haute-Savoie","url":"/actualites/garde-animaux-haute-savoie-guide"},{"text":"conditions actuelles","url":"/tarifs"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 15:40:12.313417+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 0 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot17_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 0 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot17_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot17_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Où promener son chien à Annecy : choisir la balade et vérifier les règles',
    excerpt='Sortie quotidienne, secteur sans laisse ou balade près du lac : les lieux à distinguer et les règles à transmettre à la personne qui promène votre chien.',
    meta_title='Où promener son chien à Annecy : parcs, sentiers et règles',
    meta_description='Glaisins, Thiou, Roc de Chère et plages près d’Annecy : choisissez une promenade avec votre chien et vérifiez laisse, périmètres et restrictions locales.',
    hero_image_alt='Une personne promène un chien roux en laisse au bord d’un lac, devant des montagnes.',
    internal_links='[{"text":"guide local d’Annecy","url":"/guides/annecy"},{"text":"contacts d’urgence autour d’Annecy","url":"/actualites/veterinaire-urgence-annecy-haute-savoie"},{"text":"guide de garde en Haute-Savoie","url":"/actualites/garde-animaux-haute-savoie-guide"},{"text":"conditions actuelles","url":"/tarifs"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='parcs-balades-chiens-annecy-guide' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 0 : % ligne au lieu de 1',affected; END IF;
END;
$guide_0$;

DO $guide_1$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_1_20261017$# Promener son chien à Grenoble : parcs, zones de liberté et sorties nature

**À Grenoble, les zones sans laisse sont des périmètres précis, pas une autorisation pour tout un parc ou toutes les berges de l’Isère.** Pour choisir une promenade, vérifiez le plan, les conditions de contrôle du chien et les règles propres au site. Les espaces naturels autour de la ville relèvent d’autres consignes.

Voici comment comparer une sortie urbaine, un parc métropolitain et une randonnée. Sources consultées le **17 octobre 2026** ; les restrictions temporaires et la signalisation sont à vérifier avant le départ.

**Repères :** [choisir un lieu](#lieux), [comprendre les zones sans laisse](#liberte), [préparer une sortie nature](#nature), [vérifier les réserves](#massifs), [transmettre les consignes](#garde), [questions fréquentes](#faq).

## <a id="lieux"></a>Quel parc ou parcours envisager ?

| Lieu | Organisation de la sortie | Point à vérifier |
| --- | --- | --- |
| Parc Paul-Mistral | Sortie en ville, avec un zonage municipal pour les chiens. | La partie autorisée sans laisse et les espaces interdits ou en laisse. |
| Vallier-Catane, jardin Hoche, square Roger-Genin | Autres lieux dont la Ville publie les plans de zonage. | Périmètres du parc choisi et conditions de contrôle. |
| Berges de l’Isère et chemin de halage | Parcours partagé, avec des plans distincts publiés par la Ville. | Secteur exact, autres usagers et proximité de l’eau. |
| Île d’Amour, Meylan | Parc métropolitain en bordure de l’Isère. | Consignes de la Métropole, trajet et règles pour le chien. |
| Bois des Vouillants | Sortie forestière sur Fontaine et Seyssinet-Pariset. | Itinéraire, restrictions, activités en cours et présence éventuelle de troupeaux. |

Sources : [zonage municipal des parcs](https://www.grenoble.fr/1039-zonage-des-parcs.htm), [Île d’Amour](https://www.grenoblealpesmetropole.fr/585-l-ile-d-amour.htm), [Vouillants](https://www.grenoblealpesmetropole.fr/586-les-vouillants.htm). Les temps de trajet dépendent de votre point de départ ; aucun de ces lieux n’est supposé calme ou accessible sans voiture depuis tous les quartiers.

## <a id="liberte"></a>Quelles conditions pour promener sans laisse à Grenoble ?

La Ville distingue **zones interdites**, **zones en laisse** et **zones de liberté**. Sa page de zonage permet d’ouvrir les plans de Paul-Mistral, Roger-Genin, Vallier-Catane, Hoche, Georges-Pompidou, du chemin de halage, des Champs-Élysées et des berges de l’Isère. Consultez le plan correspondant au lieu choisi.

Le [règlement municipal des espaces verts, article 11](https://www.grenoble.fr/803-reglement-des-espaces-verts.htm), distingue aussi les **caniparcs clôturés** des **zones sans laisse non clôturées**. Dans ces dernières, le chien doit rester sous contrôle ; la personne dispose d’une laisse ou d’une longe, le garde à portée de voix et de vue et peut le rappeler à ses pieds en trois appels maximum. Elle ne promène pas plus de trois chiens sans laisse simultanément.

Si ce contrôle n’est pas possible, la laisse reste nécessaire, même en zone de liberté. Le règlement interdit les chiens de première catégorie dans ces espaces verts. Les chiens de deuxième catégorie doivent rester en laisse et muselés, et ne sont pas admis dans les caniparcs clôturés. Consultez aussi les autres conditions du texte municipal et la signalisation pour votre situation.

Un chien en liberté ne doit pas approcher un chien attaché sans l’accord de la personne qui le garde. Pour un animal que vous connaissez peu, conservez un parcours et un équipement que vous pouvez maîtriser ; la possibilité de détacher n’est pas une consigne de le faire.

## <a id="nature"></a>Île d’Amour ou Vouillants : préparer la sortie autrement

La [Métropole demande de tenir les chiens en laisse dans les espaces naturels](https://www.grenoblealpesmetropole.fr/207-adopter-les-bons-gestes-en-randonnee.htm), de rester sur les itinéraires autorisés et de respecter les zones fermées. Un plan de liberté de Grenoble ne s’étend pas automatiquement à un parc situé dans une autre commune.

Pour l’Île d’Amour, préparez un parcours compatible avec le chien et les usages du parc, sans supposer que la proximité de la rivière autorise la baignade. Pour les Vouillants, consultez les informations du site et les panneaux sur les activités, restrictions et troupeaux. Les conditions ne se résument pas à une période de chasse identique chaque année ou à une forêt réputée tranquille.

Avant une sortie plus longue, vérifiez le terrain, la météo, le retour possible et l’eau à emporter. Adaptez l’effort au chien et demandez conseil au vétérinaire si sa santé ou sa capacité à faire le parcours vous inquiète. Un itinéraire balisé n’est pas une garantie d’adaptation à tout animal.

## <a id="massifs"></a>Vercors, Chartreuse : repérer le périmètre interdit

Le [Parc de Chartreuse précise les secteurs et périodes interdits aux chiens](https://www.parc-chartreuse.net/decouvrir-la-chartreuse/la-chartreuse-en-partage/les-chiens/). Les chiens de compagnie sont interdits **toute l’année, même en laisse, dans la réserve naturelle des Hauts de Chartreuse**. D’autres espaces sensibles et certains alpages ont leurs propres règles ; consultez la carte et les arrêtés correspondant au parcours. Une même période ne s’applique pas à tout le massif.

Dans le Vercors, la [page officielle de préparation des randonnées](https://rando.parc-du-vercors.fr/information/9-A-savoir) rappelle l’interdiction des chiens **dans la réserve naturelle des Hauts-Plateaux**, ainsi que dans certains espaces sensibles et alpages, même attachés. La règle de la réserve ne couvre pas automatiquement tout le parc naturel régional.

Ne partez pas vers un troupeau en supposant que la laisse suffira à autoriser le passage. Vérifiez les restrictions avant de choisir l’itinéraire et prévoyez une autre sortie si le chien n’est pas admis.

## <a id="garde"></a>Préparer les promenades pendant une garde

Transmettez un parcours habituel et une alternative plus courte, les accès, l’équipement, les rencontres à éviter et les règles utiles. La personne qui garde votre chien peut découvrir le secteur ; habiter à Grenoble ne prouve pas qu’elle connaît tous les lieux ou tous les tempéraments.

Convenez des horaires, de la durée habituelle des sorties et du transport éventuel. Laissez le vétérinaire habituel et les [contacts d’urgence autour de Grenoble](/actualites/veterinaire-urgence-grenoble-isere). En cas de problème de santé, demandez un avis vétérinaire plutôt que de poursuivre la promenade prévue.

Le [guide de garde à Grenoble](/actualites/pet-sitting-grenoble-chartreuse) aide à choisir entre visites, accueil et séjour hébergé. Sur Guardiens, le gardien séjourne dans le logement et veille sur la maison et les animaux selon les tâches convenues, **sans rémunération**. La plateforme est **actuellement 100 % gratuite pour les deux rôles**, les dépenses convenues restant distinctes ; consultez les [conditions actuelles](/tarifs).

Vérifiez l’expérience et les possibilités réelles avant de confirmer. Un écusson d’identité ne garantit pas une compétence ; une rencontre peut être proposée **si les deux personnes le souhaitent**. L’accord proposé après confirmation est à signature facultative. Gardez une autre solution, car aucune candidature ou disponibilité immédiate n’est garantie.

## <a id="faq"></a>Questions fréquentes

:::faq
### Où promener son chien sans laisse à Grenoble ?
Dans les périmètres autorisés et signalés, en respectant les conditions de contrôle. Consultez les plans municipaux du parc choisi ; une zone de liberté n’autorise pas à détacher partout dans le parc.

### Les zones de liberté sont-elles toutes clôturées ?
Non. Le règlement distingue les caniparcs clôturés des zones sans laisse non clôturées. Vérifiez le type d’espace et ses règles avant de détacher le chien.

### Peut-on détacher un chien qui ne revient pas au rappel ?
Le règlement exige un contrôle effectif et le retour aux pieds en trois appels maximum. Si les conditions de maîtrise ne sont pas respectées, le chien doit rester en laisse, même dans une zone sans laisse.

### Peut-on emmener son chien dans les réserves des Hauts de Chartreuse et des Hauts-Plateaux du Vercors ?
Les chiens de compagnie y sont interdits, même en laisse. Vérifiez le tracé et choisissez un autre itinéraire avec le chien.

### Un gardien doit-il reprendre exactement nos promenades ?
Convenez d’un parcours adapté au chien et aux capacités de la personne, avec une alternative. Une habitude ne doit pas conduire à ignorer une restriction ou une difficulté de contrôle.
:::$suite_content_1_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='d7e944f1-0b67-4289-ab2e-0930171bf613'::uuid AND slug='parcs-balades-chiens-grenoble-guide';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/parcs-balades-chiens-grenoble-guide' THEN
    RAISE EXCEPTION 'Guide suite 1 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Promener son chien à Grenoble : parcs, zones de liberté et sorties nature'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Paul-Mistral, berges, Île d’Amour ou Vouillants : choisissez un parcours adapté à votre chien et distinguez les zones de liberté des espaces protégés.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Où promener son chien à Grenoble : parcs et zones sans laisse'
    AND before_row.meta_description IS NOT DISTINCT FROM 'À Grenoble, repérez les zones sans laisse, les parcs et les sorties nature. Plans municipaux, contrôle du chien et réserves à vérifier avant de partir.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Une personne promène un chien roux en laisse sur un chemin, avec une ville et des montagnes à l’arrière-plan.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"contacts d’urgence autour de Grenoble","url":"/actualites/veterinaire-urgence-grenoble-isere"},{"text":"guide de garde à Grenoble","url":"/actualites/pet-sitting-grenoble-chartreuse"},{"text":"conditions actuelles","url":"/tarifs"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 13:25:17.763471+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 1 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot17_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 1 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot17_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot17_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Promener son chien à Grenoble : parcs, zones de liberté et sorties nature',
    excerpt='Paul-Mistral, berges, Île d’Amour ou Vouillants : choisissez un parcours adapté à votre chien et distinguez les zones de liberté des espaces protégés.',
    meta_title='Où promener son chien à Grenoble : parcs et zones sans laisse',
    meta_description='À Grenoble, repérez les zones sans laisse, les parcs et les sorties nature. Plans municipaux, contrôle du chien et réserves à vérifier avant de partir.',
    hero_image_alt='Une personne promène un chien roux en laisse sur un chemin, avec une ville et des montagnes à l’arrière-plan.',
    internal_links='[{"text":"contacts d’urgence autour de Grenoble","url":"/actualites/veterinaire-urgence-grenoble-isere"},{"text":"guide de garde à Grenoble","url":"/actualites/pet-sitting-grenoble-chartreuse"},{"text":"conditions actuelles","url":"/tarifs"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='parcs-balades-chiens-grenoble-guide' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 1 : % ligne au lieu de 1',affected; END IF;
END;
$guide_1$;

COMMIT;
