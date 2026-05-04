# AUDIT GUARDIENS — RAPPORT FACTUEL LANCEMENT 13/05/2026

Généré : 2026-05-04. Aucune modification de code. Constats uniquement.

---

## SECTION 1 — ÉTAT D'INDEXATION RÉEL

### 1.1 Pages dans le sitemap
**147 URLs** dans `public/sitemap.xml`. Ventilation par préfixe :

| Type | Nb |
|---|---|
| `/actualites/*` (articles) | 60 |
| `/guides/*` | 46 |
| `/house-sitting/*` (villes) | 23 |
| `/departement/*` | 7 |
| Pages statiques publiques | 10 (tarifs, faq, contact, petites-missions, gardien-urgence, a-propos, mentions-legales, confidentialite, cgu, inscription) |
| Homepage `/` | 1 |
| `/races/*` | **0** (DONNÉE NON DISPONIBLE — non émis dans le sitemap statique malgré 18 `breed_profiles` en base. Émission présente uniquement dans l'edge function `sitemap`) |
| `/gardiens/:id` | **0** (politique : profils exclus du sitemap statique, voir `siteRoutes.ts` commentaire L37) |

### 1.2 Profils gardiens passant le filtre sitemap
Critères : `account_status='active'` AND `profile_completion>=60` AND `role IN ('sitter','both')` AND `LENGTH(postal_code)=5` AND `avatar_url IS NOT NULL` AND `LENGTH(bio)>50`.

- **Total éligibles : 74** (sur 429 profils, dont 389 sitter/both)
- **Quick wins 50–59 % avec bio>50 + photo + CP : 0**

Ventilation par département cible (sur les 74 éligibles) :

| Dept | sitter | both |
|---|---|---|
| 01 | 1 | 0 |
| 38 | 1 | 0 |
| 63 | 0 | 1 |
| 69 | 9 | 4 |
| 74 | 2 | 0 |
| Hors zone AURA cible | 51 | 5 |

Répartition role : **sitter only 67 / both 7**.

### 1.3 Top 20 profils <60 % avec photo + CP (campagne complétion)
Aucun profil <60 % n'a à la fois photo + bio non vide + CP 5 chiffres. 10 candidats avec photo+CP **mais bio vide** :

| id | CP | completion | bio_len |
|---|---|---|---|
| d2ecd8d9 | 69220 | 50 | 0 |
| 0e8cc1f5 | 92410 | 50 | 0 |
| 20564840 | 44160 | 50 | 0 |
| 118c8894 | 29720 | 50 | 0 |
| 397681d2 | 62820 | 50 | 0 |
| 5fe97298 | 74200 | 50 | 0 |
| 44716d64 | 38300 | 50 | 0 |
| 194c701c | 09000 | 35 | 0 |
| d8bbdff0 | 13780 | 35 | 0 |
| c9c1b51c | 51100 | 35 | 0 |

### 1.4 Articles publiés
- Indexables (`published=true` AND `noindex` NULL/false) : **64**
- Drafts : **6**
- Noindex : **36**

### 1.5 Pages éditoriales publiées en base
| Table | Publiées |
|---|---|
| `seo_city_pages` | 17 |
| `seo_department_pages` | 7 |
| `city_guides` | 46 |
| `breed_profiles` | 18 (pas de flag `published`, toutes exposées via edge sitemap) |

> **ÉCART** : sitemap statique = 23 villes vs base = 17. Les 6 supplémentaires viennent de `staticRoutes`/scripts (annecy, lyon, grenoble, caluire-et-cuire, chambery, aura inclus en dur dans la fn edge).

---

## SECTION 2 — VOCABULAIRE & META

### 2.1 staticRoutes — titles + meta

| path | title len | meta len |
|---|---|---|
| `/` | 51 | 161 ⚠️ |
| `/tarifs` | 49 | 132 |
| `/faq` | 41 | 152 |
| `/actualites` | 47 | 152 |
| `/petites-missions` | 56 | 165 ⚠️ |
| `/gardien-urgence` | 56 | 178 ⚠️ |
| `/guides` | 51 | 158 |
| `/recherche` | 56 | 156 |
| `/contact` | 55 | 173 ⚠️ |
| `/a-propos` | 54 | 165 ⚠️ |
| `/login` | 54 | 178 ⚠️ |
| `/inscription` | 54 | 178 ⚠️ |
| `/cgu` | 50 | 156 |
| `/cgs` | 50 | 144 |
| `/confidentialite` | 47 | 155 |
| `/mentions-legales` | 56 | 175 ⚠️ |

> 8 meta-descriptions > 160 chars.

### 2.2 10 derniers titres dynamiques (articles)
- Garde d'animaux en Savoie : le guide complet par Guardiens
- Garde d'animaux en Haute-Savoie : le guide complet par Guardiens
- Vacances longues : faire garder son animal pendant 2 semaines ou plus
- Garde de chien et de chat à la Croix-Rousse : les spécificités du quartier
- Alternatives à la pension pour chien : 5 solutions pour partir sereinement en 2026
- Tarifs Guardiens 2026 : offert pour les propriétaires, 6,99 €/mois pour les gardiens
- S'absenter quand on a un animal : le guide des 8 situations et solutions en 2026
- Garde de chat à Lyon : faire garder son chat à domicile sans stress
- Garde de chat à la Presqu'île de Lyon : vivre chez vous pendant votre absence
- Hospitalisation : qui va s'occuper de votre chien ou votre chat ?

### 2.3 Décompte mots-clés (titles + meta)
Tableau (a) staticRoutes calculé manuellement via grep / (b) articles SQL / (c) seo_city_pages SQL :

| terme | static (a) | articles (b) | city_pages (c) |
|---|---|---|---|
| house-sitting | 0 | 29 | 0 |
| home sitting | 0 | 7 | 0 |
| home sitter | 0 | 5 | 0 |
| house sitter | 0 | 0 | 0 |
| garde chien | 0 | 0 | 0 |
| garde chat | 0 | 0 | 0 |
| garde animaux | 0 | 0 | 0 |
| garde maison | 0 | 0 | 17 |
| voisin | 0 | 0 | 0 |
| gardien | 5 | 45 | 17 |
| pet-sitter | 0 | 0 | 0 |
| Lyon | 0 | 23 | 2 |
| Annecy | 0 | 10 | 1 |
| Grenoble | 0 | 9 | 1 |
| Auvergne-Rhône-Alpes | 0 | 5 | 0 |
| **AURA** | 0 | **13** | 0 |

> ⚠️ Vocabulaire éparpillé : « house-sitting » présent 29× dans articles mais 0× sur les pages statiques + 0× sur city_pages. « AURA » apparaît 13× dans titres/meta articles malgré la règle mémoire qui le proscrit en UI visible (à confirmer si les meta SEO comptent).
> ⚠️ « garde chien/chat/animaux » (intent search principal) : **0 occurrences** partout en title/meta.

### 2.4 Pages dépassant les limites
Voir 2.1 — 8 meta > 160 chars. Aucun title > 60 chars dans staticRoutes.

### 2.5 Canonicals
INCONNU — demande externe nécessaire (vérification HTML rendu côté Prerender). Code source utilise `buildAbsoluteUrl(pathname)` via `src/lib/seo.ts` → canonical absolu cohérent attendu, mais non vérifié sur HTML servi.

---

## SECTION 3 — QUALITÉ DES PROFILS

### 3.1 Inscriptions / jour (30 derniers jours)
Pic clair début avril, chute fin avril.
```
04-05 ▇▇▇▇▇▇▇▇▇▇ 47
04-06 ▇▇▇▇▇▇ 31
04-07 ▇▇▇▇▇ 28
04-08 ▇▇▇▇▇▇▇▇ 40
04-09 ▇▇▇▇▇▇ 30
04-10 ▇▇▇▇▇ 28
04-11 ▇▇▇▇ 21
04-12 ▇▇▇▇▇▇▇▇▇ 46
04-13 ▇▇▇▇ 23
04-14 ▇ 7
04-15 ▏ 4
04-18 ▇▇▇ 17
04-19 ▇ 7
04-20 ▇▇ 10
04-21 ▇ 7
04-22 ▏ 5
04-23 ▏ 1
04-24 ▏ 5
04-25 ▏ 3
04-26 ▇▇▇ 18
04-27 ▏ 5
04-28 ▇▇ 10
04-29 ▇ 8
04-30 ▏ 1
05-01 ▏ 6
05-02 ▏ 2
05-03 ▇▇ 10
05-04 ▏ 2
```
Total ~411 inscrits sur 30 j.

### 3.2 Répartition role
- sitter only : **366**
- owner only : **40**
- both : **23**

### 3.3 Répartition complétion
| Tranche | n |
|---|---|
| 0–19 | 236 |
| 20–39 | 56 |
| 40–59 | 43 |
| 60–79 | 66 |
| 80–100 | 28 |

> 55 % des inscrits sont à <20 % complétion.

### 3.4 Triple intersection avatar+bio+CP : **89** profils

### 3.5 Compétences
- Avec `skill_categories` non vide : **70**
- `available_for_help=true` : **70**

### 3.6 Vérifications ID
| result | n |
|---|---|
| verified | 4 |
| `not_submitted` (col profile) | 425 |
| pending / refused | 0 logs |

Délai moyen de validation : INCONNU — la table `identity_verification_logs` ne stocke que la date du log final, pas une trace soumission→décision.

---

## SECTION 4 — ACTIVITÉ RÉELLE

### 4.1 Annonces (`sits`)
- Total : **2**
- Actives (end_date ≥ today) : 1
- Expirées : 1
- Avec ≥1 candidature : 2
- Statuts : `published`=1, `completed`=1

### 4.2 Candidatures (`applications`)
- Total : **4**
- accepted : 1, rejected : 1, discussing : 2
- Pending >7 j : 0

### 4.3 Gardes confirmées
Aucune `confirmed`/`in_progress`/`cancelled`. 1 `completed`. Ventilation `annule_par` : N/A (0).

### 4.4 Avis publiés
- Total : **2**
- Note moyenne : **5,00**
- Écussons (`badge_attributions`) : INCONNU — colonne mais comptage non lancé (ajout : `SELECT COUNT(*) FROM badge_attributions` à exécuter manuellement)

### 4.5 Petites missions
- Total : **2**
- completed : 2
- Avec match : INCONNU — pas de table `small_mission_applications` détectée

### 4.6 Messagerie
- Conversations totales : (cf. audit Admin Messages, 11 conv au 03/05)
- Actives 7 j : INCONNU précis ici — l'audit messagerie précédent contient les vraies métriques
- Taux de réponse moyen (heures) : INCONNU — non agrégé en SQL ici

---

## SECTION 5 — CONVERSION & FRICTION

### 5.1 Funnel inscription (events 30 j, table `analytics_events`)
| Event | n |
|---|---|
| page_view | 17 605 |
| cta_sitter_clicked | 89 |
| cta_proprio_clicked | 28 |
| signup_started | 720 |
| signup_role_selected | 309 |
| signup_form_submitted | 93 |
| signup_failed | 28 |
| signup_email_confirmed | 25 |
| signup_completed | 20 |
| onboarding_started | 102 |
| onboarding_step_completed | 157 |
| onboarding_completed | 43 |
| user_activated | 29 |
| first_action | 3 |

> Funnel observé : 720 starts → 309 role → 93 form submit → 25 email confirmed → 20 completed → 43 onboarding completed → 29 activated → **3 first_action**. Drop énorme entre `signup_form_submitted` (93) et `signup_email_confirmed` (25) = 73 % de perte sur la confirmation email.
> Note : 411 inscrits réels en DB sur 30 j vs 20 events `signup_completed` → **tracking incomplet** côté event final (cf. TODO-lovable.md « Webhook INSERT profiles »).

### 5.2 Pages d'erreur
TRACKING ABSENT — pas d'event `page_404` dans `analytics_events`. Liste 404 : INCONNU sans GA4/SC.

### 5.3 Performance pages clés
INCONNU — Lighthouse manuel requis. Aucune table `web_vitals` exposée ; `webVitals.ts` existe mais aucun event agrégé en analytics_events sur 30 j.

---

## SECTION 6 — INVENTAIRE CONTENU

### 6.1 Articles publiés indexables (64 — extrait 25 plus récents)
Tableau dispo via `SELECT slug, title, category, published_at, LENGTH(content), noindex FROM articles WHERE published=true ORDER BY published_at DESC` (résultat partiel exécuté). Tous indexables sauf 4 noindex (`bricolage-montage-meubles-entraide-grenoble-lyon`, `courses-aide-domicile-entraide-senior-lyon`, `reseau-entraide-quartier-lyon-aura`, et autres listés dans la fn edge sitemap).

### 6.2 Pages villes publiées (17)
annecy / beaujolais / bourg-saint-maurice / caluire-et-cuire / chambery / chamonix / clermont-ferrand / ecully / grenoble / lyon / megeve / monts-du-lyonnais / saint-didier-au-mont-d-or / saint-etienne / tassin-la-demi-lune / valence / villeurbanne — toutes `published=true` (= indexables).

### 6.3 Pages races publiées
**18 breed_profiles en base, mais 0 dans le sitemap statique** (servis uniquement via edge function `/sitemap`). Liste détaillée non extraite ici (à requêter `SELECT species, breed FROM breed_profiles`).

### 6.4 Couverture des requêtes cibles
| Requête | URL | Présent |
|---|---|---|
| comment faire garder mon chien | — | **non** |
| garde chien Lyon | `/actualites/garde-animaux-lyon-...` partiel | **partiel** (titre n'utilise pas l'expression) |
| garde chien Annecy | — | **non** (titre ne matche pas) |
| garde chien Grenoble | — | **non** |
| chien anxieux pension | — | **non** |
| garde animal urgence | `/actualites/devenir-gardien-urgence-guardiens` + `/gardien-urgence` | **partiel** (angle vendeur, pas requête user) |
| alternative pension canine | `/actualites/pension-chien-alternatives-guide` | **oui** |
| qui peut garder mon chien | — | **non** |
| house-sitting France | — | **non** (que des pages villes) |
| résidence secondaire vide vacances | — | **non** |

---

## SECTION 7 — TECHNIQUE SEO

### 7.1 Test Prerender 5 routes
TEST EXTERNE REQUIS — utiliser `curl -A "Mozilla/5.0 (compatible; Googlebot/2.1)" https://guardiens.fr/...` depuis l'extérieur (Prerender / Cloudflare Worker). Le sandbox Lovable n'a pas accès au domaine production avec UA Googlebot pour vérifier le rendu HTML servi.

### 7.2 Schema.org par type
| Page | Schema attendu | Présent dans le code |
|---|---|---|
| Homepage | Organization + WebSite | OUI (`src/components/seo/*` + `index.html`) |
| /tarifs | Service + Offer | OUI (cf. mémoire `pricing/detailed-article`) |
| /faq | FAQPage | OUI (page FAQ dédiée) |
| Articles | Article + BreadcrumbList | OUI (BreadcrumbList récemment corrigé pour le champ `item`) |
| Pages villes | LocalBusiness/Service | OUI (`CitySchemaOrg.tsx`) |
| Profils gardiens | Person | À VÉRIFIER (composant existe `PublicSitterProfile`, schema non vérifié ici) |

Validation runtime via `scripts/validate-jsonld.mjs` + test Vitest `jsonld-validation.test.ts` qui bloque le build si vocabulaire proscrit.

### 7.3 robots.txt actuel
```
User-agent: *
Allow: /
Disallow: /admin /dashboard /messages /mon-abonnement /notifications /sits
Disallow: /annonces/ /search /recherche-gardiens /review/ /house-guide/
Disallow: /profile /owner-profile /favoris /mes-avis /settings
Disallow: /forgot-password /reset-password /unsubscribe /test-accord /auth/
Disallow: /recherche /login
Crawl-delay: 1
Sitemap: https://guardiens.fr/sitemap.xml
```

### 7.4 Sitemap header + 5 dernières URLs
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://guardiens.fr/</loc><lastmod>2026-04-26</lastmod>...
...
  <url><loc>https://guardiens.fr/departement/savoie</loc><lastmod>2026-03-26</lastmod>...
  <url><loc>https://guardiens.fr/departement/drome</loc><lastmod>2026-03-26</lastmod>...
  <url><loc>https://guardiens.fr/departement/isere</loc><lastmod>2026-03-26</lastmod>...
  <url><loc>https://guardiens.fr/departement/loire</loc><lastmod>2026-03-26</lastmod>...
  <url><loc>https://guardiens.fr/departement/haute-savoie</loc><lastmod>2026-03-26</lastmod>...
```
> **Freshness suspecte** : la majorité des `lastmod` est figée au 26/03/2026 (script statique), pas re-généré récemment. Décalage avec articles récents (15/04).

---

## SECTION 8 — DETTE TECHNIQUE BLOQUANTE

| Item | Impact | Fichier / source |
|---|---|---|
| Sitemap statique non régénéré (lastmod 26/03) | GÊNANT — Google reçoit signal de freshness périmé | `scripts/generate-sitemap.mjs` non lancé en CI ? |
| `/races/*` absent du sitemap statique | GÊNANT — 18 pages races non découvrables via sitemap.xml | `public/sitemap.xml` |
| Tracking `signup_completed` incomplet (20 events vs 411 vrais) | BLOQUANT analytics — pas d'attribution réelle des canaux | `src/lib/analytics.ts` + TODO `Webhook INSERT profiles` |
| Bio vide sur 7 profils en zone cible (CP+photo, completion 50%) | GÊNANT — quick win pour gonfler sitemap éligible (74→81) | Campagne email |
| 425/429 profils sans vérification ID soumise | BLOQUANT confiance — score Trust planché | Onboarding ne pousse pas vers IDV |
| 4 articles `noindex=true` mentionnant « AURA » dans le slug | COSMÉTIQUE — déjà noindex | `articles` |
| 8 meta-descriptions statiques > 160 chars | COSMÉTIQUE SEO | `src/data/siteRoutes.ts` |
| 0 schema validé sur profils `/gardiens/:id` (à vérifier) | GÊNANT | `PublicSitterProfile.tsx` |
| Vocabulaire « garde chien / garde chat / garde animaux » 0× en title/meta | BLOQUANT SEO — requêtes principales non couvertes | Tous templates |
| TODO `prerender` dans `PublicSitDetail.tsx` (commentaire) | INCONNU impact prod | `src/pages/PublicSitDetail.tsx:4` |

---

## SECTION 9 — ANALYTICS / SEARCH CONSOLE

### 9.1 GA4 — events custom
26 event_types détectés en base (cf. 5.1). GA4 lui-même : INCONNU — pas d'accès direct à GA4 depuis Lovable. Seul `analytics_events` (interne) est consultable.
Manquants attendus : `page_404`, `web_vital_*`, `application_started/completed/abandoned`, UTM partage social.

### 9.2 Search Console
INCONNU — demande externe nécessaire. Aucune trace API GSC dans le code. Sitemap déclaré dans robots.txt → soumission manuelle nécessaire à confirmer côté Google.

### 9.3 Cookies / RGPD
- Bandeau présent : OUI (`src/components/layout/CookieConsent.tsx`)
- GA4 conditionnel au consentement : OUI (`loadGoogleAnalytics()` appelé uniquement après `granted`, `disableGoogleAnalytics()` sur refus)

---

## SECTION 10 — NON AUDITÉ

| Question | Pourquoi | Comment répondre |
|---|---|---|
| Search Console : impressions, CTR, top queries | Pas d'API GSC connectée | Connecter GSC + export CSV |
| GA4 funnel utilisateur réel | Pas d'accès GA4 | Accès propriété GA4 |
| Performance LCP/CLS/FID prod | Pas de stockage web vitals | Lighthouse manuel ou activer collecte `webVitals.ts` → `analytics_events` |
| Rendu Prerender Googlebot | Sandbox ne peut pas requêter prod avec UA Googlebot fiable | `curl -A Googlebot` externe + comparaison HTML |
| Liens cassés internes | Pas de crawler exécuté | Lancer Screaming Frog / Sitebulb |
| Délai moyen validation IDV | `identity_verification_logs` ne stocke pas la timeline soumission→décision | Ajouter colonnes `submitted_at`, `decided_at` |
| Schema.org rendu côté HTML servi | Code OK mais HTML non vérifié | curl + validateur Schema.org |
| Conversations / taux de réponse précis | Non requêté ici | RPC `admin_message_stats` (cf. session précédente) |
| Top 404 réels | Pas tracké | Logs Vercel ou GSC |
| CTR pages villes vs articles | INCONNU | GSC |

---

## TOP 10 CONSTATS

1. 74 — profils gardiens passent le filtre sitemap (sur 429 inscrits, soit 17 %)
2. 17 — pages villes publiées en base, vs 23 dans le sitemap statique (incohérence)
3. 0 — quick wins gardiens (50–59 % avec photo+CP+bio>50)
4. 425/429 — profils sans vérification d'identité soumise
5. 13 — articles avec « AURA » en titre/meta (mot proscrit en UI visible)
6. 0 — occurrences de « garde chien », « garde chat », « garde animaux » dans titles/meta de TOUS les templates (statique + articles + city_pages)
7. 411 inscrits DB sur 30 j vs 20 events `signup_completed` trackés (écart 95 %)
8. 73 % — taux de perte entre `signup_form_submitted` (93) et `signup_email_confirmed` (25)
9. 26/03/2026 — lastmod figé sur la majorité du sitemap statique (freshness périmée)
10. 18 — `breed_profiles` en base, 0 dans le sitemap statique `public/sitemap.xml`

---

**Path final :** `audit/AUDIT_2026_05_LANCEMENT.md`
