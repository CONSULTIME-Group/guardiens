import type { ScoreGroupId } from "@/components/profile/ScoreBreakdown";

/**
 * Groupe de chaque critère du barème dans le panneau « Ce que mesure votre
 * score » (lot SC1, 10/11/2026, arène claude/arene/2026-11-10-score-completion).
 * Les points restent ceux de src/lib/profileCompletion.ts ; seul le rangement
 * change. Gardien : rassure 65, matchs 20, entraide 15. Propriétaire :
 * rassure 60, matchs 30, entraide 10.
 */
export const SITTER_SCORE_GROUP: Record<string, ScoreGroupId> = {
  location: "trust",
  avatar: "trust",
  bio: "trust",
  gallery: "trust",
  identity: "trust",
  lifestyle: "match",
  affinity: "match",
  competences: "help",
};

export const OWNER_SCORE_GROUP: Record<string, ScoreGroupId> = {
  location: "trust",
  avatar: "trust",
  bio: "trust",
  property_desc: "trust",
  gallery: "trust",
  identity: "trust",
  pet: "match",
  affinity: "match",
  owner_competences: "help",
};
