-- Refonte des guides urgence vétérinaire Lyon et situations difficiles pendant une garde, autorisée le 17/10/2026.
-- Les URL, auteurs, dates de publication et indexabilité sont conservés.
BEGIN;
CREATE TABLE IF NOT EXISTS public._backup_articles_suite_lot19_20261017 AS SELECT * FROM public.articles WHERE false;
REVOKE ALL ON public._backup_articles_suite_lot19_20261017 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public._backup_articles_suite_lot19_20261017 TO service_role;
ALTER TABLE public._backup_articles_suite_lot19_20261017 ENABLE ROW LEVEL SECURITY;
SELECT id FROM public.articles WHERE id IN ('31aa4845-6c2e-4b14-bcc4-942d38162996'::uuid,'65d5845a-84bf-40b9-96cc-f6f00abb698e'::uuid) ORDER BY id FOR UPDATE;

DO $guide_0$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_0_20261017$# Animal anxieux, chat caché ou chien réactif : que faire pendant une garde ?

**Commencez par décrire ce qui change, sans coller une étiquette à l’animal.** Un chien qui aboie, un chat qui se cache ou un refus de contact ne permettent pas à eux seuls de distinguer peur, douleur et difficulté d’adaptation. Demandez au propriétaire ce qui est habituel ; pour un changement inquiétant ou un doute sur la santé, contactez le vétérinaire.

Votre rôle pendant la garde consiste à prendre soin de l’animal dans les conditions convenues. Vous n’avez pas à improviser une rééducation, un diagnostic ou un traitement pour « réussir » le séjour.

**Sommaire :** [réagir à un changement](#reagir), [chien anxieux](#chien-anxieux), [chat caché](#chat-cache), [chien réactif](#reactivite), [organiser un relais](#relais), [préparer la garde suivante](#preparer), [questions fréquentes](#faq).

## <a id="reagir"></a>Que faire dès qu’une situation vous inquiète ?

Notez des faits : ce que fait l’animal, depuis quand, dans quel contexte et ce qui diffère des consignes. Prévenez le propriétaire pour connaître ses habitudes. **Si vous soupçonnez un problème de santé, demandez un avis vétérinaire sans attendre un délai standard de 24 ou 48 heures.** L’absence de réponse du propriétaire ne doit pas retarder cet appel.

Une difficulté respiratoire, des convulsions, une blessure ou une ingestion suspectée nécessitent un contact vétérinaire immédiat. Le professionnel vous indique la conduite à tenir. N’administrez aucun médicament sans consigne et ne modifiez pas une prescription de votre propre initiative.

Gardez à portée de main le vétérinaire habituel et le service de garde du lieu du séjour. À Lyon, retrouvez les [numéros d’urgence vétérinaire et leurs horaires](/actualites/veterinaire-urgence-lyon-guide) ; ailleurs, utilisez les contacts convenus avant le départ ou le répondeur de la clinique habituelle.

| Ce que vous observez | Ce que vous pouvez organiser | Aide à solliciter |
| --- | --- | --- |
| Chien en détresse quand il reste seul | Revoir les absences prévues et les possibilités de relais. | Propriétaire et vétérinaire pour évaluer la situation. |
| Chat qui se cache davantage ou change ses habitudes | Préserver un refuge calme et observer repas, eau et litière sans forcer le contact. | Vétérinaire si le changement inquiète ou si ces fonctions changent. |
| Réactions intenses en promenade | Éviter les situations connues qui déclenchent une réaction et revoir le parcours. | Propriétaire, puis professionnel adapté ; relais si la sécurité n’est pas assurée. |
| Signes de maladie ou blessure | Appeler et suivre les consignes, préparer le transport demandé. | Vétérinaire ; ne pas attendre la fin d’une période d’adaptation. |

## <a id="chien-anxieux"></a>Le chien supporte mal vos absences

Les vocalises, destructions ou déplacements répétés peuvent accompagner une difficulté à rester seul. Ils ne constituent pas un diagnostic. La [RSPCA](https://www.rspca.org.uk/adviceandwelfare/pets/dogs/behaviour/separationrelatedbehaviour) rappelle qu’un problème de santé peut contribuer à ces comportements et recommande un avis vétérinaire.

Reprenez les habitudes et le programme déjà convenus avec le propriétaire. Si les absences prévues ne sont pas supportées, discutez rapidement d’une autre organisation : horaires compatibles, personne de relais ou autre solution de garde. Vous n’êtes pas tenu de promettre une présence permanente que vous ne pouvez assurer.

Ne punissez pas l’animal pour les dégâts et ne le laissez pas pleurer pour qu’il « apprenne ». Un jouet alimentaire n’est pas une solution garantie ni une raison de prolonger une absence qui provoque de la détresse. N’entreprenez pas seul un programme d’entraînement pendant la garde.

## <a id="chat-cache"></a>Le chat reste caché

Un refuge peut aider un chat à se sentir en sécurité. Laissez-lui son espace et évitez de le sortir de force ou de multiplier les sollicitations. Maintenez un accès à l’eau, à la nourriture et à la litière, sans les coller à sa cachette.

**Se cacher ne prouve pas que tout va bien.** [Cats Protection](https://www.cats.org.uk/help-and-advice/cat-behaviour/cats-hiding) recommande un contrôle vétérinaire lorsqu’un chat se cache davantage que d’habitude. Surveillez les changements d’alimentation, de boisson ou de litière et demandez conseil si vous êtes inquiet. N’attendez pas deux jours sans consommation constatée avant de réagir.

Demandez au propriétaire comment observer cet animal sans l’effrayer et comment distinguer les consommations si plusieurs chats partagent le logement. Ne rassurez pas quelqu’un uniquement parce que le chat a mangé une fois.

## <a id="reactivite"></a>Le chien réagit aux autres animaux ou aux passants

Évitez les rencontres forcées et les situations que le propriétaire a identifiées comme difficiles. Adaptez le trajet et les horaires aux possibilités du chien et à votre capacité à le tenir en sécurité. Une distance fixe de vingt mètres ne convient pas à tous les animaux.

Ne tentez pas de « reprendre le dessus » ni de punir un grognement. La [RSPCA, sur l’agression canine](https://www.rspca.org.uk/adviceandwelfare/pets/dogs/behaviour/aggression), souligne l’importance d’un examen vétérinaire et les risques liés aux confrontations. N’essayez pas d’apprendre à un chien à tolérer une situation en l’y exposant davantage pendant le séjour.

Si vous ne pouvez pas effectuer les sorties ou les soins sans danger, contactez le propriétaire pour organiser un relais compétent. Pour préparer le choix d’une garde adaptée, le [guide du chien réactif](/actualites/chien-reactif-agressif-garde-solutions) complète ces repères ; il ne remplace pas un accompagnement individuel.

## <a id="relais"></a>Quand faut-il revoir ou interrompre l’organisation ?

Prévenez le propriétaire dès que les besoins dépassent ce qui était prévu ou ce que vous pouvez assurer. Décrivez les faits et les tâches devenues impossibles, sans attendre le dépôt d’un avis après le séjour. Si un soin ne peut pas être réalisé, demandez au vétérinaire comment procéder.

Organisez la transition avec le propriétaire et le relais qui accepte de prendre la suite. **Ne laissez pas un animal sans solution de prise en charge.** En cas de danger, mettez-vous à l’abri et demandez l’aide appropriée ; ne tentez pas une manipulation risquée pour respecter le programme initial.

Le [guide des imprévus](/actualites/gerer-imprevu-pendant-garde) aide à préparer cette coordination. Un réseau de membres n’assure pas automatiquement un remplacement disponible immédiatement.

## <a id="preparer"></a>Les questions à poser avant de confirmer une prochaine garde

- Comment l’animal réagit-il à une autre personne, aux absences, aux soins et aux sorties ?
- Quelles difficultés sont connues, dans quelles circonstances et avec quel accompagnement ?
- Quels horaires, gestes et équipements sont réellement nécessaires ?
- Pouvez-vous effectuer ces tâches avec votre expérience et vos contraintes ?
- Qui appeler et quel relais a accepté d’intervenir si l’organisation ne convient plus ?

Une rencontre peut aider **si les deux personnes le souhaitent**, sans garantir le comportement futur. Vous pouvez refuser une garde qui dépasse vos possibilités. Décrivez honnêtement votre expérience dans votre [profil de gardien](/actualites/creer-profil-gardien-attractif) et utilisez le [guide de la première garde](/actualites/reussir-premiere-garde-house-sitting) pour préparer l’échange.

Guardiens permet de proposer ou de rechercher une garde de maison et d’animaux entre particuliers. La plateforme est **actuellement 100 % gratuite pour les deux rôles** ; le gardien est hébergé sans rémunération. Transport, dépenses et frais vétérinaires sont distincts. Une éventuelle contribution aux frais de la plateforme ne pourrait intervenir **avant le second semestre 2027**, avec trente jours de préavis. Les [conditions actuelles](/tarifs) restent la référence.

## <a id="faq"></a>Questions fréquentes

:::faq
### Un animal qui change de comportement est-il forcément stressé par la garde ?
Non. Le comportement seul ne permet pas d’exclure un problème de santé. Décrivez le changement au propriétaire et demandez un avis vétérinaire s’il est inquiétant ou inhabituel.

### Faut-il attendre 48 heures quand un chat se cache et ne mange pas ?
Non : n’utilisez pas ce délai comme règle d’attente. Contactez un vétérinaire si vous constatez un changement d’alimentation, de boisson ou de litière, ou si vous êtes inquiet pour sa santé.

### Faut-il laisser un chien anxieux pleurer pour qu’il s’habitue ?
Non. Reprenez contact avec le propriétaire pour revoir l’organisation et demander l’avis du vétérinaire. N’improvisez pas de programme d’apprentissage de la solitude pendant la garde.

### Peut-on refuser une garde avec un animal réactif ?
Oui. Expliquez vos limites avant de confirmer. Si une difficulté apparaît pendant le séjour, contactez rapidement le propriétaire pour organiser une solution adaptée sans laisser l’animal sans prise en charge.

### Qui appeler si le propriétaire ne répond pas et que l’animal semble malade ?
Appelez le vétérinaire habituel ou le service de garde du secteur. Expliquez votre rôle et poursuivez les tentatives de contact avec le propriétaire, sans retarder la demande d’avis médical.

### Guardiens garantit-il un remplacement si la garde ne convient plus ?
Non. Les membres doivent discuter d’un relais et de ses modalités avant la garde. La plateforme ne garantit pas qu’une autre personne sera immédiatement disponible.
:::$suite_content_0_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='31aa4845-6c2e-4b14-bcc4-942d38162996'::uuid AND slug='gerer-animaux-difficiles-garde';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/gerer-animaux-difficiles-garde' THEN
    RAISE EXCEPTION 'Guide suite 0 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Animal anxieux, chat caché ou chien réactif : que faire pendant une garde ?'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Pendant une garde, un comportement inhabituel mérite d’être décrit et compris. Les repères pour adapter le quotidien, demander de l’aide et reconnaître ses limites.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Animaux difficiles pendant une garde : comment réagir'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Chien anxieux, chat caché ou comportement inhabituel pendant une garde : observez, adaptez l’organisation et sachez quand contacter le vétérinaire.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Une personne assise près d’une table tend la main devant un chien dans un salon.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"numéros d’urgence vétérinaire et leurs horaires","url":"/actualites/veterinaire-urgence-lyon-guide"},{"text":"guide du chien réactif","url":"/actualites/chien-reactif-agressif-garde-solutions"},{"text":"guide des imprévus","url":"/actualites/gerer-imprevu-pendant-garde"},{"text":"profil de gardien","url":"/actualites/creer-profil-gardien-attractif"},{"text":"guide de la première garde","url":"/actualites/reussir-premiere-garde-house-sitting"},{"text":"conditions actuelles","url":"/tarifs"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 14:10:21.218295+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 0 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot19_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 0 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot19_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot19_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Animal anxieux, chat caché ou chien réactif : que faire pendant une garde ?',
    excerpt='Pendant une garde, un comportement inhabituel mérite d’être décrit et compris. Les repères pour adapter le quotidien, demander de l’aide et reconnaître ses limites.',
    meta_title='Animaux difficiles pendant une garde : comment réagir',
    meta_description='Chien anxieux, chat caché ou comportement inhabituel pendant une garde : observez, adaptez l’organisation et sachez quand contacter le vétérinaire.',
    hero_image_alt='Une personne assise près d’une table tend la main devant un chien dans un salon.',
    internal_links='[{"text":"numéros d’urgence vétérinaire et leurs horaires","url":"/actualites/veterinaire-urgence-lyon-guide"},{"text":"guide du chien réactif","url":"/actualites/chien-reactif-agressif-garde-solutions"},{"text":"guide des imprévus","url":"/actualites/gerer-imprevu-pendant-garde"},{"text":"profil de gardien","url":"/actualites/creer-profil-gardien-attractif"},{"text":"guide de la première garde","url":"/actualites/reussir-premiere-garde-house-sitting"},{"text":"conditions actuelles","url":"/tarifs"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='gerer-animaux-difficiles-garde' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 0 : % ligne au lieu de 1',affected; END IF;
END;
$guide_0$;

DO $guide_1$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_1_20261017$# Vétérinaire de garde à Lyon : contacts et horaires des urgences

## <a id="contacts"></a>Quels numéros appeler à Lyon et dans la métropole ?

**Appelez avant de vous déplacer.** Votre vétérinaire habituel, ou son répondeur, peut vous orienter vers son service de garde.

- **AdomVET, service de garde Lyon : [04 72 30 40 40](tel:+33472304040).** Clinique au **56 route de Vienne, 69007 Lyon** : **19 h à 8 h en semaine, du samedi 14 h au lundi 8 h, 24 h/24 les jours fériés**. Consultations uniquement après orientation par la régulation. Le service à domicile est annoncé **24 h/24** ; zone et délai à confirmer. [Horaires du service](https://www.urgences-veterinaires-lyon.fr/) et [fonctionnement de la clinique](https://www.urgences-veterinaires-lyon.fr/clinique-veterinaire/).
- **Mermoz Vet : [04 78 74 29 61](tel:+33478742961).** Urgences annoncées **24 h/24, 7 j/7**, au **76 rue Marius Berliet, 69008 Lyon**. [Coordonnées de Mermoz](https://mermoz.vet/).
- **CHV OnlyVet : [04 81 09 18 40](tel:+33481091840).** Urgences annoncées **24 h/24, 7 j/7**, au **7 rue Jean Zay, 69800 Saint-Priest**. [Coordonnées d’OnlyVet](https://www.onlyvet.fr/).
- **SIAMU, CHUVAC de VetAgro Sup : [04 78 87 07 07](tel:+33478870707).** Urgences annoncées **24 h/24, 7 j/7**, au **1 avenue Bourgelat, 69280 Marcy-l’Étoile**. [Service d’urgence du CHUVAC](https://chuvac.vetagro-sup.fr/services/urgences/) et [informations d’accès](https://chuvac.vetagro-sup.fr/informations-pratiques/).

Coordonnées consultées sur les sites des établissements le **17 octobre 2026**, sans appel de test. Cette sélection n’est ni un classement ni un annuaire exhaustif. Confirmez l’accueil, le lieu et l’espèce prise en charge : des horaires affichés ne garantissent pas une consultation immédiate.

**Dans cette page :** [préparer l’appel](#appel), [le 3115](#3115), [frais de consultation](#frais), [urgence pendant une garde](#garde), [questions fréquentes](#faq).

## <a id="appel"></a>Que faire si l’animal présente des signes inquiétants ?

**Contactez immédiatement un vétérinaire** en cas de difficulté respiratoire, de convulsions, de blessure ou d’ingestion suspectée. N’attendez pas qu’une crise dure cinq minutes pour demander conseil. Décrivez les signes, leur début, l’espèce, les problèmes connus et les traitements de l’animal, ainsi que votre emplacement.

Le professionnel évalue la situation et donne les consignes de soins et de transport. N’improvisez pas de traitement et ne donnez pas de médicament sans son avis. Rassemblez les ordonnances ou le carnet de santé disponibles, sans retarder l’appel pour chercher un document.

Une intervention à domicile peut être proposée, mais une clinique peut être nécessaire. L’organisation dépend de l’état de l’animal, des moyens requis et des disponibilités du service ; aucun délai d’arrivée n’est garanti par cet article.

## <a id="3115"></a>Le 3115 remplace-t-il ces numéros ?

Le [3115](https://www.urgences-veterinaires.fr/) est un numéro privé du réseau Emergence et de ses partenaires, qui annonce un appel gratuit d’orientation 24 h/24. Le service lyonnais indique en être le référent local. Vous pouvez le joindre ou appeler directement un établissement : le 3115 n’est pas un passage obligatoire ni un répertoire de toutes les cliniques.

## <a id="frais"></a>Combien coûte une consultation d’urgence à Lyon ?

Le prix dépend du service, de l’horaire et des actes nécessaires. À titre de repère daté, le [service de garde Lyon](https://www.urgences-veterinaires-lyon.fr/) affiche **120 € pour la consultation en clinique** et **126 € à domicile**, avec **20 % de majoration entre minuit et 6 h**, sur sa page tarifs 2026 consultée le 17 octobre. Ce sont les prix annoncés par un service, pas une moyenne lyonnaise ni le coût total d’un traitement.

Demandez ce qui est inclus, une estimation des soins proposés et les modalités de paiement. La gratuité d’un appel d’orientation n’inclut pas les actes vétérinaires.

## <a id="garde"></a>Un problème pendant la garde de l’animal d’un propriétaire

Appelez le vétérinaire et prévenez le propriétaire. **Ne retardez pas la demande d’avis médical parce que le propriétaire ne répond pas.** Indiquez au professionnel que vous êtes le gardien et communiquez les coordonnées du propriétaire.

Pour une prochaine garde, préparez les contacts, le dossier médical disponible, les prescriptions, les moyens de transport et un relais qui a accepté ce rôle. Discutez des personnes joignables, des décisions et du règlement des soins. Ne supposez pas qu’un gardien connaît les établissements ou possède une compétence médicale du seul fait de son inscription.

Le [guide des situations difficiles avec un animal](/actualites/gerer-animaux-difficiles-garde) aide à décrire un changement observé sans poser de diagnostic. Retrouvez aussi le [guide des imprévus](/actualites/gerer-imprevu-pendant-garde) et la [checklist de départ](/actualites/checklist-partir-vacances-animaux). Pour un autre séjour : [urgences Grenoble](/actualites/veterinaire-urgence-grenoble-isere) et [urgences Annecy](/actualites/veterinaire-urgence-annecy-haute-savoie).

**Guardiens met en relation des propriétaires et des gardiens hébergés pour veiller sur la maison et les animaux.** La plateforme est actuellement 100 % gratuite pour les deux rôles ; le gardien est accueilli sans rémunération, les dépenses sont à convenir et les frais médicaux restent distincts. Elle ne fournit ni soins vétérinaires ni remplacement immédiat. Pour une absence future, le [guide des formules de garde à Lyon](/actualites/pet-sitting-lyon-guide-complet) et les [conditions actuelles](/tarifs) complètent ces informations.

## <a id="faq"></a>Questions fréquentes

:::faq
### Quel vétérinaire appeler à Lyon la nuit ou le dimanche ?
Vous pouvez contacter AdomVET au 04 72 30 40 40, Mermoz au 04 78 74 29 61, OnlyVet au 04 81 09 18 40 ou le SIAMU au 04 78 87 07 07. Appelez pour être orienté et confirmer l’accueil avant de partir.

### La clinique AdomVET est-elle ouverte 24 h/24 en semaine ?
Son site annonce un accueil en clinique de 19 h à 8 h en semaine, du samedi 14 h au lundi 8 h et 24 h/24 les jours fériés. Le service à domicile est annoncé 24 h/24. La régulation doit orienter la consultation.

### Quel est le numéro d’urgence de VetAgro Sup à Marcy-l’Étoile ?
Le SIAMU du CHUVAC indique le 04 78 87 07 07 pour les urgences 24 h/24. Le campus se trouve au 1 avenue Bourgelat, 69280 Marcy-l’Étoile. Appelez avant de venir.

### Le 3115 est-il obligatoire avant d’aller en clinique ?
Non. C’est une possibilité d’orientation vers un réseau privé. Les établissements ont aussi leurs contacts directs ; suivez les modalités d’admission du service que vous joignez.

### Peut-on faire venir un vétérinaire à domicile ?
Le service de garde Lyon annonce cette possibilité 24 h/24 au 04 72 30 40 40. La régulation confirme le secteur, le délai et si l’intervention convient à l’animal. Une clinique peut être nécessaire.

### Une consultation d’urgence est-elle gratuite ?
La gratuité éventuelle du conseil ou de l’orientation téléphonique ne signifie pas que la consultation et les soins le sont. Demandez au service les frais et les modalités de paiement.
:::$suite_content_1_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='65d5845a-84bf-40b9-96cc-f6f00abb698e'::uuid AND slug='veterinaire-urgence-lyon-guide';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/veterinaire-urgence-lyon-guide' THEN
    RAISE EXCEPTION 'Guide suite 1 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Vétérinaire de garde à Lyon : contacts et horaires des urgences'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Un animal malade ou blessé dans la métropole de Lyon ? Les contacts des services d’urgence, les horaires en clinique et les possibilités à domicile.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Vétérinaire de garde Lyon : urgences 24h/24'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Urgence vétérinaire à Lyon : numéros d’AdomVET, Mermoz, OnlyVet et du SIAMU, adresses et horaires. Appelez avant de vous déplacer.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Une vétérinaire examine un chat roux installé dans son sac de transport.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"guide des situations difficiles avec un animal","url":"/actualites/gerer-animaux-difficiles-garde"},{"text":"guide des imprévus","url":"/actualites/gerer-imprevu-pendant-garde"},{"text":"checklist de départ","url":"/actualites/checklist-partir-vacances-animaux"},{"text":"urgences Grenoble","url":"/actualites/veterinaire-urgence-grenoble-isere"},{"text":"urgences Annecy","url":"/actualites/veterinaire-urgence-annecy-haute-savoie"},{"text":"guide des formules de garde à Lyon","url":"/actualites/pet-sitting-lyon-guide-complet"},{"text":"conditions actuelles","url":"/tarifs"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 13:55:16.356109+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 1 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot19_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 1 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot19_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot19_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Vétérinaire de garde à Lyon : contacts et horaires des urgences',
    excerpt='Un animal malade ou blessé dans la métropole de Lyon ? Les contacts des services d’urgence, les horaires en clinique et les possibilités à domicile.',
    meta_title='Vétérinaire de garde Lyon : urgences 24h/24',
    meta_description='Urgence vétérinaire à Lyon : numéros d’AdomVET, Mermoz, OnlyVet et du SIAMU, adresses et horaires. Appelez avant de vous déplacer.',
    hero_image_alt='Une vétérinaire examine un chat roux installé dans son sac de transport.',
    internal_links='[{"text":"guide des situations difficiles avec un animal","url":"/actualites/gerer-animaux-difficiles-garde"},{"text":"guide des imprévus","url":"/actualites/gerer-imprevu-pendant-garde"},{"text":"checklist de départ","url":"/actualites/checklist-partir-vacances-animaux"},{"text":"urgences Grenoble","url":"/actualites/veterinaire-urgence-grenoble-isere"},{"text":"urgences Annecy","url":"/actualites/veterinaire-urgence-annecy-haute-savoie"},{"text":"guide des formules de garde à Lyon","url":"/actualites/pet-sitting-lyon-guide-complet"},{"text":"conditions actuelles","url":"/tarifs"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='veterinaire-urgence-lyon-guide' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 1 : % ligne au lieu de 1',affected; END IF;
END;
$guide_1$;

COMMIT;
