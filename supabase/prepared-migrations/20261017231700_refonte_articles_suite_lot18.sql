-- Refonte des guides urgences vétérinaires Annecy et Grenoble, autorisée le 17/10/2026.
-- Les URL, auteurs, dates de publication et indexabilité sont conservés.
BEGIN;
CREATE TABLE IF NOT EXISTS public._backup_articles_suite_lot18_20261017 AS SELECT * FROM public.articles WHERE false;
REVOKE ALL ON public._backup_articles_suite_lot18_20261017 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public._backup_articles_suite_lot18_20261017 TO service_role;
ALTER TABLE public._backup_articles_suite_lot18_20261017 ENABLE ROW LEVEL SECURITY;
SELECT id FROM public.articles WHERE id IN ('e12213b6-d33a-42c8-a543-0d8d4fab4126'::uuid,'903ba318-fc29-4218-bccb-18849bc16e57'::uuid) ORDER BY id FOR UPDATE;

DO $guide_0$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_0_20261017$# Vétérinaire de garde à Annecy : contacts et horaires des urgences

## <a id="contacts"></a>Quel numéro appeler à Annecy ?

**Appelez un vétérinaire avant de vous déplacer.** Votre clinique habituelle, ou son répondeur lorsqu’elle est fermée, peut vous orienter vers son service de garde.

- **SOS VETO Annecy : [04 50 22 24 24](tel:+33450222424).** Garde en dehors des heures d’ouverture habituelles, jusqu’à **21 h**, week-ends et jours fériés compris. Le vétérinaire indique le cabinet ou la clinique où venir ; ce service ne consulte pas à domicile. [Horaires et fonctionnement de SOS VETO](https://sosveto74.com/).
- **CHV Saint-Martin : [04 50 600 900](tel:+33450600900).** Urgences **24 h/24, 7 j/7**, au **321 impasse des Champs, 74350 Allonzier-la-Caille**. Prévenez l’équipe avant l’arrivée. [Contact du CHV](https://chvsm.com/contact/).
- **VetoAdom Alpin : [04 58 17 32 32](tel:+33458173232).** Service d’urgence à domicile annoncé **24 h/24, 7 j/7** dans le secteur d’Annecy. L’appel permet d’évaluer la situation ; confirmez la zone et le délai. Une clinique peut être indiquée si l’intervention à domicile ne convient pas. [Service VetoAdom Alpin](https://www.vetoadom-alpin.com/urgence-veterinaire-grenoble.php).

**Après 21 h**, SOS VETO renvoie vers VetoAdom Alpin ou le CHV Saint-Martin. Les horaires habituels de consultation du CHV ne limitent pas son service d’urgence.

Contacts et horaires consultés sur les sites des services le **17 octobre 2026**, sans appel de test. Confirmez la prise en charge au téléphone, notamment pour un NAC. Cette liste n’est pas un classement ni un annuaire exhaustif.

**Pour la suite :** [préparer l’appel](#appel), [comprendre le 3115](#3115), [urgence pendant une garde](#garde), [questions fréquentes](#faq).

## <a id="appel"></a>Que dire au vétérinaire au téléphone ?

Décrivez ce que vous observez et depuis quand, l’espèce de l’animal, les traitements et problèmes de santé connus, ainsi que votre adresse exacte. En cas d’ingestion suspectée, indiquez le produit et gardez son emballage si vous l’avez.

Des difficultés à respirer, des convulsions, une blessure ou une suspicion de coup de chaleur justifient de **contacter immédiatement un vétérinaire**. N’attendez pas qu’une crise atteigne une durée donnée pour demander conseil. Le [service de régulation](https://www.vetoadom-alpin.com/urgence-veterinaire.php) évalue l’urgence et vous indique quoi faire, où aller et comment transporter l’animal.

N’improvisez pas un traitement ou un médicament. Suivez les consignes du vétérinaire ; ne retardez pas l’appel pour rassembler tous les documents. Si un déplacement est demandé, faites confirmer le lieu d’accueil et prenez les ordonnances ou le carnet de santé disponibles.

## <a id="3115"></a>Le 3115 est-il obligatoire ?

Non. Le [3115, page Annecy](https://www.urgences-veterinaires.fr/veterinaire-de-garde-ANNECY-74000), annonce une orientation gratuite 24 h/24. Il s’agit d’un **numéro privé du réseau Emergence et de ses partenaires**, pas d’un service public répertoriant tous les établissements. Vous pouvez aussi appeler directement les services ci-dessus ou votre vétérinaire habituel.

Un appel ou un conseil gratuit ne signifie pas que la consultation, les examens ou le déplacement le sont. Demandez les conditions et les frais au service qui propose la prise en charge.

## <a id="garde"></a>Si l’urgence survient pendant une garde de maison

Vous gardez l’animal de quelqu’un d’autre ? Contactez le vétérinaire puis prévenez le propriétaire. Si celui-ci ne répond pas, **ne retardez pas la demande d’avis vétérinaire**. Expliquez que vous êtes le gardien et donnez les coordonnées du propriétaire.

Pour une garde à venir, préparez ensemble :

- le vétérinaire habituel et les services de garde adaptés au lieu du séjour ;
- le dossier de santé, les traitements prescrits et les modalités de transport ;
- un contact de relais qui a accepté ce rôle ;
- les personnes joignables, la prise de décision et l’organisation du paiement des soins.

Ces points sont à discuter : un profil de gardien ne prouve pas une compétence médicale. Le [guide des imprévus pendant une garde](/actualites/gerer-imprevu-pendant-garde) et la [checklist de départ](/actualites/checklist-partir-vacances-animaux) aident à préparer ces échanges. Pour un séjour ailleurs, consultez aussi les [contacts d’urgence à Grenoble](/actualites/veterinaire-urgence-grenoble-isere).

**Guardiens est une plateforme de mise en relation pour des gardes de maison et d’animaux**, pas un service vétérinaire ni un remplacement d’urgence. Pour une prochaine absence, le [guide de garde en Haute-Savoie](/actualites/garde-animaux-haute-savoie-guide) aide à choisir une organisation. La plateforme est actuellement 100 % gratuite pour les deux rôles ; le gardien est hébergé sans rémunération, et les dépenses restent à convenir. Les soins vétérinaires sont distincts. Consultez les [conditions actuelles](/tarifs).

## <a id="faq"></a>Questions fréquentes

:::faq
### Qui appeler pour une urgence vétérinaire à Annecy la nuit ?
Le CHV Saint-Martin annonce un accueil des urgences 24 h/24 au 04 50 600 900. VetoAdom Alpin annonce un service à domicile 24 h/24 au 04 58 17 32 32. Appelez pour faire évaluer la situation et confirmer la prise en charge.

### SOS VETO Annecy répond-il après 21 h ?
Son site indique une garde jusqu’à 21 h et renvoie ensuite vers VetoAdom Alpin ou le CHV Saint-Martin. Appelez le service adapté avant tout déplacement.

### Où se trouve le CHV Saint-Martin ?
Au 321 impasse des Champs, 74350 Allonzier-la-Caille. Son numéro est le 04 50 600 900. Prévenez l’équipe de votre arrivée et faites confirmer l’accueil de votre animal.

### Peut-on faire venir un vétérinaire à domicile ?
VetoAdom Alpin propose ce service dans le secteur d’Annecy. La zone, le délai et l’adéquation de l’intervention sont à confirmer au 04 58 17 32 32. Certaines situations nécessitent une clinique.

### Le 3115 et les consultations sont-ils gratuits ?
Le 3115 annonce un appel gratuit pour orienter vers son réseau privé. Les consultations et autres actes vétérinaires peuvent être payants. Demandez leurs conditions au service concerné.

### Faut-il attendre l’accord du propriétaire pour appeler le vétérinaire ?
Non : si vous gardez un animal et êtes inquiet pour sa santé, demandez un avis vétérinaire et prévenez le propriétaire. Expliquez votre rôle au professionnel ; l’appel ne doit pas attendre que le propriétaire réponde.
:::$suite_content_0_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='e12213b6-d33a-42c8-a543-0d8d4fab4126'::uuid AND slug='veterinaire-urgence-annecy-haute-savoie';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/veterinaire-urgence-annecy-haute-savoie' THEN
    RAISE EXCEPTION 'Guide suite 0 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Vétérinaire de garde à Annecy : contacts et horaires des urgences'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Un animal malade ou blessé à Annecy ? Voici les contacts des services de garde, leurs horaires et les informations à donner au vétérinaire.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Vétérinaire de garde Annecy : urgences 24h/24'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Annecy : SOS VETO 04 50 22 24 24 jusqu’à 21 h ; CHV Saint-Martin 04 50 600 900, urgences 24 h/24. Appelez avant de vous déplacer.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Une vétérinaire examine un chien accompagné de sa propriétaire, qui tient un téléphone.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"guide des imprévus pendant une garde","url":"/actualites/gerer-imprevu-pendant-garde"},{"text":"checklist de départ","url":"/actualites/checklist-partir-vacances-animaux"},{"text":"contacts d’urgence à Grenoble","url":"/actualites/veterinaire-urgence-grenoble-isere"},{"text":"guide de garde en Haute-Savoie","url":"/actualites/garde-animaux-haute-savoie-guide"},{"text":"conditions actuelles","url":"/tarifs"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 15:40:12.318591+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 0 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot18_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 0 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot18_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot18_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Vétérinaire de garde à Annecy : contacts et horaires des urgences',
    excerpt='Un animal malade ou blessé à Annecy ? Voici les contacts des services de garde, leurs horaires et les informations à donner au vétérinaire.',
    meta_title='Vétérinaire de garde Annecy : urgences 24h/24',
    meta_description='Annecy : SOS VETO 04 50 22 24 24 jusqu’à 21 h ; CHV Saint-Martin 04 50 600 900, urgences 24 h/24. Appelez avant de vous déplacer.',
    hero_image_alt='Une vétérinaire examine un chien accompagné de sa propriétaire, qui tient un téléphone.',
    internal_links='[{"text":"guide des imprévus pendant une garde","url":"/actualites/gerer-imprevu-pendant-garde"},{"text":"checklist de départ","url":"/actualites/checklist-partir-vacances-animaux"},{"text":"contacts d’urgence à Grenoble","url":"/actualites/veterinaire-urgence-grenoble-isere"},{"text":"guide de garde en Haute-Savoie","url":"/actualites/garde-animaux-haute-savoie-guide"},{"text":"conditions actuelles","url":"/tarifs"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='veterinaire-urgence-annecy-haute-savoie' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 0 : % ligne au lieu de 1',affected; END IF;
END;
$guide_0$;

DO $guide_1$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_1_20261017$# Vétérinaire de garde à Grenoble : contacts et horaires des urgences

## <a id="contacts"></a>Quel service appeler à Grenoble ?

**Appelez avant de partir.** Votre vétérinaire habituel peut prendre en charge l’animal ou indiquer son service de garde sur son répondeur.

- **Maison des Urgences Vétérinaires de Grenoble : [04 80 42 33 23](tel:+33480423323).** Accueil au **32 rue de Comboire, 38130 Échirolles**. Horaires annoncés : **19 h 30 à 7 h 30 en semaine, à partir de midi le samedi, 24 h/24 les dimanches et jours fériés**. L’appel permet une évaluation et une orientation par la régulation vétérinaire. [Coordonnées et horaires de la Maison des Urgences](https://www.maisondesurgences-grenoble.com/).
- **VetoAdom Alpin : [04 58 17 32 32](tel:+33458173232).** Urgences à domicile annoncées **24 h/24, 7 j/7** dans le secteur grenoblois. Confirmez la zone et le délai au téléphone ; le vétérinaire peut vous orienter vers une clinique selon la situation. [Service VetoAdom Alpin Grenoble](https://www.vetoadom-alpin.com/urgence-veterinaire-grenoble.php).

**La consultation à Échirolles n’est donc pas ouverte 24 h/24 tous les jours de la semaine.** En journée, votre clinique habituelle ou la régulation vous indique où consulter. Un service annoncé 24 h/24 ne garantit pas une arrivée immédiate à domicile.

Coordonnées et horaires consultés sur les sites des services le **17 octobre 2026**, sans appel de test. Confirmez l’accueil de votre espèce et les possibilités du moment avant de vous déplacer. Cette sélection n’est pas exhaustive.

**Repères :** [préparer l’appel](#appel), [le rôle du 3115](#3115), [NAC et frais](#accueil), [urgence pendant une garde](#garde), [questions fréquentes](#faq).

## <a id="appel"></a>Comment obtenir un avis adapté à la situation ?

Décrivez l’animal, ce que vous constatez, le début des signes, ses traitements et ses antécédents connus. Indiquez où vous êtes et comment vous pouvez vous déplacer. Pour une ingestion suspectée, précisez le produit et gardez l’emballage si disponible.

**Appelez immédiatement un vétérinaire** si l’animal convulse, respire difficilement, est blessé ou présente des signes inquiétants après une exposition à la chaleur. N’attendez pas cinq minutes pour voir s’il récupère. Le [vétérinaire régulateur](https://www.vetoadom-alpin.com/urgence-veterinaire.php) détermine avec vous les suites et les gestes à effectuer.

Ne donnez pas de médicament et n’improvisez pas de soins sans consigne vétérinaire. L’appel passe avant la recherche de tous les papiers. Si le professionnel demande de venir, faites confirmer le lieu, les modalités de transport et les documents utiles.

## <a id="3115"></a>Faut-il passer par le 3115 ?

Le [3115, page Grenoble](https://www.urgences-veterinaires.fr/veterinaire-de-garde-GRENOBLE-38000), annonce un appel gratuit 24 h/24 pour orienter vers un vétérinaire de son réseau. C’est un **numéro privé du réseau Emergence et de ses partenaires**. Il ne recense pas tous les établissements et son utilisation n’est pas obligatoire avant un appel direct.

## <a id="accueil"></a>NAC, déplacement et frais : les points à confirmer

Pour un lapin, un rongeur, un oiseau ou un reptile, annoncez l’espèce dès le début. La Maison des Urgences indique que la prise en charge des oiseaux et reptiles dépend de certains membres de son équipe. Ne déduisez pas d’une mention « NAC » que toute espèce peut être reçue à toute heure.

La régulation annoncée gratuite est distincte des consultations, examens et interventions. Demandez les frais, les modalités de paiement et les possibilités de prise en charge au service contacté. La gratuité d’une plateforme de garde n’inclut pas les soins vétérinaires.

## <a id="garde"></a>Vous gardez l’animal pendant l’absence du propriétaire ?

Demandez un avis vétérinaire puis contactez le propriétaire. **Son absence de réponse ne doit pas retarder l’appel au professionnel.** Présentez-vous comme gardien et communiquez les coordonnées du propriétaire. Le vétérinaire précise la suite de la prise en charge.

Avant une prochaine garde, mettez au même endroit le vétérinaire habituel, les numéros d’urgence du secteur, les prescriptions, un contact de relais et les moyens de transport possibles. Discutez aussi des personnes joignables, des décisions et du paiement des soins. Aucune expérience médicale ne doit être supposée à partir d’un profil.

Le [guide des imprévus](/actualites/gerer-imprevu-pendant-garde) détaille l’organisation entre propriétaire et gardien. La [checklist avant départ](/actualites/checklist-partir-vacances-animaux) aide à réunir les informations utiles. Pour une autre destination, retrouvez les [contacts d’urgence à Annecy](/actualites/veterinaire-urgence-annecy-haute-savoie).

Pour préparer un séjour futur, consultez le [guide de garde à Grenoble et en Chartreuse](/actualites/pet-sitting-grenoble-chartreuse). **Guardiens met en relation des propriétaires et des gardiens hébergés pour veiller sur la maison et les animaux.** La plateforme est actuellement 100 % gratuite pour les deux rôles ; le gardien est accueilli sans rémunération et les dépenses sont à convenir. Elle ne fournit ni soins vétérinaires ni remplacement immédiat. Les [conditions actuelles](/tarifs) sont distinctes des frais médicaux.

## <a id="faq"></a>Questions fréquentes

:::faq
### Quel numéro appeler pour un vétérinaire de garde à Grenoble ?
La Maison des Urgences Vétérinaires est joignable au 04 80 42 33 23. VetoAdom Alpin, pour une évaluation et une éventuelle intervention à domicile, est joignable au 04 58 17 32 32. Appelez avant de vous déplacer.

### La Maison des Urgences de Grenoble reçoit-elle 24 h/24 ?
Pas tous les jours : son site annonce 19 h 30 à 7 h 30 en semaine, à partir de midi le samedi, et 24 h/24 les dimanches et jours fériés. Faites confirmer l’accueil par téléphone.

### Quelle est l’adresse du service d’urgence à Échirolles ?
La Maison des Urgences Vétérinaires se situe au 32 rue de Comboire, 38130 Échirolles. Son numéro est le 04 80 42 33 23. Appelez pour confirmer l’orientation et la prise en charge avant le départ.

### Un vétérinaire peut-il venir à domicile à Grenoble la nuit ?
VetoAdom Alpin annonce un service 24 h/24 au 04 58 17 32 32. Le professionnel évalue si cette solution convient et précise la zone et le délai. Une consultation en clinique peut être nécessaire.

### Peut-on attendre pour voir si une convulsion ou un coup de chaleur passe ?
Contactez immédiatement un vétérinaire pour obtenir des consignes adaptées. Ne vous fiez pas à un délai trouvé dans un article pour décider d’attendre.

### La consultation est-elle gratuite si l’appel l’est ?
Non : un conseil ou une orientation téléphonique gratuite n’inclut pas les actes vétérinaires. Les conditions et les frais sont à demander au service qui propose la prise en charge.
:::$suite_content_1_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='903ba318-fc29-4218-bccb-18849bc16e57'::uuid AND slug='veterinaire-urgence-grenoble-isere';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/veterinaire-urgence-grenoble-isere' THEN
    RAISE EXCEPTION 'Guide suite 1 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Vétérinaire de garde à Grenoble : contacts et horaires des urgences'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Besoin d’un vétérinaire de garde à Grenoble ? Les numéros utiles, les horaires d’accueil à Échirolles et les possibilités d’intervention à domicile.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Vétérinaire de garde Grenoble : urgences 24h/24'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Grenoble : Maison des Urgences 04 80 42 33 23 à Échirolles ; VetoAdom Alpin 04 58 17 32 32 à domicile. Horaires et appel avant déplacement.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Une vétérinaire en tenue bleue s’occupe d’un chien dans une salle de soins.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"guide des imprévus","url":"/actualites/gerer-imprevu-pendant-garde"},{"text":"checklist avant départ","url":"/actualites/checklist-partir-vacances-animaux"},{"text":"contacts d’urgence à Annecy","url":"/actualites/veterinaire-urgence-annecy-haute-savoie"},{"text":"guide de garde à Grenoble et en Chartreuse","url":"/actualites/pet-sitting-grenoble-chartreuse"},{"text":"conditions actuelles","url":"/tarifs"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 13:40:17.576179+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 1 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot18_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 1 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot18_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot18_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Vétérinaire de garde à Grenoble : contacts et horaires des urgences',
    excerpt='Besoin d’un vétérinaire de garde à Grenoble ? Les numéros utiles, les horaires d’accueil à Échirolles et les possibilités d’intervention à domicile.',
    meta_title='Vétérinaire de garde Grenoble : urgences 24h/24',
    meta_description='Grenoble : Maison des Urgences 04 80 42 33 23 à Échirolles ; VetoAdom Alpin 04 58 17 32 32 à domicile. Horaires et appel avant déplacement.',
    hero_image_alt='Une vétérinaire en tenue bleue s’occupe d’un chien dans une salle de soins.',
    internal_links='[{"text":"guide des imprévus","url":"/actualites/gerer-imprevu-pendant-garde"},{"text":"checklist avant départ","url":"/actualites/checklist-partir-vacances-animaux"},{"text":"contacts d’urgence à Annecy","url":"/actualites/veterinaire-urgence-annecy-haute-savoie"},{"text":"guide de garde à Grenoble et en Chartreuse","url":"/actualites/pet-sitting-grenoble-chartreuse"},{"text":"conditions actuelles","url":"/tarifs"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='veterinaire-urgence-grenoble-isere' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 1 : % ligne au lieu de 1',affected; END IF;
END;
$guide_1$;

COMMIT;
