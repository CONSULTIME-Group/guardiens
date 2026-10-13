-- Lot Y1 (13/10/2026) : plafond de candidatures (décision du fondateur du
-- 13/10/2026) et défauts P1 de la passe 4 de l'audit (emails, notifications,
-- push).
--
-- 1. Plafond : une annonce qui atteint son plafond reste publiée, ouverte et
--    visible partout ; seules les nouvelles candidatures sont refusées par
--    trg_guard_application_sit_open (inchangé, erreur SIT_CLOSED « cette
--    annonce a reçu toutes les candidatures prévues »). Seul le propriétaire
--    ferme une annonce (accepting_applications). Les opérations du bloc 1 ont
--    été appliquées en base le 13/10/2026 à 18h ; ce fichier les consigne et
--    retire les deux fonctions devenues inutiles.

-- 1. Plafond de candidatures -----------------------------------------------

-- 1a. Plus de fermeture ni de réouverture automatique au plafond (appliqué le
--     13/10 à 18h). Les deux triggers du lot X3a sont retirés, puis leurs
--     fonctions, qui ne servent plus à rien.
DROP TRIGGER IF EXISTS trg_close_sit_when_application_cap_reached ON public.applications;
DROP TRIGGER IF EXISTS trg_reopen_sit_when_application_slot_freed ON public.applications;
DROP FUNCTION IF EXISTS public.close_sit_when_application_cap_reached();
DROP FUNCTION IF EXISTS public.reopen_sit_when_application_slot_freed();

-- 1b. Valeur par défaut du plafond portée à 10 (appliqué le 13/10 à 18h),
--     alignée sur DEFAULT_MAX_APPLICATIONS (src/lib/applicationCap.ts).
ALTER TABLE public.sits ALTER COLUMN max_applications SET DEFAULT 10;

-- 1c. Réouverture des 3 annonces publiées fermées par le rattrapage X3a
--     (appliqué le 13/10 à 18h, gardé ici en commentaire pour mémoire, à ne
--     pas rejouer) :
--
--   UPDATE public.sits s
--      SET accepting_applications = true
--    WHERE s.status = 'published'::sit_status
--      AND s.accepting_applications IS FALSE
--      AND s.max_applications IS NOT NULL
--      AND s.max_applications > 0
--      AND (
--        SELECT count(*) FROM public.applications a
--         WHERE a.sit_id = s.id
--           AND a.status NOT IN ('rejected'::application_status, 'cancelled'::application_status)
--      ) >= s.max_applications;
