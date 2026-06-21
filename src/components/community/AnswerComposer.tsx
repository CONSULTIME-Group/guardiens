import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { trackEvent } from "@/lib/analytics";

const schema = z.object({
  body: z.string().trim().min(10, "10 caractères minimum").max(4000, "4000 caractères maximum"),
});

interface Props {
  questionId: string;
  parentAnswerId?: string | null;
  isFirstAnswer?: boolean;
  onPosted?: () => void;
  placeholder?: string;
}

const AnswerComposer = ({ questionId, parentAnswerId = null, isFirstAnswer, onPosted, placeholder }: Props) => {
  const { user } = useAuth();
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!user) {
      toast.error("Connectez-vous pour répondre.");
      return;
    }
    const parsed = schema.safeParse({ body });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("community_answers").insert({
      question_id: questionId,
      author_id: user.id,
      parent_answer_id: parentAnswerId,
      body: parsed.data.body,
    });
    setSubmitting(false);
    if (error) {
      toast.error("Impossible de publier votre réponse.");
      return;
    }
    setBody("");
    trackEvent("answer_submit", {
      metadata: { question_id: questionId, is_first_answer: !!isFirstAnswer, is_reply: !!parentAnswerId },
    });
    toast.success("Réponse publiée.");
    onPosted?.();
  };

  return (
    <div className="space-y-2">
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder ?? "Partagez votre retour, votre expérience ou un conseil."}
        rows={4}
        maxLength={4000}
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-foreground/55">{body.length}/4000</span>
        <Button onClick={submit} disabled={submitting || body.trim().length < 10}>
          {submitting ? "Publication…" : "Publier ma réponse"}
        </Button>
      </div>
    </div>
  );
};

export default AnswerComposer;
