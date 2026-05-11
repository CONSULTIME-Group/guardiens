import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { CATEGORY_META, formatCity, formatDuration, ModeFilter } from "./constants";

interface Props {
  mission: any;
  currentUserId?: string;
  isAuthenticated: boolean;
  canApplyMissions: boolean;
  mode: ModeFilter;
  onNavigateDetail: () => void;
  onPropose: () => void;
}

const MissionCard = ({ mission: m, currentUserId, isAuthenticated, canApplyMissions, mode, onNavigateDetail, onPropose }: Props) => {
  const meta = CATEGORY_META[m.category] || CATEGORY_META.animals;
  const isCompleted = m.status === "completed";
  const isMine = m.user_id === currentUserId;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onNavigateDetail}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onNavigateDetail(); } }}
      className="cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
    >
      <Card className={`border-border transition-colors h-full ${isCompleted ? "opacity-50 grayscale" : "hover:border-primary/30"}`}>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{meta.label}</span>
            {m.response_count > 0 && (
              <span className="text-xs text-muted-foreground bg-accent px-2 py-0.5 rounded-full">
                {m.response_count} proposition{m.response_count > 1 ? "s" : ""}
              </span>
            )}
          </div>
          <p className="font-medium text-sm text-foreground">{m.title}</p>
          <p className="text-xs text-muted-foreground">
            {formatCity(m.city || "—")} · {formatDuration(m.duration_estimate || "—")}
          </p>
          <p className="text-xs text-muted-foreground">En échange : {m.exchange_offer}</p>
          {isCompleted ? (
            <span className="inline-block text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Trouvé</span>
          ) : m.status === "in_progress" ? (
            <span className="inline-block text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">En cours</span>
          ) : null}
          {!isCompleted && (
            isMine ? (
              <span className="inline-block text-xs text-muted-foreground text-center w-full mt-2">Votre mission</span>
            ) : isAuthenticated && !canApplyMissions ? (
              <Button size="sm" variant="outline" className="w-full mt-2 gap-1 text-muted-foreground" disabled>
                <Lock className="h-3 w-3" /> Complétez votre profil
              </Button>
            ) : m.already_proposed ? (
              <Button size="sm" variant="outline" className="w-full mt-2 opacity-60 cursor-not-allowed" disabled>
                Proposition envoyée
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="w-full mt-2"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onPropose(); }}
              >
                {mode === "offer" ? "Je peux aider →" : "Proposer un échange →"}
              </Button>
            )
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MissionCard;
