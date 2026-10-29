-- Erreur admin du 29/10/2026 (empreinte 42tibc, /admin, signalée par Jérémie) :
-- admin_site_health renvoyait 400 « malformed array literal: "signal d'envoi
-- ouvert" » (22P02) dès qu'un signal d'envoi était ouvert, et toute la vue
-- d'ensemble perdait ses voyants.
--
-- Cause : `v_email_bad || 'texte'` avec un littéral non typé. Postgres lit le
-- littéral comme un tableau (text[] || text[]) et échoue. Les ajouts par
-- format(...) passaient, car format renvoie du text. Deux lignes concernées :
-- « signal d'envoi ouvert » et « envois bloqués par la limite de débit ».
--
-- Correctif : array_append, sur la définition en base (plus récente que 0092),
-- réécrite en place. Rejouable : sans motif à corriger, rien ne change.
DO $mig$
DECLARE
  d text;
  fixed text;
BEGIN
  SELECT pg_get_functiondef('public.admin_site_health()'::regprocedure) INTO d;
  fixed := replace(d,
    $q$v_email_bad := v_email_bad || 'signal d''envoi ouvert';$q$,
    $q$v_email_bad := array_append(v_email_bad, 'signal d''envoi ouvert');$q$);
  fixed := replace(fixed,
    $q$v_email_bad := v_email_bad || 'envois bloqués par la limite de débit';$q$,
    $q$v_email_bad := array_append(v_email_bad, 'envois bloqués par la limite de débit');$q$);
  IF fixed IS DISTINCT FROM d THEN
    EXECUTE fixed;
  END IF;
  IF position($q$v_email_bad || '$q$ IN pg_get_functiondef('public.admin_site_health()'::regprocedure)) > 0 THEN
    RAISE EXCEPTION 'admin_site_health : ajout de littéral non typé restant';
  END IF;
END
$mig$;
