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
  | "signup_form_blocked"         // Submit cliqué mais bloqué côté client (CGU non cochées, etc.)
  | "signup_form_focused"         // 1er focus sur un champ du formulaire (mesure friction)
  | "signup_email_confirmed"      // Email cliqué + session active
  | "user_activated"
  | "onboarding_started"          // Modale d'onboarding ouverte
  | "onboarding_step_completed"   // Étape terminée (metadata.step: 0|1|2)
  | "onboarding_completed"        // Profil 100% activé
  | "onboarding_dismissed"        // Modale fermée avant la fin
  | "first_action"                // Première vraie action (metadata.kind)
  | "cta_click"
  | "cta_proprio_clicked"
  | "cta_sitter_clicked"
  | "login_completed"
  | "cp_recovered"
  | "search_empty_action"
  | "search_outofzone_impression"
  | "search_outofzone_click"
  | "sit_view"
  | "sit_apply_clicked"
  | "sit_apply_blocked"
  | "sit_share_clicked"
  | "editorial_share_clicked"
  | "referral_link_copied"
  | "page_view_pre_launch"
  | "cta_complete_profile"
  | "advantage_link_click"
  | "fb_referral_landing"      // Visiteur arrivé depuis Facebook (referrer ou utm_source=facebook)
  | "fb_referral_feedback"     // Réaction au prompt de feedback (metadata.reaction)
  | "fb_referral_dismissed"    // Prompt fermé sans feedback
  // Mesure before/after : impact de la mini-bio sur MissionCard --------------
  // Tag de cohorte dans metadata.release (ex: "mission_card_bio_v1_2026_05_17").
  | "exp_mission_bio_exposure" // 1ère impression de la liste missions (release, mission_count)
  | "exp_mission_bio_click"    // Clic sur une MissionCard (release, has_bio, position)
  | "exp_mission_bio_scroll";  // Scroll max atteint sur la liste (release, max_scroll_pct, is_mobile)

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
 * Helper dédié aux clics sur les CTAs primaires.
 * Centralise le nom + l'emplacement pour faciliter l'analyse de funnel.
 */
export function trackCtaClick(name: string, location: string, extra?: Record<string, any>) {
  void trackEvent("cta_click", {
    source: location,
    metadata: { name, location, ...(extra ?? {}) },
  });
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

    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.debug("[analytics]", eventType, {
        user_id: userId,
        source: opts.source ?? null,
        metadata: opts.metadata ?? null,
      });
    }

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
 * Émet `first_action` une seule fois par utilisateur (déduplication via localStorage).
 * À appeler après une vraie 1ère action métier : création d'annonce, candidature,
 * 1er message, création mission d'entraide, etc.
 */
export async function trackFirstAction(
  kind: "sit_created" | "application_sent" | "message_sent" | "mission_created" | "long_stay_created",
  extraMetadata: Record<string, any> = {}
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) return;
    const flagKey = `first_action_tracked_${user.id}`;
    if (typeof window !== "undefined" && localStorage.getItem(flagKey)) return;
    if (typeof window !== "undefined") localStorage.setItem(flagKey, "1");
    await trackEventWithUserId(user.id, "first_action", {
      source: typeof window !== "undefined" ? window.location.pathname : null,
      metadata: { kind, ...extraMetadata },
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
  if (
    m.includes("password should be at least") ||
    m.includes("weak_password") ||
    m.includes("weak password") ||
    m.includes("password is too weak") ||
    m.includes("password is known to be weak") ||
    m.includes("pwned")
  ) {
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
