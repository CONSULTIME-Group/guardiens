import { useEffect, useMemo } from "react";
import { Star, Heart, RotateCcw, Award, type LucideIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";

/**
 * Section "Badges reçus en entraide" affichée sur les profils publics.
 * Alimentée par la vue `profile_mission_badges` qui agrège
 * `mission_feedbacks.badge_key` par receveur.
 *
 * Libellés éditoriaux : `super_voisin` est présenté « Personne en or »
 * (mot proscrit "voisin" évité) tout en conservant la clé DB.
 */

interface MissionBadgeMeta {
  label: string;
  description: string;
  icon: LucideIcon;
  iconColor: string;
  bgColor: string;
  borderColor: string;
}

const BADGE_META: Record<string, MissionBadgeMeta> = {
  coup_de_main_en_or: {
    label: "Coup de main en or",
    description: "Travail impeccable, sérieux",
    icon: Star,
    iconColor: "text-warning",
    bgColor: "bg-warning-soft",
    borderColor: "border-warning-border",
  },
  super_voisin: {
    label: "Personne en or",
    description: "Sympa, ponctuel, agréable",
    icon: Heart,
    iconColor: "text-success",
    bgColor: "bg-success-soft",
    borderColor: "border-success-border",
  },
  on_remet_ca: {
    label: "On remet ça",
    description: "On veut retravailler ensemble",
    icon: RotateCcw,
    iconColor: "text-info",
    bgColor: "bg-info-soft",
    borderColor: "border-info-border",
  },
};

interface Row {
  badge_key: string;
  earned_count: number;
  last_earned_at: string;
}

interface Props {
  profileId: string;
  /** Petit label visible côté "mon propre profil". */
  ownerNote?: string;
  className?: string;
}

const MissionBadgesReceived = ({ profileId, ownerNote, className = "" }: Props) => {
  const { data, isLoading } = useQuery({
    queryKey: ["profile_mission_badges", profileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profile_mission_badges" as any)
        .select("badge_key, earned_count, last_earned_at")
        .eq("user_id", profileId);
      if (error) throw error;
      return (data as unknown as Row[]) ?? [];
    },
    enabled: !!profileId,
    staleTime: 60_000,
  });

  const badges = useMemo(
    () => (data ?? []).filter((r) => BADGE_META[r.badge_key]),
    [data]
  );

  useEffect(() => {
    if (badges.length > 0) {
      trackEvent("profile_mission_badges_seen", {
        metadata: { profile_id: profileId, badges_count: badges.length },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [badges.length, profileId]);

  if (isLoading || badges.length === 0) return null;

  return (
    <section
      aria-labelledby="mission-badges-received-heading"
      className={`rounded-2xl border border-border/60 bg-card p-4 sm:p-5 ${className}`}
    >
      <div className="flex items-center gap-2 mb-3">
        <Award className="h-4 w-4 text-primary" aria-hidden="true" />
        <h3
          id="mission-badges-received-heading"
          className="text-sm font-semibold text-foreground"
        >
          Badges reçus en entraide
        </h3>
      </div>
      {ownerNote && (
        <p className="text-xs text-muted-foreground mb-3">{ownerNote}</p>
      )}
      <ul className="flex flex-wrap gap-2">
        {badges.map((b) => {
          const meta = BADGE_META[b.badge_key];
          const Icon = meta.icon;
          return (
            <li
              key={b.badge_key}
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 ${meta.bgColor} ${meta.borderColor}`}
              title={meta.description}
            >
              <Icon className={`h-3.5 w-3.5 ${meta.iconColor}`} aria-hidden="true" />
              <span className="text-xs font-medium text-foreground">{meta.label}</span>
              {b.earned_count > 1 && (
                <span className="text-[11px] font-semibold text-muted-foreground tabular-nums">
                  ×{b.earned_count}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default MissionBadgesReceived;
