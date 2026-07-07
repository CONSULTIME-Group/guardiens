/**
 * <WelcomeBackDigest /> — Alma résume l'activité depuis la dernière visite.
 *
 * 8 variantes déterministes selon (audience owner|sitter) × (signaux) :
 *   - owner_first_visit / sitter_first_visit  : première visite, message d'accueil neutre
 *   - owner_active / sitter_active            : au moins un signal fort (messages, candidatures, sits proches)
 *   - owner_intl   / sitter_intl              : pas de signal local, mais activité internationale
 *   - owner_empty_positive / sitter_empty_positive : rien de neuf, message positif d'exploration
 *
 * Debounce : on n'appelle la RPC qu'une fois par visite de session (sessionStorage flag).
 * Vouvoiement partout (owner + sitter, règle projet).
 */
import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAlma } from "@/contexts/AlmaContext";
import { useAlmaFrequency } from "@/hooks/useAlmaFrequency";
import { trackEvent } from "@/lib/analytics";
import { AlmaBubble, type AlmaAudience } from "./AlmaBubble";

export type WelcomeBackVariant =
  | "owner_first_visit"
  | "owner_active"
  | "owner_intl"
  | "owner_empty_positive"
  | "sitter_first_visit"
  | "sitter_active"
  | "sitter_intl"
  | "sitter_empty_positive";

export interface DigestSignals {
  new_messages: number;
  new_applications: number;
  new_sits_nearby: number;
  new_intl_sitters: number;
  new_intl_sits: number;
  is_first_visit: boolean;
}

const SESSION_KEY = "alma_welcomeback_shown";

/**
 * Sélectionne la variante en fonction de l'audience et des signaux.
 * Exportée pour être testée unitairement.
 */
export function pickVariant(audience: AlmaAudience, s: DigestSignals): WelcomeBackVariant {
  if (audience === "owner") {
    if (s.is_first_visit) return "owner_first_visit";
    if (s.new_messages > 0 || s.new_applications > 0) return "owner_active";
    if (s.new_intl_sitters > 0) return "owner_intl";
    return "owner_empty_positive";
  }
  if (s.is_first_visit) return "sitter_first_visit";
  if (s.new_messages > 0 || s.new_sits_nearby > 0) return "sitter_active";
  if (s.new_intl_sits > 0) return "sitter_intl";
  return "sitter_empty_positive";
}

interface CopyBlock {
  title: string;
  body: string;
  actionLabel?: string;
  actionHref?: string;
  actionId?: string;
}

/**
 * Copy éditoriale par variante. Vouvoiement obligatoire (owner + sitter).
 * Pas d'em-dash, pas d'emoji, pas d'icônes décoratives.
 */
export function getCopy(variant: WelcomeBackVariant, s: DigestSignals): CopyBlock {
  switch (variant) {
    case "owner_first_visit":
      return {
        title: "Ravie de vous revoir",
        body: "Je vous accompagne au fil des jours. Prenez le temps de découvrir votre tableau de bord.",
      };
    case "owner_active": {
      const parts: string[] = [];
      if (s.new_applications > 0) {
        parts.push(
          s.new_applications === 1
            ? "1 nouvelle candidature"
            : `${s.new_applications} nouvelles candidatures`,
        );
      }
      if (s.new_messages > 0) {
        parts.push(
          s.new_messages === 1
            ? "1 nouveau message"
            : `${s.new_messages} nouveaux messages`,
        );
      }
      return {
        title: "Du nouveau depuis votre dernière visite",
        body: `Vous avez ${parts.join(" et ")} à consulter.`,
        actionLabel: s.new_applications > 0 ? "Voir les candidatures" : "Ouvrir la messagerie",
        actionHref: s.new_applications > 0 ? "/dashboard#candidatures" : "/messages",
        actionId: s.new_applications > 0 ? "open_applications" : "open_messages",
      };
    }
    case "owner_intl":
      return {
        title: "De nouveaux gardiens ont rejoint la communauté",
        body: `${s.new_intl_sitters} nouvelles personnes se sont inscrites depuis votre dernière visite. Votre annonce touche un vivier grandissant.`,
        actionLabel: "Voir les gardiens à l'international",
        actionHref: "/gardiens?international=1",
        actionId: "view_intl_sitters",
      };
    case "owner_empty_positive":
      return {
        title: "Tout est calme pour le moment",
        body: "Rien de neuf ne veut pas dire rien qui vaille. Réglez la voix d'Alma et le type de conseils que vous souhaitez recevoir.",
        actionLabel: "Configurer Alma",
        actionHref: "/parametres?tab=alma",
        actionId: "configure_alma",
      };
    case "sitter_first_visit":
      return {
        title: "Ravie de vous revoir",
        body: "Je vous accompagne au fil des jours. Prenez le temps de découvrir votre tableau de bord.",
      };
    case "sitter_active": {
      const parts: string[] = [];
      if (s.new_sits_nearby > 0) {
        parts.push(
          s.new_sits_nearby === 1
            ? "1 nouvelle annonce"
            : `${s.new_sits_nearby} nouvelles annonces`,
        );
      }
      if (s.new_messages > 0) {
        parts.push(
          s.new_messages === 1
            ? "1 nouveau message"
            : `${s.new_messages} nouveaux messages`,
        );
      }
      return {
        title: "Du nouveau depuis votre dernière visite",
        body: `Vous avez ${parts.join(" et ")} à consulter.`,
        actionLabel: s.new_sits_nearby > 0 ? "Voir les annonces" : "Ouvrir la messagerie",
        actionHref: s.new_sits_nearby > 0 ? "/annonces" : "/messages",
        actionId: s.new_sits_nearby > 0 ? "open_sits" : "open_messages",
      };
    }
    case "sitter_intl":
      return {
        title: "Des maisons à l'étranger vous attendent",
        body: `${s.new_intl_sits} nouvelles gardes hors de France sont ouvertes. De belles occasions pour explorer.`,
        actionLabel: "Voir les gardes à l'étranger",
        actionHref: "/annonces?international=1",
        actionId: "open_intl_sits",
      };
    case "sitter_empty_positive":
      return {
        title: "Une accalmie, c'est aussi une opportunité",
        body: "Aucune nouvelle annonce dans votre zone pour le moment. Explorez les fiches races ou élargissez votre rayon pour multiplier vos chances.",
        actionLabel: "Explorer les fiches races",
        actionHref: "/races",
        actionId: "explore_breeds",
      };
  }
}

export interface WelcomeBackDigestProps {
  /** Force la variante (utile pour tests / storybook). */
  forcedVariant?: WelcomeBackVariant;
  /** Signaux injectés (utile pour tests). Si absent, appel RPC. */
  signals?: DigestSignals;
  className?: string;
}

export function WelcomeBackDigest({
  forcedVariant,
  signals: signalsProp,
  className,
}: WelcomeBackDigestProps) {
  const { activeRole } = useAuth();
  const { frequency: almaFrequency } = useAlmaFrequency();
  const { claimProactiveSurface, releaseProactiveSurface } = useAlma();
  const navigate = useNavigate();
  const audience: AlmaAudience = activeRole === "owner" ? "owner" : "sitter";

  const [signals, setSignals] = useState<DigestSignals | null>(signalsProp ?? null);
  const [dismissed, setDismissed] = useState(false);
  const claimedRef = useRef(false);

  // Fetch RPC une seule fois par session (debounce). Le verrou de surface
  // est posé AVANT l'await pour éviter la race avec DormantReturnWhisper.
  useEffect(() => {
    if (signalsProp) return;
    let cancelled = false;

    try {
      if (sessionStorage.getItem(SESSION_KEY) === "1") {
        setDismissed(true);
        return;
      }
    } catch {
      /* silent */
    }

    // Claim immédiat : si FirstMeeting est déjà en place, on renonce.
    const ok = claimProactiveSurface("welcome_back");
    if (!ok) {
      setDismissed(true);
      return;
    }
    claimedRef.current = true;

    (async () => {
      try {
        const { data, error } = await supabase.rpc("get_activity_since_last_visit" as any);
        if (cancelled) return;
        if (error || !data) {
          setDismissed(true);
          return;
        }
        setSignals(data as unknown as DigestSignals);
        try {
          sessionStorage.setItem(SESSION_KEY, "1");
        } catch {
          /* silent */
        }
      } catch {
        setDismissed(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [signalsProp, claimProactiveSurface]);

  // Libère le verrou quand le composant se démonte.
  useEffect(() => {
    return () => {
      if (claimedRef.current) {
        releaseProactiveSurface("welcome_back");
        claimedRef.current = false;
      }
    };
  }, [releaseProactiveSurface]);

  const variant: WelcomeBackVariant | null = signals
    ? forcedVariant ?? pickVariant(audience, signals)
    : null;

  useEffect(() => {
    if (!variant || !signals || dismissed) return;
    try {
      trackEvent("alma_welcomeback_seen", {
        metadata: {
          variant,
          audience,
          new_messages: signals.new_messages,
          new_applications: signals.new_applications,
          new_sits_nearby: signals.new_sits_nearby,
          new_intl_sitters: signals.new_intl_sitters,
          new_intl_sits: signals.new_intl_sits,
        },
      });
    } catch {
      /* silent */
    }
  }, [variant, signals, dismissed, audience]);

  const handleAction = useCallback(
    (actionId: string, href: string) => {
      try {
        trackEvent("alma_welcomeback_action_clicked", {
          metadata: { variant, action_id: actionId },
        });
      } catch {
        /* silent */
      }
      navigate(href);
    },
    [variant, navigate],
  );

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    try {
      trackEvent("alma_welcomeback_dismissed", { metadata: { variant } });
    } catch {
      /* silent */
    }
  }, [variant]);

  // Kill switch : si l'utilisateur a choisi "silent", Alma ne parle jamais
  // spontanément, même si un digest est disponible.
  if (almaFrequency === "silent") return null;
  if (dismissed || !variant || !signals) return null;
  // Règle produit : Alma ne se présente jamais sans proposer d'action.
  // Les variantes « first_visit » ne portent qu'un message d'accueil sans
  // action concrète. Le concierge IA (SitDraftFromPrompt) et les NBA du
  // dashboard prennent le relais, on reste silencieux ici.
  if (variant === "owner_first_visit" || variant === "sitter_first_visit") return null;

  const copy = getCopy(variant, signals);

  return (
    <AlmaBubble
      audience={audience}
      variant="dashboard"
      title={copy.title}
      onDismiss={handleDismiss}
      className={className}
      actions={
        copy.actionLabel && copy.actionHref && copy.actionId ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleAction(copy.actionId!, copy.actionHref!)}
          >
            {copy.actionLabel}
          </Button>
        ) : undefined
      }
    >
      {copy.body}
    </AlmaBubble>
  );
}

export default WelcomeBackDigest;
