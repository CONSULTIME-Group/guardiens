# Conversion propriétaire en première session

## Faits vérifiés avant plan (code + base, 16/08)

- Auto-confirm email actif : `email_confirmed_at` à 0-1 min après signup pour 11 des 12 derniers propriétaires. La session n'est PAS interrompue par la confirmation email. Le problème est donc purement ce qu'on demande au propriétaire pendant la session.
- 20 derniers propriétaires relus en base : 4 publiés (completion 85-95), 1 brouillon abandonné (65), 2 avec logement + animaux mais zéro annonce (70, 50), 4 coquilles vides (0-10), le reste profils partiels sans logement.
- Base globale : 7 brouillons contre 8 annonces publiées. Presque un brouillon mort par annonce en ligne.
- Crons de relance existants, tous à J+1 ou plus : `send_sit_draft_reminder_daily` (8h, drafts > 24h), `nudge-stale-draft` (7h), `relance-cp-manquant` (lun 9h30). Hors fenêtre de conversion mesurée.

## 1. Cartographie de l'existant

```text
/inscription (Register.tsx, 870 l.)
  étape 1 : rôle | étape 2 : email + mot de passe + CGU, ou Google
  aucun champ identité (prénom, ville) collecté
  post-signup : session immédiate, navigate("/dashboard")  [Register.tsx:325]
        │
        ▼
OnboardingModal, 7 slides, strictement 1er login  [AppLayout.tsx:10,91]
        │
        ▼
/dashboard (OwnerDashboard.tsx)
  si completion < 60 et onboarding_minimal_completed :
    OnboardingWelcome plein écran, checklist 5 étapes dans l'ordre :
    avatar → logement → animaux → identité → PUBLIER (dernier)
    [OnboardingWelcome.tsx:100-142, condition OwnerDashboard.tsx:158-166]
    texte affiché : « À 60 %, vous pourrez publier votre première annonce »
  sinon : cockpit, Star section variante "publish", CTA → /sits/create
        │
        ▼
/sits/create (CreateSit.tsx, 2771 l.)
  préflight : si logement OU animaux OU photo manquant
    → écran setup bloquant (CreateSitSetupStep) avec saisie inline
      InlineHousingBlock (écrit properties), PetsEditor (pets), InlinePhotoUpload
    → bouton Continuer désactivé tant que les 3 blocs ne sont pas remplis,
      animaux EXIGÉS [setupState.ts:52-64]
  étape 0 L'essentiel : lieu (domicile), titre, dates
  étape 1 La garde : lieu optionnel, description 2 champs (30 car. min chacun)
  étape 2 Préférences : photo couverture, préférences, publication
  règles : sitPublishRules.ts (animaux advisory depuis le 12/08, photo requise,
  pas de seuil de complétion)
```

Logement, animaux et galerie vivent sur `/owner-profile` (tables `properties` et `pets`, partagées entre toutes les annonces). Le setup step les édite déjà inline, sans quitter le tunnel.

Sorties du tunnel : OnboardingWelcome dismissable (localStorage persistant), OnboardingModal fermable, setup step SANS sortie quand ouvert par le préflight (`canGoBack: false`), formulaire avec autosauvegarde brouillon.

## 2. Points de fuite (appuyés sur code + données)

- **Fuite 1, inscription → vide (4/20 à 0 %)** : aucun champ profil à l'inscription, puis 7 slides de modal avant tout accès. Les 3 comptes à 0 % ont `onboarding_minimal_completed = false` : ils décrochent au modal ou juste après.
- **Fuite 2, checklist inversée (7/20 profils partiels sans logement)** : OnboardingWelcome présente « Publiez votre première annonce » en 5e et dernière position, après avatar et identité qui ne servent pas à publier. Pire, la phrase « À 60 %, vous pourrez publier » est factuellement fausse : `useAccessLevel.ts:56-66` donne `canPublish: true` aux propriétaires quel que soit le score. Elle dit à un propriétaire à 40 % qu'il ne peut pas publier alors qu'il le peut.
- **Fuite 3, rupture profil/annonce (2/20)** : logement + animaux remplis, zéro annonce. Ils ont fait le profil et ne sont jamais allés sur /sits/create.
- **Fuite 4, brouillon abandonné (7 en base)** : le draft est créé puis quitté, relance seulement à J+1.
- **Fuite 5, blocage dur latent** : un propriétaire sans animaux (maison, jardin, légitime depuis le 12/08) ne peut PAS passer l'écran setup : `canContinue` exige `hasPets`. Contradiction directe avec sitPublishRules, sans issue ni retour possible.

Le seuil 85-95 % chez les publiés est une corrélation (publier exige logement + photo + description, ce qui gonfle le score), pas un gate.

## 3. Parcours cible proposé

Principe : pour un propriétaire, la création d'annonce EST la fin de l'inscription. Le tunnel inline existe déjà, le problème est que personne n'y arrive.

```text
/inscription (inchangé : rôle, email, mot de passe)
   │  session immédiate
   ▼
/sits/create?source=signup  (direct, pas de dashboard, modal différé)
   │  écran setup enrichi :
   │    0. prénom + code postal si absents (écrits sur profiles)
   │    1. logement (existant, inline)
   │    2. animaux, devenus OPTIONNELS (« si vous en avez »)
   │    3. une photo (existant)
   ▼
formulaire 3 étapes → publication
Sortie honnête permanente : « Je préfère faire ça plus tard » → /dashboard
```

Sur la rupture logement/animaux : ne PAS déplacer les données. `properties` et `pets` sont partagées entre annonces, l'édition inline dans le tunnel (déjà existante) est la bonne réponse, étendue à prénom/ville. `/owner-profile` reste l'écran d'enrichissement ultérieur. Doctrine sitPublishRules conservée : ne bloquer que sur l'actionnable (titre, dates, description, photo).

## 4. Découpage en lots

**Lot 0, correctifs de cohérence (gain immédiat, risque faible)**
- Corriger la phrase « À 60 %… » dans OnboardingWelcome (fausse) et réordonner la checklist : publier en premier.
- `setupState.ts` : animaux passent en recommandé, non bloquant (alignement 12/08). `CreateSitSetupStep.tsx` : bloc animaux affiché comme optionnel, Continuer actif sans animaux.
- Fichiers : `OnboardingWelcome.tsx`, `src/lib/setupState.ts`, `CreateSitSetupStep.tsx`, tests `setupState` + Playwright `signup-flow`.
- À tester : parcours sans animaux possible de bout en bout, checklist réordonnée.

**Lot 1, tunnel post-signup (structurant, risque moyen)**
- `Register.tsx` : `postAuthTarget` propriétaire → `/sits/create?source=signup` (sauf redirect explicite), email et Google (l. 325, 422).
- `OnboardingModal` : différé au premier retour dashboard pour un owner frais, ne pas interrompre le tunnel.
- `CreateSitSetupStep` : bloc identité (prénom + code postal) si absent, écriture `profiles`. Sortie « plus tard » explicite vers /dashboard même en préflight.
- À tester : specs `signup-flow.spec.ts` (redirect changé), `sits-create-alma-bubble`, `sit-draft-autosave`, parcours complet mobile 390 px.

**Lot 2, instrumentation (risque nul)**
- Événement `sit_first_publish` avec `minutes_since_signup` et `same_session`. Conserver les événements existants (`sits_create_preflight_blocked`, `setup_shown`, `setup_completed`, `step_started/completed`).
- Requête de cohorte SQL documentée dans le code.

**Lot 3, relance recalibrée (optionnel, après mesure)**
- `send-sit-draft-reminder` : ajouter une relance H+2 pour les brouillons créés en session d'inscription, en plus du J+1. Aucun autre cron touché.

## 5. Mesure

- Indicateur principal : taux de publication en première session = propriétaires avec `published_at` ≤ 24 h après `created_at` / propriétaires inscrits. Baseline actuelle : 25 % (4/16).
- Secondaires : taux d'entrée dans /sits/create en première session, taux de complétion du setup, durée médiane signup → publication (baseline : 24 min à 5 h 48).
- Fenêtre de lecture : cumul 30 jours glissants. À 3 inscriptions propriétaires par semaine, aucune lecture hebdomadaire ni A/B n'est exploitable, on lira une tendance sur 4 à 6 semaines.

## 6. Ce que je déconseille, franchement

- **Le blocage dur** (« impossible de terminer l'inscription sans brouillon ») : il produira des brouillons coquilles vides qui pollueront les relances, le back-office et l'indicateur lui-même, et il fait fuir les « je m'inscris pour plus tard » qui seraient revenus. Le mur souple (tunnel par défaut, sortie visible mais pas mise en avant) obtient l'essentiel du résultat sans dark pattern.
- **Ajouter prénom/ville au formulaire d'inscription** : chaque champ à l'inscription coûte des inscrits. Ces champs ont une raison d'être visible dans le tunnel (l'annonce), pas sur le formulaire de compte.
- **Dupliquer logement/animaux dans l'annonce** : casse le partage entre annonces et EditSit.
- **Sur-instrumenter avant le Lot 1** : avec ce volume, les événements existants suffisent à lire l'effet, le Lot 2 n'ajoute que le marqueur de cohorte indispensable.

## Détails techniques

- Aucune migration SQL nécessaire pour les lots 0 à 2 (toutes les colonnes existent : `first_name`, `postal_code`, `properties`, `pets`, `sits.status`, `published_at`).
- Contraintes éditoriales appliquées : vouvoiement, aucun tiret cadratin, aucun mot proscrit, pas d'icônes décoratives dans les nouveaux textes.
- Garde-fous existants à faire passer : tests Vitest (`setupState`, `sitPublishRules`, guards), Playwright `signup-flow.spec.ts` et `sit-draft-autosave`.
