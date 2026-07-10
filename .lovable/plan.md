
# Cadrage fiabilité tuyauterie email

Deux chantiers indépendants. Aucun code modifié à ce stade.

Ancrage code réel :
- `supabase/functions/send-mass-email/index.ts` (633 l.) : boucle synchrone unique, `fetch` Resend `/emails/batch` par paquets de 100, aucune idempotence, statut `mass_emails.status` passe direct `sending` → `sent`/`error`, si l'invocation crashe la campagne reste bloquée `sending` et un rejeu ré-envoie tout depuis zéro.
- `supabase/functions/process-email-queue/index.ts` (365 l.) : worker unique, lit `pgmq` (`auth_emails`, `transactional_emails`), rate-limit stocké sur ligne unique `email_send_state.id=1` (`retry_after_until`), une seule clé `RESEND_API_KEY` (via lib `@lovable.dev/email-js`).
- `send-transactional-email` : déjà idempotent (clé + `email_send_log`), sert de référence.
- Tables présentes : `email_send_log`, `email_deferred_queue`, `email_unsubscribe_tokens`, `mass_emails`, `mass_email_sends`, `email_send_state`, `suppressed_emails`, pgmq (`auth_emails`, `transactional_emails`, DLQ).

---

## Chantier A — File idempotente `send-mass-email`

### Objectif
Passer d'un envoi synchrone monobloc à un modèle **producteur (enqueue) / consommateur (worker)** avec idempotence par (campagne, destinataire), lock de campagne, reprise après crash, et lots bornés.

### Phase 1 — Quick wins (sans changer l'archi)
Réduire la casse immédiate sans refonte.

1. **Idempotence défensive côté insert** : ajouter contrainte `UNIQUE (mass_email_id, recipient_email)` sur `mass_email_sends` + `insert ... on conflict do nothing`. Un rejeu partiel ne peut plus recréer les mêmes lignes de tracking.
2. **Filtrage recipients déjà envoyés** avant la boucle Resend : `select recipient_email from mass_email_sends where mass_email_id = :id and status = 'sent'` et retrancher. Permet à un rejeu de reprendre là où on s'est arrêté (best effort, mais ne double-envoie plus).
3. **Statut `paused` + heartbeat** : ajouter colonnes `mass_emails.locked_at`, `locked_by`, `heartbeat_at`, transitions `pending → sending → done|error|paused`. Cron de watchdog qui repasse en `paused` toute campagne dont `heartbeat_at` a > 5 min de retard.
4. **Lock d'entrée** : refuser un `send` sur une campagne dont `status in ('sending','done')` sauf flag `resume=true`.

Effort : ~0.5 j. Zéro migration risquée. Élimine les doubles envois évidents.

### Phase 2 — Refonte producteur/consommateur (structurel)
Réutiliser pgmq (déjà en prod) plutôt qu'introduire une nouvelle brique.

**Modèle cible**

```text
POST send-mass-email (mode=send)
  └─> résout profils + compliance + tokens
  └─> insert mass_emails (status=pending)
  └─> insert mass_email_sends (status=queued) — 1 ligne / destinataire
  └─> pgmq.send mass_emails queue : { campaign_id, send_id }
  └─> 200 OK immédiat  (pas d'appel Resend ici)

pg_cron toutes les 30s → process-mass-email-queue (nouvelle edge fn)
  └─> read_email_batch('mass_emails', batch=25, vt=60)
  └─> pour chaque msg :
        - re-check suppression + opt-out (fresh)
        - fetch Resend /emails (unitaire, pas batch)
        - update mass_email_sends by (campaign_id, recipient_email) → sent|failed
        - pgmq.delete
        - respecte email_send_state.retry_after_until (partagé)
  └─> quand aucune ligne queued restante pour une campagne : mass_emails.status = done
```

**Migrations**

- Nouvelle queue pgmq `mass_emails` + DLQ `mass_emails_dlq` (via helpers existants `read_email_batch`, `delete_email`, `move_to_dlq` — déjà génériques sur `queue_name`).
- `mass_email_sends` :
  - `UNIQUE (mass_email_id, recipient_email)`
  - `status` étendu : `queued|sending|sent|failed|suppressed|skipped`
  - `attempts int default 0`, `last_attempt_at timestamptz`, `last_error text`
  - index `(mass_email_id, status)`.
- `mass_emails` : `locked_at`, `heartbeat_at`, `enqueued_count`, `sent_count`, `failed_count`, `skipped_count`, status enum `pending|enqueuing|sending|paused|done|error|cancelled`.
- Trigger update des compteurs sur `mass_email_sends` (ou vue matérialisée simple).

**Edge functions**

- `send-mass-email` (existante) : garde le mode `count`, le mode `send` devient un **enqueuer** pur (pas de Resend). Reste synchrone mais borné (résolution profils + inserts batch ≤ 500 lignes).
- **`process-mass-email-queue`** (nouvelle) : consommateur, `verify_jwt=true`, appelée par pg_cron. Réutilise la logique 429/403/DLQ de `process-email-queue`. Traite par lot de 25, temps max ~10 s.
- **`cancel-mass-email`** (nouvelle, optionnelle) : purge la queue des messages d'une campagne + passe status=cancelled. Utile pour arrêt d'urgence.

**Idempotence par destinataire**

- Clé naturelle : `(mass_email_id, lower(recipient_email))`.
- Avant Resend : `select status from mass_email_sends where ... for update skip locked` ; si déjà `sent`, on delete le msg pgmq sans envoyer.
- `Idempotency-Key` HTTP Resend : `mass-<mass_email_id>-<send_id>` — protège même en cas de duplicate pgmq (VT race).

**Reprise**

- Redémarrer une campagne `paused` : refill pgmq depuis `mass_email_sends where status in ('queued','failed') and attempts < 5`. Aucun profil recalculé.

**Compatibilité RGPD / opt-out / List-Unsubscribe**

- Le worker **re-vérifie** `suppressed_emails` et `email_preferences.product_emails` juste avant l'envoi (fenêtre entre enqueue et send peut être > minutes). Ligne passe `skipped` avec raison.
- Tokens `email_unsubscribe_tokens` : provisionnés à l'enqueue (comme aujourd'hui). Le HTML est stocké dans le message pgmq **avec** placeholder remplacé au moment du send (on stocke `token` dans le msg, pas l'HTML final, pour rester < taille pgmq raisonnable).
- Headers `List-Unsubscribe` + `List-Unsubscribe-Post` construits par le worker.

### Fichiers touchés

- `supabase/functions/send-mass-email/index.ts` : refonte mode `send`.
- `supabase/functions/process-mass-email-queue/index.ts` : nouveau.
- `supabase/functions/cancel-mass-email/index.ts` : nouveau (optionnel).
- `supabase/config.toml` : entrées des nouvelles fonctions.
- Migrations SQL : contraintes + colonnes + queue pgmq + cron `select cron.schedule('mass-email-worker', '*/30 * * * * *', $$ ... http_post ... $$)`.
- Admin UI (`AdminMassEmailsStats` etc.) : lecture compteurs, bouton pause/reprise/cancel. **Hors périmètre technique de ce chantier**, à cadrer séparément.

### Risques et rollback

- Risque principal : régression sur compliance (fenêtre enqueue→send). Mitigé par re-check dans le worker.
- Risque secondaire : messages pgmq trop volumineux si on stocke le HTML. Mitigation : stocker uniquement le contexte (subject, body texte, cta, token) et re-rendre au worker via `buildHtml`.
- Rollback : la table `mass_emails` conserve un ancien chemin, garder un feature-flag `MASS_EMAIL_LEGACY=true` qui court-circuite l'enqueue et refait l'envoi synchrone (code Phase 1). Retour arrière en < 5 min.

### Effort relatif
Phase 1 : S (0.5 j). Phase 2 : M-L (2-3 j dev + 0.5 j vérif prod).

---

## Chantier B — Fiabilisation pipeline auth (SPOF)

### Objectif
Rendre le pipeline d'auth (signup / magiclink / recovery) résilient à : cron figé, `email_send_state.id=1` bloqué, clé Resend HS.

### Phase 1 — Quick wins observabilité (déblocage immédiat)

1. **Heartbeat worker** : le `process-email-queue` écrit `email_send_state.last_run_at = now()` en fin d'exécution (même si 0 message). Nouvelle colonne.
2. **Vue de santé SQL** `v_email_pipeline_health` :
   - `last_run_age_seconds` (now - last_run_at)
   - `oldest_pending_age_seconds` (min queued_at des queues pgmq)
   - `stuck_rate_limit` (retry_after_until dépassé > 10 min)
   - `dlq_last_hour` (comptage `email_send_log` status=dlq)
   - `failure_rate_1h` (failed / (sent+failed))
3. **Cron d'alerte** (nouvelle edge fn `email-pipeline-watchdog`, pg_cron / 5 min) :
   - Si `last_run_age > 5 min` OU `oldest_pending_age > 10 min` OU `failure_rate_1h > 0.3` OU `stuck_rate_limit` : `send-email-direct` vers admin (Jérémie) + insert `error_logs`.
   - Rate-limit alerte : max 1 alerte / heure / type.
4. **Unfreeze automatique du rate-limit** : si `retry_after_until` est dépassé de plus de 15 min mais reste dans le futur (bug), le worker le remet à `null` en début de run (garde-fou). Fix ligne 124.

Effort : ~0.5 j. Zéro migration destructrice.

### Phase 2 — Réduction SPOF (structurel)

**Rate-limit granulaire (fin de la ligne id=1)**

- Nouvelle table `email_rate_limit_state (scope text primary key, retry_after_until timestamptz, updated_at)`.
- Scopes : `resend_primary`, `resend_backup`, éventuellement par purpose (`auth`, `transactional`).
- Migration : conserver `email_send_state.id=1` pour la config (batch_size, TTL, etc.) — on ne casse pas la lecture existante. Seul le rate-limit migre.
- Worker : `select ... where scope = :active_key`, `upsert` sur 429. Plus de contention sur une seule ligne.

**Clé Resend de secours + bascule**

- Nouveau secret `RESEND_API_KEY_BACKUP` (facultatif, absence = pas de bascule).
- Colonne `email_send_state.active_key ∈ {'primary','backup'}` + `primary_disabled_until timestamptz`.
- Politique : si clé primaire génère `failure_rate_1h > seuil` (ex. 50 % sur ≥ 20 tentatives) OU 429 persistant > 30 min → auto-bascule sur `backup`, log + alerte admin. Bascule retour manuelle (admin UI ou script).
- Attention : `@lovable.dev/email-js` route via LOVABLE_API_KEY, pas RESEND directement — la bascule Resend s'applique aux fonctions qui appellent Resend en direct (`send-mass-email`, `send-email-direct`, `send-transactional-email` selon route). À valider : quelles fonctions passent par Lovable vs Resend direct. **Point à trancher avant impl** — voir « Décisions ouvertes ».

**Coupure automatique d'un flux défaillant**

- Table `email_flow_circuit (flow text primary key, state text, opened_at, half_open_at, failure_count, success_count)`.
- Flux : `auth_signup`, `auth_magiclink`, `auth_recovery`, `transactional`, `mass`.
- Circuit breaker classique : > N échecs consécutifs → OPEN → refuse enqueue (retourne 503 côté hook), alerte, revient HALF_OPEN après cooldown. Empêche d'engorger pgmq pendant une panne provider.
- Auth reste toujours prioritaire : le breaker `auth_*` n'a pas d'effet sur la lecture (on tente toujours), seulement sur les nouveaux enqueues transactionnels/masse.

### Fichiers touchés

- `supabase/functions/process-email-queue/index.ts` : lecture nouvelle table rate-limit, écriture heartbeat, garde-fou unfreeze, choix `active_key`.
- `supabase/functions/email-pipeline-watchdog/index.ts` : nouveau (alertes).
- `supabase/functions/auth-email-hook/index.ts` : check circuit breaker avant enqueue (pour flux non-auth uniquement).
- `supabase/functions/send-mass-email/index.ts` + `send-transactional-email` + `send-email-direct` : lecture `active_key` → sélection secret Resend, écriture métriques circuit.
- `supabase/config.toml` : entrée watchdog.
- Migrations : `email_rate_limit_state`, `email_flow_circuit`, colonnes `email_send_state.last_run_at` + `active_key` + `primary_disabled_until`, cron watchdog.

### Risques et rollback

- Risque : bascule automatique intempestive → alertes en boucle. Mitigation : seuils conservateurs (20 tentatives min, 30 min de persistance), toggle `AUTO_FAILOVER_ENABLED` en env.
- Risque : circuit breaker qui bloque légitimement l'auth. Mitigation : les 4 flux `auth_*` sont **exclus** du breaker en écriture (jamais OPEN).
- Rollback : chaque brique (heartbeat, rate-limit granulaire, backup key, breaker) est indépendante et derrière un flag. On peut les activer/désactiver individuellement.

### Effort relatif
Phase 1 : S (0.5-1 j). Phase 2 : M (2 j) — hors décision Lovable-vs-Resend direct qui peut ajouter 0.5 j de reverse-eng.

---

## Décisions ouvertes à trancher avant Phase 2

1. **Route d'envoi effective** : `process-email-queue` passe par `@lovable.dev/email-js` (LOVABLE_API_KEY), pas Resend direct. La « clé Resend de secours » ne concerne donc que `send-mass-email` / `send-email-direct` / `send-transactional-email` selon leur route réelle. À auditer explicitement avant d'écrire la bascule.
2. **Canal d'alerte watchdog** : email admin uniquement, ou Slack/webhook en complément ?
3. **Refonte mass_emails Phase 2** : big-bang ou coexistence temporaire avec l'ancien chemin derrière feature flag (recommandé) ?

## Ordre de livraison recommandé

1. Chantier A Phase 1 (idempotence + lock) — bloque les doubles envois **cette semaine**.
2. Chantier B Phase 1 (heartbeat + watchdog + unfreeze) — sécurise l'auth **cette semaine**.
3. Chantier B Phase 2 (rate-limit granulaire, backup key, breaker).
4. Chantier A Phase 2 (worker pgmq mass).
