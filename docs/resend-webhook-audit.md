# Audit délivrabilité et tracking Resend, Pass 1

Date : 6 juillet 2026
Contexte : 35 emails owner envoyés sur 30 jours avec 0 ouverture et 0 clic
remontés dans `email_send_log`. Diagnostic pour départager délivrabilité
(spam) et tracking cassé.

## Cause racine identifiée

`supabase/functions/send-transactional-email/index.ts` construisait le payload
Resend **sans le champ `tracking`**. Par défaut, l'API Resend n'injecte alors
ni pixel d'ouverture, ni réécriture des liens en `click.resend.com/*`. Le
webhook `resend-webhook` recevait donc uniquement `email.delivered`,
`email.bounced`, `email.complained`, jamais `email.opened` ni `email.clicked`.

Conséquence : `first_opened_at`, `open_count`, `first_clicked_at`,
`click_count` sont restés à `NULL` / `0` pour 100 % des envois transactionnels
sur les 30 derniers jours.

Fonction également concernée : `send-email-direct` (envoi ponctuel utilisé
pour les emails admin one-shot).

`send-mass-email` était déjà correctement configurée
(`tracking: { opens: true, clicks: true }` ligne 364).

## Correctifs appliqués dans ce commit

- `send-transactional-email` : ajout de
  `tracking: { opens: true, clicks: true }` au payload Resend.
- `send-email-direct` : même ajout.
- Vue SQL `public.email_delivery_stats` : agrégats quotidiens par template
  (envoyés, délivrés, ouverts, cliqués, bounces, plaintes, taux).

Les templates React Email n'avaient pas besoin de modification, les liens
étaient déjà en HTTPS vers `guardiens.fr`. La réécriture par Resend se fait
côté serveur au moment de l'envoi une fois `tracking.clicks` activé.

## Points à valider côté Jérémie, hors code

### 1. Webhook Resend

Dashboard Resend, section Webhooks :

- URL : `https://erhccyqevdyevpyctsjj.supabase.co/functions/v1/resend-webhook`
- Events cochés : `email.sent`, `email.delivered`, `email.opened`,
  `email.clicked`, `email.bounced`, `email.complained`
- Signing secret Svix : présent dans les secrets edge sous
  `RESEND_WEBHOOK_SECRET`

L'edge function `resend-webhook` vérifie déjà la signature Svix et met à
jour `email_send_log` par `resend_id` pour chaque event type. Aucun code à
modifier ici.

### 2. DNS `guardiens.fr` (Cloudflare)

À vérifier via `dig` ou https://mxtoolbox.com :

- **SPF** : `guardiens.fr TXT "v=spf1 include:_spf.resend.com ~all"`
- **DKIM Resend** : trois CNAME `resend._domainkey`, `resend2._domainkey`,
  `resend3._domainkey` pointant vers `resend.com` (valeurs exactes dans le
  dashboard Resend, Domains > guardiens.fr)
- **DMARC** :
  `_dmarc.guardiens.fr TXT "v=DMARC1; p=quarantine; rua=mailto:dmarc@guardiens.fr; adkim=s; aspf=s; pct=100"`

Démarrer à `p=quarantine`, passer à `p=reject` après 1 mois de monitoring
sans incident.

### 3. Test manuel

- Envoyer un email test depuis `/admin/emails` vers Gmail, Outlook, iCloud
- Vérifier l'arrivée en boîte principale (pas Promotions, pas Spam)
- Ouvrir l'email, cliquer un CTA
- Repasser 2 minutes plus tard sur `email_send_log` :
  `first_opened_at` et `first_clicked_at` doivent être renseignés

## Suivi

Une fois les 3 points ci-dessus validés et le fix déployé, les prochains
envois transactionnels doivent remonter un `open_rate` cohérent (référence
industrie : 20 à 35 % pour du transactionnel bien configuré).

Si à 48 h le taux reste sous 15 %, la piste devient contenu email (objet,
preview text, densité de CTA) ou réputation IP Resend, à creuser en Pass 2.
