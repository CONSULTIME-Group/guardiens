-- Refonte des guides anciens guides Grenoble et entraide, autorisée le 17/10/2026.
-- Les URL, auteurs, dates de publication et indexabilité sont conservés.
BEGIN;
CREATE TABLE IF NOT EXISTS public._backup_articles_suite_lot53_20261017 AS SELECT * FROM public.articles WHERE false;
REVOKE ALL ON public._backup_articles_suite_lot53_20261017 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public._backup_articles_suite_lot53_20261017 TO service_role;
ALTER TABLE public._backup_articles_suite_lot53_20261017 ENABLE ROW LEVEL SECURITY;
SELECT id FROM public.articles WHERE id IN ('0ac1d393-0d63-4b52-a7dc-58c2f55183ed'::uuid,'803bd897-b6de-46af-a251-db5cd13054da'::uuid) ORDER BY id FOR UPDATE;

DO $guide_0$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_0_20261017$# Pet-sitting à Grenoble : organiser une garde adaptée à l’animal

**Pour une garde à Grenoble, comparez la présence et le suivi proposés plutôt qu’un profil de gardien supposé selon le quartier.** Le [guide actuel de garde à Grenoble et en Chartreuse](/actualites/pet-sitting-grenoble-chartreuse) détaille les solutions et les points à préparer.

## <a id="reperes"></a>Les conditions à préciser avant de choisir

| Point | Informations utiles |
| --- | --- |
| Animal | Routines, réactions, alimentation et suivi prescrit. |
| Présence | Visites, nuits, durée des absences et rythme des nouvelles. |
| Accès | Trajet réel, marches, clés et équipements du logement. |
| Relais | Contact accepté, accès et dépenses convenues. |

Le pet-sitting peut être une visite, un accueil ailleurs ou une garde avec séjour. Un logement proche d’un arrêt de transport n’est pas automatiquement accessible selon les horaires ou le matériel nécessaires. Vérifiez le trajet et les conditions applicables au déplacement de l’animal.

Préparez les parcours habituels plutôt que de supposer qu’un chien actif doit aller en montagne. Le [guide des parcs et promenades de Grenoble](/actualites/parcs-balades-chiens-grenoble-guide) distingue accès et restrictions. Une randonnée nouvelle ne se décide pas à partir de la race ou de la proximité du relief.

Si un suivi particulier est nécessaire, vérifiez que la personne possède les capacités requises et accepte les consignes. Laissez le contact du vétérinaire et préparez l’organisation des urgences ; aucune clinique ou disponibilité permanente n’est présumée.

Comparez les devis sur les mêmes prestations. Sur Guardiens, le gardien est hébergé sans rémunération et la plateforme est actuellement gratuite pour les deux rôles. Les dépenses restent distinctes, selon les [conditions tarifaires](/tarifs).

Une rencontre est possible si vous le souhaitez tous les deux. Les avis disponibles et un document contrôlé ne certifient pas une compétence. Aucune candidature, réponse dans un délai fixe ou solution de remplacement n’est garantie.

## <a id="faq"></a>Questions fréquentes

:::faq
### Où trouver les conseils actuels pour une garde à Grenoble ?
Le guide de Grenoble et de la Chartreuse compare les solutions et les préparatifs. Consultez-le pour définir la présence et les conditions adaptées à votre animal.

### Faut-il un véhicule pour garder un animal à Grenoble ?
Cela dépend du logement et des déplacements nécessaires. Vérifiez les trajets aux horaires concernés, le matériel et les conditions de transport plutôt que de supposer qu’une formule convient partout.
:::$suite_content_0_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='0ac1d393-0d63-4b52-a7dc-58c2f55183ed'::uuid AND slug='pet-sitting-grenoble-guide';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS DISTINCT FROM true
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/pet-sitting-grenoble-chartreuse' THEN
    RAISE EXCEPTION 'Guide suite 0 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Pet-sitting à Grenoble : organiser une garde adaptée à l’animal'
    AND before_row.excerpt IS NOT DISTINCT FROM 'La garde se choisit selon les besoins de l’animal, les accès et la présence proposée. Le guide actuel de Grenoble détaille les solutions et la préparation.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Pet-sitting à Grenoble : présence et préparation de garde'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Comparez visites, accueil et séjour dans le logement à Grenoble. Définissez routines, accès et relais, puis consultez le guide actuel pour préparer la garde.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Une personne marche avec un chien en laisse près d’un sac de transport contenant un chat, dans une rue pavée.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"guide actuel de garde à Grenoble et en Chartreuse","url":"/actualites/pet-sitting-grenoble-chartreuse"},{"text":"guide des parcs et promenades de Grenoble","url":"/actualites/parcs-balades-chiens-grenoble-guide"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-07-27 17:18:49.739662+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 0 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot53_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 0 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot53_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot53_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Pet-sitting à Grenoble : organiser une garde adaptée à l’animal',
    excerpt='La garde se choisit selon les besoins de l’animal, les accès et la présence proposée. Le guide actuel de Grenoble détaille les solutions et la préparation.',
    meta_title='Pet-sitting à Grenoble : présence et préparation de garde',
    meta_description='Comparez visites, accueil et séjour dans le logement à Grenoble. Définissez routines, accès et relais, puis consultez le guide actuel pour préparer la garde.',
    hero_image_alt='Une personne marche avec un chien en laisse près d’un sac de transport contenant un chat, dans une rue pavée.',
    internal_links='[{"text":"guide actuel de garde à Grenoble et en Chartreuse","url":"/actualites/pet-sitting-grenoble-chartreuse"},{"text":"guide des parcs et promenades de Grenoble","url":"/actualites/parcs-balades-chiens-grenoble-guide"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='pet-sitting-grenoble-guide' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 0 : % ligne au lieu de 1',affected; END IF;
END;
$guide_0$;

DO $guide_1$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_1_20261017$# Petites missions d’entraide : comprendre le fonctionnement actuel

**Les petites missions servent à demander une aide ponctuelle près de chez soi : arrosage, courses ou coup de main simple, selon les conditions admises.** Le [guide actuel des petites missions d’entraide](/actualites/petites-missions-entraide-guardiens) détaille les démarches, les limites et les questions avant de se décider.

## <a id="reperes"></a>Demander et proposer suivent des démarches différentes

| Votre intention | Démarche utile |
| --- | --- |
| Demander | Décrire un besoin, le lieu général, les dates et les contraintes. |
| Proposer | Indiquer sur votre profil ce que vous savez faire et vos limites. |
| Confirmer | Échanger sur les tâches, les accès et les dépenses acceptées. |
| Faire garder la maison | Préparer une garde avec séjour plutôt qu’un simple passage. |

Le formulaire de mission porte sur une demande ; l’offre d’aide se décrit dans les savoir-faire du profil. Une première réponse ne confirme pas à elle seule toute l’organisation. Convenez des détails avec la personne concernée et gardez la possibilité de refuser ou de prévoir une autre solution.

L’entraide est ponctuelle et sans rémunération. Un geste convivial ne doit pas devenir une prestation imposée en retour. Les dépenses réellement faites pour l’autre personne se distinguent du paiement d’un service et se conviennent à l’avance.

Toutes les activités ne sont pas admises. Les [conditions d’utilisation](/cgu) précisent notamment les exclusions concernant les travaux dangereux ou réglementés, les soins et la garde d’enfants. Une demande publiée ne valide pas sa faisabilité technique ou juridique ; ne transmettez pas de données sensibles dans l’annonce.

Pour une absence avec nuits dans le logement, préparez les besoins de la maison et des animaux éventuels dans une [garde de maison](/actualites/c-est-quoi-le-house-sitting). Une mission courte ne remplace pas une présence à convenir.

La plateforme est actuellement gratuite pour les deux rôles, selon les [conditions tarifaires](/tarifs). Aucune personne disponible, notification à heure fixe ou aide réussie n’est garantie.

## <a id="faq"></a>Questions fréquentes

:::faq
### Comment proposer mon aide sur Guardiens ?
Décrivez vos savoir-faire et vos limites dans votre profil. Le formulaire de petite mission sert à publier un besoin ; le guide actuel explique ces démarches distinctes.

### Une petite mission remplace-t-elle une garde de maison ?
Pas automatiquement. Un passage pour arroser se distingue d’un séjour dans le logement avec une présence et des tâches convenues. Définissez le besoin réel avant de choisir la démarche.
:::$suite_content_1_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='803bd897-b6de-46af-a251-db5cd13054da'::uuid AND slug='petites-missions-entraide-guide';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS DISTINCT FROM true
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/petites-missions-entraide-guardiens' THEN
    RAISE EXCEPTION 'Guide suite 1 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Petites missions d’entraide : comprendre le fonctionnement actuel'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Une aide ponctuelle se prépare avec un besoin clair, des limites et un accord sur l’organisation. Retrouvez le guide actuel des petites missions d’entraide.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Petites missions d’entraide : les repères pour commencer'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Demander un coup de main ou proposer une aide : comprenez les démarches actuelles, les limites et les frais. Retrouvez le guide complet de l’entraide Guardiens.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Deux personnes échangent des clés devant une maison, près d’un sac de courses, d’outils de jardin et d’un chien.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"guide actuel des petites missions d’entraide","url":"/actualites/petites-missions-entraide-guardiens"},{"text":"conditions d’utilisation","url":"/cgu"},{"text":"garde de maison","url":"/actualites/c-est-quoi-le-house-sitting"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-09-16 12:30:11.57959+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 1 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot53_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 1 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot53_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot53_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Petites missions d’entraide : comprendre le fonctionnement actuel',
    excerpt='Une aide ponctuelle se prépare avec un besoin clair, des limites et un accord sur l’organisation. Retrouvez le guide actuel des petites missions d’entraide.',
    meta_title='Petites missions d’entraide : les repères pour commencer',
    meta_description='Demander un coup de main ou proposer une aide : comprenez les démarches actuelles, les limites et les frais. Retrouvez le guide complet de l’entraide Guardiens.',
    hero_image_alt='Deux personnes échangent des clés devant une maison, près d’un sac de courses, d’outils de jardin et d’un chien.',
    internal_links='[{"text":"guide actuel des petites missions d’entraide","url":"/actualites/petites-missions-entraide-guardiens"},{"text":"conditions d’utilisation","url":"/cgu"},{"text":"garde de maison","url":"/actualites/c-est-quoi-le-house-sitting"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='petites-missions-entraide-guide' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 1 : % ligne au lieu de 1',affected; END IF;
END;
$guide_1$;

COMMIT;
