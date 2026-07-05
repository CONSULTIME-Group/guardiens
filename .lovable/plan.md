
# Article inventaire Guardiens, plan d'exécution

Chantier lourd (4-5h), 10 étapes séquencées. Voici comment j'attaque.

## Vérifications préalables à faire avant de coder

1. **Table `guide_requests`** : existe déjà (13 colonnes, 4 policies d'après le contexte). Je lis le schéma actuel avant d'ajouter une migration, pour ne pas dupliquer des colonnes.
2. **Pattern article** : `ArticleDetail.tsx` rend depuis BDD. Je regarde s'il gère déjà des placeholders ou des composants React injectés, pour choisir Option A (Markdown + placeholders) ou Option B (composant React dédié via routeur d'exceptions).
3. **Turnstile Cloudflare** : je vérifie s'il est déjà en place dans le projet (`TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`). Si absent, je demande à l'utilisateur avant d'ajouter la dépendance.
4. **Edge function d'illustration article** : je vérifie son nom exact avant de l'appeler pour générer la cover.
5. **Cron pattern** : je vérifie si `pg_cron` est déjà utilisé sur d'autres jobs (email queue oui) pour rester cohérent.

## Décisions par défaut (je choisis, dis stop si pas ok)

- **Option B** pour l'article : composant React dédié `ArticleInventaire` monté via routeur d'exceptions dans `ArticleDetail`. Plus lisible que du Markdown avec placeholders custom, meilleur pour les données live.
- **Cover image** : je génère via l'edge function existante si dispo, sinon `imagegen--generate_image` en fallback.
- **Turnstile** : si pas déjà présent, je livre le formulaire avec honeypot + rate-limit IP uniquement, et je pose une TODO pour l'ajout Turnstile ultérieur. Sinon je le branche.
- **Digest admin** : envoi via le pipeline app-emails existant (`send-transactional-email` + template dédié), pas de nouveau système.
- **Signature double** : "Jérémie et Elisa" à la fin, sans emoji ni icône.

## Séquence d'exécution

### Étape 1, base de données (migration unique)
- Vérifier et compléter `guide_requests` : colonnes manquantes (`ip_hash`, `city_context`, `admin_notes`, `delivered_at`, `delivered_url`, `updated_at`, `status` enum interne).
- Trigger `update_updated_at_column` sur `guide_requests`.
- RLS : INSERT réservé service_role (via edge function), SELECT/UPDATE/DELETE admin uniquement.
- RPC `get_inventaire_counts()` SECURITY DEFINER, retourne JSON groupé (cities, breeds par species, places par category, pros).
- GRANTs corrects sur la RPC (execute to anon + authenticated).

### Étape 2, edge function `submit-guide-request`
- CORS restreint à guardiens.fr et preview Lovable.
- Zod validation stricte.
- Honeypot `website` : drop silencieux si non vide.
- Turnstile : vérification server-to-server si secret dispo, sinon skip.
- Hash IP SHA256 avec `HASH_SALT` (à générer via `generate_secret` si absent).
- Rate-limit 15 min par IP.
- Insert row.
- Enqueue confirmation email si `email` fourni.
- Retour 200 avec ticket_id court.

### Étape 3, composant `GuideRequestForm`
- Radio group 5 types, label conditionnel du champ `subject`.
- Textarea `details` (500 max), input `email` optionnel, checkbox RGPD.
- Honeypot masqué visuellement mais accessible aux bots.
- Toast succès/échec, état loading.

### Étape 4, hook `useInventaireCounts`
- React Query, staleTime 5 min.
- Appel unique de la RPC.
- Retour typé.

### Étape 5, article
- Insert en BDD via `supabase--insert` : slug, titles, meta, published_at.
- Cover : génération illustration + upload storage, ou fallback.
- Composant `ArticleInventaire` monté dans `ArticleDetail` quand slug match.
- 7 sections comme au prompt, vouvoiement, aucun mot proscrit, aucun tiret cadratin.
- FAQPage + Article + Dataset Schema.org.
- Signature Jérémie et Elisa, `dateModified` dynamique.

### Étape 6, teaser Observatoire
- Ajout section "Notre inventaire vivant" entre stats et confiance, 4 tuiles via `useInventaireCounts`, CTA vers `#demande`.

### Étape 7, admin kanban
- Route `/admin/guide-requests` dans `App.tsx`.
- Entrée dans `AdminSidebar` entre small-missions et contact-messages.
- Page `AdminGuideRequests` : 4 colonnes drag-less (boutons "étape suivante"), KPI en haut (demandes/mois, temps médian, camembert répartition), filtre par type.
- Modal "Livré avec URL" pour renseigner `delivered_url`.

### Étape 8, digest quotidien
- Edge function `send-guide-requests-digest`.
- Job `pg_cron` 8h Europe/Paris.
- Requête : demandes créées depuis hier 8h, groupées par type.
- Skip si 0.
- Envoi via `send-transactional-email` avec template `guide-requests-digest`.

### Étape 9, SEO
- Sitemap régénéré (via script existant si présent).
- Schema.org validé (le test `jsonld-validation` doit passer).
- Vérif `no-em-dash-guard` : je scan mon contenu avant commit.

### Étape 10, tests
- Typecheck.
- Tests existants (no-em-dash, jsonld, footer-token) doivent rester verts.
- Un test unitaire sur la RPC `get_inventaire_counts` (structure de retour).

## Ce que je ne fais pas sans confirmation

- Installer Turnstile si absent : je pose la question en cours de route.
- Ajouter le composant React dans un nouveau routeur : je reste sur `ArticleDetail`.
- Modifier la sidebar au-delà de l'entrée demandée.

## Estimation

Cohérent avec l'estimation du prompt : 4 à 5h côté agent, en 8 à 12 exécutions groupées.

Dites go et j'attaque par l'étape 1 (lecture schéma + migration).
