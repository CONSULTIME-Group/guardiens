-- Correction : « RAISE EXCEPTION 'texte' USING MESSAGE = ... » declenche une
-- erreur plpgsql (option MESSAGE deja fournie). Le message lisible passe
-- desormais par la chaine de la clause RAISE, le code technique par HINT.
CREATE OR REPLACE FUNCTION public.validate_small_mission()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_texte text;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.mission_type = 'offre'::mission_type_enum THEN
    RAISE EXCEPTION 'Les offres ne se publient plus. Dites plutot ce que vous aimez faire dans votre profil, rubrique « Ce que je fais volontiers ».'
      USING HINT = 'offer_creation_disabled', ERRCODE = 'P0001';
  END IF;

  IF NEW.duration_estimate IS NOT NULL AND NEW.duration_estimate NOT IN ('1-2h', 'half_day', 'several', 'weekend', 'day', 'few_days', 'week', 'two_weeks', 'month_plus') THEN
    RAISE EXCEPTION 'Invalid duration_estimate: %. Allowed values: 1-2h, half_day, several, weekend, day, few_days, week, two_weeks, month_plus', NEW.duration_estimate;
  END IF;

  IF TG_OP = 'INSERT' AND NEW.date_needed IS NOT NULL AND NEW.date_needed < CURRENT_DATE THEN
    RAISE EXCEPTION 'date_needed cannot be in the past';
  END IF;

  IF NEW.title IS NOT NULL THEN NEW.title := public.strip_emojis(NEW.title); END IF;
  IF NEW.description IS NOT NULL THEN NEW.description := public.strip_emojis(NEW.description); END IF;
  IF NEW.exchange_offer IS NOT NULL THEN NEW.exchange_offer := public.strip_emojis(NEW.exchange_offer); END IF;

  v_texte := coalesce(NEW.title,'') || ' ' || coalesce(NEW.description,'') || ' ' || coalesce(NEW.exchange_offer,'');
  IF public.mutual_aid_money_mention(v_texte) THEN
    RAISE EXCEPTION 'Ici on s''echange des services, jamais de l''argent. Proposez plutot ce que vous offrez en retour : un cafe, des oeufs du jardin, un coup de main quand vous pourrez.'
      USING HINT = 'money_in_mutual_aid', ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_profile_helps_with()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.helps_with IS NOT NULL AND btrim(NEW.helps_with) <> '' THEN
    NEW.helps_with := public.strip_emojis(NEW.helps_with);
    IF public.mutual_aid_money_mention(NEW.helps_with) THEN
      RAISE EXCEPTION 'Ici on s''echange des services, jamais de l''argent. Dites plutot ce que vous aimez faire pour les gens du coin.'
        USING HINT = 'money_in_mutual_aid', ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;