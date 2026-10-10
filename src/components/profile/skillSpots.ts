/** Petites gouaches de savoir-faire existantes, partagées fiche et cartes. */
import type { SkillSpot } from "@/lib/sitterSkillGroups";
import spotChat from "@/assets/missions/spot-chat-160.webp";
import spotChien from "@/assets/missions/spot-chien-160.webp";
import spotPoules from "@/assets/missions/spot-poules-160.webp";
import spotBienetre from "@/assets/missions/spot-bienetre-160.webp";
import spotJardin from "@/assets/missions/spot-jardin-160.webp";
import spotBricolage from "@/assets/missions/spot-bricolage-160.webp";

export const SPOTS: Record<SkillSpot, string> = {
  "spot-chat": spotChat,
  "spot-chien": spotChien,
  "spot-poules": spotPoules,
  "spot-bienetre": spotBienetre,
  "spot-jardin": spotJardin,
  "spot-bricolage": spotBricolage,
};
