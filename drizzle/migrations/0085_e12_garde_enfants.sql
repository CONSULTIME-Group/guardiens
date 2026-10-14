-- Lot E12 (14/10/2026) : la garde d'enfants est exclue de l'Entraide.
--
-- Décision de Jérémie du 14/10/2026, qui remplace celle du 11/10/2026 (CGU 7,
-- version 8). Miroir de src/lib/missionChildCare.ts : un besoin dont le titre
-- ou la description demande de garder un mineur est refusé à l'insertion et à
-- la modification de ces champs (indice child_care_in_mutual_aid, message
-- traduit par CreateSmallMission). L'aide aux devoirs reste possible.
-- Trigger séparé de validate_small_mission pour ne pas réécrire sa version
-- en production. Rejouable.

CREATE OR REPLACE FUNCTION public.enforce_no_child_care_in_mutual_aid()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_text text := coalesce(NEW.title, '') || E'\n' || coalesce(NEW.description, '');
  v_child constant text := '(enfants?|fils|filles?|b[ée]b[ée]s?|petits?-enfants?|petite-fille|petit-fils|gamins?|loulous?|petits?|petites?)';
  v_mine constant text := '(mon|ma|mes|nos|notre|les|leurs?)';
BEGIN
  IF coalesce(NEW.mission_type, 'besoin') <> 'besoin' THEN
    RETURN NEW;
  END IF;
  IF v_text ~* '\ygardes?\s+d[''’]\s*enfants?\y'
     OR v_text ~* '\ybaby[\s-]?sitt?(ing|eur|euse|er)?\y'
     OR v_text ~* '\ynounou\y'
     OR v_text ~* ('\ygarder\s+' || v_mine || '\s+' || v_child || '\y')
     OR v_text ~* ('\ys[''’]\s*occuper\s+(de\s+)?' || v_mine || '\s+' || v_child || '\y')
     OR v_text ~* ('\y(aller\s+)?chercher\s+' || v_mine || '\s+' || v_child || '\s+(à|a)\s+l[''’]\s*(école|ecole|crèche|creche)\y')
     OR v_text ~* '\ysortie\s+d[''’]\s*(école|ecole|crèche|creche)\y' THEN
    RAISE EXCEPTION 'La garde d''enfants reste hors de l''Entraide Guardiens.'
      USING HINT = 'child_care_in_mutual_aid';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_enforce_no_child_care_in_mutual_aid ON public.small_missions;
CREATE TRIGGER trg_enforce_no_child_care_in_mutual_aid
  BEFORE INSERT OR UPDATE OF title, description ON public.small_missions
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_no_child_care_in_mutual_aid();
