# Plan acquisition « pub automatique » — bilan + suite

## Déjà livré

### Chantier 1 — SEO programmatique
- **150 villes France** : `topCitiesFrance.ts` + admin `AdminCityPages` avec batch throttlé, génération via `generate-city-page`.
- **96 départements** : admin `AdminDepartments` + edge `generate-department-page`.
- **60 races** (40 chiens + 20 chats) : `topBreeds.ts` + admin `AdminBreeds`, batch via `generate-breed-profile`.

### Chantier 2 — Soumission Google automatique
- **IndexNow** : triggers DB sur `sits`, `articles`, `city_guides`, `seo_city_pages`, `seo_department_pages`, `small_missions`.
- **GSC** : edge `gsc-submit-sitemap` (JWT RS256 via `GOOGLE_SERVICE_ACCOUNT_JSON`) + cron quotidien 5h UTC.

### Chantier 3 — Partage social
- **OG dynamiques** : edge `og-page` (satori + resvg) sur ville, race, département, article.
- **Bouton partage 1-clic** : `ShareLink` (Facebook, WhatsApp, Email, Clipboard, Web Share) + UTM auto + event `editorial_share_clicked`.
- **JSON-LD enrichi** :
  - `FAQPage` ajoutée sur fiches de race (4 questions standards).
  - `Service` annonce enrichi : `serviceType`, image OG, `areaServed` PostalAddress, credential identité vérifiée, `interactionStatistic` gardes accueillies.
  - Déjà solide auparavant : Article + FAQPage + HowTo (articles), Service + AggregateRating (gardiens), Service + Offer + FAQPage (villes/départements).

### Chantier 4 — Emails cycle de vie
- 3 nouveaux templates : `owner-no-sit-j3`, `owner-no-sit-j10`, `referral-boost-monthly`.
- 2 séquences : `owner-no-sit-relance` (J+3 puis J+10, exit `has_published_sit`) et `referral-boost-monthly` (mensuel, membres actifs).
- Évaluateur étendu : nouveau type d'enrôlement `active_referral` + dédup glissante pour campagnes récurrentes.
- Cron horaire `evaluate-journeys-hourly` (HH:15).

## Suite proposée (ordre d'impact)

### A — Pilotage et mesure (1 jour) — RECOMMANDÉ
Sans dashboard les chantiers 1-4 tournent à l'aveugle.
- **Dashboard admin `/admin/seo`** : impressions GSC, clics, top requêtes, pages indexées, statut soumissions IndexNow.
- **Dashboard admin `/admin/lifecycle`** : taux d'envoi/ouverture/clic par séquence (`email_send_log` × `journey_step_log` × `email_engagement_events`), taux de sortie (exit_condition_met).
- KPIs en haut, tables sortables, filtres 7/30/90 jours.

### B — Articles longue traîne (1 jour)
- 20 articles auto-générés : « comment trouver un gardien à [top 20 villes] » + « partir en vacances avec [top 10 races] ».
- Edge `generate-article` déjà en place, simple boucle admin.
- Maillage interne : chaque article link vers ville + race + 2 villes du département.

### C — Programme parrainage gamifié (0,5 jour)
- Page `/parrainage` enrichie : compteur live de filleuls actifs + barre de progression vers prochain mois offert.
- Partage 1-clic WhatsApp/SMS avec message pré-rempli + lien tracké.
- Email transactionnel quand un filleul s'inscrit, puis quand il devient actif.

### D — Sitemap dynamique villes/départements/races (0,5 jour)
- `scripts/generate-sitemap.mjs` lit `seo_city_pages`, `seo_department_pages`, `breed_profiles` au lieu de listes en dur.
- `<lastmod>` basé sur `updated_at` pour faire revenir Google.

### E — Schema.org `ItemList` sur landing/listings (0,5 jour)
- Landing : `ItemList` des 8 sits récents (rich result possible).
- BreedsListing : `ItemList` des races (CollectionPage).

## Recommandation
Je commence par **A (dashboards de pilotage)** : c'est l'ROI immédiat pour piloter tout ce qui a été déployé. Ou dites une lettre (B/C/D/E) pour rerouter.
