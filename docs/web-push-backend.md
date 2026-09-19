# Notifications push, premier lot

Code backend et parcours mobile prepares et testes le 19 septembre 2026.
Application SQL, secrets, fonctions et publication a verifier dans la section
deploiement avant de considerer le service actif.

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
- `src/lib/web-push.ts`, `PushNotificationsSection.tsx`, `public/push-sw.js` :
  inscription volontaire, preferences par appareil, nettoyage a la deconnexion.
  Le service worker ne met aucune page ni donnee privee en cache.
- `scripts/test-web-push-db.mjs` : execution de la vraie migration dans PGlite,
  fixtures artificielles uniquement. Lancer avec `@electric-sql/pglite` disponible
  dans NODE_PATH, sans ajouter de dependance a l'application.

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
- `push_job_eligible(job_id)` : nouvelle verification juste avant transmission,
  incluant preferences actuelles, lecture, blocages et fin du bail de traitement.

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

Les tentatives dont la reponse reseau est incertaine et les claims expires ne
sont jamais rejoues. Seuls les refus explicites 429/5xx sont retentes, au maximum
trois essais avec attente croissante. Duree de vie des jobs : une heure. Historique
terminal conserve sept jours. Les erreurs de journalisation donnent une reponse
HTTP 500 au dispatcher ; une acceptation fournisseur ne prouve jamais la remise.

## Configuration restant a creer

Variables backend, absentes du depot, a ajouter dans les secrets du projet :

- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT` (forme `mailto:` ou `https:`)

Sans ces trois valeurs, l'action `config` renvoie `enabled: false` et aucune
permission navigateur n'est demandee ; `subscribe` et l'envoi sont refuses.

## Validation du code

100 tests Vitest reussis, dont 58 pour le push et 42 pour le parcours
d'installation existant. 25 controles PostgreSQL/PGlite reussis sur les vraies
RPC et les triggers. Compilation Vite en mode development reussie, sans appel
de purge de production. Les tests utilisent des transports simules, aucun
message reel ni push de test envoye. La verification TypeScript globale a aussi
signale des erreurs preexistantes dans lazy-with-retry-guard.test.ts et
AdminAnalytics.tsx, hors de ce lot.

Ces tests ne remplacent pas un essai sur un appareil physique avec consentement.
Sous iOS/iPadOS, ouverture depuis l'icone ajoutee a l'ecran d'accueil et
permission accordee par geste utilisateur requises (iOS/iPadOS 16.4 minimum).
Sources : [WebKit](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/),
[MDN Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API),
[web-push](https://github.com/web-push-libs/web-push).

## Deploiement

Au 19 septembre 2026 a 12:32:52 UTC, lecture DB : aucune des deux tables push
n'existe et aucun cron push n'est configure. Le code n'est pas active en
production. La revue automatique a refuse la publication directe sur main,
car le GO de developpement ne couvre pas clairement cette publication.
Le lot complet doit etre relu dans la PR avant approbation explicite de la
fusion, du SQL, des cles, des fonctions et de la publication frontend.

Le controle visuel sur navigateur reel n'a pas pu etre execute dans cet
environnement : Chromium absent, telechargement termine en timeout. Les tests
de rendu et d'interaction mentionnes plus haut utilisent jsdom. La reception
sur telephone physique reste a verifier apres activation volontaire.

1. Appliquer le SQL prepare, sur GO explicite.
2. Deployer les deux fonctions, sur GO explicite.
3. Appliquer `supabase/sql/pending/20260919_web_push_cron.sql` : un passage par
   minute, cinq jobs maximum, timeout HTTP 50 secondes. Cle lue dans Vault,
   jamais dans le SQL en clair. Aucun job existant remplace et aucun appel
   immediat. Desactivation possible par `cron.unschedule` sur ce seul nom.
4. Publier le service worker et les reglages, puis verifier une inscription sur
   appareil physique. Aucun compte n'est abonne automatiquement.
