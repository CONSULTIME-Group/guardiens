# Frequency cap, bypass et file différée — référence

Source de vérité : `supabase/functions/_shared/email-cap.ts` +
`supabase/functions/send-transactional-email/index.ts` (étape 2b) +
`supabase/functions/flush-deferred-emails/index.ts`.

## 1. Limites globales

| Limite | Valeur | Constante |
|---|---|---|
| Plafond horaire par destinataire | 1 / heure | `CAP_PER_HOUR` |
| Plafond journalier par destinataire | 3 / 24 h | `CAP_PER_DAY` |
| Quiet hours (Europe/Paris, DST géré) | 22h00 → 08h00 | `QUIET_START_HOUR` / `QUIET_END_HOUR` |

Le décompte se fait sur `email_send_log` filtré par
`recipient_email ILIKE` + `status = 'sent'` sur les 1h / 24h glissantes.
Un email `deferred` ne consomme pas le quota — seul un `sent` le fait.

## 2. Templates en bypass (cap + quiet hours ignorés)

Définis dans `BYPASS_TEMPLATES` (`email-cap.ts`). Aucun de ces templates
n'est jamais reporté ni mis en file — ils partent immédiatement, y compris
la nuit, y compris au-delà de 3/jour :

- `identity-verified`
- `identity-rejected`
- `relance-piece-identite`
- `dispute-resolved`
- `report-resolved`
- `cancellation-by-owner`
- `cancellation-by-sitter`
- `cancellation-review-published`
- `cancellation-response-published`
- `sit-confirmed`
- `contact-reply`

Critères d'inclusion : sécurité/identité, résolution litige/signalement,
annulations, confirmation de garde, réponse humaine directe à un message.
**Tout ajout doit être justifié par une obligation légale / sécurité /
réponse humaine attendue immédiatement.** Les emails marketing, conseils,
relances soft, alertes ne doivent JAMAIS être ajoutés ici.

## 3. Flag urgent côté appelant

L'appelant peut forcer un envoi immédiat via `templateData.__urgent = true`.
Lu par :

```ts
const isUrgent = !!(templateData as any)?.__urgent
const bypass = BYPASS_TEMPLATES.has(templateName) || isUrgent
```

Comportement identique au bypass : pas de cap, pas de quiet hours, pas de
mise en file. À réserver aux flux serveur sensibles (webhooks Stripe,
finalisations critiques) — pas pour contourner le cap depuis l'UI.

## 4. Ordre de précédence (`decideDeferral`)

Pour les templates **non bypass** et **non urgent** :

1. **Quiet hours** (22h–8h Paris) → `defer` au prochain 08h00 Paris.
2. **Cap journalier** (≥ 3 envoyés sur 24 h) → `defer` à `oldest + 24h + 30s`.
3. **Cap horaire** (≥ 1 envoyé sur 1 h) → `defer` à `oldest + 1h + 30s`.
4. Sinon → `send`.

Le quiet hours prime toujours sur les caps : un email refusé pour cap
pendant la nuit est reporté au matin (08h00), pas au prochain créneau cap.

## 5. Interaction `idempotencyKey` ↔ file différée

`idempotencyKey` (alias `idempotency_key`) sert à 3 protections distinctes :

### 5.1 Anti-doublon sur envois déjà partis

Avant tout traitement, on cherche dans `email_send_log` :

```ts
.eq('status', 'sent')
.filter('metadata->>idempotency_key', 'eq', idempotencyKey)
```

Si une ligne existe → réponse `{ success: true, skipped: true,
reason: 'duplicate_idempotency_key' }`. Aucun appel Resend, aucun nouvel
enregistrement.

### 5.2 Anti-doublon dans la file différée

Au moment de pousser dans `email_deferred_queue` :

```ts
.eq('idempotency_key', idempotencyKey)
.eq('template_name', templateName)
.in('status', ['pending', 'sent'])
```

Si une ligne `pending` ou `sent` existe déjà → réponse
`{ success: true, deferred: true, reason: 'already_queued' }`. Sinon insert.
Conséquence : un même `idempotencyKey` rejoué N fois pendant un pic produit
**1 seule ligne en file**.

### 5.3 Flush par `flush-deferred-emails`

Le cron lit les lignes `status='pending'` avec `scheduled_for <= now()`,
puis ré-appelle `send-transactional-email` en propageant l'`idempotency_key`
d'origine. À ce moment :

- Le cap est ré-évalué. S'il est encore dépassé → la ligne est
  re-différée (nouvelle ligne en file via le même chemin), avec **le même
  `idempotencyKey`** : la garde 5.2 garantit qu'on n'en crée pas une
  deuxième tant que la précédente est `pending`.
- Si l'envoi part → la ligne `email_send_log` `status='sent'` portant
  l'`idempotency_key` rend tout rejeu ultérieur idempotent (garde 5.1).
- La ligne traitée en file passe à `sent` (ou `failed` / `dlq` après N
  tentatives) — elle ne peut plus déclencher d'envoi.

### 5.4 Recommandations clé idempotence

- **Toujours** dériver `idempotencyKey` de l'ID stable de l'événement
  déclencheur + nom du template (ex. `welcome-${userId}`,
  `booking-confirm-${bookingId}`).
- **Jamais** `Date.now()` ni `crypto.randomUUID()` côté appelant — sinon
  chaque retry crée un nouvel envoi.
- Si `idempotencyKey` est absent, il vaut `messageId` (UUID auto par
  appel) → aucune protection effective. À éviter sauf one-shot.

## 6. Tests de régression

- `supabase/functions/_shared/email-cap_test.ts` — 22 tests purs sur
  `decideDeferral`, `isQuietAt`, `nextQuietEndFrom` (DST inclus).
- `supabase/functions/_shared/email-cap-burst-sim_test.ts` — 6 simulations
  bout-en-bout (pics, quiet hours, idempotence, flush sans doublon).

Toute modification de `BYPASS_TEMPLATES`, des constantes de cap, ou de la
logique de `decideDeferral` **doit** mettre à jour ces tests.
