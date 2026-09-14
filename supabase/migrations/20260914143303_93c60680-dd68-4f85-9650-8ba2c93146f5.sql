CREATE OR REPLACE FUNCTION public.check_content_quality(p_seuil_alertes integer DEFAULT NULL::integer, p_forcer_erreur boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_debut timestamptz := clock_timestamp();
  v_tests_ko int; v_tests_total int; v_alertes int; v_cibles int;
  v_hors_gel int; v_gel int; v_seuil int; v_signaux jsonb := '[]'::jsonb; v_res jsonb;
  v_sys uuid := '00000000-0000-0000-0000-0000000c0de1';
  v_geles text[];
  v_plus_ancienne date; v_plus_14_jours int;
BEGIN
  IF p_forcer_erreur THEN RAISE EXCEPTION 'Test volontaire du chemin d erreur'; END IF;

  SELECT coalesce(array_agg(slug), ARRAY[]::text[]) INTO v_geles
  FROM content_freeze WHERE frozen_until >= current_date;

  SELECT count(*) FILTER (WHERE verdict='FAIL'), count(*) INTO v_tests_ko, v_tests_total FROM v_detector_selftest;

  DROP TABLE IF EXISTS _defauts_courants;
  CREATE TEMP TABLE _defauts_courants ON COMMIT DROP AS
    SELECT source_table, row_id, label, rule_code, excerpt FROM public.v_content_defects;

  -- Ferme uniquement les alertes dont le defaut a disparu.
  UPDATE content_quality_alerts a
     SET resolved_at = now()
   WHERE a.resolved_at IS NULL
     AND NOT EXISTS (
       SELECT 1 FROM _defauts_courants v
        WHERE v.source_table = a.source_table
          AND v.label IS NOT DISTINCT FROM a.slug
          AND v.rule_code = a.rule_code
          AND v.excerpt IS NOT DISTINCT FROM a.excerpt
     );

  -- Ouvre uniquement les defauts qui ne sont pas deja suivis.
  INSERT INTO content_quality_alerts(article_id, slug, rule_code, excerpt, source_table)
  SELECT v.row_id::uuid, v.label, v.rule_code, v.excerpt, v.source_table
    FROM _defauts_courants v
   WHERE NOT EXISTS (
     SELECT 1 FROM content_quality_alerts a
      WHERE a.resolved_at IS NULL
        AND a.source_table = v.source_table
        AND a.slug IS NOT DISTINCT FROM v.label
        AND a.rule_code = v.rule_code
        AND a.excerpt IS NOT DISTINCT FROM v.excerpt
  );

  SELECT count(*), count(DISTINCT slug),
         count(*) FILTER (WHERE slug <> ALL(v_geles)),
         count(*) FILTER (WHERE slug = ANY(v_geles))
    INTO v_alertes, v_cibles, v_hors_gel, v_gel
  FROM content_quality_alerts WHERE resolved_at IS NULL;

  SELECT min(a.detected_at)::date,
         count(*) FILTER (WHERE a.detected_at < now() - interval '14 days')
    INTO v_plus_ancienne, v_plus_14_jours
  FROM content_quality_alerts a WHERE a.resolved_at IS NULL;

  v_seuil := coalesce(p_seuil_alertes, v_gel);

  IF v_tests_ko > 0 THEN
    INSERT INTO admin_signals(signal_type, severity, entity_type, entity_id, metadata)
    VALUES ('content_detector_broken', 'critical', 'content', v_sys,
      jsonb_build_object('tests_ko', v_tests_ko, 'tests_total', v_tests_total,
        'cas', (SELECT jsonb_agg(jsonb_build_object('id',id,'regle',regle_attendue,'texte',left(texte,120)))
                FROM v_detector_selftest WHERE verdict='FAIL')))
    ON CONFLICT (signal_type, entity_id) WHERE resolved_at IS NULL
    DO UPDATE SET metadata = EXCLUDED.metadata, severity = EXCLUDED.severity;
    v_signaux := v_signaux || jsonb_build_array('content_detector_broken');
  END IF;

  IF v_hors_gel > 0 THEN
    INSERT INTO admin_signals(signal_type, severity, entity_type, entity_id, metadata)
    VALUES ('content_defect_outside_freeze', 'critical', 'content', v_sys,
      jsonb_build_object('nombre', v_hors_gel,
        'details', (SELECT jsonb_agg(jsonb_build_object('table',source_table,'cible',slug,'regle',rule_code,'extrait',left(excerpt,120)))
                    FROM content_quality_alerts WHERE resolved_at IS NULL AND slug <> ALL(v_geles))))
    ON CONFLICT (signal_type, entity_id) WHERE resolved_at IS NULL
    DO UPDATE SET metadata = EXCLUDED.metadata, severity = EXCLUDED.severity;
    v_signaux := v_signaux || jsonb_build_array('content_defect_outside_freeze');
  END IF;

  IF v_alertes > v_seuil THEN
    INSERT INTO admin_signals(signal_type, severity, entity_type, entity_id, metadata)
    VALUES ('content_quality_drift', 'warning', 'content', v_sys,
      jsonb_build_object('alertes', v_alertes, 'seuil', v_seuil, 'cibles', v_cibles))
    ON CONFLICT (signal_type, entity_id) WHERE resolved_at IS NULL
    DO UPDATE SET metadata = EXCLUDED.metadata, severity = EXCLUDED.severity;
    v_signaux := v_signaux || jsonb_build_array('content_quality_drift');
  END IF;

  v_res := jsonb_build_object(
    'tests_total', v_tests_total, 'tests_ko', v_tests_ko,
    'alertes_ouvertes', v_alertes, 'cibles', v_cibles,
    'alertes_hors_gel', v_hors_gel, 'alertes_sur_pages_gelees', v_gel,
    'pages_gelees_actives', cardinality(v_geles), 'seuil_applique', v_seuil,
    'plus_ancienne_alerte', v_plus_ancienne,
    'alertes_de_plus_de_14_jours', v_plus_14_jours,
    'signaux_emis', v_signaux, 'calcule_le', to_char(now() AT TIME ZONE 'Europe/Paris','YYYY-MM-DD HH24:MI'));

  INSERT INTO cron_run_log(edge_name, started_at, finished_at, status, metrics)
  VALUES ('check-content-quality', v_debut, clock_timestamp(),
          CASE WHEN v_signaux = '[]'::jsonb THEN 'success' ELSE 'partial' END, v_res);

  RETURN v_res;

EXCEPTION WHEN OTHERS THEN
  INSERT INTO cron_run_log(edge_name, started_at, finished_at, status, metrics, error_message)
  VALUES ('check-content-quality', v_debut, clock_timestamp(), 'failed',
          jsonb_build_object('sqlstate', SQLSTATE), SQLERRM);
  RETURN jsonb_build_object('status','failed','erreur',SQLERRM,'sqlstate',SQLSTATE,
    'calcule_le', to_char(now() AT TIME ZONE 'Europe/Paris','YYYY-MM-DD HH24:MI'));
END; $function$