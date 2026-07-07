
# Alma dashboard : une seule surface proactive à la fois

## Règle produit cible

Une seule surface Alma « proactive » (celle qui parle sans qu'on la sollicite) visible à la fois. Ordre de priorité strict, du plus bloquant au plus discret :

```text
1. AlmaFirstMeeting        (rite d'accueil unique, tant que non vu)
2. WelcomeBackDigest       (résumé de session, 1x par session)
3. Whispers du scheduler   (P0 → P3 : DormantReturn, UsageNudge, CulturalFact...)
4. AlmaDock replié         (toujours présent, pas compté comme sollicitation)
5. AlmaDock déplié avec « proposition » permanente (buildProposition)
   → seulement si aucune des surfaces 1-3 n'est active
```

Le dock replié reste visible en permanence (présence, pas sollicitation). Le dock ne se déplie automatiquement que sur un whisper du scheduler ; l'expansion manuelle par clic reste toujours possible.

## Option retenue : verrou de session partagé exposé par AlmaContext

Trois options envisagées :

- **A. Remonter WelcomeBack et FirstMeeting dans le scheduler** comme deux nouveaux types de whisper P0 spéciaux.
  Rejeté : ce sont des cartes inline dans le flux du dashboard (bloc `AlmaBubble` large), pas des whispers flottants dans le dock. Les remonter dans le scheduler forcerait à unifier deux rendus visuellement distincts et casserait la présentation inline attendue.

- **B. Faire consommer `canEmit()` par WelcomeBack et FirstMeeting.**
  Rejeté seul : `canEmit` ne connaît que les whispers dockés (queue/priorité/quota). Il ne saurait pas dire « FirstMeeting est en train de s'afficher, tais-toi ». Utile mais insuffisant.

- **C. (retenue) Verrou de session partagé dans `AlmaContext` : `activeProactiveSurface`.**
  On expose depuis `AlmaContext` :
  - `activeProactiveSurface: "first_meeting" | "welcome_back" | "whisper" | null`
  - `claimProactiveSurface(kind, priority): boolean` — pose le verrou si libre ou si la priorité est plus haute que l'occupant, retourne succès.
  - `releaseProactiveSurface(kind)` — libère quand la surface se démonte ou est dismissée.
  Le scheduler existant appelle `claim("whisper", priority)` avant `setCurrent`. WelcomeBack et FirstMeeting appellent `claim` avant de rendre. `canEmit()` renvoie false si une surface plus prioritaire est déjà active.
  Justification : minimal intrusif, garde les rendus inline vs dock séparés, résout aussi la race, testable, réversible.

## Correction de la race WelcomeBack / DormantReturn

Cause : `AlmaDormantReturnWhisper` lit `sessionStorage["alma_welcomeback_shown"]` de façon synchrone au mount, mais WelcomeBack n'écrit ce flag qu'après résolution de la RPC `get_activity_since_last_visit`. Fenêtre de course : les deux passent la garde et s'affichent ensemble.

Correction : le verrou `activeProactiveSurface` remplace complètement ce flag ad hoc. WelcomeBack pose son verrou dès son `useEffect` de mount (avant l'`await` de la RPC), pas après. `AlmaDormantReturnWhisper` appelle `canEmit("long_absence_return")` qui, avec le nouveau verrou, refuse si WelcomeBack est déjà en train de charger.

En complément, on garde le flag `sessionStorage` uniquement pour le debounce cross-navigation intra-session (empêcher WelcomeBack de re-fetch en changeant de page), mais il n'est plus utilisé pour l'arbitrage entre surfaces.

## Fichiers touchés

- `src/contexts/AlmaContext.tsx`
  - Ajout état `activeProactiveSurface` + `claim/release` + prise en compte dans `canEmit`, `queueWhisper`, et le `useEffect` de sélection du prochain whisper (claim `"whisper"` avant `setCurrent`, release sur `dismissCurrent`).
- `src/lib/alma/whisper-scheduler.ts`
  - Ajout d'un motif `reason: "surface_locked"` dans `CanEmitResult` (rétro-compat, pure addition).
- `src/components/ai/alma/WelcomeBackDigest.tsx`
  - Claim `"welcome_back"` au mount du `useEffect` de fetch, avant l'`await` de la RPC.
  - Release au dismiss et au démontage.
  - Ne rien afficher si `claim` échoue (FirstMeeting a la priorité).
- `src/components/ai/alma/AlmaFirstMeeting.tsx`
  - Claim `"first_meeting"` au mount, release sur `onDone`. Priorité la plus haute : `claim` réussit toujours et déloge un WelcomeBack qui viendrait à monter en même temps.
- `src/components/ai/alma/wiring/AlmaDormantReturnWhisper.tsx`
  - Retirer la lecture directe de `sessionStorage["alma_welcomeback_shown"]` (le verrou couvre le cas). Garder le flag `alma_dormant_return_shown` pour l'unicité par session.
- `src/pages/Dashboard.tsx`
  - Aucun changement d'ordre de rendu nécessaire (les surfaces s'auto-arbitrent via le verrou).
- Tests à ajouter dans `src/lib/alma/__tests__/` : un test unitaire sur le nouveau `claim/release` (matrice priorités), et un test d'intégration léger vérifiant que WelcomeBack ne s'affiche pas quand FirstMeeting a claimé.

## Risques et non-régression

- **Dashboard propriétaire.** `WelcomeBackDigest` et le dock sont partagés owner/sitter. `AlmaFirstMeeting` reste rendu uniquement dans `SitterDashboard.tsx` (comportement inchangé). Le verrou est neutre pour l'owner : sans FirstMeeting, WelcomeBack claim et s'affiche comme aujourd'hui.
- **Whispers du scheduler.** Le scheduler continue de fonctionner à l'identique tant qu'aucune surface inline n'est active. Aucune modification des priorités P0-P3 ni du quota.
- **Verbose mode (`?alma=verbose`).** Bypasse déjà quota et cooldown ; on l'étend pour bypasser aussi le verrou, sinon on casse le mode debug.
- **Test coverage baseline.** 15 échecs existants inchangés. Ajouter les nouveaux tests sans en casser d'autres. Typecheck attendu vert.
- **Analytics.** Aucun événement retiré ; on peut ajouter `alma_surface_locked_out` avec `{ requested, active }` pour observer les collisions en prod (facultatif, à confirmer).

## Question ouverte à confirmer avant build

Voulez-vous que le dock déplié avec « proposition permanente » (`buildProposition` dans `AlmaDock.tsx`) soit également soumis au verrou (option A : la proposition ne s'ouvre pas toute seule si FirstMeeting/WelcomeBack sont visibles), ou reste-t-il totalement passif (option B : il ne s'ouvre que sur clic utilisateur, donc pas de conflit) ? Aujourd'hui le dock ne s'auto-déplie que sur whisper, donc l'option B est déjà le comportement effectif ; option A serait une ceinture supplémentaire pour un cas qui n'arrive pas.
