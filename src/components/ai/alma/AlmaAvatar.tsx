/**
 * <AlmaAvatar /> — façade historique.
 *
 * Alma n'a plus qu'un seul visage dans l'app : le SVG stage-aware de
 * <AlmaAvatarAnimated />. Ce fichier reste un wrapper de compatibilité
 * pour les nombreux points d'appel existants, il ne rend plus jamais le
 * PNG. Le stade peut être passé explicitement (les surfaces qui affichent
 * un halo ou un liseré de stade le fournissent depuis useAlmaEvolution).
 */
import { cn } from "@/lib/utils";
import {
  AlmaAvatarAnimated,
  type AlmaAnimatedMood,
} from "./AlmaAvatarAnimated";
import type { AlmaStage } from "@/hooks/useAlmaEvolution";

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
  /** Stade d'évolution utilisateur (halo, liseré, intensité). */
  stage?: AlmaStage;
  /** Affiche un halo coloré derrière l'avatar. */
  showHalo?: boolean;
}

function toAnimatedMood(mood: AlmaMood): AlmaAnimatedMood {
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
  return (
    <AlmaAvatarAnimated
      size={size}
      mood={toAnimatedMood(mood)}
      stage={stage}
      showHalo={showHalo}
      aria-hidden={ariaHidden}
      className={cn(className)}
    />
  );
}

export default AlmaAvatar;
