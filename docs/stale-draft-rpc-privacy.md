# Restriction du détecteur de brouillons anciens

Statut : **appliqué en production après GO le 19 septembre 2026 à 19:48 UTC**.

## Défaut confirmé le 19 septembre 2026

À 19:36:45 UTC, `detect_stale_drafts()` est SECURITY DEFINER et exécutable
par anon, authenticated et service_role. Elle retourne les adresses, prénoms,
identifiants des propriétaires et informations de leurs brouillons. La lecture
agrégée serveur compte 11 résultats. Aucune donnée personnelle n'a été extraite
pour ce contrôle, aucun appel HTTP anonyme d'exfiltration effectué. Ces droits
et ce corps établissent une exposition ; ils ne prouvent pas une exploitation.

Empreinte du corps relu : MD5 `a7fda54342876f1449ad6f207589e771`.
ACL initiale : postgres, anon, authenticated et service_role ont EXECUTE.
La fixture SQL conserve la définition exacte sans aucune donnée de production.

## Lot minimal

Le SQL `supabase/sql/pending/20260919_stale_draft_rpc_privacy.sql` retire
EXECUTE à PUBLIC, anon et authenticated, en conservant service_role.
Une garde refuse les changements de définition et un contrôle final refuse
les droits hérités inattendus. La transaction ne change ni corps ni signature,
ni propriétaire, ni données, ni horaires.

Les deux appelants trouvés dans le dépôt sont dans `nudge-stale-draft` et
utilisent le client service_role. La carte d'administration appelle l'Edge en
mode manual, avec vérification serveur de l'utilisateur et de son rôle admin ;
elle n'appelle pas directement cette RPC. Aucun déploiement Edge ou frontend
n'est nécessaire pour cette restriction.

## Validation

12 contrôles PGlite réussis : reproduction de l'accès avant correctif pour les
deux rôles publics, refus après, résultats serveur identiques, absence de
modification des données et du corps, fonctions tierces intactes, répétition,
retrait des droits PUBLIC, arrêt sur définition divergente ou droits hérités.

```sh
PGLITE_MODULE=/absolute/path/to/pglite/dist/index.js node scripts/test-stale-draft-rpc-privacy.mjs
```

## Procédure d’application et contrôles

Relire définition, ACL et cron 485. Appliquer ce seul SQL puis vérifier les
droits effectifs, le corps identique et les agrégats serveur. Ne pas déclencher
de relance, Edge, cron ou envoi. Tracer la migration dans Git. Prochain passage
naturel connu du cron : 20 septembre 07:00 UTC / 09:00 Paris. Cron 485 actif,
horaire `0 7 * * *`, empreinte `17fb552d72e718531a7ceccd71f28abc`.
Son dernier passage du 19 septembre 07:00 UTC est success : 11 détectés,
11 signaux déjà présents, zéro email, zéro erreur.

## Chantiers séparés conservés

- Brouillons : 13 signaux ouverts, dont un critique expiré et un warning dont
  l'annonce a disparu ; 11 correspondent encore au détecteur.
- Discussions : quatre signaux ouverts ; une critique et une warning ont une
  candidature terminée et une annonce inéligible. Deux restent détectées.
- Villes : cinq critiques correspondent encore à zéro gardien dans 30 km ;
  une critique a désormais un ou deux gardiens. Parmi les 19 warnings, une
  ville a atteint le seuil de trois, 18 restent sous ce seuil.
- Dans le code actuel, `nudge-stale-draft` en mode cron et
  `nudge-untapped-cities` ne comportent pas de garde interne d'appelant.
  Leur protection HTTP effective reste à vérifier sans appel métier.
- Le producteur villes déduplique par semaine tandis que l'index unique des
  signaux ouverts porte seulement sur type et entité : risque de conflit
  inter-semaines et d'échec de l'insertion groupée, à reproduire séparément.
- Le passage discussions du 19 septembre 17:00 UTC est partial avec deux
  erreurs ; leur cause doit être qualifiée séparément. Ne pas assimiler HTTP
  200 ou réussite pg_cron à une réussite métier.

Ne pas fermer ces signaux en masse, changer leur gravité arbitrairement ou
élargir ce lot de permissions à ces autres corrections.

## Résultat du contrôle après application

Précontrôle à 19:48:02.138844 UTC, postcontrôle à 19:48:19.735423 UTC :
corps MD5 `a7fda54342876f1449ad6f207589e771` identique, propriétaire postgres,
SECURITY DEFINER et search_path public conservés. ACL désormais limitée à
postgres et service_role ; anon/authenticated refusés. 11 résultats éligibles
en agrégat serveur avant et après. Cron 485 et son empreinte inchangés.
Les appels SQL réels des deux rôles publics sont refusés (42501), l'appel
service_role réussit avec le même compte de 11 résultats. Aucune donnée
personnelle affichée, aucune relance ni aucun envoi déclenché.

Le chemin `sql/pending` est conservé pour la traçabilité de revue et des tests ;
il ne signifie plus que ce SQL attend une application de production.
Le passage naturel de demain reste à observer ; ce contrôle ne le remplace pas.
