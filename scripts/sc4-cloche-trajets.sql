-- Lot SC4, cloche ciblée « trajets » (10/11/2026, arène
-- claude/arene/2026-11-10-score-completion, décision R6 : une fois, aux seuls
-- gardiens actifs sur 90 jours qui n'ont jamais dit comment ils se déplacent).
--
-- À lancer UNE fois, après la publication du front des lots SC1 à SC4 (le
-- lien ouvre la question « Pour vos trajets sur place » du profil, paramètre
-- focus=trips). Rejouable sans doublon : un membre qui a déjà reçu cette
-- notification ne la reçoit pas une seconde fois.
--
-- Cible mesurée le 10/11/2026 : 661 gardiens.

-- 1. Aperçu (lecture seule).
SELECT count(*) AS cible
FROM public.profiles p
JOIN public.sitter_profiles s ON s.user_id = p.id
WHERE p.role IN ('sitter', 'both')
  AND p.account_status = 'active'
  AND p.last_seen_at > now() - interval '90 days'
  AND s.has_vehicle IS NULL;

-- 2. Envoi.
INSERT INTO public.notifications (user_id, type, title, body, link, actor_name)
SELECT p.id,
       'info',
       'Comment vous déplacez-vous pendant une garde ?',
       'Votre réponse rejoint votre profil, et les annonces qui demandent une voiture savent ce que vous proposez.',
       '/profile?section=profil&focus=trips',
       'Jérémie et Elisa'
FROM public.profiles p
JOIN public.sitter_profiles s ON s.user_id = p.id
WHERE p.role IN ('sitter', 'both')
  AND p.account_status = 'active'
  AND p.last_seen_at > now() - interval '90 days'
  AND s.has_vehicle IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.notifications n
    WHERE n.user_id = p.id
      AND n.link = '/profile?section=profil&focus=trips'
  );
