
-- Séquences complete-affinity : gardien et propriétaire.
INSERT INTO public.nurturing_sequences (key, audience, description, active, enrollment_rule, anchor_field)
VALUES
  (
    'complete-affinity-sitter',
    'sitter',
    'Gardiens inscrits depuis plus de 7 jours dont animal_types ou work_during_sit est vide, un email pédagogique unique pour activer le score d''affinité.',
    true,
    '{"type":"sitter_missing_affinity","min_age_days":7}'::jsonb,
    'created_at'
  ),
  (
    'complete-affinity-owner',
    'owner',
    'Propriétaires inscrits depuis plus de 7 jours dont presence_expected est vide, un email pédagogique unique pour activer le score d''affinité.',
    true,
    '{"type":"owner_missing_affinity","min_age_days":7}'::jsonb,
    'created_at'
  )
ON CONFLICT (key) DO UPDATE
SET audience = EXCLUDED.audience,
    description = EXCLUDED.description,
    active = EXCLUDED.active,
    enrollment_rule = EXCLUDED.enrollment_rule,
    anchor_field = EXCLUDED.anchor_field,
    updated_at = now();

-- Étape unique par séquence, delay 0, exit_condition sur remplissage effectif.
INSERT INTO public.nurturing_steps (sequence_id, step_order, delay_hours, template_name, exit_condition)
SELECT s.id, 1, 0, 'affinity-completion-sitter', '{"type":"sitter_affinity_ready"}'::jsonb
FROM public.nurturing_sequences s
WHERE s.key = 'complete-affinity-sitter'
ON CONFLICT (sequence_id, step_order) DO UPDATE
SET delay_hours = EXCLUDED.delay_hours,
    template_name = EXCLUDED.template_name,
    exit_condition = EXCLUDED.exit_condition;

INSERT INTO public.nurturing_steps (sequence_id, step_order, delay_hours, template_name, exit_condition)
SELECT s.id, 1, 0, 'affinity-completion-owner', '{"type":"owner_affinity_ready"}'::jsonb
FROM public.nurturing_sequences s
WHERE s.key = 'complete-affinity-owner'
ON CONFLICT (sequence_id, step_order) DO UPDATE
SET delay_hours = EXCLUDED.delay_hours,
    template_name = EXCLUDED.template_name,
    exit_condition = EXCLUDED.exit_condition;

-- RPC lisible par les administrateurs : renvoie les pourcentages de
-- complétude des critères d'affinité côté gardiens et propriétaires.
CREATE OR REPLACE FUNCTION public.get_affinity_completeness_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sitter_total int := 0;
  v_sitter_ready int := 0;
  v_owner_total int := 0;
  v_owner_ready int := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT
    COUNT(*),
    COUNT(*) FILTER (
      WHERE array_length(animal_types, 1) > 0
        AND coalesce(work_during_sit, '') <> ''
    )
  INTO v_sitter_total, v_sitter_ready
  FROM public.sitter_profiles;

  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE coalesce(presence_expected, '') <> '')
  INTO v_owner_total, v_owner_ready
  FROM public.owner_profiles;

  RETURN jsonb_build_object(
    'sitter_total', v_sitter_total,
    'sitter_ready', v_sitter_ready,
    'sitter_pct', CASE WHEN v_sitter_total = 0 THEN 0
      ELSE round(100.0 * v_sitter_ready / v_sitter_total, 1) END,
    'owner_total', v_owner_total,
    'owner_ready', v_owner_ready,
    'owner_pct', CASE WHEN v_owner_total = 0 THEN 0
      ELSE round(100.0 * v_owner_ready / v_owner_total, 1) END,
    'generated_at', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_affinity_completeness_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_affinity_completeness_stats() TO authenticated;
