-- Correctif ciblé article c-est-quoi-le-house-sitting (sources, FAQ compatible, frais vétérinaires).
-- Garde optimiste sur updated_at 2026-10-01 13:10:06.063345+00 (posé par le rafraîchissement SEO, contenu vérifié identique).
-- Retour arrière : UPDATE public.articles a SET content=b.content, updated_at=b.updated_at FROM public._backup_article_house_sitting_20261001b b WHERE a.id=b.id;
CREATE TABLE public._backup_article_house_sitting_20261001b AS SELECT * FROM public.articles WHERE id='6c52710a-3130-49dd-8856-47ec9233feae' AND slug='c-est-quoi-le-house-sitting';
REVOKE ALL ON public._backup_article_house_sitting_20261001b FROM anon, authenticated;
GRANT ALL ON public._backup_article_house_sitting_20261001b TO service_role;
ALTER TABLE public._backup_article_house_sitting_20261001b ENABLE ROW LEVEL SECURITY;
DO $do$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public._backup_article_house_sitting_20261001b;
  IF n <> 1 THEN RAISE EXCEPTION 'sauvegarde: % lignes', n; END IF;
  UPDATE public.articles SET content = $hs$# House-sitting : définition, fonctionnement et coûts

**Sommaire**
- [Définition et différences](#definition)
- [Fonctionnement en 5 étapes](#fonctionnement)
- [À qui cela convient, et les limites](#pour-qui)
- [Comparatif avec le pet-sitter et la pension](#comparatif)
- [Coûts réels](#prix)
- [Rémunération](#remuneration)
- [Trouver une garde ou un gardien](#trouver-missions)
- [Assurance, accord et imprévus](#legislation)
- [Exemple de préparation](#exemple)
- [Questions fréquentes](#faq)

## <a id="definition"></a>Définition : house-sitting, home-sitting et pet-sitting

Le mot vient de l'anglais (*house* pour maison, *to sit* pour garder). En français, on rencontre aussi **home-sitting** ou **homesitting** : dans l'usage courant, ces termes désignent la même idée, quelqu'un séjourne dans votre logement pendant votre absence.

Le terme ne dit rien, à lui seul, de la contrepartie. Selon les services et les pays, il peut désigner un échange sans rémunération ou une prestation payée. Sur Guardiens, c'est un **échange** : la garde n'est pas rémunérée, le gardien est hébergé sans loyer et assure en retour les tâches convenues avec le propriétaire.

Le **pet-sitting** décrit surtout le soin des animaux. Il peut se faire en visites ponctuelles, chez le pet-sitter, ou avec une présence au domicile. Les deux notions se recoupent donc souvent : une garde en house-sitting inclut fréquemment des animaux, et un pet-sitter peut dormir sur place. Ce qui compte, c'est ce que vous convenez ensemble : présence, tâches, durée, frais.

Une garde sans animaux est tout aussi légitime : relever le courrier, arroser, aérer, faire vivre la maison pendant une longue absence.

## <a id="fonctionnement"></a>Comment fonctionne une garde, en 5 étapes

### 1. Publier une annonce détaillée

Le propriétaire décrit ses dates, son logement, ses animaux (habitudes, traitements, caractère) et les tâches attendues. Plus l'annonce est précise, plus les candidatures sont pertinentes. Une annonce avec des photos du lieu de vie aide aussi le gardien à se projeter.

### 2. Choisir après un échange et une rencontre

Le propriétaire lit les profils et les avis, échange par messagerie, puis organise un appel vidéo ou une rencontre. C'est le moment de parler franchement des attentes, des horaires de présence et des points délicats.

### 3. Formaliser un accord écrit et préparer la passation

Les deux parties mettent par écrit les dates, les tâches, les horaires de présence, les contacts utiles (vétérinaire, personne relais) et la prise en charge des frais. Le jour de l'arrivée, le propriétaire fait visiter, montre les routines et remet les clés. Un guide de la maison évite bien des questions.

### 4. Vivre la garde, avec des nouvelles convenues

Le gardien suit les routines prévues et donne des nouvelles au rythme décidé ensemble : un message par jour, quelques photos, ou un point en cas d'imprévu seulement. Rien n'oblige à une disponibilité permanente, l'essentiel est que chacun sache à quoi s'attendre.

### 5. Le retour et l'avis

Au retour, un tour rapide du logement, la restitution des clés, puis un avis de chaque côté. Ces avis aident les prochains membres à choisir.

## <a id="pour-qui"></a>À qui cela convient, et les limites à connaître

Le house-sitting convient bien quand votre animal est plus serein chez lui, quand le logement gagne à être habité (jardin, plantes, courrier) ou quand l'absence dure plusieurs jours.

Quelques points méritent d'être discutés avant de s'engager :

- **Le temps de présence réel.** Un gardien vit sa vie : il fait ses courses, se promène, travaille parfois. Une présence 24 h sur 24 n'est pas garantie. Si votre animal ne peut pas rester seul, dites-le et fixez des durées d'absence maximales.
- **Le télétravail.** Il n'est possible que si la connexion et l'espace le permettent, et si les besoins de l'animal restent compatibles avec des journées de travail.
- **Les soins et les comportements délicats.** Traitement quotidien, animal âgé, chien réactif : précisez-le dans l'annonce et vérifiez l'expérience du gardien sur ce point précis.
- **Des tâches raisonnables.** Nourrir, promener, arroser, aérer, relever le courrier : oui. De gros travaux de jardin ou de ménage relèvent d'un autre cadre.

## <a id="comparatif"></a>House-sitting, pet-sitter rémunéré ou pension : comparatif

| Critère | House-sitting d'échange | Pet-sitter rémunéré | Pension |
|---|---|---|---|
| Lieu | Chez vous | Chez vous (visites ou séjour), ou chez le pet-sitter | Dans l'établissement |
| Présence | Gardien hébergé sur place, horaires selon l'accord | Selon la formule : visites ou nuits | Équipe de l'établissement, selon son organisation |
| Frais | Pas de rémunération de la garde ; frais de plateforme et dépenses convenues possibles | Prestation payée, selon devis | Prix de séjour, selon devis |
| Atouts | L'animal garde ses repères, le logement est habité | Professionnel engagé sur une prestation définie | Encadrement par du personnel, accueil possible de plusieurs animaux |
| Limites | Dépend de l'entente et de la disponibilité d'un gardien près de chez vous | Coût selon la durée ; peu de présence en formule visites | Changement d'environnement pour l'animal ; places limitées en période chargée |

Aucune formule n'est meilleure dans l'absolu. Le ministère de l'Agriculture présente d'ailleurs plusieurs solutions de garde et rappelle de bien préparer l'animal et la personne qui s'en occupe ([agriculture.gouv.fr](https://agriculture.gouv.fr/comment-faire-garder-son-animal-de-compagnie)).

Pour aller plus loin sur ce choix : [les alternatives à la pension pour chien](/actualites/pension-chien-alternatives-guide).

## <a id="prix"></a>Combien coûte le house-sitting ?

Ne pas payer le gardien ne veut pas dire zéro dépense. Il faut distinguer :

**Ce qui n'est pas payé dans un échange :** la garde elle-même (pas de rémunération) et le logement (pas de loyer pour le gardien).

**Ce qui peut coûter, côté propriétaire :**
- l'éventuelle cotisation à la plateforme de mise en relation, présentée sur la page [tarifs](/tarifs) ;
- la nourriture et les produits des animaux, laissés sur place ;
- les éventuelles dépenses vétérinaires : prévoyez dans l'accord un budget, qui avance les frais et comment ils sont remboursés, sans préjuger des responsabilités en cas d'incident ;
- les frais convenus à l'avance, par exemple des trajets demandés au gardien.

**Ce qui peut coûter, côté gardien :**
- l'éventuelle cotisation à la plateforme, selon les conditions en vigueur ;
- le transport jusqu'au lieu de garde ;
- sa propre alimentation, sauf accord différent.

Un exemple purement illustratif, pour lire un devis : si une pension vous proposait 25 € par jour pour 14 jours, le séjour coûterait 25 × 14 = 350 €, hors trajets. Ce chiffre n'est pas un tarif moyen, il sert seulement à comparer avec vos propres devis.

## <a id="remuneration"></a>Est-ce qu'on est payé en house-sitting ?

Cela dépend du cadre. Le mot house-sitting recouvre aussi des prestations rémunérées proposées par des professionnels.

Sur Guardiens, la règle est claire : la garde n'est pas rémunérée. Le gardien est hébergé, le propriétaire voit son logement habité et ses animaux restent chez eux. Seuls les frais réels convenus à l'avance (un trajet chez le vétérinaire, un achat demandé) peuvent être remboursés, sur justificatif et d'un commun accord.

## <a id="trouver-missions"></a>Trouver une garde ou un gardien

**Vous cherchez un gardien.** Publiez une annonce précise, puis regardez les profils de gardiens [près de chez vous](/house-sitting). Quelques critères utiles :
- l'expérience déclarée avec vos espèces, et les avis laissés par d'autres propriétaires ;
- la cohérence entre ses disponibilités et vos dates ;
- la qualité de l'échange : questions posées, réponses précises sur la présence.

**Vous voulez devenir gardien.** Consultez les [annonces de garde](/annonces) et la page [devenir home-sitter](/devenir-home-sitter). Un profil complet, une photo, une présentation honnête de votre expérience et de vos contraintes horaires font la différence. Les premières gardes courtes aident à recevoir de premiers avis.

Le nombre de gardiens et d'annonces varie selon les régions et les périodes : aucun délai ne peut être garanti. Publier tôt laisse plus de temps pour échanger.

## <a id="legislation"></a>Assurance, accord écrit et imprévus

**Assurance.** Avant la garde, interrogez votre assureur habitation sur la présence d'une personne dans votre logement en votre absence : garanties, exclusions, durée d'inoccupation au-delà de laquelle certaines garanties changent. Le gardien peut vérifier de son côté son assurance responsabilité civile. Service Public explique l'assurance liée aux animaux de compagnie ([F17603](https://www.service-public.gouv.fr/particuliers/vosdroits/F17603)) et la responsabilité en cas de dommages causés par un animal ([F1422](https://www.service-public.gouv.fr/particuliers/vosdroits/F1422)). Demandez à votre assureur quelles garanties et exclusions s'appliquent à la garde envisagée.

**Accord écrit.** Notez les tâches, les horaires de présence attendus, les contacts (vétérinaire, personne relais qui a un double des clés), les frais pris en charge et les modalités de nouvelles.

**Annulation.** Si l'un de vous doit annuler, prévenez l'autre le plus tôt possible. Côté propriétaire, gardez une solution de repli en tête (proche, pension, pet-sitter). Guardiens est une plateforme de mise en relation : elle ne garantit pas de remplaçant.

**Urgence vétérinaire.** Le gardien contacte le vétérinaire indiqué, puis le propriétaire. Laissez par écrit le nom de la clinique, le carnet de santé et votre accord sur la conduite à tenir.

**Cadre.** Si la garde comporte des tâches importantes ou une contrepartie qui ressemble à un salaire, la situation peut relever d'un autre cadre. En cas de doute, renseignez-vous auprès des sources officielles avant de vous engager.

## <a id="exemple"></a>Exemple illustratif : préparer une garde de dix jours

Cet exemple est inventé pour illustrer la méthode, il ne décrit pas une garde réelle.

Claire part dix jours en juin. Elle a un chat âgé sous traitement et un potager. Trois semaines avant, elle publie une annonce qui précise : un comprimé matin et soir, pas plus de six heures d'absence d'affilée, arrosage du potager le soir. Elle échange avec deux gardiens, fait un appel vidéo avec chacun et choisit celui qui a déjà donné des traitements à un chat. Ils notent l'accord : horaires, numéro du vétérinaire, sa sœur comme personne relais, croquettes et litière laissées sur place, une photo par jour. Le jour du départ, elle montre comment donner le comprimé et laisse un guide d'une page.

Ce qui a compté : des besoins écrits noir sur blanc, une question précise sur l'expérience, une personne relais.

## <a id="faq"></a>Questions fréquentes sur le house-sitting

:::faq
**Peut-on faire garder sa maison sans animaux ?**

Oui. Une garde sans animaux est tout à fait possible : présence dans le logement, courrier, plantes, aération. Précisez simplement les tâches dans l'annonce.

**Le gardien reste-t-il à la maison toute la journée ?**

Pas forcément. Le gardien a sa propre vie et peut s'absenter en journée. Si votre animal ne doit pas rester seul longtemps, indiquez une durée maximale d'absence et vérifiez qu'elle convient avant de vous engager.

**Le house-sitting a-t-il des frais ?**

La garde n'est pas rémunérée sur Guardiens et le gardien ne paie pas de loyer. Restent les frais éventuels de plateforme (voir la page tarifs), la nourriture des animaux, les éventuels soins vétérinaires (à prévoir dans l'accord), les transports et les frais convenus entre vous.

**Le gardien peut-il venir avec son propre animal ?**

Seulement avec l'accord explicite du propriétaire, et si les animaux sont compatibles. Abordez la question dès le premier échange.

**Que se passe-t-il en cas d'annulation ?**

Prévenez l'autre personne le plus tôt possible. Guardiens met en relation mais ne garantit pas de remplaçant : gardez une solution de repli, et republiez votre annonce si besoin.

**Que faire en cas de problème de santé de l'animal ?**

Le gardien contacte le vétérinaire indiqué par le propriétaire, puis prévient le propriétaire. La prise en charge habituelle des soins (budget, avance, remboursement) se convient en amont dans l'accord, sans préjuger des responsabilités en cas d'incident.

**Faut-il prévenir son assureur ?**

C'est recommandé. Demandez à votre assureur habitation ce qui est couvert quand une personne occupe votre logement pendant votre absence, et quelles exclusions s'appliquent.

**Combien de temps à l'avance chercher un gardien ?**

Il n'existe pas de délai garanti. Publier plusieurs semaines avant laisse le temps d'échanger, de se rencontrer et de préparer la passation sereinement.
:::

$hs$, updated_at = now()
  WHERE id='6c52710a-3130-49dd-8856-47ec9233feae' AND slug='c-est-quoi-le-house-sitting' AND updated_at='2026-10-01 13:10:06.063345+00';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'mise a jour: % lignes (edition concurrente ?)', n; END IF;
END $do$;