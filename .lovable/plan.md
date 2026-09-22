# Lot N1, relances gardien conditionnées, bugs de rôle, pause entraide

Plan de mise en oeuvre. Aucune écriture, aucune migration, aucun déploiement avant votre GO.

## Ce que la base dit aujourd'hui (22/09)

Vérifié par requête, pas estimé.

- Annonces réellement ouvertes (published, début futur, candidatures ouvertes, non masquée) : **9**.
- Gardiens géolocalisés avec profil gardien : **1007**.
- Gardiens ayant au moins une de ces 9 annonces à portée (50 km, ou leur rayon déclaré s'il est plus petit) : **130**.
- Séquence `discover-mutual-aid` : **496** parcours actifs, 3 étapes.
- Cron 156 `nudge-dormant-top-sitters` : actif, mercredi 11 h UTC, appelle une fonction absente du dépôt.

### Volumes attendus avec la nouvelle condition

| Relance | Candidats aujourd'hui | Retenus après condition d'annonce à portée |
|---|---|---|
| `dormant-sitter-nudge` (cron lundi) | 50 détectés, 50 géolocalisés | **8**, dont 1 compte admin à exclure et 5 ayant déjà reçu 3 envois ou plus, soit **2 envois réels** |
| `sitter-encourage-candidature` | 28 parcours actifs, 19 géolocalisés | **10** |
| `availability-nudge` (onboarding gardien, étape 3) | 15 parcours en attente de l'étape, 9 géolocalisés | **2** |

Un gardien sans coordonnées ne reçoit pas : sans coordonnées la condition ne peut pas être évaluée. Le parcours n'est pas terminé pour autant, il est reporté avec la raison `skipped_no_coordinates`.

## Partie 1, condition d'annonce à portée

### Nouveau module partagé

`supabase/functions/_shared/nearby-open-sits.ts`

- `fetchNearbyOpenSits(supabase, { userId, latitude, longitude, declaredRadiusKm, limit: 3 })`
- Retourne `{ sits: NearbySit[], reason: null | 'no_coordinates' | 'no_open_sit_nearby' }`.
- `NearbySit` : `id`, `slug`, `title`, `city`, `startDate` et `endDate` formatées en français, `distanceKm` arrondi à l'entier, `url` absolue vers l'annonce.
- Rayon appliqué : `min(50, rayon déclaré)`. Le rayon déclaré suit `effective_search_radius`, donc 30 km reste lu comme un silence et vaut 100, puis le plafond de 50 s'applique.

Requête de proximité, exécutée via une RPC `get_nearby_open_sits(_user_id uuid, _radius_km numeric, _limit int)` en SECURITY DEFINER, pour que le calcul de distance reste en base :

```sql
SELECT s.id, s.slug, s.title, s.city, s.start_date, s.end_date,
       6371 * acos(least(1,
         cos(radians(u.latitude)) * cos(radians(op.latitude)) *
         cos(radians(op.longitude) - radians(u.longitude)) +
         sin(radians(u.latitude)) * sin(radians(op.latitude))
       )) AS distance_km
FROM public.sits s
JOIN public.profiles op ON op.id = s.user_id
CROSS JOIN (SELECT latitude, longitude FROM public.profiles WHERE id = _user_id) u
WHERE s.status = 'published'
  AND s.start_date > now()
  AND s.accepting_applications IS NOT FALSE
  AND s.hidden_at IS NULL
  AND s.moderation_hidden_at IS NULL
  AND op.latitude IS NOT NULL AND op.longitude IS NOT NULL
  AND u.latitude IS NOT NULL AND u.longitude IS NOT NULL
ORDER BY distance_km ASC
LIMIT _limit;
```

Le filtre de distance final (`<= _radius_km`) est appliqué dans la RPC après calcul, pour garder une seule expression de distance.

### Points d'appel

1. `supabase/functions/nudge-sitter-dormant/index.ts` : avant l'envoi, appel de `fetchNearbyOpenSits`. Sans annonce, on incrémente `emailsSkipped`, on journalise la raison dans les métriques du run, et aucun signal admin n'est créé pour ce motif.
2. `supabase/functions/evaluate-journeys/index.ts` : pour les étapes dont le template est `sitter-encourage-candidature` ou `availability-nudge`, même appel. Sans annonce, on écrit dans `journey_step_log` `sent: false, reason: 'skipped_no_open_sit_nearby'` et **on ne fait pas avancer `current_step`** (même traitement que l'échec transitoire), pour que le parcours réessaie plus tard au lieu d'être marqué terminé. Garde-fou : ce report n'incrémente pas `transient_failure_count`, sinon le parcours serait arrêté au bout de 5 reports.

Les annonces trouvées sont passées dans `templateData` sous `nearbySits` (tableau de 1 à 3) et `primarySitUrl`.

### Rendu des templates

Adaptation d'affichage uniquement, aucun texte existant réécrit.

- `supabase/functions/_shared/transactional-email-templates/dormant-sitter-nudge.tsx` : bloc cartes annonces (titre, ville, dates, « à N km »), bouton pointant vers `primarySitUrl` au lieu de `/recherche`.
- `.../sitter-encourage-candidature.tsx` : même bloc cartes, bouton vers `primarySitUrl`.
- `.../availability-nudge.tsx` : la carte unique existante devient une liste de 1 à 3 annonces, bouton vers `primarySitUrl`.

### Plafond de 3 et exclusion admin (dormant uniquement)

Dans `nudge-sitter-dormant` :

- Fenêtres d'envoi J+30, J+45, J+75 après inscription (tolérance de 7 jours autour de chaque jalon, le cron est hebdomadaire). Hors fenêtre, pas d'envoi.
- Comptage des envois déjà réalisés dans `email_send_log` pour `template_name = 'dormant-sitter-nudge'` sur l'email du gardien. À 3 ou plus, arrêt définitif.
- Exclusion des comptes ayant le rôle `admin` dans `user_roles`.

Aucune purge de l'historique des 247 envois, on ne réécrit pas les données.

### Prénom capitalisé, un seul endroit

`supabase/functions/send-transactional-email/index.ts` contient déjà `normalizeEmailFirstNames`, appliqué à tout `templateData` avant rendu et avant calcul du sujet. Deux corrections dans cette seule fonction :

- capitalisation de chaque mot du prénom après `publicFirstName` (« jeremie » devient « Jeremie », « jean-claude » devient « Jean-Claude ») ;
- prise en compte des clés en minuscules avec tiret bas (`first_name`, `sitter_first_name`), aujourd'hui ignorées par le motif `/FirstName$/`.

La logique est extraite dans `supabase/functions/_shared/email-first-name.ts` et couverte par tests. Rien d'autre n'appelle cette normalisation, donc tous les templates transactionnels et de nurturing en bénéficient d'un coup.

## Partie 2, bugs de rôle

Relevé complet des étapes, lu en base :

| Séquence | Étape | Template | Verdict |
|---|---|---|---|
| onboarding-sitter | 1 | onboarding-j1 | sujet propriétaire, à corriger |
| onboarding-sitter | 2 | relance-profil-incomplet | neutre, correct |
| onboarding-sitter | 3 | availability-nudge | correct, conditionné au point 1 |
| onboarding-sitter | 4 | conseils-annonce-personnalises | **contenu propriétaire, à retirer** |
| onboarding-owner | 1 à 4 | onboarding-j1, conseils-publication-annonce, conseils-annonce-personnalises, relance-profil-incomplet | cohérents |
| owner-no-sit-relance | 1 à 3 | owner-no-sit-j3 / j10 / j21 | cohérents |
| helper-to-guard, reactivation-d30, discover-mutual-aid | | | audience `all`, textes neutres, pas de conflit de rôle |

Aucun autre template n'est envoyé au mauvais rôle.

### Retrait de l'étape 4 gardien

Suppression de la ligne `nurturing_steps` (étape 4 de `onboarding-sitter`) par requête de données, pas par migration.

Ce que je propose en remplacement : **rien dans ce lot**. La séquence gardien se termine alors à l'étape 3. Ajouter une quatrième étape gardien maintenant reviendrait à écrire un texte, ce qui relève du lot N2. Les parcours déjà à `current_step = 3` seront simplement marqués `completed` au prochain passage, comportement normal du moteur.

### Sujet d'onboarding-j1 selon le rôle

- `evaluate-journeys` ne passe **pas** `isOwner` aujourd'hui, donc le corps est bien rendu en version gardien, mais le sujet est statique et parle d'annonce. C'est le seul défaut.
- Correction 1 : dans `evaluate-journeys`, passer `isOwner: seq.audience === 'owner'` dans `templateData` pour tout envoi, ce qui rend l'intention explicite au lieu de reposer sur une valeur absente.
- Correction 2 : dans `onboarding-j1.tsx`, sujet dynamique. Propriétaire : « Votre première annonce en 2 minutes, Guardiens ». Gardien : « Bienvenue sur Guardiens, votre profil de gardien en quelques minutes ».
- `send-onboarding-j1` passe déjà `isOwner` correctement, il n'est pas modifié.

## Partie 3, cron orphelin 156

Constat : `cron_run_log` contient des passages `nudge-dormant-top-sitters` en statut `success` avec `detected: 0` chaque mercredi, donc la fonction **est déployée** hors dépôt et répond, mais ne détecte jamais personne. Aucun code source correspondant dans le dépôt.

Proposition : **désactiver le cron 156** (`active = false`) plutôt que le supprimer, pour garder la trace et pouvoir le réactiver si le code est retrouvé. La suppression ferme du cron et de la fonction déployée, si vous la préférez, se fera sur votre mot. Aucun envoi n'est perdu, la fonction n'envoie rien.

## Partie 4, pause entraide

Requêtes de données, à exécuter après GO :

```sql
-- 1) Pause de la séquence
UPDATE public.nurturing_sequences
SET active = false, updated_at = now()
WHERE key = 'discover-mutual-aid';

-- 2) Sortie propre des parcours actifs, sans envoi
UPDATE public.user_journeys
SET status = 'exited',
    exit_reason = 'paused_model_a',
    completed_at = now(),
    updated_at = now()
WHERE sequence_key = 'discover-mutual-aid'
  AND status = 'active';
```

496 parcours concernés au moment de la mesure. Les étapes et les templates sont conservés tels quels, la réécriture viendra plus tard.

## Migrations drizzle

Une seule, `drizzle/migrations/0016_nearby_open_sits_rpc.sql` :

- `CREATE OR REPLACE FUNCTION public.get_nearby_open_sits(...)`, `SECURITY DEFINER`, `SET search_path = public`, `STABLE` ;
- `REVOKE ALL ... FROM PUBLIC, anon, authenticated` puis `GRANT EXECUTE ... TO service_role` : cette RPC n'est appelée que par les fonctions serveur.

Aucun `DROP`, aucune colonne touchée. Copie documentaire « NE PAS REJOUER » dans `supabase/migrations/20260922xxxxxx_get_nearby_open_sits_ne_pas_rejouer.sql`, comme pour 0015.

Les points 2 (retrait d'étape), 4 (pause) et 3 (cron) sont des données, pas du schéma : ils passent par requêtes, pas par migration.

## Tests

Nouveaux fichiers :

- `src/__tests__/nearby-open-sits.test.ts` : aucune annonce, annonce à 49 km retenue, annonce à 51 km écartée, annonce dont la date de début est passée, annonce masquée (`hidden_at` et `moderation_hidden_at`), rayon déclaré plus petit que 50 respecté, absence de coordonnées.
- `src/__tests__/dormant-sitter-cap.test.ts` : plafond de 3 envois, fenêtres J+30 / J+45 / J+75, exclusion des comptes admin.
- `src/__tests__/email-first-name.test.ts` : « jeremie » devient « Jeremie », « jean-claude » devient « Jean-Claude », « MARTIN » inchangé, `first_name` traité comme `firstName`, valeur vide tolérée.
- `src/__tests__/onboarding-j1-subject.test.ts` : sujet propriétaire et sujet gardien, et `isOwner` transmis par audience.

Suite complète ensuite : Vitest complet, `npm run test:sql`, `tsc`.

## Fichiers touchés

Nouveaux : `supabase/functions/_shared/nearby-open-sits.ts`, `supabase/functions/_shared/email-first-name.ts`, `drizzle/migrations/0016_nearby_open_sits_rpc.sql`, la copie documentaire, les 4 fichiers de tests.

Modifiés : `supabase/functions/nudge-sitter-dormant/index.ts`, `supabase/functions/evaluate-journeys/index.ts`, `supabase/functions/send-transactional-email/index.ts`, `supabase/functions/_shared/transactional-email-templates/dormant-sitter-nudge.tsx`, `.../sitter-encourage-candidature.tsx`, `.../availability-nudge.tsx`, `.../onboarding-j1.tsx`.

Hors périmètre, non touchés : `send-onboarding-j1`, `send-nearby-daily-digest`, toutes les séquences propriétaire, les textes des emails (lot N2).

## Ordre d'exécution après GO

1. Code et tests, suite complète verte.
2. Migration 0016 appliquée en base.
3. Requêtes de données : retrait de l'étape 4 gardien, pause entraide et sortie des parcours, désactivation du cron 156.
4. Rapport : fichiers, diffs, tests, comptages avant et après, hash du commit. Aucun déploiement ni publication sans votre mot.
