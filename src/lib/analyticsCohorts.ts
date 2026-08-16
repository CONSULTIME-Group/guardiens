/**
 * Mesure du tunnel post-inscription propriétaire (lots 1 et 2, 16/08/2026).
 *
 * Définition de la « publication en première session » : la toute première
 * publication d'annonce (MIN(sits.published_at)) intervient au plus 24
 * heures après la création du compte (profiles.created_at). Le
 * dénominateur est l'ensemble des comptes propriétaires inscrits sur la
 * période (rôles owner et both).
 *
 * Baseline mesurée le 16/08/2026, avant ouverture du tunnel : 4 / 16,
 * soit 25 pour cent.
 *
 * Deux sources concordantes :
 *  - temps réel : l'événement analytics `sit_first_publish`, émis une seule
 *    fois par compte, avec metadata.minutes_since_signup et
 *    metadata.first_session (seuil 24 h, aligné sur cette requête) ;
 *  - base : la requête ci-dessous, rejouable à tout moment.
 *
 * Attention : sits.published_at n'est écrit à la publication que depuis le
 * 16/08/2026. Les annonces publiées avant cette date n'ont pas d'horodatage
 * fiable, la cohorte n'est donc mesurable que pour les comptes créés après
 * bascule.
 */
export const FIRST_SESSION_PUBLISH_COHORT_SQL = `
WITH first_publish AS (
  SELECT user_id, MIN(published_at) AS first_published_at
  FROM public.sits
  WHERE published_at IS NOT NULL
  GROUP BY user_id
)
SELECT
  COUNT(*) AS owners_inscrits,
  COUNT(fp.first_published_at) FILTER (
    WHERE fp.first_published_at <= p.created_at + interval '24 hours'
  ) AS publies_premiere_session,
  ROUND(
    100.0 * COUNT(fp.first_published_at) FILTER (
      WHERE fp.first_published_at <= p.created_at + interval '24 hours'
    ) / NULLIF(COUNT(*), 0),
    1
  ) AS taux_premiere_session_pct
FROM public.profiles p
LEFT JOIN first_publish fp ON fp.user_id = p.id
WHERE p.role IN ('owner', 'both')
  AND p.created_at >= :date_debut
  AND p.created_at <  :date_fin;
`;
