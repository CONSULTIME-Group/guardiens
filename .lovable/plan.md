# Alma Pass 3 — cross-canal + republish + finition

Périmètre large (7 chantiers). Livraison en **un seul commit** comme demandé, mais je propose de découper l'exécution en 2 vagues pour maîtriser le risque. Confirmez avant que je lance.

## Vague A (prioritaire, forte valeur, faible risque)

### C1 — Republish depuis annonce archivée
- Bouton "Republier avec Alma" sur `/sits` (liste) + `SitDetail` si `status IN ('archived','cancelled','completed')`
- Modale `<AlmaBubble />` avec 2 modes radio : **copy** (par défaut) / **adapt** (prompt libre)
- `CreateSit.tsx` détecte `?from={sit_id}&mode=copy|adapt` :
  - copy : pré-remplit tout sauf dates + photos optionnelles
  - adapt : appel `draft-sit-from-prompt` étendu avec contexte de l'ancienne sit
- Bandeau `AlmaBubble variant="inline"` + badge "Republication de {ancien_titre}"
- Analytics : `alma_republish_bubble_seen`, `alma_republish_mode_selected`, `alma_republish_published`

### C2 — Voix Alma dans les 5 digests emails
Refonte cosmétique **sans changement fonctionnel** des templates :
- `send-sitter-daily-digest`, `send-mission-daily-digest`, `send-mutual-aid-weekly-digest`, `send-sit-draft-reminder`, nurturing owner J+3/J+10/J+21
- Header : avatar Alma SVG 32px + signature "Alma" + baseline
- Intro : "Bonjour {prénom}, c'est Alma. Voici ce que j'ai vu pour vous depuis hier." (vouvoiement owner / tutoiement sitter)
- Footer : "Vous relisez, vous décidez."
- Ajouter `alma_signed: true` aux events `email_*_sent`

### C3 — Alma dans le welcome email + `/dashboard?welcome=alma`
- `auth-email-hook` template signup : Alma se présente, CTA "Rencontrer Alma sur mon tableau de bord"
- Dashboard : détection `?welcome=alma` → force `WelcomeBackDigest` avec variante d'accueil
- Analytics : `alma_welcome_email_sent`, `alma_dashboard_first_meeting_seen`

### C5 — Cleanup persona cross-canal
- Grep + remplacement : "L'IA", "Concierge IA", "Assistant IA" → "Alma" ; "Génération en cours" → "Alma prépare…"
- Sparkles isolées → ajouter `<AlmaAvatar />`
- Créer `docs/persona-alma.md`

### C7 — Contrôles
- `bunx tsgo --noEmit` vert
- Tests Vitest sur : détection republish, pré-remplissage copy/adapt, absence de vocabulaire proscrit dans nouveaux templates
- Grep de non-régression persona

## Vague B (à confirmer, plus lourd)

### C4 — Push notifications web (marqué optionnel par vous)
Service worker + opt-in `/settings` + rate limit 1/h + colonne `notification_preferences.alma_push_enabled`. **~1 chantier à part entière** (service worker, VAPID keys, edge function push, permission flow). Je recommande de le sortir en Pass 4.

### C6 — Dashboard admin `/admin/alma`
Adoption 7j/30j, taux d'acceptation, impact fonctionnel, freshness par moment, filtres période/rôle/moment/langue, export CSV. **Requiert instrumentation propre des 18 moments** + agrégations SQL. Faisable mais ~1 journée à part.

## Ma recommandation

Livrer **Vague A** (C1+C2+C3+C5+C7) dans ce commit, comme "Alma Pass 3 core". Traiter C4 (push) et C6 (admin KPI) en Pass 3.5 dédiée. Motif : C4 touche à l'infra service worker / permissions navigateur, C6 dépend de la stabilité des events analytics Pass 1+2+3 pour produire des KPI fiables. Les mélanger avec C1-C3 augmente la surface de bug sans bénéfice fonctionnel immédiat.

## Question

Vous confirmez :
1. **Vague A seule dans ce commit** (recommandé), ou
2. **Tout d'un coup** incluant push web + admin KPI (plus long, plus de risque) ?
