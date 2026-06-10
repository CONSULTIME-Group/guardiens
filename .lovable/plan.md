## Objectif

Site disponible en **FR** (défaut), **EN**, **ES**, **IT**, **DE**, avec SEO multilingue complet (URLs `/en/`, `/es/`, `/it/`, `/de/`, `hreflang`, sitemaps par langue).

Traductions générées par **Lovable AI** (Gemini 3 Flash) au build, relues a posteriori. Aucun coût récurrent pour le visiteur.

## Phase 1 — Infrastructure i18n (1 livraison, base solide)

**Code**
- Installer `react-i18next` + `i18next` + `i18next-browser-languagedetector`.
- Routeur : préfixe optionnel `/:lang(en|es|it|de)?/...`. FR reste sans préfixe (canonique). Les URLs existantes ne bougent pas.
- Sélecteur de langue dans `PublicHeader` + `AppLayout` (mobile inclus), drapeau + nom de langue, persistant en cookie `lang`.
- Détection auto à la 1re visite (header `Accept-Language`), redirige uniquement les visiteurs anonymes vers `/en/`, `/es/`, etc.
- `<html lang>` dynamique + `hreflang` alternates dans `PageMeta` pour chaque page.
- Mise à jour du `sitemap.xml` : 1 sitemap-index, 1 sitemap par langue.

**Tests bloquants**
- Test Vitest : toute clé i18n utilisée dans un composant doit exister dans `fr.json` (sinon build cassé).
- Test : présence des `hreflang` sur les pages clés.

**Livrable** : switch FR/EN visible, EN encore vide (clés FR par défaut). Aucun contenu cassé.

## Phase 2 — Traduction UI (libellés, boutons, menus)

- Extraction de tous les libellés en dur dans les composants vers `src/locales/fr/common.json` (~500-800 clés estimées).
- Génération automatique de `en.json`, `es.json`, `it.json`, `de.json` via Lovable AI (script Node + prompt strict vouvoiement EN/ES/IT/DE équivalent, glossaire de termes : « gardien », « coup de main », « propriétaire »…).
- Refactor progressif des composants : remplacement des chaînes par `t("key")`. Priorité : header, footer, sidebar, formulaires, toasts, navigation.

**Livrable** : navigation et chrome 100 % traduits dans les 5 langues.

## Phase 3 — Pages marketing (Landing, Tarifs, FAQ, Pros, Guides)

- Découpage des pages marketing en blocs de copy versionnés par langue.
- Traduction Lovable AI + relecture humaine recommandée pour Landing + Tarifs (impact conversion).
- SEO par langue : `title`, `description`, `og:*`, JSON-LD localisés.
- Pages spécifiques par langue dans `siteRoutes.ts` pour le sitemap.

**Livrable** : `/`, `/tarifs`, `/faq`, `/pros` accessibles en 5 langues, indexables.

## Phase 4 — Articles & guides SEO (le gros morceau)

**Architecture DB**
- Table `article_translations` (`article_id`, `lang`, `title`, `slug`, `excerpt`, `body`, `meta_title`, `meta_description`, `status`).
- Migration : copier les 100+ articles existants en `lang = 'fr'`.
- RLS + grants standards.

**Génération**
- Script batch `scripts/translate-articles.mjs` : pour chaque article × langue, appel Lovable AI Gemini 3 Flash avec prompt SEO strict (préserve structure markdown, traduit titres H2/H3, génère slugs propres, garde les liens internes français vers leurs équivalents traduits).
- Coût estimé : ~400 articles × ~2 000 tokens out ≈ raisonnable mais non négligeable.
- Statut par défaut `pending_review` : aucune publication automatique, vous validez par lot dans `AdminArticles`.

**Routes**
- `/en/journal/:slug`, `/es/journal/:slug`, etc.
- Redirections 301 entre langues équivalentes (via `hreflang`).
- Mise à jour de `sitemap.xml` (1 entrée par article × langue publiée).

**Admin**
- Onglet « Traductions » dans `AdminArticles` : voir l'état par langue, relancer une traduction, publier/dépublier par langue.

**Livrable** : articles indexables Google EN/ES/IT/DE, traductions modifiables côté admin.

## Hors périmètre (à valider plus tard)

- **Contenus utilisateurs** (annonces, profils, messages) : restent en langue d'origine. Option « traduire » à la demande possible en Phase 5.
- **Emails transactionnels** multilingues : Phase 5 séparée (~50 templates).
- **Validation de vocabulaire** (no-aura, no-em-dash, no-voisin) : adapter les tests Vitest pour ignorer les locales non-FR.

## Estimation & risques

| Phase | Effort | Risque |
|---|---|---|
| 1 — Infra | Moyen | Faible si pas de refacto routes |
| 2 — UI | Lourd | Régressions visuelles si clés mal extraites |
| 3 — Marketing | Moyen | Qualité conversion EN/ES à surveiller |
| 4 — Articles | Très lourd | Coût IA + qualité SEO à auditer après publication |

**Recommandation forte** : ne pas tout faire d'un coup. Valider Phase 1 en preview, vous testez le switch, puis on enchaîne.

## Démarrage

Si vous validez ce plan, je commence **uniquement par la Phase 1** (infra + switch UI vide en EN), pour que vous puissiez tester avant d'engager le reste.