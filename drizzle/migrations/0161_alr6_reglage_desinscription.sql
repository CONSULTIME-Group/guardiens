-- Lot ALR6 (14/11/2026) : une ancienne désinscription totale se lève quand le
-- membre rallume une famille d'emails depuis son compte. Audit du système
-- d'alertes du 14/11/2026 (claude/audit-systeme-alertes-14-novembre-2026.md,
-- constat A8), demande de Jérémie : « il faut le faire aussi la gestion des
-- emails ». Repère : alr6_reglage_desinscription. Rejouable, aucune donnée
-- modifiée par la migration.
--
-- Avant ce lot, le clic de désinscription de la messagerie inscrivait
-- l'adresse dans suppressed_emails (motif unsubscribe) et consommait le jeton :
-- plus rien ne partait, messages des membres compris, et rallumer une famille
-- dans « Préférences email » restait sans effet. Mesure du 14/11/2026 : 121
-- adresses de membres actifs dans ce cas.
--
-- public.lift_my_unsubscribe() : pour le membre connecté seulement, retire sa
-- ligne suppressed_emails de motif unsubscribe (rebonds, plaintes et compte
-- supprimé restent) et réactive son jeton de désinscription. Appelée par la
-- page « Préférences email » quand le membre garde au moins une famille.

CREATE OR REPLACE FUNCTION public.lift_my_unsubscribe()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  -- alr6_reglage_desinscription
  v_email text;
  v_lifted integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  SELECT lower(p.email) INTO v_email FROM public.profiles p WHERE p.id = auth.uid();
  IF v_email IS NULL OR v_email = '' THEN
    RETURN false;
  END IF;
  DELETE FROM public.suppressed_emails s
  WHERE lower(s.email) = v_email
    AND s.reason = 'unsubscribe';
  GET DIAGNOSTICS v_lifted = ROW_COUNT;
  IF v_lifted > 0 THEN
    UPDATE public.email_unsubscribe_tokens t
    SET used_at = NULL
    WHERE lower(t.email) = v_email
      AND t.used_at IS NOT NULL;
  END IF;
  RETURN v_lifted > 0;
END;
$function$;

REVOKE ALL ON FUNCTION public.lift_my_unsubscribe() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lift_my_unsubscribe() FROM anon;
GRANT EXECUTE ON FUNCTION public.lift_my_unsubscribe() TO authenticated, service_role;
