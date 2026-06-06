import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, ThumbsUp, Meh, MessageSquare, Check } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";

const FLAG_KEY = "fb_ref_active";          // posée par FacebookReferralTracker
const SEEN_KEY = "fb_ref_feedback_seen";   // localStorage, ne pas re-prompter avant 30j
const SEEN_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const SHOW_DELAY_MS = 25_000;

type Reaction = "useful" | "meh" | "comment";
type DismissReason =
  | "not_interested"
  | "just_browsing"
  | "too_early"
  | "no_time"
  | "other";

const DISMISS_REASONS: Array<{ key: DismissReason; label: string }> = [
  { key: "just_browsing", label: "Je découvre, je regarde" },
  { key: "no_time", label: "Pas le temps là" },
  { key: "too_early", label: "Trop tôt pour donner un avis" },
  { key: "not_interested", label: "Pas intéressé(e)" },
  { key: "other", label: "Autre raison" },
];

/**
 * Mini-prompt de feedback pour les visiteurs venant de Facebook.
 * Objectif : mesurer la qualité du trafic généré par les commentaires
 * postés sur les annonces de garde Facebook.
 *
 * Flow :
 * 1. Prompt initial, 3 réactions rapides (Utile / Bof / Commenter).
 * 2. Si l'utilisateur clique X sans réagir → étape « pourquoi »
 *    (5 raisons rapides + champ libre optionnel).
 * 3. Sortie sans choisir de raison = dismiss "silent".
 */
const FacebookReferralFeedback = () => {
  const [visible, setVisible] = useState(false);
  const [reaction, setReaction] = useState<Reaction | null>(null);
  const [comment, setComment] = useState("");
  const [thanks, setThanks] = useState(false);
  const [askingDismiss, setAskingDismiss] = useState(false);
  const [dismissReason, setDismissReason] = useState<DismissReason | null>(null);
  const [dismissComment, setDismissComment] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (sessionStorage.getItem(FLAG_KEY) !== "1") return;

      const seenRaw = localStorage.getItem(SEEN_KEY);
      if (seenRaw) {
        const seenAt = parseInt(seenRaw, 10);
        if (!Number.isNaN(seenAt) && Date.now() - seenAt < SEEN_TTL_MS) return;
      }

      const t = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
      return () => clearTimeout(t);
    } catch {
      /* silencieux */
    }
  }, []);

  const markSeen = () => {
    try {
      localStorage.setItem(SEEN_KEY, String(Date.now()));
    } catch { /* silencieux */ }
  };

  // Clic sur la croix : si aucune réaction n'a encore été donnée et qu'on
  // n'est pas déjà dans l'étape "pourquoi", on bascule sur la mini-enquête
  // de sortie. Sinon on ferme directement (et on track un dismiss "silent"
  // si l'utilisateur quitte aussi cette étape sans répondre).
  const handleClose = () => {
    if (!reaction && !askingDismiss) {
      setAskingDismiss(true);
      return;
    }
    closeNow({ silent: true });
  };

  const closeNow = ({ silent }: { silent: boolean }) => {
    setVisible(false);
    markSeen();
    if (!reaction && silent) {
      trackEvent("fb_referral_dismissed", {
        source: window.location.pathname,
        metadata: { had_reaction: false, reason: null, stage: askingDismiss ? "dismiss_step" : "initial" },
      });
    }
  };

  const submitDismissReason = (r: DismissReason) => {
    setDismissReason(r);
    if (r === "other") return; // attend un commentaire libre
    trackEvent("fb_referral_dismissed", {
      source: window.location.pathname,
      metadata: { had_reaction: false, reason: r, stage: "dismiss_step" },
    });
    setThanks(true);
    markSeen();
    setTimeout(() => setVisible(false), 1500);
  };

  const submitDismissOther = () => {
    trackEvent("fb_referral_dismissed", {
      source: window.location.pathname,
      metadata: {
        had_reaction: false,
        reason: "other",
        comment: dismissComment.trim().slice(0, 500) || null,
        stage: "dismiss_step",
      },
    });
    setThanks(true);
    markSeen();
    setTimeout(() => setVisible(false), 1500);
  };

  const submitReaction = (r: Reaction) => {
    setReaction(r);
    if (r !== "comment") {
      trackEvent("fb_referral_feedback", {
        source: window.location.pathname,
        metadata: { reaction: r },
      });
      setThanks(true);
      markSeen();
      setTimeout(() => setVisible(false), 1800);
    }
  };

  const submitComment = () => {
    trackEvent("fb_referral_feedback", {
      source: window.location.pathname,
      metadata: {
        reaction: "comment",
        comment: comment.trim().slice(0, 500) || null,
      },
    });
    setThanks(true);
    markSeen();
    setTimeout(() => setVisible(false), 1800);
  };

  if (!visible) return null;

  return (
    <div
      className={cn(
        "fixed z-[60] bottom-4 right-4 left-4 sm:left-auto sm:max-w-sm",
        "animate-in slide-in-from-bottom-4 fade-in duration-300"
      )}
      role="dialog"
      aria-label="Votre avis sur Guardiens"
    >
      <Card className="p-4 shadow-lg border-primary/20 bg-card">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <p className="text-sm font-semibold text-foreground">
              {askingDismiss ? "Avant de partir…" : "Bienvenue"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {askingDismiss
                ? "Qu'est-ce qui vous fait fermer ce message ? (1 clic)"
                : "Vous arrivez de Facebook, votre avis m'aide énormément."}
            </p>
          </div>
          <button
            onClick={handleClose}
            aria-label="Fermer"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {thanks ? (
          <div className="flex items-center gap-2 py-2 text-sm text-primary">
            <Check className="h-4 w-4" />
            Merci, c'est noté.
          </div>
        ) : askingDismiss ? (
          dismissReason === "other" ? (
            <div className="space-y-2">
              <Textarea
                autoFocus
                value={dismissComment}
                onChange={(e) => setDismissComment(e.target.value)}
                placeholder="Dites-nous en deux mots…"
                rows={3}
                maxLength={500}
                className="text-sm"
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => closeNow({ silent: true })}>
                  Passer
                </Button>
                <Button size="sm" onClick={submitDismissOther}>
                  Envoyer
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5 mt-1">
              {DISMISS_REASONS.map(({ key, label }) => (
                <Button
                  key={key}
                  variant="outline"
                  size="sm"
                  className="justify-start text-xs h-8"
                  onClick={() => submitDismissReason(key)}
                >
                  {label}
                </Button>
              ))}
              <button
                onClick={() => closeNow({ silent: true })}
                className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2 mt-1 self-end"
              >
                Préfère ne pas répondre
              </button>
            </div>
          )
        ) : reaction === "comment" ? (
          <div className="space-y-2">
            <Textarea
              autoFocus
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Ce qui vous a plu, manqué, surpris…"
              rows={3}
              maxLength={500}
              className="text-sm"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={handleClose}>
                Plus tard
              </Button>
              <Button size="sm" onClick={submitComment}>
                Envoyer
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 mt-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-col h-auto py-2 gap-1"
              onClick={() => submitReaction("useful")}
            >
              <ThumbsUp className="h-4 w-4" />
              <span className="text-[11px]">Utile</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-col h-auto py-2 gap-1"
              onClick={() => submitReaction("meh")}
            >
              <Meh className="h-4 w-4" />
              <span className="text-[11px]">Bof</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-col h-auto py-2 gap-1"
              onClick={() => submitReaction("comment")}
            >
              <MessageSquare className="h-4 w-4" />
              <span className="text-[11px]">Commenter</span>
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default FacebookReferralFeedback;
