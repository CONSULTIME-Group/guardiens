# Contrôle public du 02/10/2026, 07:00 UTC (lecture seule)

## Constat : la nouvelle version n'est toujours pas en ligne

| Domaine | push-sw.js | push-2 | nearby_sit | Handshake | Index JS |
|---|---|---|---|---|---|
| guardiens.fr | 200 (cf-cache-status BYPASS) | absent | absent | absent | index-BW9rjUUk.js |
| guardiens.lovable.app | 200 | absent | absent | absent | index-BW9rjUUk.js |

- ETag identique sur les deux domaines : f3f0a8d33b25824e2f46781475c3854d. Il s'agit de l'ancien worker. Cloudflare ne le garde pas en cache (BYPASS) : ce n'est pas un problème de cache.
- index-BW9rjUUk.js est l'index de la publication précédente (commit 34c724b).
- J'ai parcouru les 357 chunks référencés par cet index sur chaque domaine. Aucun ne contient « Tester sur cet appareil », « Nouvelles annonces près de chez » ni « Activer les notifications ».
- Je n'ai aucun outil pour consulter l'état de la publication 514ccd2f-b8ea-466e-92da-73e61cd37749. Seul le détail de la publication dans Lovable peut le montrer.

## Suite proposée (rien n'est fait sans votre accord)

1. Ouvrez le détail de la publication dans Lovable.
2. Si elle est marquée échouée ou bloquée : faites une seule nouvelle publication, sur votre GO explicite.
3. Ensuite : je refais ce même contrôle en lecture seule.
4. D'ici là : n'activez pas les nouvelles annonces et ne lancez aucun test sur votre Android, car l'ancien worker afficherait « nouveau message ».
