-- Refonte des guides voyager en France et histoire de Guardiens, autorisée le 17/10/2026.
-- Les URL, auteurs, dates de publication et indexabilité sont conservés.
BEGIN;
CREATE TABLE IF NOT EXISTS public._backup_articles_suite_lot24_20261017 AS SELECT * FROM public.articles WHERE false;
REVOKE ALL ON public._backup_articles_suite_lot24_20261017 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public._backup_articles_suite_lot24_20261017 TO service_role;
ALTER TABLE public._backup_articles_suite_lot24_20261017 ENABLE ROW LEVEL SECURITY;
SELECT id FROM public.articles WHERE id IN ('f786937a-18d5-462b-a57b-29df051faa3a'::uuid,'9808681c-da08-4b95-a714-8327d457216d'::uuid) ORDER BY id FOR UPDATE;

DO $guide_0$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_0_20261017$# Notre histoire : cinq ans de house-sitting et l’envie de créer Guardiens

Nous sommes Elisa et Jérémie. Elisa est argentine, et nous avons pratiqué le house-sitting pendant **cinq ans** avant de créer Guardiens. Nous avons voulu développer cette expérience avec une plateforme qui aide les propriétaires et les gardiens à se rencontrer autour d’un besoin concret : veiller sur une maison pendant une absence.

Il y a le logement, les animaux lorsqu’il y en a, les plantes et les consignes. Et il y a surtout deux personnes qui doivent pouvoir se comprendre, poser leurs questions et décider si elles souhaitent organiser ce séjour ensemble. C’est autour de cet échange que nous avons construit Guardiens.

*Image d’ouverture : illustration du house-sitting.*

**Dans cette histoire :** [notre point de départ](#depart), [l’idée du réseau](#reseau), [ce que nous construisons](#plateforme), [vos retours](#retours), [questions fréquentes](#faq).

## <a id="depart"></a>Une envie née de notre propre pratique

Après cinq ans à faire du house-sitting, nous avons eu envie d’aller plus loin et de développer un outil pour d’autres personnes. Expliquer ses habitudes, présenter ce que l’on sait faire, transmettre les clés et préparer une absence : ce sont les questions auxquelles la plateforme doit aider à répondre.

Le gardien séjourne dans le logement et assure les tâches convenues ; le propriétaire peut organiser son absence avec quelqu’un qu’il a choisi. Chaque maison et chaque situation demandent leurs propres échanges. Nous voulions que cette préparation trouve sa place, dès la présentation du profil jusqu’aux consignes du séjour.

## <a id="reseau"></a>Faire grandir un réseau francophone de confiance

Quand Jérémie vivait à l’étranger, un réseau francophone de ce type l’aurait intéressé : pour trouver de l’entraide, mais aussi pour faire garder sa maison pendant une absence. Cette idée fait partie de ce que nous souhaitons développer avec Guardiens.

Partager une langue facilite les premières questions et la transmission des habitudes. La confiance se construit ensuite avec des informations précises, des échanges et des engagements que chacun peut tenir. Un profil ou la proximité géographique ne suffisent pas à garantir qu’un séjour conviendra aux deux personnes.

Nous souhaitons que le réseau permette aussi de trouver un coup de main autour de chez soi, avec les [petites missions d’entraide](/actualites/petites-missions-entraide-guardiens). Les séjours de garde et les coups de main ponctuels répondent à des besoins différents, tout en partageant cette envie de se rendre service.

## <a id="plateforme"></a>Donner des outils à cet échange

Guardiens permet de présenter un profil, publier une annonce, proposer une garde et discuter dans la messagerie. Après confirmation, un accord de garde est proposé à signature facultative ; le guide de la maison aide à transmettre les consignes lorsqu’il est disponible.

Le propriétaire et le gardien restent libres de leur choix. Ils précisent les tâches, les dates, la présence, les personnes accueillies et les dépenses. Ils peuvent organiser une rencontre **s’ils le souhaitent tous les deux**. Le [guide du fonctionnement de Guardiens](/actualites/comment-fonctionne-guardiens-et-le-house-sitting-entre-particuliers) explique ce parcours.

Pour nous, créer un réseau de confiance implique aussi d’être clair sur les limites des outils. Le contrôle d’un document d’identité ne certifie ni compétences ni fiabilité ; les avis, lorsqu’ils existent, complètent les échanges. Les [repères de confiance](/actualites/securite-confiance-house-sitting) aident à préparer les questions utiles.

## <a id="retours"></a>Construire le service avec les personnes qui l’utilisent

La plateforme est **actuellement 100 % gratuite pour les propriétaires et les gardiens**. Le gardien est hébergé sans rémunération pour les tâches convenues ; les dépenses du séjour restent distinctes. Notre priorité est de créer le réseau et d’améliorer le service, avec des retours sur ce qui aide et ce qui manque.

Si vous testez Guardiens, c’est ce que nous aimerions recevoir en échange : **votre avis**. Un écran peu clair, une information difficile à trouver, une étape qui vous bloque ou une fonction utile à développer : vous pouvez nous l’expliquer depuis la [page de contact](/contact).

Avec davantage de membres, les frais d’infrastructure et de fonctionnement augmentent aussi. Une participation pourra évoluer au plus tôt au second semestre 2027, avec au moins trente jours de préavis. La [page tarifs](/tarifs) présente les conditions actuelles ; aucun montant futur n’est annoncé ici.

Nous voulons continuer à développer Guardiens à partir des besoins des personnes qui confient une maison et de celles qui proposent de la garder. Si vous souhaitez essayer, le [guide des premiers pas](/actualites/premiers-pas-sur-guardiens) vous aide à commencer selon votre rôle.

## <a id="faq"></a>Questions fréquentes

:::faq
### Qui a créé Guardiens ?
Elisa et Jérémie ont créé la plateforme après cinq ans de pratique du house-sitting. Leur objectif est de développer un réseau de confiance pour la garde de maison et l’entraide. Elisa est argentine.

### Quel est le principe d’une garde sur Guardiens ?
Un gardien séjourne dans le logement d’un propriétaire absent et assure les tâches convenues, avec ou sans animaux. Il est hébergé sans rémunération. Les deux personnes choisissent ensemble les conditions du séjour.

### Comment aider à améliorer Guardiens ?
En utilisant le service et en partageant un retour précis sur votre expérience depuis la page de contact : ce qui vous aide, ce qui manque ou ce qui vous a bloqué. La plateforme est actuellement gratuite pour les deux rôles.
:::$suite_content_0_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='f786937a-18d5-462b-a57b-29df051faa3a'::uuid AND slug='notre-histoire-pet-sitting-argentine-lyon';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/notre-histoire-pet-sitting-argentine-lyon' THEN
    RAISE EXCEPTION 'Guide suite 0 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Notre histoire : cinq ans de house-sitting et l’envie de créer Guardiens'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Nous avons créé Guardiens après cinq ans de house-sitting. Notre envie : faciliter la garde de maison et faire grandir un réseau où l’on peut se présenter, échanger et s’entraider.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Notre histoire : Elisa, Jérémie et la création de Guardiens'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Après cinq ans de house-sitting, Elisa et Jérémie ont créé Guardiens pour développer un réseau de confiance autour de la garde de maison et de l’entraide.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Une personne assise près de bagages dans un logement, avec un chat visible sur une table.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"petites missions d’entraide","url":"/actualites/petites-missions-entraide-guardiens"},{"text":"guide du fonctionnement de Guardiens","url":"/actualites/comment-fonctionne-guardiens-et-le-house-sitting-entre-particuliers"},{"text":"repères de confiance","url":"/actualites/securite-confiance-house-sitting"},{"text":"page de contact","url":"/contact"},{"text":"page tarifs","url":"/tarifs"},{"text":"guide des premiers pas","url":"/actualites/premiers-pas-sur-guardiens"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 13:55:16.363811+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 0 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot24_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 0 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot24_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot24_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Notre histoire : cinq ans de house-sitting et l’envie de créer Guardiens',
    excerpt='Nous avons créé Guardiens après cinq ans de house-sitting. Notre envie : faciliter la garde de maison et faire grandir un réseau où l’on peut se présenter, échanger et s’entraider.',
    meta_title='Notre histoire : Elisa, Jérémie et la création de Guardiens',
    meta_description='Après cinq ans de house-sitting, Elisa et Jérémie ont créé Guardiens pour développer un réseau de confiance autour de la garde de maison et de l’entraide.',
    hero_image_alt='Une personne assise près de bagages dans un logement, avec un chat visible sur une table.',
    internal_links='[{"text":"petites missions d’entraide","url":"/actualites/petites-missions-entraide-guardiens"},{"text":"guide du fonctionnement de Guardiens","url":"/actualites/comment-fonctionne-guardiens-et-le-house-sitting-entre-particuliers"},{"text":"repères de confiance","url":"/actualites/securite-confiance-house-sitting"},{"text":"page de contact","url":"/contact"},{"text":"page tarifs","url":"/tarifs"},{"text":"guide des premiers pas","url":"/actualites/premiers-pas-sur-guardiens"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='notre-histoire-pet-sitting-argentine-lyon' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 0 : % ligne au lieu de 1',affected; END IF;
END;
$guide_0$;

DO $guide_1$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_1_20261017$# Voyager en France avec le house-sitting : logement, budget et engagements

**Le house-sitting permet de séjourner dans un logement pendant l’absence de son propriétaire, en échange de la présence et des tâches convenues.** Sur Guardiens, le gardien est hébergé sans rémunération : il veille sur la maison et, s’il y en a, les animaux. Le voyage conserve un budget et le séjour demande une organisation compatible avec leurs besoins.

La plateforme est **actuellement 100 % gratuite pour les propriétaires et les gardiens**. Ce fonctionnement est détaillé sur la [page tarifs](/tarifs). Pour savoir si une garde vous convient, regardez ensemble les frais, les tâches et le temps disponible avant de choisir la destination.

**Préparer votre projet :** [comprendre l’hébergement](#hebergement), [chiffrer le séjour](#budget), [choisir une annonce](#choix), [préparer sa candidature](#candidature), [organiser les transitions](#transitions), [questions fréquentes](#faq).

## <a id="hebergement"></a>Qu’est-ce qui est proposé en échange de la garde ?

Vous vivez dans le logement pendant les dates acceptées, avec les espaces et équipements convenus. En retour, vous assurez les responsabilités définies avec le propriétaire : routines d’un animal, plantes, courrier ou autres tâches courantes compatibles avec la garde.

Une cuisine, une connexion ou une machine à laver peuvent faciliter votre quotidien **si elles sont disponibles dans ce logement**. Ne les supposez pas incluses sans lire l’annonce et en parler. Le [guide du house-sitting](/actualites/c-est-quoi-le-house-sitting) explique le principe, avec ou sans animaux.

L’hébergement ne transforme pas le séjour en vacances sans contraintes. La fréquence des sorties d’un chien, un soin ou une présence attendue dépendent du besoin réel. Vous devez pouvoir tenir les engagements, même lorsque la météo ou vos envies de visite changent.

## <a id="budget"></a>Quel budget reste à prévoir ?

Calculez le coût du séjour dans son ensemble, plutôt qu’une économie théorique par nuit. Un trajet coûteux, la nécessité d’un véhicule ou des nuits avant la passation peuvent modifier l’intérêt d’une destination.

| Poste | Ce qu’il faut prévoir ou clarifier |
| --- | --- |
| Transport aller et retour | Billets, carburant, péages et marge en cas de changement. |
| Déplacements sur place | Accès aux courses, aux sorties et au vétérinaire ; besoin éventuel d’un véhicule. |
| Alimentation et vie quotidienne | Courses, repas et dépenses personnelles selon votre rythme. |
| Charges du logement | Ce qui est inclus et ce qui doit être discuté, sans supposer une règle identique pour toutes les maisons. |
| Animaux et achats convenus | Approvisionnement prévu par le propriétaire, autorisation des dépenses et remboursement éventuel sur justificatif. |
| Assurances et repli | Garanties adaptées et réserve pour un décalage, une interruption ou un autre hébergement. |

Vérifiez avec les assureurs concernés la couverture du séjour, des responsabilités et, le cas échéant, d’un véhicule confié. Une assurance habituelle ne permet pas de présumer que tout dommage sera couvert. Le [guide du cadre juridique en France](/actualites/house-sitting-cadre-juridique-france) apporte des repères à préciser selon la situation.

## <a id="choix"></a>Choisir une garde compatible avec vos journées

Commencez par les dates, les tâches et la présence attendue. Vous souhaitez visiter une région, marcher longtemps ou télétravailler ? Expliquez votre organisation avant de confirmer. Le propriétaire doit pouvoir la rapprocher du besoin du logement et des éventuels animaux.

Une garde courte n’est pas forcément plus simple. Un animal demandant un soin ou une surveillance particulière peut exiger davantage qu’un séjour plus long dans un contexte connu. Cherchez une compatibilité avec votre expérience et vos possibilités, pas une première évaluation à obtenir à tout prix.

La distance compte aussi dans le budget et la préparation. Un séjour proche peut faciliter la passation, mais ne garantit pas un accord ; un séjour loin demande de vérifier les accès et les horaires. Utilisez les guides locaux pour préparer les sorties et les contacts, en vérifiant les règles et horaires utiles avant le déplacement.

Les annonces et disponibilités évoluent. Consultez les besoins actuellement publiés plutôt que de compter sur un exemple de séjour cité dans un ancien article. Il n’existe pas de rapport fixe entre nombre de membres et nombre de candidatures sur chaque maison.

## <a id="candidature"></a>Comment proposer une première garde ?

Présentez votre expérience réelle, y compris personnelle, et dites ce que vous ne savez pas encore assurer. Votre message doit répondre à l’annonce : dates, tâches, présence et conditions de séjour. Le [guide du profil gardien](/actualites/creer-profil-gardien-attractif) aide à rédiger une présentation précise ; le [parcours pour débuter](/actualites/comment-devenir-home-sitter-france-guide-debutant) reprend les étapes générales.

Vous pouvez organiser une rencontre **si les deux personnes le souhaitent**. Un échange en personne ou en visio aide à clarifier le séjour, sans garantir une sélection ni une adaptation automatique de l’animal. Un profil, une formation déclarée ou un document d’identité contrôlé ne prouvent pas à eux seuls une aptitude à toute garde.

Attendez un accord clair avant d’engager des frais de trajet. Après confirmation, Guardiens propose un accord de garde à signature facultative ; le guide de la maison complète les consignes lorsqu’il est disponible.

## <a id="transitions"></a>Peut-on enchaîner plusieurs maisons ?

Cela demande une marge entre les séjours. Prévoyez le transport, la restitution des clés, l’arrivée suivante et un autre hébergement si les dates ne se rejoignent pas. Une candidature en cours ne doit pas devenir votre seule solution de logement.

Convenez aussi de ce qui se passe si votre trajet est retardé, si le propriétaire rentre plus tard ou si vous ne pouvez plus assurer la garde. Préparez les contacts et un relais local qui a accepté son rôle. Les [conseils de première garde](/actualites/reussir-premiere-garde-house-sitting) détaillent la passation, la communication et le retour.

Le réseau peut aussi servir à des coups de main ponctuels sans nuitée. Le [guide de l’entraide](/actualites/petites-missions-entraide-guardiens) explique les échanges de temps ou de service convenus ensemble. Leur existence ne garantit ni un hébergement ni une garde suivante.

## <a id="faq"></a>Questions fréquentes

:::faq
### Peut-on voyager entièrement gratuitement avec le house-sitting ?
L’hébergement est proposé sans rémunération pour les tâches convenues ; le voyage conserve des frais de transport, de vie quotidienne et d’assurance, ainsi que les dépenses discutées. Chiffrez l’ensemble avant de choisir une garde.

### La plateforme Guardiens est-elle payante pour un gardien ?
Elle est actuellement 100 % gratuite pour les propriétaires et les gardiens. Les conditions tarifaires présentent le fonctionnement actuel et ses évolutions éventuelles. Les frais du séjour restent distincts.

### Peut-on visiter la région pendant la garde ?
Oui si votre organisation est compatible avec la présence et les tâches convenues. Discutez de vos projets de sortie avant de confirmer ; certains besoins ne permettent pas de longues absences en journée.

### Faut-il commencer par un week-end ?
Pas nécessairement. Choisissez les responsabilités adaptées à votre expérience et votre disponibilité. Une garde courte avec des besoins exigeants n’est pas automatiquement plus simple qu’un séjour plus long.

### Peut-on compter sur des gardes successives pour se loger ?
Aucune continuité de séjours n’est garantie. Prévoyez les transports, les transitions et un hébergement de repli. Une candidature ou un échange en cours ne vaut pas confirmation d’une prochaine garde.

### Peut-on faire du house-sitting sans garder d’animaux ?
Oui, si l’annonce concerne le logement et les tâches courantes convenues. Les animaux dépendent du besoin du propriétaire et ne sont pas obligatoires dans une garde de maison.
:::$suite_content_1_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='9808681c-da08-4b95-a714-8327d457216d'::uuid AND slug='voyager-gratuitement-france-house-sitting';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/voyager-gratuitement-france-house-sitting' THEN
    RAISE EXCEPTION 'Guide suite 1 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Voyager en France avec le house-sitting : logement, budget et engagements'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Le house-sitting peut permettre de séjourner dans un logement sans le louer. Préparez aussi le trajet, les dépenses et le temps nécessaire aux tâches convenues.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'House-sitting en France : logement, budget et engagements'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Voyager en France en gardant une maison : comprenez l’hébergement sans rémunération, les frais à prévoir et les engagements avant de choisir une garde.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Une maison moderne avec de grandes baies vitrées et une terrasse au bord d’une piscine.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"page tarifs","url":"/tarifs"},{"text":"guide du house-sitting","url":"/actualites/c-est-quoi-le-house-sitting"},{"text":"guide du cadre juridique en France","url":"/actualites/house-sitting-cadre-juridique-france"},{"text":"guide du profil gardien","url":"/actualites/creer-profil-gardien-attractif"},{"text":"parcours pour débuter","url":"/actualites/comment-devenir-home-sitter-france-guide-debutant"},{"text":"conseils de première garde","url":"/actualites/reussir-premiere-garde-house-sitting"},{"text":"guide de l’entraide","url":"/actualites/petites-missions-entraide-guardiens"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 13:55:16.433089+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 1 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot24_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 1 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot24_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot24_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Voyager en France avec le house-sitting : logement, budget et engagements',
    excerpt='Le house-sitting peut permettre de séjourner dans un logement sans le louer. Préparez aussi le trajet, les dépenses et le temps nécessaire aux tâches convenues.',
    meta_title='House-sitting en France : logement, budget et engagements',
    meta_description='Voyager en France en gardant une maison : comprenez l’hébergement sans rémunération, les frais à prévoir et les engagements avant de choisir une garde.',
    hero_image_alt='Une maison moderne avec de grandes baies vitrées et une terrasse au bord d’une piscine.',
    internal_links='[{"text":"page tarifs","url":"/tarifs"},{"text":"guide du house-sitting","url":"/actualites/c-est-quoi-le-house-sitting"},{"text":"guide du cadre juridique en France","url":"/actualites/house-sitting-cadre-juridique-france"},{"text":"guide du profil gardien","url":"/actualites/creer-profil-gardien-attractif"},{"text":"parcours pour débuter","url":"/actualites/comment-devenir-home-sitter-france-guide-debutant"},{"text":"conseils de première garde","url":"/actualites/reussir-premiere-garde-house-sitting"},{"text":"guide de l’entraide","url":"/actualites/petites-missions-entraide-guardiens"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='voyager-gratuitement-france-house-sitting' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 1 : % ligne au lieu de 1',affected; END IF;
END;
$guide_1$;

COMMIT;
