# Campagne « Postez votre premier coup de main »

## Objectif
Réactiver la base entière avec un CTA unique : publier une première demande de coup de main (garde ponctuelle, question, conseil animal). Mesurer qui postule/répond.

## Cible
- **Segment** : `tous` (gardiens + proprios + duals), tous rôles confondus.
- **Exclusions automatiques** :
  - Utilisateurs déjà auteurs d'au moins 1 `small_missions` (inutile de relancer).
  - Utilisateurs désinscrits (`suppressed_emails`) et opt-out catégorie `product`.
- **Volume estimé** : à afficher via le mode `count` avant envoi.

## Catégorie email
`product` (conseils/accompagnement, opt-out possible), pas transactional. Passe par `send-mass-email` existant, qui respecte déjà les préférences.

## Contenu
- **Sujet** : « Et si vous demandiez un coup de main cette semaine ? »
- **Preview** : « Une garde ponctuelle, une question véto, un conseil… la communauté répond. »
- **Corps** (vouvoiement, pas de tiret cadratin, pas d'emoji, pas d'icônes Lucide) :
  - Accroche : rappel que les coups de main sont gratuits, sans engagement, entre gens du coin.
  - 3 exemples concrets courts : promener le chien pendant un rdv, question sur l'alimentation d'un chat senior, aide pour transporter un animal chez le véto.
  - Rassurance : réponses en général sous 48h, notation mutuelle, aucune transaction financière.
- **CTA principal** : « Publier une demande » → `https://guardiens.fr/coups-de-main/nouveau` (ou route équivalente `CreateSmallMission`).
- **CTA secondaire (lien texte)** : « Parcourir les demandes du moment » → `/coups-de-main`.

## Flow d'exécution
1. Ouvrir `/admin` → outil emails de masse existant (`send-mass-email`).
2. Sélectionner segment `tous`, cocher exclusion « pas de mission publiée » (`no_sit_published_ever` déjà géré ; ajouter filtre équivalent `no_mission_ever` si absent).
3. Lancer un `mode: count` pour valider le volume.
4. Envoyer par batches de 100 (déjà en place), tracking ouvertures/clics activé.
5. Suivi J+3 et J+7 dans `AdminMassEmailsStats` : ouvertures, clics CTA, nouvelles missions publiées.

## Détails techniques
- **Filtre à ajouter** dans `send-mass-email/index.ts` : `no_mission_ever` (analogue à `no_sit_published_ever` mais sur table `small_missions.user_id`). Petite addition côté serveur + case à cocher dans l'UI admin d'envoi.
- **Vérifier** que `send-mass-email` filtre déjà les opt-out `product` via `email_preferences` ; sinon, ajouter un `NOT IN` sur les user_ids ayant désactivé la catégorie.
- **URL CTA** : confirmer le slug exact de la page `CreateSmallMission` (probablement `/coups-de-main/nouveau`).
- **Rate limit Resend** : batches de 100 avec pause 1s (déjà en place).

## Hors scope
- Pas de relance automatique J+7 dans ce lot (à décider après lecture des stats).
- Pas de version SMS/push.
- Pas de refonte du template HTML de `send-mass-email`.

## Livrables
1. Filtre `no_mission_ever` ajouté (backend + UI admin).
2. Vérif/ajout du filtrage opt-out `product`.
3. Rédaction sujet + corps + CTA prêts à coller dans l'outil admin.

Validez-vous ce plan ? Je peux aussi ajuster la cible (par ex. exclure les inscrits < 7 jours pour ne pas doubler l'onboarding).
