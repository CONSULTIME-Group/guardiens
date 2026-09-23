# Lot E5, Entraide : une seule diffusion par besoin

## Ce qui est constaté dans le code et la base

- Les trois fonctions corrigées à la main portent bien `SET search_path TO 'public', 'extensions'` en base (`enqueue_mission_wave`, `emit_mission_meetup_tokens`, `my_mission_meetup_tokens`), mais les fichiers `drizzle/migrations/0009`, `0013` et `0014` gardent l'ancienne définition : une redéfinition future ramènerait la panne.
- Chemins qui diffusent un besoin aujourd'hui, hors vagues :
  1. **Déclencheur base `trg_notify_helpers_on_new_mission`** sur `small_missions`, fonction `enqueue_helpers_for_new_mission()` : à l'insertion, il met en file **toute** l'audience `mission_audience()` (les 72 personnes de Lyon), sans numéro de vague.
  2. **`send-mission-daily-digest`** (cron 69, `15 * * * *`) : vide cette file et envoie. Il écarte déjà les lignes portant un numéro de vague.
  3. **`send-nearby-daily-digest`** (cron 109) : inclut les besoins ouverts de moins de 24 h dans le digest de proximité.
  4. **`send-weekly-nearby-digest`** (cron 653) : inclut les besoins ouverts de la semaine.
  - Vérifié sans diffusion de besoin : `send-mutual-aid-weekly-digest` (aucune lecture de `small_missions`), `send-mission-nudges` (auteur et répondants seulement), `notify-mission-event`, `dispatch-web-push`, `send-alert-digest`.
- Compteur du formulaire : `count_mission_notification_audience` s'appuie sur `mission_audience()`, qui accepte aussi `owner_profiles.competences_disponible` et applique un rayon élargi pour la catégorie projet. La vague, elle, passe par `mission_wave_audience()` : `available_for_help` seul. Les deux nombres peuvent donc différer.
- Bouton de l'email n°1 : `https://guardiens.fr/dashboard?utm_source=email&utm_medium=email&utm_campaign=entraide_ligne`. `HelpsWithReminder` n'a aucune ancre et se monte seulement si `helps_with` est vide.

## Décision sur le cron 69

Après suppression de la mise en file automatique, `mission_notification_queue` ne reçoit plus que des lignes de vague, que le digest ignore déjà : il n'aurait plus rien à traiter. **Le cron 69 est désactivé** (`cron.unschedule`), la fonction reste en place pour un rattrapage manuel des lignes historiques.

## 1. Alignement code et base

`drizzle/migrations/0017_entraide_search_path_and_single_wave.sql` :

```sql
ALTER FUNCTION public.enqueue_mission_wave(uuid, integer) SET search_path = public, extensions;
ALTER FUNCTION public.emit_mission_meetup_tokens(uuid) SET search_path = public, extensions;
ALTER FUNCTION public.my_mission_meetup_tokens(uuid) SET search_path = public, extensions;

-- Diffusion unique : le déclencheur historique laisse les besoins aux vagues.
CREATE OR REPLACE FUNCTION public.enqueue_helpers_for_new_mission()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
begin
  if new.status <> 'open' or new.latitude is null or new.longitude is null then
    return new;
  end if;
  if new.mission_type = 'besoin' then
    return new;
  end if;
  insert into public.mission_notification_queue (helper_id, mission_id, distance_km)
  select a.helper_id, new.id, a.distance_km
  from public.mission_audience(new.latitude::double precision, new.longitude::double precision,
                               new.category::text, new.user_id) a
  on conflict (helper_id, mission_id) do nothing;
  return new;
end;
$$;

-- Compteur du formulaire aligné sur la vague, mêmes filtres, même rayon.
CREATE OR REPLACE FUNCTION public.mission_wave_audience_preview(p_lat double precision, p_lng double precision)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  select count(*)::integer
  from public.profiles p
  left join public.email_preferences ep on ep.user_id = p.id
  left join public.suppressed_emails se on lower(se.email) = lower(p.email)
  cross join lateral (select 6371 * acos(least(1.0, greatest(-1.0,
      cos(radians(p_lat)) * cos(radians(p.latitude::double precision))
      * cos(radians(p.longitude::double precision) - radians(p_lng))
      + sin(radians(p_lat)) * sin(radians(p.latitude::double precision))))) as dist) d
  where p_lat is not null and p_lng is not null
    and p.id is distinct from auth.uid()
    and coalesce(p.available_for_help, false)
    and coalesce(p.account_status, 'active') = 'active'
    and p.email is not null
    and p.latitude is not null and p.longitude is not null
    and coalesce(ep.new_mission_digest, true) = true
    and coalesce(ep.product_emails, true) = true
    and se.email is null
    and d.dist <= public.mutual_aid_radius_km(p.id);
$$;

REVOKE ALL ON FUNCTION public.mission_wave_audience_preview(double precision, double precision) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mission_wave_audience_preview(double precision, double precision) TO authenticated, service_role;

SELECT cron.unschedule(69);
```

Les définitions d'origine de `0009`, `0013` et `0014` reçoivent le même `SET search_path` (copie de lecture, sans réexécution).

## 2. Une seule diffusion

- `supabase/functions/_shared/mission-wave.ts` : `WAVE_MAX_COUNT = 3`, `shouldSendNextWave` rend faux au-delà de trois vagues.
- `supabase/functions/notify-mission-wave/index.ts` : plafond appliqué aussi à la publication, et heures calmes déjà en place (un besoin créé à 23 h part au passage de 8 h 25).
- `supabase/functions/send-nearby-daily-digest/index.ts` et `send-weekly-nearby-digest/index.ts` : requêtes filtrées sur `mission_type = 'offre'`.
- `supabase/functions/send-mission-daily-digest/index.ts` : filtre explicite sur les besoins, en plus du filtre de vague.

## 3. Vraie promesse dans le formulaire

`src/pages/CreateSmallMission.tsx` appelle `mission_wave_audience_preview`, affiche `min(n, 10)` et, sous dix : « Les {n} personnes disponibles autour de chez vous seront prévenues. » Au-delà, la phrase actuelle des dix plus proches reste.

## 4. Gardes redirigées

Nouveau module `src/lib/missionSitRedirect.ts` : `looksLikeMultiDaySit(title, description, dateNeeded, endDate)`, vocabulaire (garde, garder, pendant les vacances, pendant X jours, semaines, mois, Noël, séjour, nourrir pendant mon absence) ou écart de dates supérieur à deux jours. Bloc affiché à l'étape de publication dans `CreateSmallMission.tsx` : titre, texte, bouton « Publier une annonce de garde » vers `/sits/create` avec titre, dates et ville repris via `writeSitPrefill`, lien secondaire « Publier quand même un besoin ». Formulations affirmatives.

## 5. Email n°1 et ancre du tableau de bord

- `entraide-ligne-helps-with.tsx` : `CTA_URL` pointe sur `/dashboard#ce-que-je-propose`, UTM inchangés.
- `HelpsWithReminder.tsx` : `id="ce-que-je-propose"`, ouverture dépliée et focus sur le champ quand l'ancre est présente.
- `src/pages/Login` (retour de connexion) : conservation du fragment d'URL pour revenir sur l'ancre.

## 6. Textes

- `WAVE_RELAUNCH_MESSAGE` devient « On prévient dix autres personnes du coin. »
- Réécritures proposées, mêmes surfaces :
  - `WAVE_EMPTY_MESSAGE` : « Autour de vous, les personnes disponibles se comptent pour le moment sur zéro. C'est la vérité du jour : votre besoin reste visible, et je préviens dès qu'une personne du coin se rend disponible. »
  - Notification « Votre demande reste visible » : inchangée, déjà affirmative.
  - Notification de relance, titre « On prévient dix autres personnes » : inchangé.

## Tests

- Vitest : plafond de trois vagues, heures calmes (création à 23 h, envoi à 8 h), redirection garde (5 cas positifs, 5 négatifs dont « nourrir les poules samedi »), texte de relance, ancre du tableau de bord, compteur du formulaire aligné sur la vague.
- `test:sql` : ajout dans `scripts/test-entraide-wave-engine.mjs` d'un appel de chaque fonction en transaction annulée, plus un contrôle générique sur `pg_proc` : toute fonction du schéma public appelant `gen_random_bytes`, `digest` ou `crypt` sans préfixe doit porter `extensions` dans son `search_path`.
- `tsc` et build.

## Après votre GO

Code, tests, migration 0017, puis redéploiement de `notify-mission-wave`, `send-nearby-daily-digest`, `send-weekly-nearby-digest`, `send-mission-daily-digest`, `send-transactional-email`. Aucune publication du site sans votre mot.
