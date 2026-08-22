-- Rattrapage 22/08/2026 : les accords signés côté propriétaire avant la mise en
-- place du trigger n'ont jamais notifié le gardien. On insère la notification
-- in-app (avec garde anti-doublon) pour les gardiens concernés.
INSERT INTO public.notifications (user_id, type, title, body, link, actor_name)
SELECT
  a.sitter_id,
  'accord_ready_for_sitter',
  'Votre accord de garde vous attend',
  coalesce(p.first_name, 'Le propriétaire') || ' a signé l''accord de garde pour « ' || coalesce(s.title, 'votre garde') || ' ». À vous de le lire et le signer.',
  '/sits/' || s.id,
  p.first_name
FROM public.garde_accords ga
JOIN public.sits s ON s.id = ga.garde_id
JOIN public.applications a ON a.sit_id = s.id AND a.status = 'accepted'
LEFT JOIN public.profiles p ON p.id = ga.user_id
LEFT JOIN public.garde_accords gs ON gs.garde_id = ga.garde_id AND gs.user_id = a.sitter_id AND gs.accepted
WHERE ga.role = 'proprio'
  AND ga.accepted
  AND gs.id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.notifications n
    WHERE n.user_id = a.sitter_id
      AND n.type = 'accord_ready_for_sitter'
      AND n.link = '/sits/' || s.id
  );