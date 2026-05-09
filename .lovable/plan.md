# KPI engagement nurturing — Plan d'exécution

## Objectif

Mesurer **ce que produisent réellement les emails de nurturing** : ouvertures, clics CTA, et surtout **taux d'action** (l'utilisateur a-t-il fait ce que l'email visait à déclencher).

Définition retenue : **action réussie = clic CTA OU sortie par exit_condition_met dans les 7 jours suivant l'envoi.**

---

## Architecture

### 1. Tracking infrastructure (nouveau)

**Table `email_engagement_events`** (append-only)
- `message_id` (jointure avec `journey_step_log` via `idempotency_key`)
- `event_type` : `open` | `click`
- `target_url` (si click)
- `user_agent`, `ip` (anonymisé /16 IPv4)
- `created_at`

**Edge function `track-email-pixel`** (GET)
- Reçoit `?mid=<message_id>` 
- Insert ligne `open` (premier seulement par mid → unique partiel)
- Renvoie un GIF transparent 1×1
- `verify_jwt = false`, public

**Edge function `track-email-click`** (GET)
- Reçoit `?mid=<message_id>&u=<base64-url>`
- Insert ligne `click` + URL
- Redirect 302 vers l'URL décodée (whitelist domaine `guardiens.fr`)
- `verify_jwt = false`, public

### 2. Templates — wrapping automatique

Helper `wrapTrackedHtml(html, messageId)` côté `send-transactional-email` :
- Ajoute `<img src=".../track-email-pixel?mid=...">` avant `</body>`
- Remplace tous les `href="https://guardiens.fr/..."` par `href=".../track-email-click?mid=...&u=...`
- Appliqué **uniquement** aux emails avec `metadata.source` commençant par `journey:` (pas aux emails transactionnels purs)

### 3. Journey log — colonne `message_id`

Ajouter `message_id` (uuid) dans `journey_step_log`, généré côté `evaluate-journeys` AVANT l'appel à `send-transactional-email` et passé en `idempotencyKey`. Permet la jointure events ↔ step.

### 4. Dashboard `/admin/nurturing`

Bloc « Engagement » dans chaque carte de séquence :
- **Envoyés** (déjà présent)
- **Taux d'ouverture** : `opens distincts / sent`
- **Taux de clic** : `clicks distincts / sent`
- **Taux d'action** : `(users avec click OU exit goal_met dans 7j) / sent`

Métriques globales en haut de page : 4 cartes (envois, ouverture moyenne, clic moyen, **action moyenne**).

Vue par étape : on garde la timeline, on ajoute open/click/action par step.

---

## Détails techniques

- **Idempotence des events** : index unique partiel `(message_id) WHERE event_type='open'` → un seul open compté par email (le premier).
- **RLS** : `email_engagement_events` lecture admin uniquement, écriture service_role.
- **Anonymisation IP** : on stocke `192.168.0.0/16` au lieu de l'IP complète (RGPD, base légale 6.1.f, déjà couverte par mention email).
- **Pas de tracking sur les emails transactionnels classiques** (signup, contact-reply, sit-confirmed…) — seulement nurturing, pour limiter le périmètre RGPD et garder ces emails propres.
- **Pas d'intégration provider externe** (Resend webhooks) : on garde le pixel maison, plus simple et indépendant.

## Limites assumées

- Le **taux d'ouverture** sera sous-estimé : Apple Mail Privacy Protection, clients texte, prefetch — ce KPI est indicatif, pas absolu.
- Le **taux d'action** est le KPI qui compte vraiment et n'est pas affecté par ces limites.
- Pas de tracking par lien individuel — on agrège tous les clics par email.

## Ordre d'exécution

1. Migration DB : table `email_engagement_events` + colonne `message_id` sur `journey_step_log`
2. Edge functions `track-email-pixel` + `track-email-click`
3. Modif `evaluate-journeys` : génère et persiste `message_id`
4. Modif `send-transactional-email` : wrapping HTML conditionnel
5. UI `AdminNurturing` : agrégations + 4 cartes + bloc engagement par séquence
6. Test bout-en-bout : envoi → ouverture → clic → KPI à jour
