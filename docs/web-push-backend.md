# Push utilisateur, etape 1/3 : backend prepare

Rien n'est applique ni deploye a cette etape. Ce document liste ce qui existe
dans le depot et ce qui reste a faire, dans l'ordre.

## Perimetre fonctionnel

Deux evenements seulement declenchent un push :

1. un nouveau message humain recu dans une conversation,
2. une nouvelle candidature recue par un proprietaire.

Les emails existants restent actifs et inchanges, delais compris. Aucune
promesse de suppression d'un canal par un autre tant qu'une preuve d'ouverture
n'existe pas.

## Fichiers

- `supabase/sql/pending/20260919_web_push.sql` : SQL **prepare, non applique**.
- `supabase/functions/_shared/web-push/` : helpers purs et testables
  (`auth.ts`, `config.ts`, `endpoint.ts`, `keys.ts`, `payload.ts`,
  `request.ts`, `transport.ts`).
- `supabase/functions/push-subscription/index.ts` : gestion cote membre.
- `supabase/functions/dispatch-web-push/index.ts` : envoi, service_role seul.
- `src/__tests__/web-push-backend.test.ts` : tests comportementaux.

## Objets SQL a appliquer plus tard

Tables `public.push_subscriptions` et `public.push_delivery_jobs` : RLS activee
et forcee, aucune policy pour `anon` ni `authenticated`, droits reserves a
`service_role`. Aucun endpoint, aucune cle, aucun contenu de message n'est
lisible depuis le client.

RPC reservees a `service_role` :

- `push_upsert_subscription(user_id, endpoint, endpoint_host, auth_key, p256dh_key, opt_in_messages, opt_in_applications)`
  refuse un endpoint deja rattache a un autre compte et plafonne a 5
  abonnements actifs par membre.
- `push_claim_jobs(limit)` : claim atomique `FOR UPDATE SKIP LOCKED`, plafond 20,
  et verification finale avant envoi (message toujours non lu, humain, non
  masque ; candidature toujours en attente et non vue ; destinataire toujours
  participant ou proprietaire ; abonnement toujours actif).
- `push_close_job(job_id, outcome, error_code)` et
  `push_disable_subscription(subscription_id, reason)`.

RPC ouvertes au membre authentifie, jamais a `anon` :
`push_my_subscriptions()` (sans endpoint), `push_set_my_preferences(...)`,
`push_delete_my_subscription(...)`. Chaque opt-in demande donc une action
authentifiee.

Triggers **additifs**, aucun trigger existant remplace :
`trg_push_enqueue_on_message` sur `public.messages` et
`trg_push_enqueue_on_application` sur `public.applications`. Ils sont
fail-open : une erreur ne fait jamais echouer l'ecriture du message ou de la
candidature, et le journal ne porte qu'un code d'erreur generique. Cooldown de
5 minutes par conversation, protege par un verrou consultatif transactionnel.
Aucun backfill historique.

## Configuration restant a creer

Variables backend, absentes du depot, a ajouter dans les secrets du projet :

- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT` (forme `mailto:` ou `https:`)

Sans ces trois valeurs, l'action `config` renvoie `enabled: false` et aucune
permission navigateur n'est demandee ; `subscribe` et l'envoi sont refuses.

## Reste a faire, hors de cette etape

1. Appliquer le SQL prepare, sur GO explicite.
2. Deployer les deux fonctions, sur GO explicite.
3. Planifier `dispatch-web-push` : aucun job planifie n'est cree ici.
4. Etapes 2 et 3 du lot : service worker et interface.
