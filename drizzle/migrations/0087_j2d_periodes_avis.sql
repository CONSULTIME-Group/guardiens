-- Lot J2d (14/10/2026) : période de la garde à côté de chaque avis (CGU 9.7,
-- version 9 en vigueur le 16/11/2026).
--
-- Les listes publiques lisent déjà les dates par public_profile_reviews
-- (sit_start_date, sit_end_date). /mes-avis lit les avis reçus et donnés du
-- membre dans reviews : review_sit_periods lui rend, en une seule lecture
-- groupée par liste, les dates de l'annonce liée, sans lecture de sits par
-- avis ni lecture d'une annonce d'autrui par le navigateur (règle Y2).
--
-- Périmètre : avis dont le membre connecté est l'auteur ou la personne
-- évaluée, plus les avis publics (publiés, validés, hors annulation, lot Z).
-- 200 identifiants au plus par appel. Droits Y2 : membre connecté seulement
-- (authenticated, service_role). Rejouable.

CREATE OR REPLACE FUNCTION public.review_sit_periods(p_review_ids uuid[])
RETURNS TABLE(review_id uuid, sit_id uuid, sit_start_date date, sit_end_date date)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT r.id AS review_id, r.sit_id, s.start_date AS sit_start_date, s.end_date AS sit_end_date
  FROM public.reviews r
  JOIN public.sits s ON s.id = r.sit_id
  WHERE auth.uid() IS NOT NULL
    AND p_review_ids IS NOT NULL
    AND cardinality(p_review_ids) <= 200
    AND r.id = ANY (p_review_ids)
    AND (
      r.reviewer_id = auth.uid()
      OR (r.reviewee_id = auth.uid() AND r.published = true)
      OR (
        r.published = true
        AND r.moderation_status = 'valide'
        AND r.review_type IS DISTINCT FROM 'annulation'
      )
    );
$function$;

COMMENT ON FUNCTION public.review_sit_periods(uuid[]) IS
  'Lot J2d : dates de la garde liée à des avis (CGU 9.7), une lecture groupée par liste.';

REVOKE EXECUTE ON FUNCTION public.review_sit_periods(uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.review_sit_periods(uuid[]) TO authenticated, service_role;
