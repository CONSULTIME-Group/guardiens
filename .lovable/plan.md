# Entraide, nouveau modèle, lot 1 : le moteur

« Un besoin, dix personnes du coin, un je peux. » Ce lot construit le moteur de diffusion par vagues, la réponse « Je peux » et la fin des offres. Ni refonte du hub ni refonte du détail.

## Vérifications faites en base

- `small_missions` : 3 besoins ouverts, 8 offres ouvertes, 1 offre en cours, 2 offres annulées. Les 8 offres ouvertes existent bien.
- `profiles.available_for_help` : 716 membres à true, dont 712 géolocalisés (la spec cite 582, chiffre à corriger).
- `mission_audience(lat, lng, category, exclude)` filtre déjà auteur, opt-out email, adresses supprimées, rayon déclaré, mais applique aussi un filtre de compétence dès que 8 candidats ou plus le passent, et ne renvoie ni ordre ni plafond.
- `enqueue_helpers_for_new_mission` (trigger) remplit `mission_notification_queue` (colonnes : helper_id, mission_id, distance_km, status, skip_reason, queued_at, sent_at). Pas de colonne de vague.
- Envoi actuel : `send-mission-daily-digest`, cron horaire à la minute 15, top 3 par personne, un email groupé toutes les 24 h. Ce n'est pas l'envoi immédiat demandé.
- `application_action_tokens` est lié par clé étrangère à `applications` : il ne peut pas porter un jeton de mission. Le mécanisme est réutilisable, pas la table.
- `profiles.helps_with` n'existe pas.
- `accept_mission_response` existe déjà : passe la mission en `in_progress`, refuse les autres réponses en option, crée la conversation et pose un message système.
- Cron `auto_close_small_missions_daily` à 3 h.

## Ce que je propose de faire différemment

1. **Ne pas modifier `mission_audience`** (utilisée par la file, le comptage et le bloc d'invitation). J'ajoute `mission_wave_audience(mission_id, limit, offset)` : proximité seule, sans compétence, tri par distance, exclusion de l'auteur, des personnes bloquées dans les deux sens, des désinscrits et des adresses supprimées.
2. **Envoi immédiat, pas digest.** Une nouvelle fonction `notify-mission-wave` envoie la vague de 10 à la publication et les vagues suivantes. Pour éviter le double envoi, `send-mission-daily-digest` ignore les lignes portant un numéro de vague. C'est un changement de comportement partagé, je le signale et j'attends votre accord dans le GO.
3. **Jeton dédié.** Nouvelle table `mission_action_tokens` (mission_id, helper_id, action, token, expires_at, used_at) et fonction `mission-quick-action`, copie fidèle de `application-quick-action` : rien sur GET, exécution sur POST, usage unique.
4. **Migration des 8 offres : pas dans une migration.** La règle interne interdit le DML de données en migration. Je fais la reprise par requêtes, après une table de sauvegarde datée, et seulement sur demande explicite.

## Découpage

**A. Base (migrations)**
- `mission_notification_queue` : colonne `wave` (entier, nullable).
- `small_missions` : colonnes `last_wave_at`, `wave_count` (nullable, défaut 0).
- `profiles.helps_with` (texte, nullable, contrainte 200 caractères).
- `mission_action_tokens` + GRANT + RLS (aucun accès client, service_role seul).
- Fonctions : `mission_wave_audience`, `enqueue_mission_wave`, `peek_mission_action_token`, `consume_mission_action_token`, `mission_can_help` (crée la réponse, notifie l'auteur).
- Garde-fou : `validate_small_mission` refuse désormais la création d'une mission `offre`.
- Trigger anti-argent étendu à `profiles.helps_with`.
- `COMMENT ON` de dépréciation, aucun DROP.

**B. Fonctions edge**
- `notify-mission-wave` (nouvelle) : vague 1 à la publication, vagues suivantes à 48 h sans « je peux », email et notification « <Prénom>, à <X> km, a besoin de quelqu'un pour <titre>, <date> », boutons « Je peux » (jeton) et « Voir le détail ». Aucune donnée personnelle hors prénom, ville et distance arrondie.
- `mission-quick-action` (nouvelle) : consomme le jeton, crée la réponse, journalise `mission_can_help` avec la source.
- Relance auteur : « Personne n'a encore pu, on prévient dix autres personnes du coin. » Et, si aucune personne disponible à moins de 30 km, le message honnête du bloc « quand la personne touche le vide », le besoin restant visible dans le fil.
- `auto-close-small-missions` : un besoin ouvert dont la date de fin est passée se ferme automatiquement.
- Cron : passage horaire sur `notify-mission-wave` pour les vagues et les relances.

**C. Interface (strict minimum)**
- `CreateSmallMission.tsx` : un seul écran, plus de choix besoin/offre, plus de champ contrepartie (phrase fixe enregistrée), plus de catégorie (valeur `other`), titre, date ou période, lieu, photo facultative. Garde-fou argent et coordonnées conservé sur titre et description.
- `SmallMissionDetail.tsx` : bouton « Je peux » pour les membres connectés.
- `MissionResponseCard.tsx` : carte de réponse côté demandeur, prénom, photo, distance, écussons, avis, ligne « ce que je propose volontiers », bouton « C'est parti » qui ouvre la conversation avec le message pré-écrit. Les autres reçoivent « Merci, c'est pourvu ».
- Profil : champ « helps_with » avec son texte d'aide.

**D. Mesure**
- Événement `mission_can_help` avec sa source, plus une requête admin documentée : nombre de « je peux » par besoin sur les dix derniers besoins.

## Tests (vitest)

Sélection des dix plus proches, vague suivante à 48 h, jeton valide, expiré et déjà utilisé, « c'est pourvu », expiration à la date, reprise des offres sous PGlite.

## Points de risque

- Double envoi digest et vague, traité au point 2 ci-dessus.
- Le trigger de publication remplit aujourd'hui la file sans limite : la vague plafonne à l'envoi, pas à la mise en file, pour garder la trace complète.
- Les besoins déjà en file avant ce lot n'ont pas de vague et restent traités par le digest.
- Le modèle repose sur la géolocalisation : 4 membres disponibles sur 716 n'ont pas de coordonnées, ils ne recevront rien.

## Hors périmètre

Hub, carte, textes éditoriaux, publication et déploiement. Aucune écriture de données sans demande explicite.
