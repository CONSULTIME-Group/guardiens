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

# Pass 2, délivrabilité et instrumentation

Date : 31 juillet 2026

## Ce que le Pass 2 a établi

- Le webhook fonctionne et écrit bien, depuis le 22 juillet 2026. Cette date
  est la **borne basse de toute statistique d'engagement**. Avant elle, les
  envois existent en base sans aucun événement de livraison, non parce qu'ils
  ont échoué mais parce que personne n'écoutait. Un taux calculé sur cette
  zone aveugle donne 32 % de livraison, contre 99,8 % réels sur la période
  instrumentée. La borne est posée dans `src/lib/emailTracking.ts`
  (`EMAIL_TRACKING_START`) et appliquée dans l'onglet Engagement de
  `/admin/emails`.
- Les emails d'authentification (inscription, réinitialisation, invitation)
  transitent par le hook auth et la file `auth_emails`, sans `resend_id`.
  Aucun événement webhook ne peut leur être rattaché. Ils sont **exclus des
  taux et signalés comme non instrumentés**, jamais comptés comme des
  non-délivrances.
- Les rebonds du groupe SFR (sfr.fr, neuf.fr, numericable.fr, club.fr) sont
  génériques, sans `subType`, et traduisent un blocage de réputation côté
  opérateur, pas des adresses inexistantes. La règle de suppression a été
  affinée : suppression immédiate sur plainte ou rebond explicitement
  permanent, **seuil de trois rebonds** pour tout rebond générique
  (`supabase/functions/resend-webhook/index.ts`).

## Deux infrastructures d'envoi coexistent sur guardiens.fr

Point à connaître avant toute intervention DNS ou email.

- `send.guardiens.fr` : sous-domaine **Resend**, celui réellement utilisé par
  toutes les fonctions d'envoi de l'application. SPF, DKIM et alignement
  vérifiés conformes.
- `notify.guardiens.fr` : sous-domaine **délégué à Mailgun** via les serveurs
  de noms de Lovable (`nsN.lovable.cloud`), hérité de l'infrastructure email
  intégrée à la plateforme. Il n'est traversé par aucun envoi applicatif
  aujourd'hui.

Conséquence pratique : chercher les enregistrements Resend sur
`notify.guardiens.fr` ne donne rien, et inversement. Les deux zones sont
indépendantes et peuvent coexister sans conflit tant qu'elles restent sur des
sous-domaines distincts. Nettoyage non urgent, mais à trancher un jour pour
éviter d'entretenir deux chaînes d'envoi sur le même domaine.

## DMARC, ordre d'action retenu

Politique conservée à `p=none` tant qu'aucun rapport n'a été lu. Le vrai
problème n'est pas la valeur de la politique, c'est que les rapports partent
vers `dmarcreports@lovable.dev` et que personne côté Guardiens ne les reçoit.
Rediriger d'abord, observer deux à quatre semaines, durcir ensuite en
connaissance de cause. Enregistrement à poser chez Cloudflare sur
`_dmarc.guardiens.fr` :

```
v=DMARC1; p=none; rua=mailto:dmarc@guardiens.fr; ruf=mailto:dmarc@guardiens.fr; fo=1; adkim=r; aspf=r; pct=100
```

