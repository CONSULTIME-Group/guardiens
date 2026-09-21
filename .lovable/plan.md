# Entraide, lot 3 : la fin d'échange et la preuve

## Point de base vérifié

- `mission_action_tokens` existe (action `can_help` par défaut, usage unique, RPC `peek_mission_action_token` / `consume_mission_action_token`, migration 0009).
- `mission_feedbacks` existe déjà avec `mission_id, giver_id, receiver_id, positive, badge_key, comment`, contrainte unique `(mission_id, giver_id)`. Elle porte exactement la notion de fin d'échange : elle est réutilisée telle quelle, plus une colonne pour l'autorisation d'affichage public.
- `small_mission_response_thanks` est un simple « merci » sur une réponse, sans mot ni consentement : conservée, non utilisée pour la preuve.
- `badge_attributions` a `sit_id` (clé étrangère vers `sits`) mais aucune colonne mission : il manque le lien vers un coup de main.
- Écussons d'entraide réellement codés : **trois**, pas six (`coup_de_main_or`, `super_voisin`, `on_remet_ca`), zéro attribué à ce jour.

## Écusson choisi

`coup_de_main_or`, libellé « Coup de main », arc « COUP DE MAIN », infobulle actuelle « Réussite d'une micro-mission de service ou d'entraide. »

Proposition de texte, à valider : infobulle « Premier coup de main donné à une personne du coin. » et notification « Karim, votre premier coup de main est noté. Merci. » Le vocabulaire « micro-mission » disparaît de l'infobulle, conformément au lexique du lot 2.

## Découpage

### A. Migration 0013 (schéma seulement, appliquée sur demande)

1. `mission_feedbacks` : ajout de `public_ok boolean NOT NULL DEFAULT true` (la case « Ce mot peut apparaître près de chez nous ») et `comment` porté à 140 caractères par contrôle applicatif.
2. `badge_attributions` : ajout de `mission_id uuid NULL` référencé sur `small_missions`, plus index unique partiel `(user_id, badge_id)` pour les écussons d'entraide, qui garantit l'attribution unique.
3. `small_missions` : ajout de `meetup_prompt_sent_at timestamptz NULL` (anti-renvoi de la relance de fin).
4. RPC `confirm_mission_meetup(p_token, p_happened, p_word, p_public_ok)` en `SECURITY DEFINER`, service role uniquement : consomme le jeton, écrit le retour, attribue l'écusson au premier « oui » côté aidant, referme ou rouvre le besoin.
5. RPC `emit_mission_meetup_tokens(p_mission_id)` : deux jetons `action = 'meetup_yes'` et `'meetup_no'` par personne.
6. Vue `public_entraide_proofs` : `mission_id, helper_first_name, owner_first_name, city, latitude_approx, longitude_approx, word, happened_at`. Possédée par postgres, sans `security_invoker`, `SELECT` à `anon` et `authenticated`, écritures révoquées, aucun nom de famille, aucune adresse, coordonnées arrondies à deux décimales comme `public_helpers`.
7. Vue `public_help_counts` : `user_id, given_count, received_count` pour le compteur de profil.

Aucun `DROP`, sauvegardes datées si une donnée est touchée.

### B. Serveur

- `supabase/functions/send-mission-meetup-prompt/index.ts` (cron horaire) : besoins `in_progress` dont `end_date`, sinon `date_needed`, est passée de un jour, sinon J+3 après l'acceptation. Un email et une notification aux deux personnes, jetons émis par la RPC, `meetup_prompt_sent_at` posé.
- Gabarits `mission-meetup-confirm-owner.tsx` et `mission-meetup-confirm-helper.tsx`, enregistrés dans le registre.
- `supabase/functions/mission-quick-action/index.ts` : accepte les actions `meetup_yes` et `meetup_no` en plus de `can_help`, mode `peek` inchangé.
- `supabase/functions/notify-mission-wave/index.ts` : une ligne de preuve, insérée seulement si une preuve existe à moins de 50 km du destinataire.

### C. Frontend

- `src/pages/MissionQuickCanHelp.tsx` : deux nouveaux états, « Oui, c'est fait » avec champ de 140 caractères « Un mot sur <Prénom> ? » et case cochée par défaut, « Ça ne s'est pas fait » avec message de suite.
- `src/components/entraide/EntraideProofCard.tsx` : la carte de preuve, prénoms, ville, mot, date en semaine.
- `src/components/entraide/EntraideProofs.tsx` : trois cartes maximum, rayon de 50 km, repli France entière.
- `src/pages/EntraideHub.tsx` : bloc de preuves entre l'en-tête et les deux vues.
- `src/pages/MissionsCityPage.tsx` : les preuves de la ville.
- `src/components/entraide/EntraideCards.tsx` et la fiche membre : compteur « 3 coups de main donnés, 1 reçu ».
- `src/components/dashboard/MesCoupsDeMain.tsx` : besoins en cours, à confirmer avec les deux boutons en ligne, terminés avec le mot reçu. Monté dans `OwnerDashboard` et `SitterDashboard` à côté de `HelpsWithReminder`.
- `src/lib/entraideProofs.ts` : logique pure (sélection par rayon, plafond à trois, date en semaine, ligne d'email).

### D. Mesure

`docs/entraide-mesure.md` : ajout de « rencontres confirmées par semaine » avec sa requête, à côté de « je peux par besoin ».

### E. Tests

Vitest : relance à J+1 et à J+3 sans date, jetons oui et non, réouverture si la date est à venir et fermeture sinon, écusson attribué une seule fois, compteurs justes, sélection des preuves (plafond trois, rayon, repli), ligne d'email uniquement sous 50 km. `scripts/audit/test-client-surface.mjs` étendu aux deux nouvelles vues : lecture anonyme possible, aucune écriture, aucune colonne d'identité.

## Risques

- Une relance sur des besoins déjà passés en `in_progress` avant ce lot enverrait un lot d'emails d'un coup. Garde-fou proposé : ne traiter que les besoins dont la date de référence tombe après la date de mise en service.
- « Ça ne s'est pas fait » rouvre le besoin et relance une vague : plafond d'une seule relance, comme demandé, sinon boucle.
- Les prénoms des preuves rendent publique une mise en relation. La vue ne sort que prénom, ville et mot autorisé.

## Ce que je ferais différemment

- Le compteur « coups de main donnés » repose sur des retours confirmés, donc il démarre à zéro pour tout le monde. Je proposerais de l'afficher seulement à partir du premier, plutôt qu'un zéro sur chaque carte.
- La case de publication cochée par défaut est un choix produit fort. Elle reste cochée si vous le confirmez, sinon je la laisse décochée avec une phrase d'invitation.
- Je garderais `small_mission_response_thanks` intacte et sans nouvel usage, pour éviter deux sources de vérité sur le même geste.

## Livraison

Aucune publication, aucun déploiement, aucune migration appliquée sans votre GO. Rapport par lot habituel : fichiers exacts, diff, tests, commit.
