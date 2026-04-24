/**
 * Lightweight analytics — fire-and-forget.
 * Tous les événements sont insérés dans `analytics_events` sans bloquer l'UI.
 * Échec silencieux (RLS, réseau, etc.) — jamais d'exception remontée.
 */
import { supabase } from "@/integrations/supabase/client";

export type EventType =
  | "page_view"
  | "signup_started"
  | "signup_role_selected"
  | "signup_form_submitted"
  | "signup_completed"
  | "signup_failed"
  | "user_activated"
  | "cta_click"
  | "login_completed"
  | "cp_recovered"
  | "search_empty_action"
  | "search_outofzone_impression"
  | "search_outofzone_click"
  | "sit_view"
  | "sit_apply_clicked"
  | "sit_apply_blocked"
  | "sit_share_clicked"
  | "referral_link_copied"
  | "page_view_pre_launch"
  | "cta_complete_profile"
  | "advantage_link_click";

interface TrackOptions {
  source?: string;
  metadata?: Record<string, any>;
}

/**
 * Track un événement de manière non-bloquante.
 * Fonctionne aussi bien pour les visiteurs anonymes que connectés.
 */
export async function trackEvent(eventType: EventType, opts: TrackOptions = {}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.debug("[analytics]", eventType, {
        user_id: user?.id ?? null,
        source: opts.source ?? null,
        metadata: opts.metadata ?? null,
      });
    }

    await supabase.from("analytics_events").insert({
      user_id: user?.id ?? null,
      event_type: eventType,
      source: opts.source ?? null,
      metadata: opts.metadata ?? null,
    });
  } catch {
    // silencieux
  }
}

/**
 * Variante qui accepte un user_id explicite (utile juste après signup
 * quand la session n'est pas encore propagée).
 */
export async function trackEventWithUserId(
  userId: string | null,
  eventType: EventType,
  opts: TrackOptions = {}
) {
  try {
    if (!userId) return;
    await supabase.from("analytics_events").insert({
      user_id: userId,
      event_type: eventType,
      source: opts.source ?? null,
      metadata: opts.metadata ?? null,
    });
  } catch {
    // silencieux
  }
}

/**
 * Normalise une erreur de signup Supabase vers un code stable pour le funnel.
 */
export function mapSignupError(message: string | undefined | null): string {
  const m = (message || "").toLowerCase();
  if (m.includes("already registered") || m.includes("already been registered") || m.includes("user already")) {
    return "already_registered";
  }
  if (m.includes("password should be at least") || m.includes("weak_password") || m.includes("weak password") || m.includes("password is too weak")) {
    return "weak_password";
  }
  if (m.includes("invalid email") || m.includes("email address") && m.includes("invalid")) {
    return "invalid_email";
  }
  if (m === "timeout") {
    return "timeout";
  }
  return "unknown";
}
