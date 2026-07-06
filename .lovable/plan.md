
# EntraideHub Pass 1, plan d'exécution

Gros chantier (~4-5h agent). Je découpe en 3 vagues pour livrer proprement et pouvoir valider entre chaque.

## Vérifications préalables (avant vague 1)

1. Lire `EntraideHub.tsx`, `SmallMissionDetail.tsx`, `CreateSmallMission.tsx`, `SmallMissionCard`, pour valider les points d'accroche exacts.
2. Lire l'enum `small_mission_response_status` en BDD pour connaître les valeurs existantes avant ajout de `withdrawn`.
3. Vérifier l'enum `reports.target_type` pour savoir s'il faut l'étendre à `small_mission`.
4. Vérifier existence de `get_or_create_conversation` (utilisé chantier 5).
5. Vérifier templates emails transactionnels existants pour caler `mission-response-withdrawn` et le mail de déclin cascade.

## Décisions par défaut (dites stop si pas ok)

- **1 seul commit final** comme demandé, mais je livre en 3 vagues d'exécution pour vérifier au fil de l'eau.
- **Notif + email cascade decline** : réutilise le pipeline `send-transactional-email` existant, template `mission-response-declined` (créé si absent).
- **Badge "date dépassée"** : token `warning` du design system, pas de couleur hardcodée.
- **Tri missions expirées** : côté client dans le hook du hub, pas de changement SQL.
- **ReportButton** : je patche l'usage buggué + j'étends l'enum `reports.target_type` si nécessaire, admin filtre inclus si la page le permet sans refactor lourd.

## Vague 1, quick wins UX pures (frontend only, 0 migration)

- **Chantier 1** : retrait gate 60 % dans `CreateSmallMission.tsx`, badge soft-nudge auteur.
- **Chantier 3** : 3 exemples cliquables sur tabs Besoins et Offres dans `EntraideHub.tsx`, pré-remplissage via `?template=` dans `CreateSmallMission.tsx`.
- **Chantier 4** : compteur missions + fallback filtre `all` si <20, badges statuts sur cards.
- **Chantier 8** : usage de `isDatePassed` (badge card + bannière detail + tri fin de liste).
- **Chantier 7 (partie fix simple)** : correction `targetId={mission.user_id}` sur `ReportButton` profil.

Analytics ajoutés dans cette vague : `mission_created_incomplete_profile`, `entraide_empty_state_template_clicked`, `entraide_all_status_default_used`, `mission_expired_badge_seen`, `mission_expired_reschedule_clicked`.

## Vague 2, modale réponse + 1-clic offre (frontend + petite RPC)

- **Chantier 2** : `MissionResponseModal.tsx` avec 3 templates, branchement CTA sidebar, composer inline conservé.
- **Chantier 5** : CTA "Je suis intéressé, contactez-moi en privé" sur missions `offer`, appel `get_or_create_conversation` + insert `small_mission_responses` + redirect messagerie.

Analytics : `mission_response_modal_opened`, `mission_response_template_used`, `mission_response_submitted_from_modal`, `mission_offer_one_click_interest`.

## Vague 3, workflow BDD (1 migration + edge function légère)

- **Chantier 6** : modale accept avec 2 modes radio, cascade decline via UPDATE batch + notifs + emails.
- **Chantier 9** : ajout enum `withdrawn`, `handleWithdrawResponse` passe en UPDATE, notif + email `mission-response-withdrawn`, affichage grisé.
- **Chantier 7 (extension enum)** : ajout `small_mission` à `reports.target_type` + second `ReportButton` en pied de detail, filtre admin si trivial.

Migration unique regroupant : enum `withdrawn`, enum `small_mission` sur reports, index si utile.

Analytics : `mission_accept_response_cascade_choice`, `mission_response_withdrawn`.

## Vague 4, tests et contrôles

- Test Vitest `mission-response-cascade.test.ts` (mode decline_others met bien pending → declined).
- Test Vitest `mission-empty-states.test.tsx` (3 exemples visibles sur Besoins et Offres).
- `bunx tsgo --noEmit` vert.
- Suite Vitest existante verte (no-em-dash, jsonld, footer-token, main-flex-min-w-0).
- Scan manuel vocabulaire proscrit dans tous les nouveaux libellés.

## Ce que je ne fais PAS sans confirmation

- Refonte de la page `/admin/reports` au-delà d'un filtre trivial par target_type.
- Ajout d'un nouveau système d'emails hors pipeline `send-transactional-email`.
- Modification du design system (tokens, couleurs).

## Estimation

~4h agent, 12-15 tool calls groupées par vague, 1 commit final "EntraideHub Pass 1, quick wins UX + fixes workflow".

Dites **go** et j'attaque par les vérifications préalables + vague 1.
