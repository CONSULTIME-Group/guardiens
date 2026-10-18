-- Maillage éditorial, lot 03 : deux articles existants. Reprise autorisée le 18/10/2026.
-- Seuls content, internal_links et updated_at changent ; URL, indexabilité et métadonnées conservées.
BEGIN;
CREATE TABLE IF NOT EXISTS public._backup_articles_maillage_lot03_20261018 AS SELECT * FROM public.articles WHERE false;
REVOKE ALL ON public._backup_articles_maillage_lot03_20261018 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public._backup_articles_maillage_lot03_20261018 TO service_role;
ALTER TABLE public._backup_articles_maillage_lot03_20261018 ENABLE ROW LEVEL SECURITY;
SELECT id FROM public.articles WHERE id IN ('6ea0dd2c-64f5-48e2-ab78-ce8ab20b8e4f'::uuid,'6c52710a-3130-49dd-8856-47ec9233feae'::uuid) ORDER BY id FOR UPDATE;

DO $article_0$
DECLARE
  before_row public.articles%ROWTYPE;
  new_content text := $maillage_lot03_0$# Petites missions Guardiens : demander ou proposer un coup de main

**Les petites missions Guardiens servent à organiser un coup de main ponctuel entre particuliers, sans rémunération.** Vous publiez un besoin, échangez avec les personnes intéressées et convenez des conditions avant de commencer. Si vous voulez proposer votre aide, présentez plutôt vos savoir-faire dans votre profil.

La plateforme est **actuellement 100 % gratuite**. Les achats ou déplacements éventuels restent distincts ; une réponse, une compétence ou un remplacement ne sont pas garantis. Le but est de rendre possible un échange de proximité, à partir de ce que chacun peut réellement assurer.

**Repères :** [choisir le bon parcours](#parcours), [décrire le besoin](#publication), [répondre et convenir](#reponse), [comprendre la gratuité](#frais), [connaître les limites](#limites), [gérer un imprévu](#imprevu), [questions fréquentes](#faq).

## <a id="parcours"></a>Demander, aider ou faire garder sa maison : par où passer ?

| Ce que vous souhaitez faire | Le parcours adapté |
| --- | --- |
| Présenter un besoin ponctuel | Publier une petite mission en décrivant la tâche et ses conditions. |
| Proposer ce que vous savez faire | Compléter les savoir-faire de votre profil et vos limites. |
| Aider sur un besoin publié | Lire la mission puis y répondre si elle correspond à vos capacités et disponibilités. |
| Faire occuper votre maison pendant une absence | Préparer une annonce de house-sitting avec la présence et les tâches convenues. |

Les [petites missions publiques](/petites-missions) permettent de découvrir les besoins. La publication demande un compte connecté, sans seuil de complétion de profil. Pour répondre au besoin d’une autre personne, le profil doit actuellement atteindre **40 % de complétion** ; suivez les informations affichées si l’accès n’est pas encore ouvert. L’écusson de contrôle d’un document d’identité n’est pas un prérequis de réponse.

L’entraide s’adresse aux adultes dans les conditions des [CGU](/cgu). Une mission ponctuelle et une garde avec hébergement suivent des parcours différents : le [guide du fonctionnement de Guardiens](/actualites/comment-fonctionne-guardiens-et-le-house-sitting-entre-particuliers) explique la garde de maison, avec ou sans animaux.

## <a id="publication"></a>Comment publier un besoin compréhensible ?

Décrivez une tâche délimitée : préparer des plantations, récupérer une commande déjà payée ou assembler un meuble selon sa notice, si les conditions sont adaptées. Pour un animal, détaillez les gestes et la présence nécessaires ; une simple visite ne convient pas automatiquement à tous les chiens ou chats.

Préparez le secteur, les dates ou créneaux, la durée envisagée, les accès et le matériel. Ajoutez une illustration utile en respectant les personnes et la confidentialité. Gardez l’adresse exacte, les codes d’accès et les documents hors de la publication publique.

Le formulaire vous fait décrire le besoin puis son organisation. **Il ne vous demande pas de rédiger une offre de service ni une contrepartie personnalisée.** Le rappel commun porte sur un merci, un café ou un coup de main à convenir ensemble. Vous n’avez pas à calculer une équivalence d’heures à rendre.

Les [idées de coups de main](/actualites/idees-coups-de-main-entraide-pres-de-chez-soi) aident à choisir une première tâche ; les [conseils pour demander simplement](/actualites/oser-demander-coup-de-main-pres-de-chez-soi) proposent un exemple de message. Une annonce précise facilite la compréhension sans garantir un délai de réponse.

Pour une aide au jardin, les guides de [jardinage en entraide à Grenoble](/actualites/jardinage-entraide-locale-grenoble) et de [jardinage en entraide à Annecy](/actualites/jardinage-entraide-quartier-annecy) montrent comment délimiter les tâches, les accès et le matériel. Ces exemples de préparation ne constituent pas une offre de personnes disponibles.

## <a id="reponse"></a>Comment proposer son aide et confirmer les conditions ?

Pour rendre visibles vos compétences, utilisez les [savoir-faire du profil](/profile?section=savoir-faire). Expliquez ce que vous savez faire, le matériel dont vous disposez éventuellement et ce que vous préférez refuser. Ce profil ne constitue pas une certification professionnelle.

Sur une demande qui vous convient, vous pouvez indiquer que vous pouvez aider ou répondre avec un mot, selon les actions affichées. Une première réponse ouvre l’échange ; elle ne règle pas à elle seule toutes les conditions de l’intervention. Certaines demandes peuvent être temporairement fermées aux nouvelles réponses lorsqu’il y en a déjà en attente.

Avant de convenir de l’aide, confirmez la tâche, les personnes présentes, le créneau, les accès, le matériel, les frais éventuels et les limites. Demandez les précisions manquantes et dites ce que vous ne pouvez pas assurer. Une personne qui reçoit une réponse reste libre de ne pas la retenir.

Une rencontre préalable est possible **si vous le souhaitez tous les deux**. Un contrôle de document d’identité, lorsqu’un profil l’affiche, ne garantit ni la fiabilité ni une compétence. Les avis, lorsqu’ils existent, complètent la discussion ; une aide réussie sur une tâche ne prouve pas que la personne peut assurer toutes les autres.

## <a id="frais"></a>Gratuit signifie-t-il qu’aucune dépense n’est possible ?

La [gratuité actuelle de la plateforme](/tarifs) et l’absence de rémunération du service sont deux points à distinguer des dépenses. Les plants, les courses ou les consommables doivent être prévus ; ils ne sont pas offerts automatiquement par la personne qui aide.

Les CGU permettent le remboursement **au montant exact sur justificatif d’une dépense avancée pour l’autre et convenue**. Cela ne rémunère ni le temps ni le travail. N’utilisez pas un forfait ou un remboursement inventé pour payer le service. Pour un trajet, vérifiez ensemble les conditions et les frais réels admissibles.

L’absence de paiement ne dispense pas automatiquement de toutes les obligations juridiques, fiscales ou d’assurance. Une activité régulière, professionnelle ou réglementée ne devient pas une petite mission admissible en supprimant simplement un prix. Pour une situation qui dépasse l’entraide ponctuelle, demandez l’avis de l’interlocuteur compétent.

## <a id="limites"></a>Quelles tâches ne relèvent pas de cette entraide ?

Les CGU excluent notamment la garde ou le transport d’enfants non accompagnés de leur représentant légal, les soins médicaux ou paramédicaux et l’aide corporelle, les travaux électriques, de gaz ou de chauffage, la hauteur, l’élagage, l’abattage, la construction et la démolition. Elles excluent aussi les activités réglementées et certaines activités professionnelles. Consultez le cadre complet avant de publier.

L’aide aux devoirs suit des conditions précises : le représentant légal présente la demande et reste l’interlocuteur ; lui-même ou un adulte du foyer est présent pendant toute la séance, y compris à distance. Ne publiez pas le nom, la photo, l’école ou l’adresse d’un enfant.

Pour un proche, préparez la demande avec son accord et restez l’interlocuteur. Des conditions particulières s’appliquent aux personnes sous protection juridique. Le [guide d’aide aux courses et aux proches](/actualites/courses-aide-domicile-entraide-senior-lyon) explique aussi les limites concernant argent, documents et moyens de paiement.

Demandez à votre assureur ce que couvre votre contrat pour la tâche envisagée, les personnes et les dommages. **Guardiens ne fournit pas une assurance générale de l’échange.** Ne présumez pas qu’une multirisque habitation couvrira automatiquement un accident, vos propres blessures ou un objet confié.

## <a id="imprevu"></a>Et si l’aide ne peut plus avoir lieu ou si un incident survient ?

Prévenez rapidement si une condition change. Pour une tâche essentielle, notamment des soins ou une présence animale convenue, prévoyez un relais avant de compter sur une réponse éventuelle. Confirmez ce relais avec la personne concernée ; la plateforme ne garantit pas un remplacement.

En cas d’urgence, contactez les secours ou le professionnel adapté ; une urgence vétérinaire ne doit pas attendre de joindre d’abord le propriétaire. Le [guide des imprévus pendant une garde](/actualites/gerer-imprevu-pendant-garde) aide à préparer les contacts et l’organisation.

Pour un dommage, conservez les éléments utiles, prévenez la personne concernée et contactez les assureurs selon la situation. La responsabilité ne se règle pas automatiquement par un geste symbolique ou à la charge d’une seule personne. Signalez à la plateforme les comportements contraires aux règles, sans attendre d’elle une prise en charge d’assurance ou un résultat de médiation garanti.

Après une mission terminée, vous pouvez laisser le retour proposé dans le parcours. Restez factuel sur l’échange réalisé et préservez les informations privées ; aucun avis positif ne doit être exigé à l’avance. Pour aller plus loin, le [guide du réseau d’entraide de proximité](/actualites/reseau-entraide-quartier-lyon-aura) propose des étapes pour renouveler les échanges librement.

Notre article sur la [technologie et le lien social de proximité](/actualites/technologie-recreer-lien-pres-de-chez-soi) explique ce qu’un outil de mise en relation peut faciliter, et ce qui reste à construire entre les personnes.

## <a id="faq"></a>Questions fréquentes

:::faq
### Qui peut publier ou répondre à une petite mission ?
Un membre connecté peut publier un besoin sans seuil de complétion du profil. Pour répondre au besoin d’une autre personne, le profil doit actuellement atteindre 40 % de complétion. L’entraide s’adresse aux adultes dans le cadre des CGU.

### Où publier une offre d’aide ?
Les nouvelles petites missions servent à présenter un besoin. Pour proposer ce que vous savez faire, renseignez les savoir-faire de votre profil puis échangez sur les demandes adaptées à vos capacités et disponibilités.

### Faut-il proposer une contrepartie personnalisée ?
Non. Le formulaire rappelle un merci, un café ou un coup de main à convenir ensemble. Il ne demande pas de calculer une prestation ou un nombre d’heures équivalents.

### Peut-on rembourser une dépense ?
Une dépense avancée pour l’autre et convenue peut être remboursée au montant exact sur justificatif. Ce remboursement reste distinct de la rémunération du travail, interdite dans ce cadre.

### Les petites missions sont-elles assurées par Guardiens ?
Guardiens ne fournit pas une assurance générale de l’échange. Vérifiez avec votre assureur la couverture de la tâche, des personnes et des dommages envisagés avant de commencer.

### Une petite mission garantit-elle un gardien pour mes vacances ?
Non. Une aide ponctuelle peut permettre de faire connaissance, mais une garde de maison demande un nouvel échange sur la présence, les animaux et les tâches. Aucune candidature, compétence ou solution de remplacement n’est garantie.
:::$maillage_lot03_0$;
  new_links jsonb := '[{"url":"/petites-missions","text":"petites missions publiques"},{"url":"/cgu","text":"CGU"},{"url":"/actualites/comment-fonctionne-guardiens-et-le-house-sitting-entre-particuliers","text":"guide du fonctionnement de Guardiens"},{"url":"/actualites/idees-coups-de-main-entraide-pres-de-chez-soi","text":"idées de coups de main"},{"url":"/actualites/oser-demander-coup-de-main-pres-de-chez-soi","text":"conseils pour demander simplement"},{"url":"/profile?section=savoir-faire","text":"savoir-faire du profil"},{"url":"/tarifs","text":"gratuité actuelle de la plateforme"},{"url":"/actualites/courses-aide-domicile-entraide-senior-lyon","text":"guide d’aide aux courses et aux proches"},{"url":"/actualites/gerer-imprevu-pendant-garde","text":"guide des imprévus pendant une garde"},{"url":"/actualites/reseau-entraide-quartier-lyon-aura","text":"guide du réseau d’entraide de proximité"},{"text":"jardinage en entraide à Grenoble","url":"/actualites/jardinage-entraide-locale-grenoble"},{"text":"jardinage en entraide à Annecy","url":"/actualites/jardinage-entraide-quartier-annecy"},{"text":"technologie et le lien social de proximité","url":"/actualites/technologie-recreer-lien-pres-de-chez-soi"}]'::jsonb;
  affected integer;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='6ea0dd2c-64f5-48e2-ab78-ce8ab20b8e4f'::uuid AND slug='petites-missions-entraide-guardiens';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS DISTINCT FROM false
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/petites-missions-entraide-guardiens' THEN
    RAISE EXCEPTION 'Lot 03 article 0: état éditorial inattendu';
  END IF;
  IF before_row.content = new_content AND before_row.internal_links IS NOT DISTINCT FROM new_links THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-18T02:58:49.651855+00:00'::timestamptz
    OR md5(before_row.content) IS DISTINCT FROM '256db68276e1b5c5700d4778aa7d0fd2' THEN
    RAISE EXCEPTION 'Lot 03 article 0: version concurrente';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_maillage_lot03_20261018 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Lot 03 article 0: sauvegarde différente';
  END IF;
  INSERT INTO public._backup_articles_maillage_lot03_20261018 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_maillage_lot03_20261018 z WHERE z.id=x.id);
  UPDATE public.articles SET content=new_content, internal_links=new_links, updated_at=now()
    WHERE id=before_row.id AND slug=before_row.slug AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN RAISE EXCEPTION 'Lot 03 article 0: écriture incomplète'; END IF;
END;
$article_0$;

DO $article_1$
DECLARE
  before_row public.articles%ROWTYPE;
  new_content text := $maillage_lot03_1$# House sitting : définition, prix et fonctionnement d'un home sitter

**En bref**

- Le house sitting, ou home sitting, est un échange : une personne loge chez vous pendant votre absence et veille sur la maison et les animaux éventuels.
- Cette personne s'appelle un home sitter, un house sitter ou un gardien.
- Sur Guardiens, la plateforme est actuellement 100 % gratuite pour les deux rôles et le gardien est hébergé sans rémunération.
- Les frais qui restent se décident entre vous : nourriture des animaux, soins éventuels, trajets demandés.
- Une garde se prépare en cinq étapes : annonce, échange et confirmation, consignes et accord éventuel, garde, retour.

**Sommaire**

- [Définition](#definition)
- [Qu'est-ce qu'un home sitter ?](#home-sitter)
- [Fonctionnement en 5 étapes](#fonctionnement)
- [Prix : combien coûte un home sitter ?](#prix)
- [Devenir home sitter](#devenir-home-sitter)
- [House sitting, pet sitter ou pension](#comparatif)
- [À qui cela convient](#pour-qui)
- [Assurance, accord écrit et imprévus](#legislation)
- [Pourquoi nous avons créé Guardiens](#experience)
- [Exemple de préparation](#exemple)
- [Questions fréquentes](#faq)

## <a id="definition"></a>Définition : house sitting, home sitting et pet sitting

Le house sitting est la garde d'un logement par une personne qui y séjourne pendant l'absence de ses occupants. Le mot vient de l'anglais : *house* pour maison, *to sit* pour garder. En français, home sitting, homesitting et gardiennage de maison désignent la même pratique.

Sur Guardiens, le house sitting est un échange. Le gardien est hébergé sans rémunération ; la maison est habitée selon la présence convenue et les animaux éventuels conservent leur environnement. Ce que chacun apporte (présence, tâches, durée, frais) se fixe ensemble avant la garde.

Le pet sitting désigne surtout le soin des animaux : visites ponctuelles, accueil chez le pet sitter ou présence au domicile. Les deux pratiques se recoupent souvent, puisqu'une garde de maison inclut fréquemment des animaux.

Une garde de maison sans animaux est une garde à part entière : courrier, plantes, aération, présence pendant une longue absence.

## <a id="home-sitter"></a>Qu'est-ce qu'un home sitter ?

Un home sitter est la personne qui loge chez vous pendant votre absence pour veiller sur votre maison et, le plus souvent, sur vos animaux. On dit aussi house sitter, gardien de maison ou, sur Guardiens, gardien.

Son rôle tient en quelques gestes du quotidien, définis avec le propriétaire :

- nourrir et promener les animaux selon leurs habitudes, suivre les consignes vétérinaires prescrites uniquement si les gestes sont compris et acceptés ;
- arroser les plantes et le potager, relever le courrier, aérer ;
- donner à la maison un air habité pendant votre absence ;
- envoyer des nouvelles au rythme convenu.

Les profils sont variés : retraités, télétravailleurs, couples, étudiants, personnes en voyage. Consultez les informations renseignées dans les profils, les expériences décrites et les avis lorsqu’ils existent. Un document d’identité contrôlé ne certifie pas une compétence ou la fiabilité. Vous voyez les gardiens [à proximité de chez vous](/house-sitting).

## <a id="fonctionnement"></a>Comment fonctionne une garde, en 5 étapes

### 1. Publier une annonce détaillée

Le propriétaire décrit ses dates, son logement, ses animaux (habitudes, traitements, caractère) et les tâches attendues. Des photos du lieu de vie aident le gardien à se projeter. Décrire les contraintes aide les personnes intéressées à décider si elles peuvent assurer la garde : [préparer une annonce](/sits/create). Une candidature n’est pas garantie.

### 2. Échanger et choisir

Le propriétaire lit les profils et les avis, puis échange par messagerie avec les gardiens intéressés. Un appel vidéo ou une rencontre peuvent compléter cet échange, si vous le souhaitez tous les deux. C'est le moment de parler des attentes, des horaires de présence et des points délicats.

### 3. Préparer les consignes et l’accord après confirmation

Après confirmation, les deux parties préparent les consignes et peuvent établir un accord ; sa signature sur Guardiens est facultative. Elles notent les dates, les tâches, la présence, les contacts et la prise en charge des frais. Le jour de l'arrivée, le propriétaire montre les routines et remet les clés. Un guide de la maison répond aux questions avant qu'elles se posent.

### 4. Vivre la garde

Le gardien suit les routines prévues et donne des nouvelles au rythme décidé ensemble : un message par jour, quelques photos, ou un point en cas d'imprévu. Chacun sait à quoi s'attendre, et c'est ce qui rend la garde sereine.

### 5. Le retour et l'avis

Au retour : un tour du logement, les clés rendues et un point sur les dépenses. Chacun peut laisser un avis utile aux prochains membres, sans garantie d’une autre garde.

## <a id="prix"></a>Prix : combien coûte un home sitter ?

Sur Guardiens, la plateforme est actuellement 100 % gratuite pour les propriétaires et les gardiens. Le gardien est hébergé sans rémunération ; les dépenses restent distinctes. Notre priorité est de construire un réseau de confiance et d’améliorer le service grâce aux retours des membres. Une participation aux frais d’infrastructure pourrait être envisagée au plus tôt au second semestre 2027, avec au moins trente jours d’information préalable. Les conditions sont sur la page [tarifs](/tarifs).

Le mot home sitting désigne aussi des prestations payées, proposées par des professionnels ou des agences. Leur prix se fixe sur devis, selon la durée, le nombre d'animaux et les tâches demandées.

Dans un échange, quelques dépenses restent à prévoir et à écrire dans l'accord :

| Qui | Dépense | Comment la cadrer |
|---|---|---|
| Propriétaire | Nourriture, litière et produits des animaux | Laissés sur place avant le départ |
| Propriétaire | Soins vétérinaires éventuels | Un budget prévu, qui avance les frais et comment ils sont remboursés |
| Propriétaire | Trajets ou achats demandés au gardien | Remboursés sur justificatif, d'un commun accord |
| Gardien | Transport jusqu'au lieu de garde | À sa charge, sauf accord différent |
| Gardien | Sa propre alimentation | À sa charge, sauf accord différent |

## <a id="devenir-home-sitter"></a>Devenir home sitter : être logé en échange de la garde

Devenir home sitter, c'est loger dans une maison le temps d'une garde, en échange des soins apportés à la maison et aux animaux. C'est une façon de découvrir une région, de vivre au calme pour écrire ou télétravailler, ou de partager le quotidien d'animaux le temps d'un séjour.

Pour commencer sur Guardiens :

1. [Préparez votre profil](/profile) : une présentation sincère, vos expériences, vos disponibilités et vos limites.
2. Consultez les [annonces de garde](/annonces) et proposez-vous sur celles qui vous correspondent.
3. Choisissez une garde dont les besoins correspondent à vos capacités, éventuellement courte et proche. Un avis ou une candidature acceptée n’est pas garanti.
4. Répondez vite et précisément aux propriétaires : la qualité de l'échange fait souvent la différence.

Le guide complet est sur la page [devenir home sitter](/devenir-home-sitter).

Pour organiser vos premiers séjours, le guide du [voyage en France avec le house-sitting](/actualites/voyager-gratuitement-france-house-sitting) détaille la préparation et les dépenses à prévoir. Le guide pour [devenir gardien de maison à l’étranger](/actualites/devenir-gardien-maison-etranger) développe les vérifications propres à un séjour international ; les formalités dépendent de votre situation et de la destination.

## <a id="comparatif"></a>House sitting, pet sitter rémunéré ou pension : comparatif

| Critère | House sitting d'échange | Pet sitter rémunéré | Pension |
|---|---|---|---|
| Lieu | Chez vous | Chez vous (visites ou séjour), ou chez le pet sitter | Dans l'établissement |
| Présence | Gardien logé sur place, horaires selon l'accord | Selon la formule : visites ou nuits | Équipe de l'établissement, selon son organisation |
| Frais | Échange logement contre garde ; sur Guardiens, plateforme actuellement gratuite pour les deux rôles ; dépenses convenues | Prestation payée, sur devis | Prix de séjour, sur devis |
| Atouts | L'animal garde ses repères, la maison est habitée | Professionnel engagé sur une prestation définie | Encadrement par du personnel, accueil de plusieurs animaux |
| Points d'attention | Présence et capacités à vérifier, disponibilités à confirmer | Coût qui grandit avec la durée ; présence courte en formule visites | Changement d'environnement pour l'animal ; places limitées en période chargée |

Chaque formule répond à une situation. Le ministère de l'Agriculture présente plusieurs solutions de garde et rappelle de bien préparer l'animal et la personne qui s'en occupe ([agriculture.gouv.fr](https://agriculture.gouv.fr/comment-faire-garder-son-animal-de-compagnie)).

Pour aller plus loin : [les alternatives à la pension pour chien](/actualites/pension-chien-alternatives-guide), et notre guide de la [garde d'animaux à domicile](/actualites/garde-animaux-domicile-chien-chat) pour choisir entre visites et gardien sur place. Pour une maison sans animaux, voyez comment [faire garder sa maison pendant son absence](/actualites/confier-sa-maison-absence-risques).

## <a id="pour-qui"></a>À qui cela convient

Le house sitting convient bien quand votre animal est plus serein chez lui, quand le logement gagne à être habité (jardin, plantes, courrier) ou quand l'absence dure plusieurs jours, voire plusieurs semaines ([gardes de deux semaines et plus](/actualites/vacances-longues-garde-animal-2-semaines)).

Quatre points à caler avant de vous engager :

- **Le temps de présence.** Le gardien organise ses journées : courses, promenades, parfois du travail. Si votre animal a besoin de compagnie, fixez ensemble une durée d'absence maximale.
- **Le télétravail.** Vérifiez la connexion, l'espace de travail et la compatibilité avec les besoins de l'animal.
- **Les soins et comportements délicats.** Traitement quotidien, animal âgé, chien réactif : écrivez-le dans l'annonce et vérifiez l'expérience du gardien sur ce point précis.
- **Des tâches du quotidien.** Nourrir, promener, arroser, aérer, relever le courrier. Les gros travaux de jardin ou de ménage relèvent d'un autre cadre.

Le lieu du séjour change aussi la préparation. Pour [faire garder sa maison et ses animaux à Tahiti](/actualites/garde-maison-animaux-tahiti), notre guide détaille les solutions, les prix en F CFP, les déplacements et les consignes à prévoir avant de partir.

À La Réunion, le guide de la [garde kaz et du house-sitting](/actualites/garde-kaz-house-sitting-la-reunion) aide à préparer le logement, les déplacements et les échanges avec le gardien, en distinguant l’accès à la plateforme des dépenses du séjour.

## <a id="legislation"></a>Assurance, accord écrit et imprévus

**Assurance.** Avant la garde, interrogez votre assureur habitation sur la présence d'une personne dans votre logement pendant votre absence : garanties, exclusions, durée d'inoccupation au-delà de laquelle certaines garanties changent. Le gardien vérifie de son côté son assurance responsabilité civile. Service Public explique l'assurance liée aux animaux de compagnie ([F17603](https://www.service-public.gouv.fr/particuliers/vosdroits/F17603)) et les démarches d’indemnisation en cas de préjudice ([F1422](https://www.service-public.gouv.fr/particuliers/vosdroits/F1422)).

**Accord écrit.** Notez les tâches, les horaires de présence attendus, les contacts (vétérinaire, personne relais avec un double des clés), les frais pris en charge et le rythme des nouvelles.

**Annulation.** Si l'un de vous doit annuler, prévenez l'autre le plus tôt possible. Le propriétaire garde en tête une solution de repli (un proche, une pension, un pet sitter) et peut republier son annonce à tout moment.

**Urgence vétérinaire.** Le gardien contacte le vétérinaire indiqué et suit ses consignes, sans attendre la réponse du propriétaire en cas d’urgence. Laissez par écrit le nom de la clinique, le carnet de santé et votre accord sur la conduite à tenir.

**Cadre.** Une garde qui comporte de lourdes tâches ou une contrepartie proche d'un salaire relève d'un autre cadre. Les repères sont détaillés dans [le cadre juridique du house sitting en France](/actualites/house-sitting-cadre-juridique-france), et les bonnes pratiques de confiance dans [sécurité et confiance en house sitting](/actualites/securite-confiance-house-sitting).

## <a id="experience"></a>Pourquoi nous avons créé Guardiens

Avec ma femme Elisa, qui est argentine, nous avons pratiqué la garde de maison pendant cinq ans avant de créer Guardiens. J’aurais aimé disposer de ce type d’application lorsque je vivais à l’étranger : un réseau francophone pour organiser une garde et trouver des occasions de s’entraider.

Le but est de construire ce réseau progressivement. Des besoins précis, des limites exprimées et les retours des membres nous aident à améliorer le service ; une inscription ne crée pas à elle seule la confiance.

[Notre histoire, de l’Argentine à Lyon](/actualites/notre-histoire-pet-sitting-argentine-lyon), revient sur l’origine du projet. Pour passer du principe à une préparation concrète, le guide d’une [première garde en Auvergne](/actualites/temoignage-premiere-garde-auvergne) présente les questions d’accès, de tâches et de relais à poser avant de confirmer.

Jérémie et Elisa

## <a id="exemple"></a>Exemple illustratif : préparer une garde de dix jours

Cet exemple est inventé pour illustrer la préparation.

Une propriétaire s’absente dix jours avec une maison, un chat et des plantes à confier. Elle décrit les accès, les habitudes du chat, la présence nécessaire et l’arrosage. Après échange, les deux personnes confirment ce qu’elles peuvent assurer. Elles préparent les consignes, le rythme des nouvelles, le contact du vétérinaire et un proche ayant accepté de servir de relais.

Ce qui aide : les besoins du logement sont écrits, les limites sont comprises et une autre organisation reste possible si la garde doit s’interrompre. La préparation ne garantit pas l’absence d’imprévu.

## <a id="faq"></a>Questions fréquentes sur le house sitting

:::faq
**Qu'est-ce que le house sitting ?**

Le house sitting est un échange : une personne loge chez vous pendant votre absence et veille sur votre maison et vos animaux, en contrepartie du logement.

**Qu'est-ce qu'un home sitter ?**

Un home sitter est la personne qui loge chez vous pendant votre absence pour prendre soin de la maison et des animaux. On dit aussi house sitter ou gardien.

**Le house sitting est-il gratuit ?**

La plateforme est actuellement gratuite pour les deux rôles et le gardien est hébergé sans rémunération. Les dépenses convenues restent distinctes. La page tarifs précise les conditions actuelles et l’évolution possible, sans gratuité permanente promise.

**Combien coûte un home sitter professionnel ?**

Un home sitter rémunéré fixe son prix sur devis, selon la durée, le nombre d'animaux et les tâches. Demandez plusieurs devis pour comparer.

**Comment devenir home sitter ?**

Présentez sincèrement vos expériences et limites, puis consultez les annonces dont les besoins correspondent à vos capacités. Une garde courte peut être une première expérience, sans avis ou acceptation garanti.

**Peut-on faire garder sa maison sans animaux ?**

Oui. Une garde sans animaux couvre la présence dans le logement, le courrier, les plantes et l'aération. Précisez les tâches dans l'annonce.

**Faut-il rencontrer le gardien avant la garde ?**

La rencontre est facultative. Vous pouvez échanger par messagerie ; un appel vidéo ou une rencontre peut compléter cet échange si vous le souhaitez tous les deux.

**Le gardien reste-t-il à la maison toute la journée ?**

Le gardien organise ses journées : courses, promenades, parfois du travail. Si votre animal a besoin de compagnie, fixez ensemble une durée d'absence maximale avant la garde.

**Le gardien peut-il venir avec son propre animal ?**

Oui, avec l'accord explicite du propriétaire et si les animaux s'entendent. Abordez la question dès le premier échange.

**Que se passe-t-il en cas d'annulation ?**

Prévenez l'autre personne le plus tôt possible et republiez votre annonce si besoin. Gardez en tête une solution de repli : un proche, une pension, un pet sitter.

**Que faire si l'animal tombe malade pendant la garde ?**

Le gardien appelle le vétérinaire et suit ses consignes, sans attendre une réponse du propriétaire en cas d’urgence. Il informe aussi le propriétaire. Le budget, l'avance et le remboursement des soins se conviennent dans l'accord avant la garde.

**Faut-il prévenir son assureur ?**

C'est recommandé. Demandez à votre assureur habitation ce qui est couvert quand une personne occupe votre logement pendant votre absence, et quelles exclusions s'appliquent.

**Combien de temps à l'avance chercher un gardien ?**

Présentez vos dates et besoins dès qu’ils sont connus, en gardant du temps pour échanger et préparer un relais. Aucun délai de réponse ou candidat disponible n’est garanti.
:::


Au-delà des gardes, Guardiens réunit aussi l'[entraide du quotidien](/petites-missions), jardinage, courses, trajets, une partie de belote, et des [chantiers et projets participatifs](/projets) à réaliser ensemble.$maillage_lot03_1$;
  new_links jsonb := '[{"url":"/house-sitting","text":"à proximité de chez vous"},{"url":"/sits/create","text":"préparer une annonce"},{"url":"/tarifs","text":"tarifs"},{"url":"/profile","text":"Préparez votre profil"},{"url":"/annonces","text":"annonces de garde"},{"url":"/devenir-home-sitter","text":"devenir home sitter"},{"url":"/actualites/pension-chien-alternatives-guide","text":"les alternatives à la pension pour chien"},{"url":"/actualites/garde-animaux-domicile-chien-chat","text":"garde d''animaux à domicile"},{"url":"/actualites/confier-sa-maison-absence-risques","text":"faire garder sa maison pendant son absence"},{"url":"/actualites/vacances-longues-garde-animal-2-semaines","text":"gardes de deux semaines et plus"},{"url":"/actualites/garde-maison-animaux-tahiti","text":"faire garder sa maison et ses animaux à Tahiti"},{"url":"/actualites/house-sitting-cadre-juridique-france","text":"le cadre juridique du house sitting en France"},{"url":"/actualites/securite-confiance-house-sitting","text":"sécurité et confiance en house sitting"},{"url":"/petites-missions","text":"entraide du quotidien"},{"url":"/projets","text":"chantiers et projets participatifs"},{"text":"voyage en France avec le house-sitting","url":"/actualites/voyager-gratuitement-france-house-sitting"},{"text":"devenir gardien de maison à l’étranger","url":"/actualites/devenir-gardien-maison-etranger"},{"text":"garde kaz et du house-sitting","url":"/actualites/garde-kaz-house-sitting-la-reunion"},{"text":"Notre histoire, de l’Argentine à Lyon","url":"/actualites/notre-histoire-pet-sitting-argentine-lyon"},{"text":"première garde en Auvergne","url":"/actualites/temoignage-premiere-garde-auvergne"}]'::jsonb;
  affected integer;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='6c52710a-3130-49dd-8856-47ec9233feae'::uuid AND slug='c-est-quoi-le-house-sitting';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS DISTINCT FROM false
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/c-est-quoi-le-house-sitting' THEN
    RAISE EXCEPTION 'Lot 03 article 1: état éditorial inattendu';
  END IF;
  IF before_row.content = new_content AND before_row.internal_links IS NOT DISTINCT FROM new_links THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-18T04:02:35.701425+00:00'::timestamptz
    OR md5(before_row.content) IS DISTINCT FROM '065fed97942b31edf33396b6a3c75ef9' THEN
    RAISE EXCEPTION 'Lot 03 article 1: version concurrente';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_maillage_lot03_20261018 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Lot 03 article 1: sauvegarde différente';
  END IF;
  INSERT INTO public._backup_articles_maillage_lot03_20261018 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_maillage_lot03_20261018 z WHERE z.id=x.id);
  UPDATE public.articles SET content=new_content, internal_links=new_links, updated_at=now()
    WHERE id=before_row.id AND slug=before_row.slug AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN RAISE EXCEPTION 'Lot 03 article 1: écriture incomplète'; END IF;
END;
$article_1$;

COMMIT;
