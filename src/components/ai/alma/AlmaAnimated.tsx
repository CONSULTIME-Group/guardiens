/**
 * <AlmaAnimated /> — façade historique.
 *
 * Alma n'a plus qu'un seul visage : le SVG stage-aware. Ce wrapper est
 * conservé pour les points d'appel qui rendaient auparavant le plein
 * corps (SitDraftFromPrompt, etc.). Il délègue à <AlmaAvatarAnimated />
 * en grand format, avec le stade utilisateur récupéré via
 * useAlmaEvolution.
 */
import { cn } from "@/lib/utils";
import { useAlmaEvolution } from "@/hooks/useAlmaEvolution";
import {
  AlmaAvatarAnimated,
  type AlmaAnimatedMood,
} from "./AlmaAvatarAnimated";
import type { AlmaMood } from "./AlmaAvatar";

interface AlmaAnimatedProps {
  size?: number;
  className?: string;
  mood?: AlmaMood;
  stage?: "nouvelle" | "eveillee" | "complice" | "fidele";
}

function toAnimatedMood(mood: AlmaMood): AlmaAnimatedMood {
  if (mood === "attention") return "attentive";
  return mood;
}

export function AlmaAnimated({
  size = 96,
  className,
  mood = "idle",
  stage,
}: AlmaAnimatedProps) {
  const { data } = useAlmaEvolution();
  const effectiveStage = stage ?? data?.stage;

  return (
    <AlmaAvatarAnimated
      size={size}
      mood={toAnimatedMood(mood)}
      stage={effectiveStage}
      className={cn(className)}
    />
  );
}

export default AlmaAnimated;
