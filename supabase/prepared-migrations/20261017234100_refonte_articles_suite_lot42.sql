-- Refonte des guides anciens-premiere-garde-profil, autorisée le 17/10/2026.
-- Les URL, auteurs, dates de publication et indexabilité sont conservés.
BEGIN;
CREATE TABLE IF NOT EXISTS public._backup_articles_suite_lot42_20261017 AS SELECT * FROM public.articles WHERE false;
REVOKE ALL ON public._backup_articles_suite_lot42_20261017 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public._backup_articles_suite_lot42_20261017 TO service_role;
ALTER TABLE public._backup_articles_suite_lot42_20261017 ENABLE ROW LEVEL SECURITY;
SELECT id FROM public.articles WHERE id IN ('4ff21b11-8263-4b88-b1f9-5b3070ef3ecd'::uuid,'f6c93f52-8254-45cb-b112-e9d877aec504'::uuid) ORDER BY id FOR UPDATE;

DO $guide_0$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_0_20261017$# Première garde de chien : les informations à préparer

**Avant une première garde de chien, vérifiez les habitudes, les réactions et les tâches que vous pouvez réellement assurer.** Retrouvez les préparatifs détaillés dans le [guide actuel pour réussir une première garde](/actualites/reussir-premiere-garde-house-sitting).

## <a id="reperes"></a>Ce qu’il faut convenir avec le propriétaire

| Point | Informations utiles |
| --- | --- |
| Repas | Aliment habituel, quantité, horaires et récompenses autorisées. |
| Sorties | Équipement, parcours, réactions et règles des lieux fréquentés. |
| Présence et logement | Absences acceptées, accès, tâches et relais possible. |
| Suivi | Ordonnance éventuelle, contacts vétérinaires et consignes d’urgence. |

La taille du chien ne suffit pas à fixer une durée de promenade ou à choisir un équipement. Décrivez les situations concrètes et n’improvisez pas une activité, un traitement ou une manipulation que vous ne maîtrisez pas.

Une rencontre préalable est possible si vous le souhaitez tous les deux. Montrez ou faites expliquer les accès et le matériel dans les conditions convenues ; ne forcez pas une interaction avec l’animal. Les [conseils de préparation de la maison](/actualites/preparer-maison-avant-garde) complètent cette transmission.

Convenez du rythme des nouvelles et des informations à envoyer. Il n’existe pas une obligation générale de message le matin et photo le soir. Une agitation, un refus de nourriture ou un autre changement ne doit pas être écarté comme une adaptation forcément normale : demandez un avis adapté. Une urgence vétérinaire n’attend pas de joindre d’abord le propriétaire.

Sur Guardiens, le gardien est hébergé sans rémunération et la plateforme est actuellement gratuite, selon les [conditions tarifaires](/tarifs). Frais, présence et tâches restent à convenir, sans avis positif ou future garde garantis.

## <a id="faq"></a>Questions fréquentes

:::faq
### Où trouver les conseils détaillés pour ma première garde ?
Le guide actuel couvre les questions avant confirmation, la transmission, la présence et les imprévus. Vous pouvez le lire depuis le lien de cette page et le bouton final.

### Faut-il rencontrer le propriétaire avant de confirmer ?
Une rencontre est possible si vous le souhaitez tous les deux. Quel que soit le choix, faites préciser les conditions, les comportements, les accès et les tâches nécessaires avant de confirmer.
:::$suite_content_0_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='4ff21b11-8263-4b88-b1f9-5b3070ef3ecd'::uuid AND slug='conseils-garder-chien';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS DISTINCT FROM true
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/reussir-premiere-garde-house-sitting' THEN
    RAISE EXCEPTION 'Guide suite 0 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Première garde de chien : les informations à préparer'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Avant de confirmer une garde, vérifiez les habitudes du chien et ce que vous pouvez assurer. Le guide actuel détaille les préparatifs et les imprévus.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Première garde de chien : les informations à préparer'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Repas, sorties, accès, présence et contacts : préparez une première garde de chien et retrouvez les conseils détaillés dans le guide actuel.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Une adulte est accroupie près d’un chien en harnais dans un salon, avec du matériel de garde.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"guide actuel pour réussir une première garde","url":"/actualites/reussir-premiere-garde-house-sitting"},{"text":"conseils de préparation de la maison","url":"/actualites/preparer-maison-avant-garde"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-09-05 06:57:45.541044+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 0 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot42_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 0 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot42_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot42_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Première garde de chien : les informations à préparer',
    excerpt='Avant de confirmer une garde, vérifiez les habitudes du chien et ce que vous pouvez assurer. Le guide actuel détaille les préparatifs et les imprévus.',
    meta_title='Première garde de chien : les informations à préparer',
    meta_description='Repas, sorties, accès, présence et contacts : préparez une première garde de chien et retrouvez les conseils détaillés dans le guide actuel.',
    hero_image_alt='Une adulte est accroupie près d’un chien en harnais dans un salon, avec du matériel de garde.',
    internal_links='[{"text":"guide actuel pour réussir une première garde","url":"/actualites/reussir-premiere-garde-house-sitting"},{"text":"conseils de préparation de la maison","url":"/actualites/preparer-maison-avant-garde"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='conseils-garder-chien' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 0 : % ligne au lieu de 1',affected; END IF;
END;
$guide_0$;

DO $guide_1$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_1_20261017$# Devenir gardien de maison : préparer son profil et ses premiers échanges

**Pour devenir gardien de maison, présentez votre expérience réelle, vos disponibilités et les conditions que vous pouvez assurer.** Le [guide actuel de création d’un profil de gardien](/actualites/creer-profil-gardien-attractif) explique cette préparation en détail.

## <a id="reperes"></a>Les premiers éléments à mettre au clair

| Élément | Ce qu’il faut préciser |
| --- | --- |
| Expérience | Situations déjà pratiquées, avec ou sans animaux, y compris hors de la plateforme. |
| Présence | Disponibilités, contraintes et absences possibles. |
| Tâches | Gestes que vous savez assurer et limites à discuter. |
| Présentation | Photo reconnaissable et description honnête, sans témoignage inventé. |

Un contrôle de document d’identité, lorsqu’un profil l’affiche, ne certifie ni une compétence ni la fiabilité. Ne déduisez pas d’un écusson une priorité garantie, l’accès à un statut d’urgence ou une garde acceptée.

Pour chaque annonce, lisez les dates, la présence et les tâches avant de répondre. Posez les questions manquantes et décrivez ce qui correspond à votre expérience. Une rencontre préalable est possible si vous le souhaitez tous les deux ; elle ne remplace pas les consignes à transmettre.

Une maison peut être gardée avec ou sans animaux. Sur Guardiens, le gardien est hébergé pendant la garde sans rémunération, et la plateforme est actuellement gratuite pour les deux rôles selon les [conditions tarifaires](/tarifs). Déplacements, alimentation et dépenses éventuelles restent distincts.

Avant de partir, confirmez les conditions, les contacts et un relais. La signature d’un accord après confirmation est facultative. L’acceptation d’une garde dépend d’un échange sur les besoins et les conditions.

## <a id="faq"></a>Questions fréquentes

:::faq
### Où trouver le guide actuel pour préparer mon profil ?
Le guide de création du profil détaille photo, expérience, présence et limites. Le lien de cette page et le bouton final permettent de le consulter.

### Le house-sitting sur Guardiens est-il un emploi rémunéré ?
Le gardien est hébergé pendant la garde sans rémunération, selon les conditions convenues. La plateforme est actuellement gratuite ; déplacements, nourriture et autres dépenses éventuelles restent distincts.
:::$suite_content_1_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='f6c93f52-8254-45cb-b112-e9d877aec504'::uuid AND slug='devenir-gardien-guide-complet';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS DISTINCT FROM true
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/creer-profil-gardien-attractif' THEN
    RAISE EXCEPTION 'Guide suite 1 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Devenir gardien de maison : préparer son profil et ses premiers échanges'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Préparez un profil honnête, puis échangez sur les besoins de chaque annonce. Le guide actuel détaille la présentation, les disponibilités et les limites à préciser.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Devenir gardien de maison : préparer son profil'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Présentez votre expérience, vos disponibilités et vos limites pour devenir gardien de maison. Retrouvez le guide actuel, sans garde ou priorité garantie.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Une personne tient un chien et un chat dans ses bras devant un canapé.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"guide actuel de création d’un profil de gardien","url":"/actualites/creer-profil-gardien-attractif"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-14 13:59:17.121368+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 1 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot42_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 1 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot42_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot42_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Devenir gardien de maison : préparer son profil et ses premiers échanges',
    excerpt='Préparez un profil honnête, puis échangez sur les besoins de chaque annonce. Le guide actuel détaille la présentation, les disponibilités et les limites à préciser.',
    meta_title='Devenir gardien de maison : préparer son profil',
    meta_description='Présentez votre expérience, vos disponibilités et vos limites pour devenir gardien de maison. Retrouvez le guide actuel, sans garde ou priorité garantie.',
    hero_image_alt='Une personne tient un chien et un chat dans ses bras devant un canapé.',
    internal_links='[{"text":"guide actuel de création d’un profil de gardien","url":"/actualites/creer-profil-gardien-attractif"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='devenir-gardien-guide-complet' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 1 : % ligne au lieu de 1',affected; END IF;
END;
$guide_1$;

COMMIT;
