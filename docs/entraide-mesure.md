# Entraide, mesure du nouveau modèle

Événement analytics : `mission_can_help`, propriété `source` valant `email`
(bouton « Je peux » d'un courriel de vague) ou `page` (fiche du besoin).

Requête de suivi : nombre de « je peux » par besoin, sur les dix derniers
besoins publiés.

```sql
SELECT m.id,
       m.title,
       m.created_at::date AS publie_le,
       m.wave_count,
       count(r.id) AS je_peux
FROM public.small_missions m
LEFT JOIN public.small_mission_responses r ON r.mission_id = m.id
WHERE m.mission_type = 'besoin'
GROUP BY m.id, m.title, m.created_at, m.wave_count
ORDER BY m.created_at DESC
LIMIT 10;
```

Taux de conversion d'une vague (personnes prévenues qui répondent) :

```sql
SELECT q.mission_id,
       q.wave,
       count(*) AS prevenus,
       count(r.id) AS je_peux
FROM public.mission_notification_queue q
LEFT JOIN public.small_mission_responses r
       ON r.mission_id = q.mission_id AND r.responder_id = q.helper_id
WHERE q.wave IS NOT NULL
GROUP BY q.mission_id, q.wave
ORDER BY q.mission_id, q.wave;
```

Repères de départ : 716 membres visibles dans l'entraide, dont 712 localisés.
