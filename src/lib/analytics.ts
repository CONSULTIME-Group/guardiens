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
  | "signup_completed"
  | "signup_failed"
  | "cta_click"
  | "login_completed"
  | "cp_recovered";

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
