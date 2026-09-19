# Notifications push, premier lot

Code backend et parcours mobile prepares et testes le 19 septembre 2026.
SQL applique a 14:55 UTC, secrets installes a 15:06 UTC, deux fonctions
deployees a 15:07 UTC, cron installe a 15:08 UTC. La publication du frontend
et la reception reelle sur appareil restent en cours.

## Perimetre fonctionnel

Deux evenements seulement declenchent un push :

1. un nouveau message humain recu dans une conversation,
2. une nouvelle candidature recue par un proprietaire.

Les emails existants restent actifs et inchanges, delais compris. Aucune
promesse de suppression d'un canal par un autre tant qu'une preuve d'ouverture
n'existe pas.

## Fichiers

- `supabase/sql/pending/20260919_web_push.sql` : SQL applique en production le
  19 septembre 2026 a 14:55 UTC (empreinte sha256 fbe071b0..., RLS forcee,
  zero abonnement, zero job, 19 triggers existants preserves).
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

## Objets SQL appliques le 19 septembre 2026 a 14:55 UTC

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

## Configuration installee

Variables backend, absentes du depot, installees dans les secrets du projet le
19 septembre 2026 a 15:06 UTC (presence booleenne, aucune valeur affichee) :

- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT` (forme `mailto:` ou `https:`, valeur choisie `https://guardiens.fr`)

Sans ces trois valeurs, l'action `config` renverrait `enabled: false` et aucune
permission navigateur ne serait demandee ; `subscribe` et l'envoi seraient
refuses. Avec les trois installees, `config` repond `enabled: true`.

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

Historique conserve : au 19 septembre 2026 a 12:32:52 UTC, lecture DB, aucune
des deux tables push n'existait et aucun cron push n'etait configure. La revue
automatique avait refuse la publication directe sur main, le GO de
developpement ne couvrant pas clairement cette publication. Le lot complet a
ete relu puis approuve par GO explicite.

Etats successifs du 19 septembre 2026 :

1. 14:55 UTC : SQL applique en production, empreinte sha256 fbe071b0 conforme,
   RLS forcee, zero abonnement, zero job, 19 triggers existants preserves.
2. 15:06 UTC : trois secrets VAPID generes localement puis installes (presence
   booleenne seulement), aucune paire existante ecrasee, aucune valeur affichee.
3. 15:07 UTC : fonctions `push-subscription` et `dispatch-web-push` deployees,
   aucune autre fonction. Verifications HTTP sans effet metier : action
   `config` publique HTTP 200, `enabled: true`, cle publique de 87 caracteres,
   reponse limitee a `enabled` et `publicKey` ; `status` sans authentification
   refuse HTTP 401 ; `dispatch-web-push` sans authentification refuse HTTP 401.
4. 15:08:05 UTC : cron `dispatch-web-push` installe, job 1224 actif, un passage
   par minute, cinq jobs maximum, timeout HTTP 50 secondes, cle lue dans Vault,
   jamais dans le SQL en clair, aucun appel immediat. Desactivation possible
   par `cron.unschedule` sur ce seul nom.
5. Frontend : publication du service worker et des reglages en cours, pas encore
   faite. Aucun compte n'est abonne automatiquement.

`verify_jwt = false` est desormais fixe dans `supabase/config.toml` pour
`push-subscription` et `dispatch-web-push` : les deux handlers assurent eux
memes leur authentification (JWT membre ou cle de service stricte). Sans ces
entrees, un redeploiement ulterieur pourrait retablir le rejet JWT par defaut.

Limites conservees : le dispatcher n'a pas ete appele avec la cle de service,
aucun appareil inscrit, aucun message, candidature ni envoi declenche. La
reception reelle sur telephone physique n'est pas encore testee et reste a
verifier apres activation volontaire par un membre. Une acceptation par le
service de push du navigateur ne prouve jamais la remise.

Le controle visuel sur navigateur reel n'a pas pu etre execute dans cet
environnement : Chromium absent, telechargement termine en timeout. Les tests
de rendu et d'interaction mentionnes plus haut utilisent jsdom.
