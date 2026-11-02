-- Lot MSG2 : la notification d'un message ouvre sa conversation.
CREATE OR REPLACE FUNCTION public.push_job_conversation(p_job_id uuid)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT m.conversation_id
  FROM public.push_delivery_jobs j
  JOIN public.messages m ON m.id = j.source_id
  WHERE j.id = p_job_id AND j.event_kind = 'message';
$function$;

REVOKE ALL ON FUNCTION public.push_job_conversation(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.push_job_conversation(uuid) TO service_role;
