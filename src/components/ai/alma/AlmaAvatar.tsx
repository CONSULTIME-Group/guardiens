/**
 * <AlmaAvatar /> — façade historique.
 *
 * Alma n'a plus qu'un seul visage dans l'app : le SVG stage-aware de
 * <AlmaAvatarAnimated />. Ce fichier reste un wrapper de compatibilité
 * pour les nombreux points d'appel existants, il ne rend plus jamais le
 * PNG. Le stade utilisateur est récupéré automatiquement via
 * useAlmaEvolution pour que l'évolution soit visible partout.
 */
import { cn } from "@/lib/utils";
import { useAlmaEvolution } from "@/hooks/useAlmaEvolution";
import {
  AlmaAvatarAnimated,
  type AlmaAnimatedMood,
} from "./AlmaAvatarAnimated";

export type AlmaMood =
  | "idle"
  | "happy"
  | "sleepy"
  | "attention"
  | "attentive"
  | "thinking"
  | "gentle"
  | "playful";

type Size = 24 | 32 | 40 | 56 | 72 | 96;

interface AlmaAvatarProps {
  size?: Size;
  className?: string;
  "aria-hidden"?: boolean;
  /** Conservé pour compat : géré nativement par le SVG animé. */
  animateIn?: boolean;
  /** Conservé pour compat : géré nativement par le SVG animé. */
  breathe?: boolean;
  /** Humeur contextuelle. */
  mood?: AlmaMood;
  /** Force un stade précis (sinon lecture via useAlmaEvolution). */
  stage?: "nouvelle" | "eveillee" | "complice" | "fidele";
  /** Affiche un halo coloré derrière l'avatar. */
  showHalo?: boolean;
}

function toAnimatedMood(mood: AlmaMood): AlmaAnimatedMood {
  // "attention" (legacy) → "attentive"
  if (mood === "attention") return "attentive";
  return mood;
}

export function AlmaAvatar({
  size = 32,
  className,
  mood = "idle",
  stage,
  showHalo,
  ...rest
}: AlmaAvatarProps) {
  const ariaHidden = rest["aria-hidden"];
  const { data } = useAlmaEvolution();
  const effectiveStage = stage ?? data?.stage;

  return (
    <AlmaAvatarAnimated
      size={size}
      mood={toAnimatedMood(mood)}
      stage={effectiveStage}
      showHalo={showHalo}
      aria-hidden={ariaHidden}
      className={cn(className)}
    />
  );
}

export default AlmaAvatar;
