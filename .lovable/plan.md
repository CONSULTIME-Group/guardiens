
## Intention

Sur `SmallMissionDetail`, remplacer le vocabulaire et l'UX de "proposition/candidature" par un fil de **réponses conversationnelles** (esprit commentaires), plus un mécanisme léger de **reconnaissance** : l'auteur du besoin peut marquer une réponse comme « personne retenue pour aider » (ou « réponse utile » pour une question), et cette reconnaissance est restituée sur le profil public de l'aidant sous forme de compteurs ("a aidé 12 fois", "3 conseils marqués utiles").

Pas de note étoilée sur l'entraide (règle métier existante conservée).

## Ce qui change côté UX

Sur `/petites-missions/:id` :
- Titre de la section : « Réponses » (au lieu de « Propositions »).
- CTA principal : « Répondre » / « Proposer mon aide » (au lieu de « Envoyer une proposition »).
- Composer inline type commentaire (textarea + bouton) sous le fil, sans dialog lourd.
- Chaque réponse = carte compacte : avatar, prénom (lien profil), date relative, texte, badges éventuels de l'aidant.
- Bouton discret côté auteur du besoin sur chaque réponse :
  - Type « Besoin » : « Retenir cette personne » (toggle, une seule sélection active).
  - Type « Question » : « Marquer utile » (multi-possible).
- Badge visuel sur la réponse retenue : « Personne retenue » (vert doux).
- Suppression de l'ancien dialog « ProposeExchangeDialog » sur les missions solidaires (conservé pour les échanges structurés, si utilisé ailleurs).

Sur le profil public de l'aidant (`/gardiens/:id`) :
- Nouveau petit bloc « Entraide » dans la colonne réputation :
  - « A aidé N fois » (nb de réponses retenues)
  - « M conseils marqués utiles » (nb de réponses `is_useful` sur questions)

## Ce qui change côté données

Table `small_mission_responses` déjà en place ; ajouter :
- `is_selected boolean default false` (une seule par mission, contrainte via index unique partiel).
- `is_useful boolean default false` (multi possible, pour questions).
- `selected_at timestamptz`, `marked_useful_at timestamptz`.

RLS :
- Seul l'auteur de la mission peut set `is_selected` / `is_useful` (policy update ciblée).
- Lecture publique conservée.

Compteurs profil : vue SQL `helper_recognition_stats(user_id)` qui agrège `is_selected` et `is_useful` par utilisateur, lue depuis le profil.

Analytics : events `mission_reply_submit`, `mission_reply_selected`, `mission_reply_useful`.

## Fichiers touchés

- `src/pages/SmallMissionDetail.tsx` : refonte de la section réponses + composer inline + actions auteur.
- `src/components/missions/` : nouveau `MissionReplyList.tsx`, `MissionReplyComposer.tsx`, `MissionReplyItem.tsx`. Retrait de l'appel à `ProposeExchangeDialog` sur cette page.
- `src/pages/SitterProfile.tsx` (ou composant réputation existant) : ajout du bloc « Entraide ».
- `src/pages/OwnerProfile.tsx` : idem si un owner peut aussi répondre.
- Nouveau hook `useHelperRecognition(userId)`.
- Migration Supabase : colonnes + index + policy + vue.
- i18n (`fr.json`) : nouvelles clés `mission_reply.*`.

## Hors-scope

- Pas de notation étoilée sur l'entraide.
- Pas de refonte des échanges structurés (garde ↔ mission) ni du dialog `ProposeExchangeDialog` sur les autres flux.
- Pas de notifications email spécifiques dans ce lot (pourra suivre).

Je lance l'implémentation dès votre feu vert.
