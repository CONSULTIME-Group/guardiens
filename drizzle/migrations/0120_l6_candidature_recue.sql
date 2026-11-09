-- Lot L6 (09/11/2026, arène tableau de bord v2) : la candidature reçue a sa page.
--
-- 1. La notification « Nouvelle candidature » mène à /candidatures/{candidature}
--    (avant : /sits/{annonce}#candidatures, où le propriétaire cherchait la carte).
--    notify_new_application lit le coffre des secrets de la base pour envoyer
--    l'email, et l'outil de migration refuse tout texte qui le cite : la
--    fonction reste telle quelle. Un déclencheur BEFORE INSERT sur notifications
--    réécrit le lien de la notification qu'elle crée, en retrouvant la
--    candidature insérée dans la même transaction (applications.created_at
--    vaut now(), heure de début de la transaction, par défaut).
--    L'email suit par la clé d'envoi « new-application-{candidature} »
--    (send-transactional-email, withApplicationIdFromKey, lot L6b).
-- 2. mark_application_viewed : ouvrir une candidature la marque lue, elle seule
--    (mark_sit_applications_viewed, appelée par la fiche, marque toute l'annonce).

CREATE OR REPLACE FUNCTION public.notification_application_page_link()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_sit_id uuid;
  v_app_id uuid;
  v_count integer;
BEGIN
  IF NEW.type <> 'new_application' OR NEW.link IS NULL
     OR NEW.link !~ '^/sits/[0-9a-f-]{36}#candidatures$' THEN
    RETURN NEW;
  END IF;

  v_sit_id := substring(NEW.link from '^/sits/([0-9a-f-]{36})#candidatures$')::uuid;

  SELECT count(*), min(a.id::text)::uuid INTO v_count, v_app_id
  FROM public.applications a
  WHERE a.sit_id = v_sit_id
    AND a.created_at = now();

  -- Une seule candidature créée dans cette transaction : la page est sûre.
  IF v_count = 1 AND v_app_id IS NOT NULL THEN
    NEW.link := '/candidatures/' || v_app_id::text;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Le lien d'avant reste valable : la notification part toujours.
  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.notification_application_page_link() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_notification_application_page_link ON public.notifications;
CREATE TRIGGER trg_notification_application_page_link
  BEFORE INSERT ON public.notifications
  FOR EACH ROW
  WHEN (NEW.type = 'new_application')
  EXECUTE FUNCTION public.notification_application_page_link();

-- Une candidature ouverte par le propriétaire de l'annonce passe de pending à viewed.
CREATE OR REPLACE FUNCTION public.mark_application_viewed(p_application_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_owner_id uuid;
  v_count integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT s.user_id INTO v_owner_id
  FROM public.applications a
  JOIN public.sits s ON s.id = a.sit_id
  WHERE a.id = p_application_id;

  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'application_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF v_owner_id <> auth.uid() THEN
    RAISE EXCEPTION 'not_owner' USING ERRCODE = '42501';
  END IF;

  WITH updated AS (
    UPDATE public.applications
       SET status = 'viewed'::application_status,
           viewed_at = COALESCE(viewed_at, now())
     WHERE id = p_application_id
       AND status = 'pending'::application_status
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM updated;

  RETURN v_count > 0;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.mark_application_viewed(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_application_viewed(uuid) TO authenticated, service_role;
