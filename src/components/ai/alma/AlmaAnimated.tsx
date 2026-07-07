/**
 * <AlmaAnimated /> — façade historique.
 *
 * Alma n'a plus qu'un seul visage : le SVG stage-aware. Ce wrapper est
 * conservé pour les points d'appel qui rendaient auparavant le plein
 * corps (SitDraftFromPrompt, etc.). Il délègue à <AlmaAvatarAnimated />
 * en grand format.
 */
import { cn } from "@/lib/utils";
import {
  AlmaAvatarAnimated,
  type AlmaAnimatedMood,
} from "./AlmaAvatarAnimated";
import type { AlmaMood } from "./AlmaAvatar";
import type { AlmaStage } from "@/hooks/useAlmaEvolution";

interface AlmaAnimatedProps {
  size?: number;
  className?: string;
  mood?: AlmaMood;
  stage?: AlmaStage;
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
  return (
    <AlmaAvatarAnimated
      size={size}
      mood={toAnimatedMood(mood)}
      stage={stage}
      className={cn(className)}
    />
  );
}

export default AlmaAnimated;
