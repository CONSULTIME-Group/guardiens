# Audit — Copy home FR + flash header

Mode analyse. Aucune modification proposée, uniquement constats.

---

## 1. Copy de la home (FR)

**Fichier source unique** : `src/i18n/locales/fr/common.json`, namespace `landing.*`. Chargé via `src/i18n/index.ts` (`resources.fr.common`). Rendu depuis `src/pages/Landing.tsx` et les composants `src/components/landing/*.tsx`.

### 1.1 Bloc `landing.hero.*` (valeurs FR exactes)

| Clé | Valeur |
|---|---|
| `eyebrow` | `Entraide · Garde d'animaux · House-sitting` |
| `brand_tagline` | `Proches de chez vous.` |
| `title_main` | `La garde d'animaux, le coup de main,` |
| `title_accent` | `la rencontre.` |
| `lede` | `Guardiens met en relation propriétaires d'animaux et gardiens de confiance, partout en France. House-sitting à domicile, entraide entre gens du coin, aucune commission côté propriétaire, un gardien recommandé par la communauté près de chez vous.` |
| `lede_italic` | `Et derrière chaque échange, une rencontre que vous n'auriez pas cherchée.` |
| `cta_owner` | `Publier mon annonce` |
| `cta_sitter` | `Je veux garder` |
| `reassurance` | `Des gardiens du coin vous attendent près de chez vous.` |
| `kpi_houses` | `maisons gardées` |
| `kpi_animals` | `animaux accompagnés` |
| `kpi_members` | `inscrits` |
| `kpi_missions` | `missions d'entraide` |

### 1.2 Titres et sous-titres des sections, dans l'ordre du rendu

Ordre effectif dans `Landing.tsx` : `LiveListingsStrip` puis TOC, puis **UsagesSection → InternationalStrip → RencontreSection → HowItWorksSection → EntraideSection → InventoryStrip → ConfianceSection → ComparatifSection → AffinityScoreShowcase → TestimonialsSection → NotreHistoireSection → ProsShowcase → GuidesVillesSection → FaqSection → AlmaTipsTeaser → FinalCtaSection**.

| Section (composant) | H2 / titre | Sous-titre / lede |
|---|---|---|
| `UsagesSection` | `Garde d'animaux à domicile et entraide locale.` (eyebrow : `Ce qu'on fait ensemble`) | `Le house-sitting d'un côté, l'entraide entre gens du coin de l'autre. À vous de choisir, l'un, l'autre, ou les deux.` |
| `InternationalStrip` | `Français à l'étranger ? Faites veiller sur votre maison en France, et inversement.` | Actif : `Depuis le lancement, des gardes s'organisent entre la France et le reste du monde. {{count}} annonces internationales en cours.` — Sinon : `Les premiers gardiens s'organisent. Bientôt disponible dans plusieurs pays.` |
| `RencontreSection` | `Le vrai prétexte, / c'est la rencontre.` (eyebrow : `Ce qu'on n'écrit jamais dans une annonce`) | (pas de lede, trois paragraphes `meeting.p1/p2/p3`) |
| `HowItWorksSection` | `Comment ça marche ?` (eyebrow : `Simple et transparent`) | Footnote : `Inscription en 2 minutes · Sans carte bancaire` |
| `EntraideSection` | `Osez demander. Osez proposer.` (eyebrow : `Pour tous · Sans abonnement · Sans argent`) | `p1`/`p2` du bloc `aid.*` |
| `InventoryStrip` | `Ce qu'on a construit pour vous` | `Un inventaire vivant, remis à jour à chaque visite.` |
| `ConfianceSection` | `Choisir en confiance, à un kilomètre comme à mille.` (eyebrow : `Confiance & périmètre`) | `Quatre repères pour partir tranquille : gratuit côté propriétaires, rencontre avant chaque garde, profils vérifiés, et un périmètre que vous fixez vous-même.` |
| `ComparatifSection` | `House-sitting, pension, pet-sitter : que choisir ?` | `Quatre solutions pour faire garder vos animaux pendant votre absence. Comparaison factuelle, sans jugement.` |
| `AffinityScoreShowcase` | `Le match qui compte, 7 critères, pas juste la proximité` | `Un score calculé automatiquement entre chaque propriétaire et chaque gardien, pondéré, transparent, visible.` |
| `TestimonialsSection` | `Ils ont osé. Voici ce qu'il leur reste.` | `Témoignages recueillis auprès de nos premiers membres.` |
| `NotreHistoireSection` | `Tout a commencé avec un visa.` (eyebrow : `Notre histoire`) | `story.p1` : `L'habitude de s'ouvrir aux gens du coin s'est perdue. Par manque de prétexte.` |
| `ProsShowcase` | `Vétérinaires, toiletteurs, éducateurs, vérifiés Guardiens` | `Un annuaire local de professionnels animaliers. Vérification SIRET manuelle par notre équipe pour ceux qui affichent le badge.` |
| `GuidesVillesSection` | `House-sitting près de chez vous.` (eyebrow : `Guides & villes`) | `Des guides concrets pour préparer votre garde, et des hubs locaux pour les villes les plus actives, Lyon, Annecy, Grenoble, et partout en France.` |
| `FaqSection` | `Questions fréquentes` | (8 Q/R) |
| `FinalCtaSection` | `Votre prochaine histoire commence ici.` | `Vous partirez l'esprit léger. Vous rentrerez avec autre chose, un coin découvert, une rencontre, quelqu'un que vous n'auriez jamais croisé.` Footnote : `Inscription en 2 minutes, sans carte bancaire.` |

### 1.3 (a) Mentions commission / prix / tarif / abonnement / gratuité

- `landing.hero.lede` : `aucune commission côté propriétaire`.
- `landing.usages.owner.badge` : `Sans abonnement`.
- `landing.usages.mutual.badge` : `Gratuit`.
- `landing.aid.eyebrow` : `Pour tous · Sans abonnement · Sans argent` ; `aid.need_footer` : `Sans argent, sans abonnement. C'est le pari.`
- `landing.how.footnote` : `Inscription en 2 minutes · Sans carte bancaire`.
- `landing.trust.lede` : `gratuit côté propriétaires` ; `trust.p1_title` : `Gratuit pour les propriétaires` ; `trust.p1_text` : `tout est gratuit. Pas de carte bancaire demandée.`
- `landing.compare.rows.guardiens.cost` : `Aucun frais entre membres` ; `pension.cost` : `Payant, tarif journalier` ; `petsitter.cost` : `Payant, à la visite` ; `relative.cost` : `Sans frais en général`.
- `landing.faq.a2` : `sans abonnement pour les propriétaires. Aucune carte bancaire demandée. Guardiens reste gratuit tant que…`
- `landing.faq.a7` : `sans abonnement, pour les propriétaires comme pour les gardiens…` (contradiction avec la doctrine tarifaire : Sitter = 6,99 €/mois hors période fondateurs).
- `landing.final.footnote` : `Inscription en 2 minutes, sans carte bancaire.`

### 1.3 (b) Écarts avec les taglines de la charte

| Attendu charte | Rendu actuel | Écart |
|---|---|---|
| H1 hero L1 « Proches de chez vous. » | `brand_tagline` = `Proches de chez vous.` **mais en L2**, pas en H1. Le H1 est `title_main + title_accent` = `La garde d'animaux, le coup de main, la rencontre.` | Ordre inversé : la tagline est reléguée en surtitre italique, l'H1 SEO est un autre message. |
| H1 hero L2 « Partir. Revenir. Recommencer. » | Absente du bundle FR (grep sans résultat sur `Partir. Revenir`). | **Manquante**. |
| H1 hero L3 « Garder une maison. Échanger un service. Se faire confiance. » | Absente du bundle FR. | **Manquante**. |
| Titre piliers « Un réseau de gens du coin qui se font confiance. » | Aucun H2 ne porte ce libellé (grep sans résultat). Section piliers = `ConfianceSection` avec titre `Choisir en confiance, à un kilomètre comme à mille.` | **Écart de titre**. |
| Titre témoignages « Ils ont sauté le pas. » | `landing.testimonials.title` = `Ils ont osé. Voici ce qu'il leur reste.` | **Formulation différente** (même intention, autre verbe). |
| Titre CTA final « Ton histoire commence ici. » | `landing.final.title` = `Votre prochaine histoire commence ici.` | **Vouvoiement** (conforme mémoire), mais ajout de « prochaine ». La charte demandée est en tutoiement, incompatible avec la règle projet (vouvoiement obligatoire). Arbitrage produit à trancher. |

### 1.3 (c) Mots proscrits et scan éditorial

- **« voisin / voisinage »** : **aucune occurrence** dans le namespace `landing.*` (grep clean). Conforme.
- **« à vie »** : aucune occurrence.
- **« gratuitement »** : aucune occurrence (mais « gratuit », « sans abonnement », « sans argent », « aucune commission », « aucun frais » utilisés à répétition, cf. §1.3 a). Rappel mémoire SEO-editorial : préférer « gratuit » à « 0 € », conforme ; mais la densité est forte (7 mentions gratuité sur la home).
- **Concurrent nommé** : aucune occurrence.
- **Tiret cadratin `—` (U+2014)** : **aucune occurrence** dans `landing.*` du FR (grep `\u2014` clean). Conforme.
- **Autres signaux** :
  - `landing.compare.title` contient un `:` bien encodé, pas de tiret cadratin.
  - `landing.aid.quote` : `La vie de village n'a pas disparu. Elle attendait simplement qu'on ose la première question.` — utilise guillemets droits, à harmoniser en français `«  »` (mémoire éditoriale). Idem `landing.aid.need_title` et `offer_title` qui utilisent `«  »` FR corrects.
  - Contradiction pricing : `faq.a7` affirme la gratuité **côté gardiens aussi**, alors que la doctrine tarifaire officielle est 6,99 €/mois gardien (gratuit uniquement jusqu'au 14/07/2026). Point à arbitrer.
  - `landing.final.title` : « Votre **prochaine** histoire » suppose que l'utilisateur a déjà une histoire avec Guardiens — cohérent pour un visiteur retour, discutable pour un premier contact.

---

## 2. Flash header Connexion → Mon espace

### 2.1 Diagnostic — confirmé

Ordre réel des événements dans `src/contexts/AuthContext.tsx` (l.145-193) :

1. **Montage** : `useEffect` s'exécute.
2. Deux appels **quasi simultanés** :
   - `supabase.auth.onAuthStateChange(...)` (l.154) qui s'abonne.
   - `supabase.auth.getSession().then(...)` (l.183) qui résout la session persistée.
3. Dans **les deux branches**, le code fait `setHasSession(!!session?.user); setAuthChecked(true);` **inconditionnellement**.

Comportement de `supabase-js v2` : dès la souscription, la lib émet un événement `INITIAL_SESSION` **synchrone** (ou quasi) avec la session lue en storage. Si le refresh token est expiré côté client, `INITIAL_SESSION` arrive avec `session = null` **avant** que `getSession()` (qui déclenche le refresh réseau) ne résolve. Le handler pose alors `hasSession = false; authChecked = true`.

Dans `PublicHeader.tsx` (l.60-75), la condition est :
```
!authChecked ? <skeleton/> : hasSession ? "Mon espace" : "Connexion + Inscription"
```
Dès que `authChecked = true` avec `hasSession = false`, le header **flashe « Connexion / Inscription »**. Puis `getSession()` résout, éventuel refresh, `onAuthStateChange` réémet `TOKEN_REFRESHED` (ou `SIGNED_IN`) avec une session valide, `hasSession` repasse à `true`, et le header bascule sur « Mon espace ».

**Le diagnostic est confirmé**, avec une précision : ce n'est pas `getSession` vs `onAuthStateChange` qui posent le problème indépendamment, c'est que `authChecked` est basculé à `true` sur **le tout premier signal**, y compris `INITIAL_SESSION` à `null`, avant que le refresh n'ait eu lieu. Sur un poste avec réseau lent ou token expiré, le flash est visible ~200 à 800 ms.

Cas où le flash se produit certainement :
- Token présent en localStorage mais `expires_at < now` → refresh nécessaire → `INITIAL_SESSION` = null.
- Cold start PWA / retour après longue inactivité.
- Réseau lent au premier `POST /auth/v1/token?grant_type=refresh_token`.

Cas où il ne se produit pas :
- Session fraîche non expirée → `INITIAL_SESSION` porte déjà la session.
- Aucune session en storage → `authChecked=true` + `hasSession=false` est **la vraie réponse**, pas un flash.

### 2.2 Correction recommandée (non implémentée)

Approche **combinée**, aucune n'est suffisante seule :

**A. Détection préalable du token persistant** (pré-hydratation optimiste)
Avant même que Supabase ne réponde, lire synchroniquement `localStorage` à la recherche d'une clé `sb-<projectRef>-auth-token` (ou utiliser le storage key du client). Si elle existe et contient un `access_token` ou `refresh_token`, poser un état local `hasStoredSession = true` et **maintenir le skeleton** tant que l'authentification n'a pas été explicitement résolue (succès **ou** échec du refresh). Cela couvre le cas où l'utilisateur est effectivement connecté mais que le token doit être rafraîchi.

**B. Ne pas basculer `authChecked` sur `INITIAL_SESSION = null` si un token est en storage**
Dans le handler `onAuthStateChange`, distinguer `event === "INITIAL_SESSION"` avec `session === null` **et** présence d'un token persistant → **ne pas** poser `authChecked = true`, attendre `SIGNED_IN` / `TOKEN_REFRESHED` / la résolution finale de `getSession()`.

**C. Timeout de sécurité**
Si aucune résolution après ~1,5 s, forcer `authChecked = true` avec l'état courant pour ne pas geler le header indéfiniment (cas où le refresh échoue durablement, réseau coupé).

**D. Côté `PublicHeader`** : rien à changer, la logique `!authChecked ? skeleton : …` est correcte dès lors que `authChecked` reflète bien « la vérité finale connue ».

Recommandation : **A + B + C**. A donne l'effet visuel immédiat (skeleton maintenu), B corrige la cause racine, C évite le blocage pathologique. Ne pas se contenter de A seule (le skeleton pourrait s'afficher pour des visiteurs anonymes qui ont un vieux token invalide — B tranche ce cas).

---

## Synthèse actionnable (pour arbitrage produit, pas d'implémentation)

1. **Copy home** : décider si la charte de taglines (H1 3 lignes, titre piliers, titre témoignages, titre CTA final) remplace les libellés actuels — impact SEO H1 non trivial. Corriger `faq.a7` (contradiction gratuité gardien). Harmoniser guillemets FR dans `aid.quote`.
2. **Flash header** : correctif A+B+C dans `AuthContext.tsx`, `PublicHeader.tsx` inchangé.
