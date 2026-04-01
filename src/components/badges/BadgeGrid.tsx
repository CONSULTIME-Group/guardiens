import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  PawPrint, Home, Leaf, Camera, Wrench, Rocket, Heart, Star,
  ShieldCheck, Award, Zap, HeartHandshake,
} from "lucide-react";

/* ── All possible sitter-facing badges ── */
const ALL_SITTER_BADGES = [
  { key: "animals_adopted", label: "Les animaux l'ont adopté", condition: "Reçu après une garde", icon: PawPrint, fill: "#EAF3DE", stroke: "#3B6D11" },
  { key: "house_clean", label: "Maison nickel", condition: "Reçu après une garde", icon: Home, fill: "#E6F1FB", stroke: "#185FA5" },
  { key: "garden_great", label: "Le potager respire", condition: "Reçu après une garde", icon: Leaf, fill: "#EAF3DE", stroke: "#3B6D11" },
  { key: "daily_news", label: "Des nouvelles tous les jours", condition: "Reçu après une garde", icon: Camera, fill: "#EEEDFE", stroke: "#534AB7" },
  { key: "resourceful", label: "Débrouillard(e)", condition: "Reçu après une garde", icon: Wrench, fill: "#FAEEDA", stroke: "#854F0B" },
  { key: "beyond_expectations", label: "Au-delà des attentes", condition: "Reçu après une garde", icon: Rocket, fill: "#EEEDFE", stroke: "#534AB7" },
  { key: "neighbors_love", label: "Les voisins l'adorent", condition: "Reçu après une garde", icon: Heart, fill: "#FBEAF0", stroke: "#993556" },
  { key: "invite_christmas", label: "On l'invite à Noël", condition: "Reçu après une garde", icon: Star, fill: "#FAEEDA", stroke: "#854F0B" },
  { key: "identity_verified", label: "ID vérifiée", condition: "Vérifier ton identité", icon: ShieldCheck, fill: "#EAF3DE", stroke: "#3B6D11" },
  { key: "founder", label: "Fondateur", condition: "Inscrit avant le 13 mai 2026", icon: Award, fill: "#FAEEDA", stroke: "#854F0B" },
  { key: "emergency_sitter", label: "Gardien d'urgence", condition: "5 gardes + note ≥ 4.7", icon: Zap, fill: "#FAEEDA", stroke: "#854F0B" },
  { key: "mutual_connection", label: "Le courant passe", condition: "Évaluation positive mutuelle", icon: HeartHandshake, fill: "#E6F1FB", stroke: "#185FA5" },
];

const LOCKED_FILL = "#F1EFE8";
const LOCKED_STROKE_DASHBOARD = "#B4B2A9";
const LOCKED_STROKE_PUBLIC = "#D3D1C7";

interface BadgeGridProps {
  /** Map of badge_key → count (unlocked badges) */
  unlockedBadges: Record<string, number>;
  /** "dashboard" shows tooltip with lock condition; "public" hides tooltip on locked */
  variant: "dashboard" | "public";
}

export default function BadgeGrid({ unlockedBadges, variant }: BadgeGridProps) {
  const totalUnlocked = Object.keys(unlockedBadges).length;

  // Sort: unlocked first for public variant
  const sorted = variant === "public"
    ? [...ALL_SITTER_BADGES].sort((a, b) => {
        const aUnlocked = !!unlockedBadges[a.key];
        const bUnlocked = !!unlockedBadges[b.key];
        if (aUnlocked && !bUnlocked) return -1;
        if (!aUnlocked && bUnlocked) return 1;
        return 0;
      })
    : ALL_SITTER_BADGES;

  return (
    <div>
      <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
        {sorted.map((badge) => {
          const unlocked = !!unlockedBadges[badge.key];
          const count = unlockedBadges[badge.key] || 0;
          const Icon = badge.icon;

          const lockedStroke = variant === "public" ? LOCKED_STROKE_PUBLIC : LOCKED_STROKE_DASHBOARD;
          const lockedOpacity = variant === "public" ? "opacity-25" : "opacity-40";

          const shield = (
            <div
              className={`flex flex-col items-center gap-0.5 ${unlocked ? "cursor-default" : ""}`}
              style={{ width: 56 }}
            >
              <div
                className={`relative flex items-center justify-center ${unlocked ? "" : lockedOpacity}`}
                style={{ width: 40, height: 48, filter: unlocked ? undefined : "grayscale(100%)" }}
              >
                <svg viewBox="0 0 40 48" width={40} height={48} className="absolute inset-0">
                  <path
                    d="M20 2 L38 10 L38 30 C38 40 20 46 20 46 C20 46 2 40 2 30 L2 10 Z"
                    fill={unlocked ? badge.fill : LOCKED_FILL}
                    stroke={unlocked ? badge.stroke : lockedStroke}
                    strokeWidth={1.5}
                  />
                </svg>
                <Icon
                  className="relative z-10"
                  style={{ width: 16, height: 16, color: unlocked ? badge.stroke : lockedStroke }}
                />
              </div>
              {unlocked && count > 1 && (
                <span className="bg-primary text-primary-foreground text-xs w-5 h-5 rounded-full flex items-center justify-center -mt-3 relative z-20">
                  {count}
                </span>
              )}
            </div>
          );

          // Dashboard: always show tooltip
          if (variant === "dashboard") {
            return (
              <Tooltip key={badge.key}>
                <TooltipTrigger asChild>{shield}</TooltipTrigger>
                <TooltipContent side="top" className="max-w-[200px]">
                  {unlocked ? (
                    <>
                      <p className="text-xs font-medium">{badge.label}</p>
                      {count > 1 && <p className="text-xs text-muted-foreground">Reçu {count} fois</p>}
                    </>
                  ) : (
                    <p className="text-xs">🔒 {badge.label} — {badge.condition}</p>
                  )}
                </TooltipContent>
              </Tooltip>
            );
          }

          // Public: tooltip only on unlocked
          if (unlocked) {
            return (
              <Tooltip key={badge.key}>
                <TooltipTrigger asChild>{shield}</TooltipTrigger>
                <TooltipContent side="top" className="max-w-[200px]">
                  <p className="text-xs font-medium">{badge.label}</p>
                  {count > 1 && <p className="text-xs text-muted-foreground">Reçu {count} fois</p>}
                </TooltipContent>
              </Tooltip>
            );
          }

          return <div key={badge.key}>{shield}</div>;
        })}
      </div>

      {/* Counter */}
      <p className="text-xs text-muted-foreground text-center mt-2">
        {variant === "dashboard" ? (
          totalUnlocked === 0
            ? "Tes premiers écussons apparaîtront après ta première garde."
            : `${totalUnlocked}/${ALL_SITTER_BADGES.length} écussons débloqués`
        ) : (
          `${totalUnlocked} écusson${totalUnlocked > 1 ? "s" : ""} reçu${totalUnlocked > 1 ? "s" : ""}`
        )}
      </p>
    </div>
  );
}
