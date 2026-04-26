import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, ThumbsUp, Meh, MessageSquare, Check } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";

const FLAG_KEY = "fb_ref_active";          // posée par FacebookReferralTracker
const SEEN_KEY = "fb_ref_feedback_seen";   // localStorage — ne pas re-prompter avant 30j
const SEEN_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const SHOW_DELAY_MS = 25_000;

type Reaction = "useful" | "meh" | "comment";

/**
 * Mini-prompt de feedback pour les visiteurs venant de Facebook.
 * Objectif : mesurer la qualité du trafic généré par les commentaires
 * postés sur les annonces de garde Facebook.
 */
const FacebookReferralFeedback = () => {
  const [visible, setVisible] = useState(false);
  const [reaction, setReaction] = useState<Reaction | null>(null);
  const [comment, setComment] = useState("");
  const [thanks, setThanks] = useState(false);

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

  const close = () => {
    setVisible(false);
    markSeen();
    if (!reaction) {
      trackEvent("fb_referral_dismissed", {
        source: window.location.pathname,
        metadata: { had_reaction: false },
      });
    }
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
              Bienvenue 👋
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Vous arrivez de Facebook — votre avis m'aide énormément !
            </p>
          </div>
          <button
            onClick={close}
            aria-label="Fermer"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {thanks ? (
          <div className="flex items-center gap-2 py-2 text-sm text-primary">
            <Check className="h-4 w-4" />
            Merci, c'est noté !
          </div>
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
              <Button variant="ghost" size="sm" onClick={close}>
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
