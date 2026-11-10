-- Lot ALMA3 (10/11/2026, demande de Jérémie) : invitation à donner son avis
-- sur Google, posée une fois dans la cloche des membres qui ont utilisé
-- Guardiens. Même liste que la condition du murmure d'Alma
-- (AlmaGoogleReviewWhisper lit cette notification).
--
-- Membres visés : compte non supprimé, inscrit depuis 7 jours au moins, et
-- au moins une annonce publiée (hors brouillon), une candidature envoyée ou
-- un besoin d'entraide déposé (hors annulé). Aucun tri par satisfaction :
-- Google interdit de ne solliciter que les clients satisfaits.
--
-- Aucun déclencheur ne relaie ce type en push ni en email
-- (push_enqueue_on_nearby_notification ne traite que new_sit_nearby).
-- Rejouable : un membre déjà invité n'est pas invité deux fois.
-- Le lien doit rester égal à GOOGLE_REVIEW_URL (src/lib/constants.ts).

INSERT INTO public.notifications (user_id, type, title, body, link, actor_name)
SELECT
  p.id,
  'google_review_invite',
  'Votre avis compte',
  'Vous faites vivre Guardiens près de chez vous. Ce serait super d''aider la communauté à grandir : donnez votre avis sur Google, tout simplement.',
  'https://g.page/r/CcG68dHWYoHIEAE/review',
  'Alma'
FROM public.profiles p
WHERE p.account_status IS DISTINCT FROM 'deleted'
  AND p.created_at < now() - interval '7 days'
  AND (
    EXISTS (SELECT 1 FROM public.sits s WHERE s.user_id = p.id AND s.status <> 'draft')
    OR EXISTS (SELECT 1 FROM public.applications a WHERE a.sitter_id = p.id)
    OR EXISTS (SELECT 1 FROM public.small_missions m WHERE m.user_id = p.id AND m.status <> 'cancelled')
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.notifications n
    WHERE n.user_id = p.id AND n.type = 'google_review_invite'
  );
