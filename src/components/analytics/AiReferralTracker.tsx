import { useEffect } from "react";
import { trackEvent, trackEventWithUserId } from "@/lib/analytics";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "ai_ref_session";
const ENGINE_KEY = "ai_ref_engine";
const ATTRIB_KEY = "ai_ref_attributed";

/**
 * Miroir strict de FacebookReferralTracker, pour les IA génératives.
 * Détecte les visiteurs arrivant depuis un assistant IA :
 *   - document.referrer (chatgpt.com, perplexity.ai, claude.ai, copilot...)
 *   - OU utm_source / ref / utm_medium (ChatGPT envoie souvent
 *     utm_source=chatgpt.com & utm_medium=ai-assistant)
 *
 * Un seul event par session navigateur (sessionStorage, aucun cookie
 * persistant, aucun tracking cross-site).
 */
const ENGINES: { key: string; re: RegExp }[] = [
  { key: "chatgpt", re: /chatgpt|openai/i },
  { key: "perplexity", re: /perplexity/i },
  { key: "gemini", re: /gemini/i },
  { key: "copilot", re: /copilot|edgeservices/i },
  { key: "claude", re: /claude|anthropic/i },
  { key: "mistral", re: /mistral/i },
  { key: "iask", re: /iask/i },
  { key: "phind", re: /phind/i },
  { key: "poe", re: /(^|[^a-z])poe(\.com|[^a-z]|$)/i },
  { key: "huggingface", re: /huggingface/i },
  { key: "writesonic", re: /writesonic/i },
];

const AI_HINT =
  /chatgpt|openai|perplexity|gemini|copilot|claude|anthropic|mistral|edgeservices|iask|phind|poe\.com|huggingface|writesonic|ai-assistant/i;

export function detectAiEngine(...candidates: (string | null | undefined)[]): string | null {
  const haystack = candidates.filter(Boolean).join(" ");
  if (!haystack || !AI_HINT.test(haystack)) return null;
  for (const { key, re } of ENGINES) {
    if (re.test(haystack)) return key;
  }
  return "other";
}

const AiReferralTracker = () => {
  useEffect(() => {
    if (typeof window === "undefined") return;

    let unsub: { unsubscribe: () => void } | undefined;

    try {
      const params = new URLSearchParams(window.location.search);
      const utmSource = (params.get("utm_source") || "").toLowerCase();
      const utmMedium = (params.get("utm_medium") || "").toLowerCase();
      const ref = (params.get("ref") || "").toLowerCase();
      const referrer = document.referrer || "";

      const alreadyTracked = sessionStorage.getItem(STORAGE_KEY);
      const engine = alreadyTracked
        ? sessionStorage.getItem(ENGINE_KEY)
        : detectAiEngine(referrer, utmSource, utmMedium, ref);

      if (!engine) return;

      if (!alreadyTracked) {
        sessionStorage.setItem(STORAGE_KEY, "1");
        sessionStorage.setItem(ENGINE_KEY, engine);

        trackEvent("ai_referral_landing", {
          source: window.location.pathname,
          metadata: {
            engine,
            referrer: referrer || null,
            landing_path: window.location.pathname,
            utm_source: utmSource || null,
            utm_medium: utmMedium || null,
            ref: ref || null,
          },
        });
      }

      // Attribution : si le visiteur s'authentifie plus tard dans la même
      // session, on ré-émet l'atterrissage avec son user_id (une seule fois),
      // ce qui permet de croiser avec signup_form_submitted / onboarding_completed.
      if (sessionStorage.getItem(ATTRIB_KEY)) return;

      const attribute = (userId?: string | null) => {
        if (!userId || sessionStorage.getItem(ATTRIB_KEY)) return;
        sessionStorage.setItem(ATTRIB_KEY, "1");
        void trackEventWithUserId(userId, "ai_referral_landing", {
          source: window.location.pathname,
          metadata: {
            engine,
            referrer: referrer || null,
            landing_path: window.location.pathname,
            utm_source: utmSource || null,
            utm_medium: utmMedium || null,
            ref: ref || null,
            attribution: "identified",
          },
        });
      };

      void supabase.auth.getSession().then(({ data }) => attribute(data.session?.user?.id ?? null));
      unsub = supabase.auth.onAuthStateChange((_e, session) => {
        attribute(session?.user?.id ?? null);
      }).data.subscription;
    } catch {
      // silencieux
    }

    return () => unsub?.unsubscribe();
  }, []);

  return null;
};

export default AiReferralTracker;
