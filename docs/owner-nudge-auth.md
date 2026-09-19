# Protection de la relance des propriétaires

Statut : **déployé en production le 19 septembre 2026 à 20:19:29 UTC**, sur la
seule Edge `nudge-owner-pending-application`. Base distante relue :
`0ef9c881f22fc3a588cceccf703d708e9aaca588`.

## Défaut et périmètre

Dans le handler `nudge-owner-pending-application`, le mode manual vérifie
l'utilisateur et son rôle admin, mais le mode cron n'a pas de contrôle interne
de l'appelant. Le code peut alors lire les détecteurs, écrire les signaux et
demander des emails. Aucun appel métier public n'a été effectué en production
pour exploiter ou confirmer ce défaut. La passerelle vérifie normalement le
JWT par défaut ; cela ne constitue pas un contrôle du rôle administrateur.
Les métadonnées de la version réellement déployée n'étaient pas accessibles.

Quatre lignes ajoutées au seul handler de production : import et appel du
garde existant `requireAdminOrServiceRole`, avant client métier, feature flag,
lecture du corps, journalisation et traitements. OPTIONS reste public.
La clé service exacte et les sessions admin restent acceptées. Les contrôles
spécifiques du mode manual, les détecteurs et l'anti-doublon sont inchangés.
Pas de changement du garde partagé, de SQL, cron, configuration ou frontend.

## Vérification locale

Le handler et le garde réels sont exécutés avec dépendances inertes et réseau
interdit. Avant correction : 9 tests échouent, 7 passent. Après correction :
16 tests ciblés passent, ainsi que 40 tests des autres fonctions planifiées.
Total : **56 contrôles réussis**.

Couverture : appels sans jeton, clé publique, faux rôle service, session
expirée, membre non admin en deux modes, erreur de lecture du rôle, service et
admin en cron vide, recherche manuelle admin, contrôle utilisateur manuel
préservé, feature flag, erreur détecteur, OPTIONS, apikey seule, GET public.
Les tests ne valident pas la délivrabilité email et n'envoient rien.

```sh
npx vitest run src/__tests__/owner-nudge-auth.test.ts src/__tests__/scheduled-functions-auth.test.ts
```

## Déploiement effectué sur cette seule Edge

Intégration des fichiers, puis déploiement de la seule fonction
`nudge-owner-pending-application` le 19 septembre 2026 à 20:19:29 UTC. Aucun
appel service ou admin de test n'a été effectué : aucun mode sec fiable n'est
établi ici. Contrôles publics relevés juste après déploiement, sans traitement
métier : OPTIONS 200, POST sans identifiants 401, POST avec clé publique seule
401, POST avec jeton public légitime 401, POST avec faux jeton de rôle service
(signature invalide) 401. Aucune ligne `cron_run_log` créée par ces contrôles
(vérification à 20:20 UTC, 0 ligne depuis 20:15 UTC). Aucun email, aucun
signal, aucun envoi. La preuve métier reste attendue au prochain passage
naturel. Cron 142 relu le 19 septembre à 20:09:07 UTC : actif,
`0 9,17 * * *`, clé service Vault référencée, empreinte
`c25454c33f090cb7970d75e63216e548`. Prochain passage connu : 20 septembre
09:00 UTC / 11:00 Paris. Frontend non publié, crons non modifiés.

## Deux autres constats, non corrigés par ce lot

1. Le passage du 19 septembre 17:00:08–17:00:19 UTC contient deux erreurs dans
   la boucle discussions. Les journaux Edge consultables à 20:09 ne couvrent
   que 20:00–20:09 ; aucune trace détaillée de 17:00 disponible. Aucun email
   journalisé entre 16:55 et 17:10. Cause, code SQL et statut HTTP inconnus.
   Les compteurs sont compatibles avec un échec d'insertion OU un retour
   failed du sender ; l'absence de ligne email ne permet pas de choisir.
2. Le contrôle anti-doublon local des deux helpers lit seulement message_id,
   tandis que le sender stocke la clé stable sous metadata.idempotency_key.
   À 20:09:27 UTC, les deux discussions encore détectées ont déjà un sent
   correspondant via metadata, zéro correspondance via message_id. Le défaut
   entraîne des appels inutiles ; il ne prouve ni doublon livré ni cause des
   deux erreurs. Préparer une correction séparée, compatible avec les anciens
   journaux, sans relance de rattrapage.

Conserver aussi les tâches de protection des Edge brouillons/villes,
réconciliation ciblée des signaux périmés et idempotence du producteur villes.
