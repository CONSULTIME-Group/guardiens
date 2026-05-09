-- Nouvelle séquence de nurturing : découverte de l'entraide (petites missions)
-- Cible tous les membres actifs qui n'ont jamais publié ni répondu à une petite mission.
-- Étape 1 à J+21, étape 2 à J+45. Sortie dès que l'utilisateur a une activité d'entraide.

INSERT INTO public.nurturing_sequences (key, audience, description, active, enrollment_rule, anchor_field)
VALUES (
  'discover-mutual-aid',
  'all',
  'Invite à découvrir l''entraide : demander un coup de main, en proposer un, vivre une rencontre.',
  true,
  '{"type":"signup","window_days":7,"min_age_days":21}'::jsonb,
  'created_at'
)
ON CONFLICT (key) DO UPDATE SET
  description = EXCLUDED.description,
  enrollment_rule = EXCLUDED.enrollment_rule,
  anchor_field = EXCLUDED.anchor_field,
  active = true;

-- Récupère l'id et insère les étapes (idempotent)
WITH seq AS (
  SELECT id FROM public.nurturing_sequences WHERE key = 'discover-mutual-aid'
)
INSERT INTO public.nurturing_steps (sequence_id, step_order, delay_hours, template_name, exit_condition, send_condition)
SELECT seq.id, v.step_order, v.delay_hours, v.template_name, v.exit_condition::jsonb, '{}'::jsonb
FROM seq, (VALUES
  (1, 504,  'discover-mutual-aid-1', '{"type":"has_mutual_aid_activity"}'),
  (2, 1080, 'discover-mutual-aid-2', '{"type":"has_mutual_aid_activity"}')
) AS v(step_order, delay_hours, template_name, exit_condition)
ON CONFLICT DO NOTHING;