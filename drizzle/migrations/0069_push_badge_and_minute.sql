-- Lot N2 (11/10/2026) : pastille de l'icone et notifications plus rapides.
-- 1. push_unread_badge : nombre de messages non lus du titulaire d'un
--    abonnement, lu par dispatch-web-push (service_role) au moment de l'envoi.
--    Meme regle que le compteur du site (useNavBadgeCounts) : messages
--    d'autrui, non lus, dans les conversations du membre. Aucun contenu,
--    aucun identifiant renvoye.
-- 2. Job 1224 dispatch-web-push : chaque minute au lieu de cinq. Le corps
--    {"limit":5} est garde : 5 envois de 8 s au plus tiennent sous la fenetre
--    de reservation de 2 minutes. URL, en-tetes et lecture du coffre inchanges.

CREATE OR REPLACE FUNCTION public.push_unread_badge(p_subscription_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT count(*)::integer
  FROM public.push_subscriptions s
  JOIN public.conversations c ON c.owner_id = s.user_id OR c.sitter_id = s.user_id
  JOIN public.messages m ON m.conversation_id = c.id
  WHERE s.id = p_subscription_id
    AND m.read_at IS NULL
    AND m.sender_id IS NOT NULL
    AND m.sender_id <> s.user_id;
$function$;

REVOKE ALL ON FUNCTION public.push_unread_badge(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.push_unread_badge(uuid) TO service_role;

COMMENT ON FUNCTION public.push_unread_badge(uuid) IS
  'Lot N2 : nombre de messages non lus pour la pastille de l icone, service_role uniquement.';

DO $migration$
BEGIN
  IF (SELECT count(*) FROM cron.job WHERE jobid = 1224 AND jobname = 'dispatch-web-push') <> 1 THEN
    RAISE EXCEPTION 'Job 1224 dispatch-web-push introuvable';
  END IF;

  CREATE TABLE IF NOT EXISTS public._backup_cron_push_n2_20261011 AS
    SELECT jobid, jobname, schedule, active, command FROM cron.job WHERE jobid = 1224;
  ALTER TABLE public._backup_cron_push_n2_20261011 ENABLE ROW LEVEL SECURITY;
  REVOKE ALL ON TABLE public._backup_cron_push_n2_20261011 FROM PUBLIC, anon, authenticated;

  PERFORM cron.alter_job(job_id := 1224, schedule := '* * * * *');

  IF (SELECT count(*) FROM cron.job WHERE jobid = 1224 AND jobname = 'dispatch-web-push'
      AND schedule = '* * * * *' AND active) <> 1 THEN
    RAISE EXCEPTION 'Job 1224 non conforme apres reecriture';
  END IF;
END;
$migration$;