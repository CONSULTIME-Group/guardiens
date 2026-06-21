import { useEffect, useState } from "react";
import { ThumbsUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { trackEvent } from "@/lib/analytics";

interface Props {
  answerId: string;
  initialCount: number;
}

const HelpfulButton = ({ answerId, initialCount }: Props) => {
  const { user } = useAuth();
  const [count, setCount] = useState(initialCount);
  const [voted, setVoted] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    supabase
      .from("community_answer_votes")
      .select("id")
      .eq("answer_id", answerId)
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setVoted(!!data);
      });
    return () => {
      cancelled = true;
    };
  }, [answerId, user]);

  const toggle = async () => {
    if (!user) {
      toast.error("Connectez-vous pour voter.");
      return;
    }
    if (busy) return;
    setBusy(true);
    if (voted) {
      const { error } = await supabase
        .from("community_answer_votes")
        .delete()
        .eq("answer_id", answerId)
        .eq("user_id", user.id);
      if (!error) {
        setVoted(false);
        setCount((c) => Math.max(c - 1, 0));
      }
    } else {
      const { error } = await supabase
        .from("community_answer_votes")
        .insert({ answer_id: answerId, user_id: user.id });
      if (!error) {
        setVoted(true);
        setCount((c) => c + 1);
        trackEvent("answer_helpful_click", { metadata: { answer_id: answerId } });
      }
    }
    setBusy(false);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors",
        voted
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-card text-foreground/70 border-border hover:bg-accent",
      )}
      aria-pressed={voted}
    >
      <ThumbsUp className="h-3.5 w-3.5" />
      {count}
    </button>
  );
};

export default HelpfulButton;
