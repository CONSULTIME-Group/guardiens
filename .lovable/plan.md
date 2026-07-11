# Plan — Audit PART 1 (17 Q) + PART 2 (7 skills)

Read-only. Aucune modification code/BDD. Livrable = un rapport unique structuré selon votre format.

## Méthode d'exécution

**Phase 1 — Collecte parallèle** (≈20 appels batchés) :

- **SQL (supabase--read_query, en parallèle)** :
  - Q2 : `analytics_events` filtré `affinity_onboarding%` depuis 2026-07-09 (count par event + funnel entrée→complétion)
  - Q5 : `articles` sans canonical_url (slug, category, published_at)
  - Q6 : `articles` sans published_at
  - Q7 : `information_schema.columns` pour `seo_city_pages` + count + slugs
  - Q9 : `seo_cache` extraction `data->'gsc'->'topQueries'` top 25
  - Q12 : recherche impressions `?lang=en` dans `seo_cache` GSC data
  - Q14 : `cron.job` + `cron.job_run_details` récents
  - Q17 : `information_schema.columns` seo_cache + dernières écritures
  - Q10 : `pg_trigger` + `pg_get_triggerdef` pour `articles_recache_prerender`
  - Q16 : article `c-est-quoi-le-house-sitting` (content length, updated_at, catégorie, meta)

- **Code (rg + view, en parallèle)** :
  - Q1 : `ActivateRoleDialog` usage + handler "Contact proprio" ; `CreateSit*` validation photo ; champ `pets` readonly ; `Profile.tsx` hero sitter ; `SitterProfileForm` étape expérience
  - Q4 : `src/pages/admin/_components/dashboard/useDashboardData.ts` lignes 40-107 (les 27 requêtes)
  - Q8 : `src/data/cityContent.ts` sections Lyon
  - Q11 : grep `generate-longtail-article` dans tout le repo
  - Q13 : `refreshArticleValidator.ts` + `articles-post-pivot.ts` critères urgent/incomplet
  - Q15 : faisabilité edge function test `sites.list()` (lecture code connector gateway)

**Phase 2 — Analyse & synthèse**

- Croiser findings avec les 7 skills existants (déjà audités hier).
- Pour chaque zone grise → réponse factuelle chiffrée + chemin fichier/table.
- Pour chaque skill → tableau §section actuelle / correct / preuve.

## Livrable

Un seul message structuré :

```
PART 1 — 17 zones grises
### Q1 Backlog UX
  Bug 1 : (a/b/c) + preuve
  …Bug 5
### Q2 Onboarding affinité funnel
  [tableau chiffré]
### Q3 5 patterns nurturing
  Pour chaque : SQL détection + nom edge + cron
### Q4 27 requêtes AdminDashboard
  [regroupement + RPC proposées]
### Q5→Q17 [chacune traitée]

PART 2 — Corrections skill par skill
### guardiens-tech
  §X.Y  Actuel / Correct / Preuve
### guardiens-product
  …
### guardiens-editorial
### guardiens-gtm
### guardiens-alma
### guardiens-seo
### guardiens-seo-geo-strategie
```

## Points de vigilance

- **Q12 (cannibalisation ?lang=en)** : les données GSC dans `seo_cache` n'incluent probablement pas le query param dans l'URL agrégée. Si impossible de trancher côté BDD, je le dirai explicitement (« signal absent dans seo_cache, à vérifier GSC UI ») plutôt que d'inventer.
- **Q15 (test sites.list service account)** : je lirai le code pour dire si c'est faisable sans déployer une nouvelle fonction ; pas d'exécution puisque read-only.
- **Q3 (patterns nurturing)** : ce sont des *propositions* (pas de la doctrine actuelle) — clairement labellisé.
- **PART 2** : je m'appuie sur les 7 skills tels que résumés dans mem://index + findings d'hier. Si une section évoquée n'existe pas exactement sous ce numéro, je propose le titre le plus proche + note.

## Volume estimé

Rapport long (~15-20k caractères). Un seul message dense, pas de découpage.

Confirmez « go » pour lancer la phase 1.
