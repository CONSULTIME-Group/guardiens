CREATE OR REPLACE FUNCTION public.auto_archive_past_sits()
 RETURNS TABLE(started integer, ended integer, archived_published integer, archived_finished integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_started int := 0;
  v_ended int := 0;
  v_arch_pub int := 0;
  v_arch_fin int := 0;
BEGIN
  -- Autorise les cascades internes vers public.profiles (recalcul compteurs).
  PERFORM set_config('app.allow_internal_profile_update', 'on', true);

  -- La transition 'confirmed' vers 'in_progress' n'est plus faite ici.
  -- Elle appartient desormais exclusivement a l'edge function
  -- auto-transition-sits, seule a poster le message systeme
  -- "Le guide de la maison est disponible" et les notifications associees.
  -- Un basculement silencieux ici faisait perdre ces effets de bord.
  v_started := 0;

  -- La transition 'in_progress' vers 'completed' n'est plus faite ici.
  -- Elle appartient desormais exclusivement a l'edge function
  -- auto-transition-sits, seule a envoyer la notification
  -- "Garde terminee" au proprietaire et au gardien accepte, avec le lien
  -- vers le depot d'avis. Un basculement silencieux ici priverait les deux
  -- parties de cette notification et empecherait l'edge function de
  -- retrouver la garde a traiter.
  v_ended := 0;

  WITH u AS (
    UPDATE public.sits SET status = 'archived'
     WHERE status = 'published' AND end_date < CURRENT_DATE
     RETURNING 1
  ) SELECT count(*) INTO v_arch_pub FROM u;

  WITH u AS (
    UPDATE public.sits SET status = 'archived'
     WHERE status IN ('completed','cancelled') AND end_date < CURRENT_DATE - INTERVAL '7 days'
     RETURNING 1
  ) SELECT count(*) INTO v_arch_fin FROM u;

  RETURN QUERY SELECT v_started, v_ended, v_arch_pub, v_arch_fin;
END;
$function$
;