/**
 * Lot L4 : gouaches du récit, une par moment de la garde (vignettes
 * détourées de la série « états vides » et de l'accueil, aucune image neuve).
 */
import porte from "@/assets/aquarelles/final-arrivee-240.webp";
import animal from "@/assets/aquarelles/es-vide-promenade-256.webp";
import lettre from "@/assets/aquarelles/es-vide-lettre-256.webp";
import depart from "@/assets/aquarelles/es-vide-depart-gardien-256.webp";
import cles from "@/assets/aquarelles/histoire-cles-360.webp";
import matin from "@/assets/aquarelles/es-vide-chat-256.webp";
import type { StoryArt } from "@/lib/dashboardStory";

export const STORY_ART: Record<StoryArt, string> = { porte, animal, lettre, depart, cles, matin };
