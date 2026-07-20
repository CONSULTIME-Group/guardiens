Chantier lourd (2747 lignes, hero + flux + rail + extraction en composants). Je propose de le livrer en 5 lots atomiques, chacun compilable et testable, plutôt qu'un seul commit géant qui risque de casser des chemins critiques (SEO, JSON-LD, sticky, tabs mobile).

## Lot 1 — Extraction squelette (aucun changement visuel)
- Créer `src/components/profile/ProfileHero.tsx`, `StoryTiles.tsx`, `TrustStory.tsx`, `ProfileRail.tsx`, `AffinityTeaserCard.tsx`, `CommunityPulseCard.tsx`, `AlmaWhisperCard.tsx` avec props typées.
- Déplacer d'abord des blocs existants tels quels dans ces composants (juste couper/coller). Page passe de 2747 lignes à ~1200.
- Nettoyage code mort : objet `jsonLd` non utilisé, `cancellations`, `gardeReviewsCount`, rgba() en dur → tokens, `text-amber-500` → `text-primary`.

## Lot 2 — Hero resserré
- Illustration 170-200px, avatar chevauchant, badge lieu droite.
- H1 + pastille "Disponible" (motion-safe pulse) / "Indisponible" crème.
- Sous-titre "Gardien·ne à {ville} · Membre depuis {mois année}" + note intégrée si avis ≥ 1.
- Accroche Playfair italique conditionnelle (tagline pro > motivation ≤ 140c > rien).
- ≤ 3 chips (Identité vérifiée / Répond aux messages si donnée réelle / Dès {mois} si connu / Gardien d'urgence existant).
- CTA primaire sous hairline + réassurance non-connecté.
- Suppression : stats line KPI, TrustScore composite hero, Alma hero, affinité hero, stats strip mobile.

## Lot 3 — Tuiles histoire + sections flux
- StoryTiles : 3 tuiles max, phrases construites, aucune tuile si donnée absente, grille masquée si < 2 tuiles.
- Sections trio signature espacées 52px : "Qui est {prénom}" (bio + motivation + grille de faits 2 col), "Confiance" id=confiance (TrustStory racontée + timeline existante + SpecialBadge + MissionBadges), "Les avis" (ReviewGrid existant OU empty raconté carte pointillée), "En images" (galerie + lightbox existants).
- Suppression des Tabs Radix desktop À propos/Avis/Pratique/Galerie → flux unique. Mobile même flux empilé.
- PublicExperiences absorbé dans "Qui est {prénom}".

## Lot 4 — Rail droit + sticky CTA
- ProfileRail sticky ≥ 1024px (340px), s'empile en fin de flux mobile.
- AffinityTeaserCard visiteur non connecté (ring flouté forêt→or, lien inscription encodé) OU composants OwnerToSitterAffinity/AffinitySection existants déplacés ici pour connecté.
- AlmaWhisperCard : UNE seule phrase Playfair italique, premier whisper pertinent parmi existants.
- CommunityPulseCard : seul bloc sombre (dégradé pine-deep→pine), 2 chiffres max, uniquement données réelles locales. Titre élargi "Sur Guardiens" si pas de donnée locale ; bloc masqué si aucun chiffre réel.
- Sticky mobile existant conservé mais gated par IntersectionObserver sur CTA hero.

## Lot 5 — QA + captures
- Vérifier tabs proprio/entraide inchangés fonctionnellement sous nouveau hero.
- Typecheck, vitest (jsonld, em-dash, main-flex, footer-bg guards).
- Playwright 390 + 1280, deux profils (avec avis / neuf).

## Points techniques

**Tokens** : réutiliser `--primary` (forêt), `--secondary`/`--accent` pour terra, `--muted`, `--border`, `--card`, `--foreground`. Pastille "Disponible" = `bg-primary text-primary-foreground` avec pulse motion-safe. Pouls communauté = `bg-gradient-to-br from-primary to-primary/80`. Or (#C8A24B) : à ajouter au design system comme `--gold` HSL ou réutiliser un token doré existant si présent (à vérifier dans index.css lot 4).

**Données** : toutes déjà chargées dans la page (bio, motivation, gallery, identity_verified, verification_date, mobility_radius_km, has_vehicle, min_duration, animals_accepted, city, member_since, response_time, availability_date). Aucun nouveau hook, aucune nouvelle requête.

**Hors périmètre** : PageMeta, ProfileSchemaOrg, canonical, noindex, window.prerenderReady (vague 36).

**Volumétrie** : ~2000 lignes touchées, 7 nouveaux fichiers. Je livre les 5 lots dans cette conversation, en commençant par le Lot 1 dès validation.

Confirmez le plan (ou ajustez le découpage) et j'enchaîne.