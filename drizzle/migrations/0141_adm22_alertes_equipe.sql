-- Lot ADM22 (12/11/2026) : alertes de l'équipe, au choix de chaque admin.
-- Chaque admin choisit, dans Paramètres > Notifications, les événements qui
-- lui valent un email immédiat à son adresse de compte :
--   contact     : un message de contact arrive ;
--   suspicious  : un compte suspect est signalé ;
--   health      : un voyant système passe au rouge.
-- Tout est éteint par défaut. Le point du matin reste inchangé.
-- L'email part par le gabarit admin-team-alert (une ligne, texte constant,
-- sans nom ni extrait, aucun destinataire fixe) et la file email_deferred_queue.
-- Les déclencheurs n'empêchent jamais l'écriture d'origine. Aucune donnée
-- existante modifiée. Repère : adm22_alertes_equipe.

CREATE TABLE IF NOT EXISTS public.admin_alert_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_email boolean NOT NULL DEFAULT false,
  suspicious_email boolean NOT NULL DEFAULT false,
  health_email boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_alert_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_alert_preferences_own_select ON public.admin_alert_preferences;
CREATE POLICY admin_alert_preferences_own_select ON public.admin_alert_preferences
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS admin_alert_preferences_own_insert ON public.admin_alert_preferences;
CREATE POLICY admin_alert_preferences_own_insert ON public.admin_alert_preferences
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS admin_alert_preferences_own_update ON public.admin_alert_preferences;
CREATE POLICY admin_alert_preferences_own_update ON public.admin_alert_preferences
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (user_id = auth.uid() AND public.has_role(auth.uid(), 'admin'::public.app_role));

REVOKE ALL ON public.admin_alert_preferences FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON public.admin_alert_preferences TO authenticated;
GRANT ALL ON public.admin_alert_preferences TO service_role;

-- Met en file un email par admin abonné à ce type d'alerte.
CREATE OR REPLACE FUNCTION public.admin_alert_enqueue(
  p_kind text, p_ref text, p_subject text, p_title text, p_action text, p_link text
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
-- adm22_alertes_equipe
DECLARE
  v_count integer := 0;
BEGIN
  INSERT INTO public.email_deferred_queue
    (template_name, recipient_email, template_data, idempotency_key, defer_reason, scheduled_for)
  SELECT
    'admin-team-alert',
    u.email,
    jsonb_build_object('subject', p_subject, 'title', p_title, 'action', p_action, 'link', p_link),
    'admin-alert-' || p_kind || '-' || p_ref || '-' || p.user_id::text,
    'admin_alert',
    now()
  FROM public.admin_alert_preferences p
  JOIN public.user_roles r ON r.user_id = p.user_id AND r.role = 'admin'::public.app_role
  JOIN auth.users u ON u.id = p.user_id
  WHERE u.email IS NOT NULL
    AND CASE p_kind
          WHEN 'contact' THEN p.contact_email
          WHEN 'suspicious' THEN p.suspicious_email
          WHEN 'health' THEN p.health_email
          ELSE false
        END
    AND NOT EXISTS (
      SELECT 1 FROM public.email_deferred_queue q
      WHERE q.idempotency_key = 'admin-alert-' || p_kind || '-' || p_ref || '-' || p.user_id::text
    );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END
$fn$;

REVOKE ALL ON FUNCTION public.admin_alert_enqueue(text, text, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_alert_enqueue(text, text, text, text, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.admin_alert_on_contact_message() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  BEGIN
    PERFORM public.admin_alert_enqueue(
      'contact', NEW.id::text,
      'Guardiens admin : un message de contact à lire',
      'Répondre à 1 message de contact',
      'Un message vient d''arriver par le formulaire de contact. Il attend une réponse dans l''administration.',
      'https://guardiens.fr/admin/contact-messages');
  EXCEPTION WHEN OTHERS THEN
    NULL; -- l'alerte ne bloque jamais l'envoi du message
  END;
  RETURN NEW;
END
$fn$;

DROP TRIGGER IF EXISTS trg_admin_alert_contact_message ON public.contact_messages;
CREATE TRIGGER trg_admin_alert_contact_message
  AFTER INSERT ON public.contact_messages
  FOR EACH ROW EXECUTE FUNCTION public.admin_alert_on_contact_message();

CREATE OR REPLACE FUNCTION public.admin_alert_on_signal() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  BEGIN
    IF NEW.signal_type = 'suspicious_account' THEN
      PERFORM public.admin_alert_enqueue(
        'suspicious', NEW.id::text,
        'Guardiens admin : un compte suspect à vérifier',
        'Vérifier 1 compte signalé comme suspect',
        'Un compte vient d''être signalé par la détection automatique. Sa fiche attend votre lecture.',
        'https://guardiens.fr/admin/users?user=' || NEW.entity_id::text);
    ELSIF NEW.signal_type IN (
      'cron_consecutive_failures', 'digest_queue_morning_backlog', 'nurturing_run_anomaly',
      'sit_notification_claim_starvation', 'content_detector_broken', 'prerender_monthly_budget_reached'
    ) THEN
      PERFORM public.admin_alert_enqueue(
        'health', NEW.id::text,
        'Guardiens admin : un voyant du site est passé au rouge',
        'Regarder 1 voyant du site passé au rouge',
        'Un contrôle automatique du site vient de lever une alerte (' || NEW.signal_type || '). L''état du site donne le détail.',
        'https://guardiens.fr/admin');
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL; -- l'alerte ne bloque jamais l'écriture du signal
  END;
  RETURN NEW;
END
$fn$;

DROP TRIGGER IF EXISTS trg_admin_alert_signal ON public.admin_signals;
CREATE TRIGGER trg_admin_alert_signal
  AFTER INSERT ON public.admin_signals
  FOR EACH ROW EXECUTE FUNCTION public.admin_alert_on_signal();

REVOKE ALL ON FUNCTION public.admin_alert_on_contact_message() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_alert_on_signal() FROM PUBLIC, anon, authenticated;
