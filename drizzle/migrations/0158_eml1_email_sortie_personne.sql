-- Lot EML1 (14/11/2026) : l'email « X vient à votre sortie » présente la
-- personne (photo, prénom, ville, membre depuis, identité vérifiée, lien vers
-- sa fiche). Demande de Jérémie après l'essai du 14/11 : « pourquoi j'ai pas
-- sa photo, son profil dans le mail ». Pour le geste 'joined', p_stamp porte
-- l'identifiant du membre inscrit (outing_email_on_attendee, migration 0147).
-- Repère : eml1_email_sortie_personne. Rejouable.

CREATE OR REPLACE FUNCTION public.outing_email_enqueue(p_kind text, p_outing uuid, p_recipient uuid, p_actor_name text DEFAULT NULL::text, p_stamp text DEFAULT ''::text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $fn$
-- sort3_emails_sorties
-- eml1_email_sortie_personne
DECLARE
  v_outing public.outings%ROWTYPE;
  v_email text;
  v_subject text;
  v_title text;
  v_body text;
  v_place text;
  v_key text;
  v_count integer := 0;
  v_actor jsonb := NULL;
  v_actor_id uuid;
BEGIN
  IF NOT COALESCE((SELECT enabled FROM public.feature_flags WHERE key = 'sorties_emails'), false) THEN
    RETURN 0;
  END IF;
  SELECT * INTO v_outing FROM public.outings WHERE id = p_outing;
  IF NOT FOUND THEN RETURN 0; END IF;
  SELECT u.email INTO v_email FROM auth.users u WHERE u.id = p_recipient;
  IF v_email IS NULL OR v_email = '' THEN RETURN 0; END IF;

  v_place := CASE v_outing.place_kind
    WHEN 'online' THEN 'En ligne'
    ELSE COALESCE(NULLIF(btrim(v_outing.place_label), ''), v_outing.city)
  END;

  IF p_kind = 'joined' THEN
    v_subject := COALESCE(p_actor_name, 'Un membre') || ' vient à votre sortie';
    v_title := 'Une place prise : ' || v_outing.title;
    v_body := COALESCE(p_actor_name, 'Un membre') || ' vient. Vous lui donnez le rendez-vous par message, depuis la fiche de votre sortie.';
    IF p_stamp ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      v_actor_id := p_stamp::uuid;
      SELECT jsonb_build_object(
        'firstName', NULLIF(btrim(p.first_name), ''),
        'avatarUrl', NULLIF(btrim(p.avatar_url), ''),
        'city', NULLIF(btrim(p.city), ''),
        'memberSince', to_char(p.created_at AT TIME ZONE 'Europe/Paris', 'YYYY-MM'),
        'verified', COALESCE(p.identity_verified, false),
        'profileUrl', 'https://guardiens.fr/gardiens/' || p.id::text)
      INTO v_actor
      FROM public.profiles p WHERE p.id = v_actor_id;
    END IF;
  ELSIF p_kind = 'changed' THEN
    v_subject := 'Changement pour ' || v_outing.title;
    v_title := 'Le rendez-vous a changé : ' || v_outing.title;
    v_body := 'Voici le nouveau rendez-vous. Votre place reste réservée, et vous la libérez d''un geste depuis la fiche si ce jour vous convient moins.';
  ELSIF p_kind = 'cancelled' THEN
    v_subject := 'Sortie annulée : ' || v_outing.title;
    v_title := 'Sortie annulée : ' || v_outing.title;
    v_body := COALESCE('Un mot de l''organisateur : « ' || v_outing.cancel_note || ' » ', '')
      || 'D''autres sorties vous attendent près de chez vous.';
  ELSIF p_kind = 'reminder' THEN
    v_subject := 'Demain : ' || v_outing.title;
    v_title := 'C''est demain : ' || v_outing.title;
    v_body := CASE WHEN p_recipient = v_outing.organizer_id
      THEN 'Votre sortie a lieu demain. La liste des inscrits est sur la fiche, avec un bouton pour écrire à chacun.'
      ELSE 'Votre place est réservée. Un empêchement ? Libérez-la d''un geste depuis la fiche, elle revient aux gens du coin.'
    END;
  ELSE
    RETURN 0;
  END IF;

  v_key := 'outing-' || p_kind || '-' || p_outing::text || '-' || p_recipient::text || COALESCE(NULLIF('-' || p_stamp, '-'), '');

  INSERT INTO public.email_deferred_queue
    (template_name, recipient_email, template_data, idempotency_key, defer_reason, scheduled_for)
  SELECT
    'outing-update', v_email,
    jsonb_strip_nulls(jsonb_build_object(
      'kind', p_kind,
      'subject', v_subject, 'title', v_title, 'body', v_body,
      'whenWhere', public.outing_when_label(v_outing.starts_at) || ' · ' || v_place,
      'link', 'https://guardiens.fr/sorties/' || v_outing.slug,
      'cta', CASE WHEN p_kind = 'cancelled' THEN 'Voir les sorties' WHEN p_kind = 'joined' THEN 'Lui écrire depuis la sortie' ELSE 'Voir la sortie' END,
      'actor', v_actor)),
    v_key, 'outing_' || p_kind, now()
  WHERE NOT EXISTS (SELECT 1 FROM public.email_deferred_queue q WHERE q.idempotency_key = v_key);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END
$fn$;

REVOKE ALL ON FUNCTION public.outing_email_enqueue(text, uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;
