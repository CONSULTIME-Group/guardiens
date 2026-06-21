# Module « Questions & conseils »

Forum communautaire léger pour poser une question (comportement animal, jardin, maison, garde…) et recevoir plusieurs réponses publiques. **Séparé** des petites missions (qui restent transactionnelles : Besoin / Offre).

## Périmètre

- Route dédiée : `/questions` (liste + filtres) et `/questions/:id` (détail + fil de réponses).
- Entrée depuis le dashboard : remplacer le bloc actuel « Échanges autour de vous » par 2 cartes côte à côte : « Petites missions » (existant) + « Questions & conseils » (nouveau).
- Cohabite avec `/petites-missions`, aucune fusion DB.

## Modèle de données

Deux nouvelles tables publiques.

### `community_questions`
- `category` : `animaux | jardin | maison | garde | autre`
- `title` (5–120), `body` (20–4000), `tags text[]`, `city` (optionnel)
- `status` : `open | resolved | closed` (auteur peut marquer « résolu »)
- `accepted_answer_id` (nullable, FK community_answers)
- `views_count`, `answers_count`, `helpful_count` (compteurs)
- `is_pinned`, `is_hidden` (modération)

### `community_answers`
- `question_id` FK, `parent_answer_id` (1 niveau de réponse imbriquée)
- `body` (10–4000), `helpful_count`
- `is_author_pick` (épinglé par l'auteur de la question)
- `is_hidden`

### `community_answer_votes`
- `(answer_id, user_id)` unique, type `helpful`.

### RLS
- Lecture publique (`anon` + `authenticated`) sur questions/answers non masquées.
- Écriture : `authenticated` uniquement, scoping `auth.uid()`.
- Admin : peut tout modérer via `has_role(auth.uid(), 'admin')`.
- Triggers pour incrémenter `answers_count` / `helpful_count`.
- `GRANT` complets (anon SELECT, authenticated CRUD scoped, service_role ALL).

### Modération
- Réutilise `reports` (table existante) avec `target_type = 'question' | 'answer'`.
- Réutilise `blocked_users` : un user bloqué n'apparaît pas dans les fils.
- Auto-masquage à 3 signalements (trigger).

## UI / composants

```
src/pages/Questions.tsx                 # liste + filtres catégorie/statut/ville
src/pages/QuestionDetail.tsx            # question + fil de réponses
src/pages/QuestionCreate.tsx            # formulaire création
src/components/community/
  QuestionCard.tsx
  AnswerThread.tsx
  AnswerComposer.tsx
  HelpfulButton.tsx
  CategoryPills.tsx
src/components/dashboard/CommunityQuestionsSection.tsx  # bloc dashboard
src/hooks/useCommunityQuestions.ts
src/hooks/useQuestionDetail.ts
```

## Dashboard

Remplace `MissionsNearbySection` par un layout 2 colonnes :

```text
+----------------------------+----------------------------+
| Petites missions           | Questions & conseils       |
| (Besoin / Offre — actuel)  | (NOUVEAU)                  |
| 3 missions proches         | 3 questions actives proches|
| → /petites-missions        | → /questions               |
+----------------------------+----------------------------+
```

Sur mobile : stack vertical, Questions en 2ᵉ.

## SEO

- `/questions` : title « Questions & conseils entre gardiens et propriétaires »
- `/questions/:id` : title dynamique = `{title} — Questions & conseils`, JSON-LD `QAPage` avec `mainEntity: Question + suggestedAnswer[] + acceptedAnswer`.
- Sitemap : ajouter questions `status = 'open' OR 'resolved'`, exclure `closed/hidden`.

## Analytics

- `question_create_submit` { category }
- `question_view` { id }
- `answer_submit` { question_id, is_first_answer }
- `answer_helpful_click` { answer_id }
- `question_mark_resolved` { id, answers_count }

## Garde-fous

- Vouvoiement, aucune icône Lucide dans le contenu éditorial (titres/cartes ok pour actions/nav).
- Pas de « voisin », pas de tiret cadratin, pas d'AURA.
- Aucune mention concurrent.
- Light mode par défaut.

## Livraison (3 étapes séquentielles)

1. **Migration DB** (tables + RLS + triggers + GRANTs + realtime sur `community_answers`).
2. **Pages + hooks + composants** + intégration dashboard 2 colonnes.
3. **SEO** : sitemap + JSON-LD QAPage + `PageMeta`.

## Hors scope (volontairement)

- Notifications push/email sur nouvelle réponse → V2.
- Tag « expert vétérinaire » → V2 (nécessite badge dédié).
- Upload photos dans questions → V2.
- Recherche full-text → V2 (filtres catégorie/ville suffisent au lancement).
