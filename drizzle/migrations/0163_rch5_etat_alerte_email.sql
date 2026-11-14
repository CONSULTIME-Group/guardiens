-- Lot RCH5 (14/11/2026) : état des emails d'alerte du membre connecté, lu par
-- la ligne d'alerte de la recherche. Arène « page Recherche » du 14/11/2026
-- (claude/arene/2026-11-14-recherche, plan v3 corrigé, décision 2 de Jérémie :
-- « migration de lecture, ligne d'alerte toujours vraie »). Repère :
-- rch5_etat_alerte_email. Rejouable, lecture seule, aucune donnée modifiée.
--
-- La ligne « Vos alertes : les nouvelles gardes à moins de {r} km de chez
-- vous, dès leur publication » ne doit s'afficher que si un email part
-- réellement. Les conditions sont celles de notify-sitters-on-publish
-- (l. 456 à 496) : rôle gardien, compte actif, adresse renseignée,
-- alert_emails non coupé, rythme immédiat, adresse absente de
-- suppressed_emails. Une ligne email_preferences absente vaut immédiat.
-- suppressed_emails n'est lisible que par le service : d'où SECURITY DEFINER,
-- limité au seul membre connecté.
--
-- Valeurs : 'immediate' (un email part à la publication), 'digest' (rythme
-- autre qu'immédiat, la ligne propose les préférences email), 'off' (rien ne
-- part : ligne masquée).

CREATE OR REPLACE FUNCTION public.my_alert_email_state()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  -- rch5_etat_alerte_email
  v_email text;
  v_status text;
  v_role text;
  v_alert boolean;
  v_freq text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN 'off';
  END IF;
  SELECT lower(p.email), p.account_status, p.role::text
    INTO v_email, v_status, v_role
  FROM public.profiles p WHERE p.id = auth.uid();
  IF v_email IS NULL OR v_email = '' THEN RETURN 'off'; END IF;
  IF v_status IS NOT NULL AND v_status <> 'active' THEN RETURN 'off'; END IF;
  IF coalesce(v_role, '') NOT IN ('sitter', 'both') THEN RETURN 'off'; END IF;
  IF EXISTS (SELECT 1 FROM public.suppressed_emails s WHERE lower(s.email) = v_email) THEN
    RETURN 'off';
  END IF;
  SELECT ep.alert_emails, ep.sit_alert_frequency INTO v_alert, v_freq
  FROM public.email_preferences ep WHERE ep.user_id = auth.uid();
  IF v_alert IS FALSE THEN RETURN 'off'; END IF;
  IF coalesce(v_freq, 'immediate') <> 'immediate' THEN RETURN 'digest'; END IF;
  RETURN 'immediate';
END;
$function$;

REVOKE ALL ON FUNCTION public.my_alert_email_state() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.my_alert_email_state() FROM anon;
GRANT EXECUTE ON FUNCTION public.my_alert_email_state() TO authenticated, service_role;
