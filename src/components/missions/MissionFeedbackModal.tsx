import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ThumbsUp, ThumbsDown, Star, Heart, RotateCcw } from "lucide-react";

const MISSION_BADGES = [
  {
    key: "coup_de_main_en_or",
    label: "Coup de main en or",
    description: "Travail impeccable, sérieux",
    icon: Star,
    bgColor: "bg-amber-50 dark:bg-amber-900/20",
    borderColor: "border-amber-300 dark:border-amber-700",
    iconColor: "text-amber-500",
    selectedBg: "bg-amber-100 dark:bg-amber-900/40",
  },
  {
    key: "super_voisin",
    label: "Personne en or",
    description: "Sympa, ponctuel, agréable",
    icon: Heart,
    bgColor: "bg-green-50 dark:bg-green-900/20",
    borderColor: "border-green-300 dark:border-green-700",
    iconColor: "text-green-500",
    selectedBg: "bg-green-100 dark:bg-green-900/40",
  },
  {
    key: "on_remet_ca",
    label: "On remet ça",
    description: "On veut retravailler ensemble",
    icon: RotateCcw,
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
    borderColor: "border-blue-300 dark:border-blue-700",
    iconColor: "text-blue-500",
    selectedBg: "bg-blue-100 dark:bg-blue-900/40",
  },
];

export { MISSION_BADGES };

interface MissionFeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  missionId: string;
  receiverId: string;
  receiverName: string;
  onSubmitted: () => void;
}

const MissionFeedbackModal = ({
  open, onOpenChange, missionId, receiverId, receiverName, onSubmitted,
}: MissionFeedbackModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [positive, setPositive] = useState<boolean | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user || positive === null) return;
    setSubmitting(true);

    const { error } = await supabase.from("mission_feedbacks" as any).insert({
      mission_id: missionId,
      giver_id: user.id,
      receiver_id: receiverId,
      positive,
      badge_key: selectedBadge,
      comment: comment.trim() || null,
    });

    setSubmitting(false);

    if (error) {
      if (error.code === "23505") {
        toast({ title: "Retour déjà envoyé", description: "Vous avez déjà donné votre retour pour cette mission." });
      } else {
        toast({ variant: "destructive", title: "Erreur", description: "Impossible d'envoyer votre retour." });
        return;
      }
    } else {
      toast({ title: "Merci pour votre retour ! 🙌" });
    }

    onOpenChange(false);
    onSubmitted();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg">Comment ça s'est passé ?</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Votre retour sur l'entraide avec {receiverName}
          </p>
        </DialogHeader>

        <div className="space-y-6 mt-2">
          {/* 1. Thumbs */}
          <div>
            <p className="text-sm font-medium mb-3">Ça s'est bien passé ?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setPositive(true)}
                className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  positive === true
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border hover:border-primary/30"
                }`}
              >
                <ThumbsUp className={`h-8 w-8 ${positive === true ? "text-primary" : "text-muted-foreground"}`} />
                <span className="text-sm font-medium">Oui 👍</span>
              </button>
              <button
                onClick={() => setPositive(false)}
                className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  positive === false
                    ? "border-destructive bg-destructive/5 shadow-sm"
                    : "border-border hover:border-destructive/30"
                }`}
              >
                <ThumbsDown className={`h-8 w-8 ${positive === false ? "text-destructive" : "text-muted-foreground"}`} />
                <span className="text-sm font-medium">Non 👎</span>
              </button>
            </div>
          </div>

          {/* 2. Badge selection */}
          <div>
            <p className="text-sm font-medium mb-1">Attribuer un écusson <span className="text-muted-foreground font-normal">(optionnel)</span></p>
            <p className="text-xs text-muted-foreground mb-3">1 écusson max</p>
            <div className="space-y-2">
              {MISSION_BADGES.map((badge) => {
                const Icon = badge.icon;
                const isSelected = selectedBadge === badge.key;
                return (
                  <button
                    key={badge.key}
                    onClick={() => setSelectedBadge(isSelected ? null : badge.key)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                      isSelected
                        ? `${badge.selectedBg} ${badge.borderColor} shadow-sm`
                        : `${badge.bgColor} border-transparent hover:${badge.borderColor}`
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isSelected ? badge.selectedBg : badge.bgColor}`}>
                      <Icon className={`h-5 w-5 ${badge.iconColor}`} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{badge.label}</p>
                      <p className="text-xs text-muted-foreground">{badge.description}</p>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                        <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Comment */}
          <div>
            <p className="text-sm font-medium mb-1.5">Un mot sur cette entraide ? <span className="text-muted-foreground font-normal">(optionnel)</span></p>
            <Textarea
              placeholder="Ex : Très sympa, chien bien promené, merci !"
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 100))}
              maxLength={100}
              className="min-h-[60px]"
            />
            <p className="text-xs text-muted-foreground mt-1 text-right">{comment.length}/100</p>
          </div>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={positive === null || submitting}
            className="w-full"
          >
            {submitting ? "Envoi..." : "Envoyer mon retour"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MissionFeedbackModal;
