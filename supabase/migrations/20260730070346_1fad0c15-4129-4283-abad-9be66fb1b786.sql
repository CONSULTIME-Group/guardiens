CREATE OR REPLACE FUNCTION public.validate_environments()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  allowed text[] := ARRAY[
    'ville','campagne','montagne',
    'lac','vignes','foret','mer'
  ];
  env text;
BEGIN
  IF NEW.environments IS NOT NULL THEN
    IF array_length(NEW.environments, 1) > 3 THEN
      RAISE EXCEPTION 'Maximum 3 environnements autorisés';
    END IF;
    FOREACH env IN ARRAY NEW.environments LOOP
      IF NOT (env = ANY(allowed)) THEN
        RAISE EXCEPTION 'Environnement % non autorisé. Valeurs acceptées : ville, campagne, montagne, lac, vignes, foret, mer', env;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$function$;