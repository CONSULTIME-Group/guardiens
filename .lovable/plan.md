# Diagnostic : double alerte La Rochelle reçue par Claire

## Preuve (lecture seule, table mass_email_sends)
Adresse clairepoimboeuf@orange.fr, profil 3561bc39, un seul profil à ce nom.

| Date (UTC) | Campagne | Rayon | ID fournisseur | Statut |
|---|---|---|---|---|
| 02/10 10:58:34 | b5240019 | 80 km | 01a0fc44-115a-7301-a5e9-b13b21357aff | ouvert 11:04 |
| 02/10 10:58:44 | 17e72026 | 180 km | 01a0fc44-378c-78e2-a8d3-c40d3b7bcb39 | ouvert 11:04 |

Les deux emails : circuit `send-mass-email-proximity` (segment proximity), filtre mission_id e5724f3e (plantation), objet « Près de chez vous, Gaelle cherche un coup de main », mission_type besoin. Deux ID fournisseur distincts, 10 secondes d'écart.

## Cause établie
Élargissement du rayon de 80 à 180 km : le second envoi ne connaissait pas le premier. Aucun digest, aucune vague automatique, aucun autre profil ni adresse en cause (email_send_log : seulement owner-departure-question le 30/09). Le reclassement en projet n'y est pour rien. Ce n'est pas un nouveau défaut : c'est exactement l'incident du 02/10.

## Digest et vague
Pas impliqués ici. Dédup existante : vague = email_send_log, clé mission-wave-<id>-, et mission_notification_queue par membre ; le correctif prêt les ajoute aussi aux exclusions de l'envoi de proximité. La réapparition d'une annonce dans le digest n'est pas en cause dans ce cas.

## Correctif minimal recommandé
Aucun nouveau code. Le correctif anti-double-envoi est déjà prêt, testé, mais pas encore déployé (commits fb2de36c7 à 05b8c6993). Son test 80 puis 180 km reproduit ce cas. Avec votre GO : déployer la fonction send-mass-email-proximity, puis publier le site. Pas de migration.
