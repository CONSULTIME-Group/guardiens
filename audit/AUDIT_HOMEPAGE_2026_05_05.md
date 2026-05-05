# Audit 360° Homepage — 2026-05-05

> Lecture seule. Aucune modification appliquée. Audit critique avant chantier S7.

---

## Résumé exécutif

La homepage est globalement **propre, conforme à la doctrine éditoriale, et SEO-saine**, mais elle souffre de **deux maux structurels** apparus après les 5 vagues de retouches : (1) **redondance** entre la carte « Local par envie, national par liberté » (section *Pourquoi publier*) et la **section entière** « Local par envie, national par liberté » qui la suit — c'est exactement le même H2 répété ; (2) **dispersion CTA propriétaire** (5 boutons « Publier mon annonce / Je cherche un gardien » sur la page, hors footer). Côté SEO, le `<title>` met « home sitting » en tête mais le **H1 ne contient aucun mot-clé recherche** (« Quelqu'un du coin veille sur votre maison »), créant un *title↔H1 mismatch*. Côté éditorial, deux formules à risque doctrinal subsistent (« Sans limite de temps », « Pas d'abonnement. Jamais. »). Le `noscript` d'`index.html` n'a pas suivi la migration entraide. Aucun bloquant pour S7.

---

## Section 1 — Cohérence textuelle

### 🔴 CRITIQUE — Redondance H2 quasi-littérale

- **Ligne 488** (carte 04, section *Pourquoi publier*) : `<h3> Local par envie, national par liberté </h3>` + corps « Notre cœur, c'est la proximité… élargissez le rayon… créez du lien partout en France. »
- **Lignes 505-512** (section dédiée immédiatement après) : `<h2> Local par envie, national par liberté </h2>` + sous-titre « Notre promesse, c'est la confiance retrouvée avec les gens du coin. Mais rien ne vous y oblige : Guardiens couvre toute la France… »

→ **Même titre, mêmes mots-clés, même promesse, à 30 lignes d'écart.** Le visiteur a l'impression d'un bug.

**Action** : supprimer la carte 04 « Local par envie » du grid *Pourquoi publier* (la garder à 3 cartes : gratuit / rencontre / vérifiés) **OU** garder la carte 04 et reformuler le H2 de la section dédiée en « Le périmètre, c'est vous » (en réutilisant le kicker existant) avec un angle plus *outil* (« 5 / 30 km / France ») que *promesse*.

### ⚠️ MINEUR — Promesse géographique répétée 5 fois

Sur 1384 lignes, le message « local mais accessible partout en France » revient :
1. Hero subtitle (l.369) : « partout en France »
2. Hero teaser (l.374) : « Du coin… ou d'ailleurs : les annonces sont accessibles partout en France »
3. Carte 04 (l.488-491)
4. Section *Local par envie* (l.498-579)
5. Section *Villes* — carte 4 « Partout en France » (l.1283-1295)

→ Pédagogie volontaire (mémoire `intentional-ux-tradeoffs`), mais **le hero teaser l.374** fait doublon direct avec le sous-titre l.369 qui dit déjà « partout en France ». **Action** : supprimer la phrase italique l.374-376, garder juste le sous-titre l.369.

### ⚠️ MINEUR — Sous-titre hero un peu chargé

L.369 : « Home sitting, garde d'animaux et petites missions d'entraide. La vie de quartier qui revient, partout en France. » → 3 services + 1 promesse + 1 portée géo en 22 mots. Lisible mais dense pour un H2 hero.
**Suggestion** : « Home sitting, garde d'animaux, petites missions d'entraide. La vie de quartier qui revient. » (la portée géo est portée par le badge + la 4e carte villes).

### ✅ OK — Ordre narratif

Hero → Pourquoi → Périmètre → Saisonnier → 3 façons → Comment ça marche → Démo → Outils confiance → Entraide → Témoignages → Guides → Histoire → Villes → Fondateur → CTA final. **Arc cohérent** (promesse → preuves → outils → différenciateur → réassurance → conversion).

---

## Section 2 — SEO technique  ·  Score 8 / 10

| Check | Statut | Détail |
|---|---|---|
| Title < 60 chars + keyword | ✅ | 56 chars, « Home sitting » en tête |
| Meta description < 160 | ✅ | 153 chars, accroche entraide + portée |
| Un seul H1 | ✅ | l.365 uniquement |
| Hiérarchie H1→H2→H3 | ✅ | Aucun saut de niveau |
| **Title ↔ H1 alignement** | 🔴 | Title = « Home sitting & petites missions d'entraide », H1 = « Quelqu'un du coin veille sur votre maison » → **0 mot-clé commun**. Google peut réécrire le SERP title. |
| Schemas JSON-LD valides | ✅ | 4 schemas, test `jsonld-validation` vert |
| Canonical présent | ✅ | Via `PageMeta` |
| OG/Twitter cohérents | ✅ | Synchronisés Helmet + index.html (M5) |
| Maillage interne | ✅ | `/petites-missions` × 4, `/gardien-urgence` × 1, `/actualites`, `/guides`, 3 villes hub, 3 articles propriétaire, 3 articles gardien |
| **noscript `index.html`** | ⚠️ | l.46-47 : « Un gardien près de chez vous s'occupe de votre maison et de vos animaux pendant vos absences. gratuit pour les propriétaires. » → ne mentionne **plus** l'entraide, ne reflète plus la nouvelle promesse. Faible impact (bots modernes exécutent JS) mais incohérent. |

**Détail title↔H1** : c'est le seul vrai trou SEO. Deux options :
- **Option A** (favorisée) : reformuler H1 → « Quelqu'un du coin veille sur votre maison » reste, mais ajouter un **eyebrow/kicker** au-dessus du H1 du type `<p class="text-xs uppercase">Home sitting & entraide locale</p>` qui injecte le mot-clé **avant** le H1 sans casser l'émotion.
- **Option B** : changer le H1 en « Home sitting de proximité : quelqu'un du coin veille sur votre maison » (perd en punch, gagne en SEO).

---

## Section 3 — Éditorial & rédactionnel

### 🔴 CRITIQUE — 2 formulations doctrinalement à risque

| Ligne | Texte | Problème | Suggestion |
|---|---|---|---|
| 466 | « tout est gratuit pour les propriétaires. **Sans limite de temps.** » | Équivalent sémantique de « à vie / pour toujours », tous deux proscrits par la doctrine. | « tout est gratuit pour les propriétaires. **Sans abonnement requis.** » |
| 854 | « Pas d'argent. Pas d'abonnement. **Jamais.** » | « Jamais » = engagement temporel illimité (même registre que « pour toujours »). | « Pas d'argent. Pas d'abonnement. **C'est le principe.** » |

### ⚠️ MINEUR — JSON-LD FAQ ligne 329

« un gardien habite **gratuitement** dans votre maison » → le mot proscrit `gratuitement` apparaît dans le contexte « sans payer de loyer » (sens littéral, pas tarification). Sémantiquement défendable, mais la doctrine de validation JSON-LD bloque ce mot. À vérifier que le test `validate-jsonld.mjs` ne le sanctionne pas (il n'a pas été listé dans la garde-fou car « voisin/AURA » uniquement).

**Suggestion** : « un gardien loge **sans frais** dans votre maison ».

### ✅ Voix « On » respectée

`On a été invités dans des vies` (l.1184), `c'est pour ça qu'on a construit Guardiens` (l.1201). Pas de « nous » marketing.
**Faux positif** : « nous envoient des photos » (l.76, témoignage utilisateur — OK).

### ✅ Vouvoiement absolu

100% vouvoiement vérifié. Aucun « tu » ou impératif tutoyé.

### ✅ Aucun « voisin/voisinage »

0 occurrence.

### Phrases qui sonnent particulièrement juste

- L.366 : *« Quelqu'un du coin veille sur votre maison. »* — H1 parfait, image concrète.
- L.911 : *« La vie de village n'a pas disparu. Elle attendait juste qu'on ose la première question. »* — pépite éditoriale, à mettre en avant.
- L.1184 : *« On n'a jamais gardé des maisons. On a été invités dans des vies. »* — citation fondatrice, garde toute sa force.
- L.835-839 (intro entraide) : storytelling concret (« arroser le jardin… grand-mère d'à côté… bricoleur du quartier ») — exemplaire.

### Phrases fades ou clichés

| Ligne | Texte | Problème |
|---|---|---|
| 458 | « Des gardiens près de chez vous, vérifiés, pour partir l'esprit tranquille. » | Trop générique, ressemble à toute plateforme gardes d'animaux. |
| 612-613 | Kicker « Ce qu'on fait ensemble » + H2 « Trois façons de vivre quelque chose. » | « Vivre quelque chose » = vide. Suggestion : *« Trois façons de s'engager. »* ou *« Trois façons d'utiliser Guardiens. »* |
| 745 | « Pas besoin de chance, juste de bons outils » | Cliché coaching/marketing, jure avec le ton chaleureux du reste. |
| 1326-1330 | « Votre histoire commence ici. » + « Garder une maison. Donner un coup de main. Recevoir de l'aide. Ce sont des gestes simples — mais ils changent tout. » | CTA final consensuel. La page mérite mieux : la phrase l.911 ferait un meilleur close. |

---

## Section 4 — Design & UX

### ✅ 4e carte « Partout en France »

`grid-cols-1 md:grid-cols-2 lg:grid-cols-4` — layout robuste, 4e carte stylistiquement identique aux 3 villes (même pattern bg-card + border + group hover). **Pas de casse mobile.**

### ⚠️ Hero un peu surchargé

Inventaire vertical : badge Gratuit → H1 → sous-titre H2 → paragraphe → italique « Du coin ou d'ailleurs » → 2 CTAs principaux → 2 liens secondaires (entraide + urgence) → ligne badge Fondateur → 4 KPIs.
→ **9 blocs textuels** dans le hero. Recommandation : supprimer l'italique l.374 (cf. §1) ramène à 8, c'est mieux.

### ⚠️ Densité de la section *Outils de confiance* (l.738-821)

3 colonnes × 2 bullets = 6 items + intro + CTA. C'est dense mais lisible grâce au pattern « Connaître / Sécuriser / Communiquer ». OK.

### ✅ Rythme visuel

`bg-background` → `bg-background` → `bg-primary/5` → `bg-background` → `bg-muted/30` → `bg-background` → `bg-accent` → `bg-background` → `bg-muted/30` → `bg-background` → `bg-muted/30` → `bg-primary` → `bg-foreground`. Alternance efficace, climax fondateur (vert plein) puis CTA final (sombre).

### ⚠️ Bandeau saisonnier (l.582-601) un peu orphelin

Coincé entre la section périmètre et la section « Trois façons ». Dynamique (`seasonal.title`), mais courte et CTA proprio identique à 4 autres CTAs proprio de la page. **Question** : utile ? Sinon, supprimer pour respirer.

---

## Section 5 — Positionnement & message

### Visibilité des 3 modes d'usage

| Mode | Visibilité home | Statut |
|---|---|---|
| Garde / home sitting | Hero + sections 1, 2, 3, 5, 9 | ✅ Très visible (peut-être trop) |
| Petites missions d'entraide | Hero teaser + section 6 entière + CTA final | ✅ Bien équilibré |
| Gardien d'urgence | 1 lien hero (l.407-412) | 🔴 **Sous-représenté.** Aucune section dédiée, aucune mention dans 1300 lignes. Si S7 enrichit `/gardien-urgence`, il faut **a minima** un encart home (1 carte ou bandeau) qui pointe dessus. |

### Différenciateur unique

✅ Très clair via la section 6 (« Avant, il y avait quelqu'un du coin qui passait arroser le jardin… ») et la section histoire. **C'est la signature de la page.**

### Visiteur non-propriétaire

- **Gardien voyageur** : 1 carte (section 3 wedge), 1 CTA hero secondaire, 1 CTA final, 1 section guides « Pour les gardiens ». ✅ Présent mais nettement secondaire (intentionnel).
- **Candidat entraide** : section 6 dédiée, CTA hero, CTA final. ✅ OK.
- **Visiteur urgence** : ❌ 1 lien minuscule. À renforcer post-S7.

### Pricing 6,99 €/mois sitter

❌ **Non mentionné** sur la home. Mentionné uniquement dans Schema Service (invisible utilisateur) et noscript (l.55). 
**Question stratégique** : faut-il l'afficher ? Pré-lancement, le silence est défendable (ne pas effrayer). Post-13 mai, à reconsidérer (transparence). **Pas une priorité immédiate.**

---

## Section 6 — Conversion

### Inventaire CTAs (hors footer & nav)

| # | Ligne | Label | Cible | Type |
|---|---|---|---|---|
| 1 | 387 | **Publier mon annonce** | `/inscription?role=owner` | Hero primary |
| 2 | 396 | Je veux garder | `/inscription?role=sitter` | Hero secondary |
| 3 | 405 | Découvrir l'entraide de quartier | `/petites-missions` | Hero link |
| 4 | 411 | Gardien d'urgence | `/gardien-urgence` | Hero link |
| 5 | 595 | **Publier mon annonce** | `/inscription?role=owner` | Banner |
| 6 | 629 | Je cherche un gardien → | `/inscription?role=owner` | Card |
| 7 | 642 | Je veux garder → | `/inscription?role=sitter` | Card |
| 8 | 658 | Découvrir l'entraide → | `/petites-missions` | Card |
| 9 | 722 | **Je cherche un gardien** | `/inscription?role=owner` | Section CTA |
| 10 | 814 | Créer mon compte | `/inscription?role=owner` | Section CTA |
| 11 | 919 | Découvrir les petites missions | `/petites-missions` | Section CTA |
| 12 | 925 | Créer mon compte | `/inscription` | Section CTA |
| 13 | 1138 | Tous les articles & conseils | `/actualites` | Soft |
| 14 | 1148 | Guides locaux par ville | `/guides` | Soft |
| 15 | 1317 | Rejoindre le mouvement | `/inscription` | Fondateur |
| 16 | 1337 | Je cherche un gardien | `/inscription?role=owner` | Final |
| 17 | 1343 | Je veux garder | `/inscription?role=sitter` | Final |
| 18 | 1353 | Découvrir l'entraide de quartier | `/petites-missions` | Final |

→ **18 CTAs sur la page**, dont **6 strictement « inscription propriétaire »** (#1, #5, #6, #9, #10, #16) avec 4 libellés différents (« Publier mon annonce », « Je cherche un gardien », « Créer mon compte », « Rejoindre le mouvement »).

### ⚠️ MINEUR — Manque de cohérence libellé propriétaire

**Action** : harmoniser à **2 libellés max** :
- Action concrète : **« Publier mon annonce »** (hero, banner, section *Comment ça marche*, CTA final)
- Action engagement : **« Créer mon compte »** (section *Outils*, fondateur)

→ Évite la sensation de 4 boutons disant la même chose en 4 mots différents.

### ✅ Pression descendante

L'argumentaire descend bien : Hero (promesse) → Pourquoi (bénéfices) → 3 façons (positionnement) → Comment (opérationnel) → Démo (preuve) → Outils (réassurance) → Entraide (différenciateur) → Témoignages (social proof) → Histoire (émotion) → Fondateur (urgence) → CTA final. Funnel propre.

### ⚠️ MINEUR — CTA hero principal vs secondaire

Le primary `Publier mon annonce` a `bg-primary` + ring + shadow-xl. Le secondary `Je veux garder` est outline transparent. Hiérarchie **claire**, mais le primary est volontairement très lourd visuellement → bien pour combler le manque d'annonces (priorité business validée).

---

## Section 7 — Détails techniques

| Check | Statut | Détail |
|---|---|---|
| Preload hero image | ✅ | `index.html` l.34 + `fetchpriority=high` |
| Preload fonts | ✅ | Outfit + Playfair, woff2, crossorigin |
| Preload France illustration | ✅ | `requestIdleCallback` + `fetchpriority=low` (l.232-247) |
| Code splitting | ✅ | `DemoListingShowcase` lazy via `Section 4` |
| Alt textes images | ✅ | Hero + France + Histoire panorama, tous descriptifs |
| ARIA labels | ✅ | `aria-labelledby="scope-heading"`, `aria-label` témoignages, `aria-hidden` décoratifs |
| Skip link | ❓ | Non visible dans Landing.tsx — sans doute dans `PublicHeader`. À vérifier. |
| `prefers-reduced-motion` | ✅ | Block `@media` l.1376-1378 + `motion-reduce:transition-none` sur RevealOnScroll |
| Mobile 4e carte villes | ✅ | `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`, pas de casse |
| `prerenderReady` signal | ✅ | Émis par `PageMeta` |

---

## Conclusion — Top 5 actions prioritaires

| # | Action | Impact | Effort |
|---|---|---|---|
| **1** | **Supprimer la redondance « Local par envie / national par liberté »** : retirer la carte 04 du grid *Pourquoi publier* (l.486-492) → ramener à 3 cartes équilibrées. | 🔴 Cohérence visiteur immédiate | 5 min |
| **2** | **Remplacer 2 formulations à risque doctrinal** : l.466 « Sans limite de temps » → « Sans abonnement requis » ; l.854 « Pas d'abonnement. Jamais. » → « Pas d'abonnement. C'est le principe. » | 🔴 Conformité doctrine éditoriale | 3 min |
| **3** | **Aligner title et H1** via un kicker SEO au-dessus du H1 hero : `<p>Home sitting & entraide locale</p>` au-dessus de « Quelqu'un du coin veille sur votre maison. » | 🟠 SEO + cohérence SERP | 5 min |
| **4** | **Harmoniser libellés CTA propriétaire** à 2 maximum (« Publier mon annonce » / « Créer mon compte »). 6 boutons, 4 libellés actuellement. | 🟠 Conversion + clarté | 10 min |
| **5** | **Synchroniser `<noscript>` d'`index.html`** avec la nouvelle promesse entraide (l.46-47 obsolètes). | 🟡 Hygiène SEO/social fallback | 5 min |

**Bonus (non bloquants pour S7)** :
- Reformuler l.745 « Pas besoin de chance, juste de bons outils » (cliché coaching).
- Reformuler l.612-613 « Trois façons de vivre quelque chose » (vide).
- Supprimer la phrase italique hero l.374-376 (doublon « partout en France »).
- Décider du sort du bandeau saisonnier l.582-601 (orphelin, CTA redondant).
- Préparer un encart home « Gardien d'urgence » à activer après S7.

**Verdict global** : la page est **prête pour le lancement** sous réserve des 2 corrections doctrinales (#2). Les autres actions sont du polish à fort ROI mais pas bloquantes.
