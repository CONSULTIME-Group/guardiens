# EntraideHub Pass 1, plan d'exécution — TERMINÉ

## Livraisons

### Vague 1 (livré précédemment)
- Retrait gate 60% dans `CreateSmallMission.tsx`, tracking soft-nudge.
- 3 exemples cliquables sur tabs Besoins et Offres dans `EntraideHub.tsx`.
- Compteur missions, fallback filtre `all` si <20.
- `isDatePassed` : badge card, bannière detail, tri fin de liste.
- Fix `ReportButton targetId={mission.user_id}` sur profil.
- Templates : 6 exemples spécifiques.

### Vague 2 (ce commit)
- `MissionResponseModal.tsx` : 3 templates rapides Besoin/Offre + textarea + submit.
- Sidebar CTA "Répondre publiquement" / "Solliciter cette aide" ouvre la modale (composer inline conservé).
- CTA 1-clic "Je suis intéressé(e), contactez-moi" sur missions `offre` : `startConversation` (context `mission_help`) + insert réponse + redirect `/messages`.

### Vague 3 (ce commit)
- Migration : `ALTER TYPE small_mission_response_status ADD VALUE 'withdrawn'`.
- Modale accept : 2 modes radio (garder / écarter les autres) affichée si >1 réponse pending. Cascade decline batch + notifs + email `mission-proposal-declined`.
- Retrait réponse : DELETE → UPDATE status=withdrawn + notif + email `mission-response-withdrawn` (nouveau template + registry).
- Affichage grisé pour statut withdrawn dans `MissionResponseCard` + branche dédiée sidebar.
- `ReportButton` : ajout config `small_mission` + second bouton (mission + profil) dans le header auteur de la page detail.

### Vague 4 (contrôles)
- `bunx tsgo --noEmit` : vert.
- `src/pages/__tests__/mission-response-cascade.test.ts` : 3 tests OK.
- Suite Vitest existante : mêmes 15 échecs pré-existants (snapshots + `window` non défini dans un timer d'`ActiveRolesSection`), rien de nouveau.

## Analytics ajoutés
`mission_response_modal_opened`, `mission_response_template_used`, `mission_response_submitted_from_modal`, `mission_offer_one_click_interest`, `mission_accept_response_cascade_choice`, `mission_response_withdrawn`.

## Prêt pour Pass 2
Infra emails, `startConversation`, enum `withdrawn` en place. On peut enchaîner sur la Pass 2 (notifications + digest).
