import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Handshake, Star, Heart, RotateCcw } from "lucide-react";
import { MISSION_BADGES } from "./MissionFeedbackModal";

interface EntraideSectionProps {
  userId: string;
}

const EntraideSection = ({ userId }: EntraideSectionProps) => {
  const [givenCount, setGivenCount] = useState(0);
  const [receivedCount, setReceivedCount] = useState(0);
  const [badgeCounts, setBadgeCounts] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<{ comment: string; giverName: string; badgeKey: string | null }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      // Count missions helped (accepted responses)
      const { count: helpedCount } = await supabase
        .from("small_mission_responses")
        .select("id", { count: "exact", head: true })
        .eq("responder_id", userId)
        .eq("status", "accepted");

      // Count missions posted that were completed
      const { count: postedCount } = await supabase
        .from("small_missions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "completed");

      setGivenCount(helpedCount || 0);
      setReceivedCount(postedCount || 0);

      // Get feedbacks received
      const { data: feedbacks } = await supabase
        .from("mission_feedbacks" as any)
        .select("badge_key, comment, giver_id, giver:giver_id(first_name)")
        .eq("receiver_id", userId)
        .order("created_at", { ascending: false });

      if (feedbacks && feedbacks.length > 0) {
        // Count badges
        const counts: Record<string, number> = {};
        const commentsList: typeof comments = [];

        feedbacks.forEach((f: any) => {
          if (f.badge_key) {
            counts[f.badge_key] = (counts[f.badge_key] || 0) + 1;
          }
          if (f.comment) {
            commentsList.push({
              comment: f.comment,
              giverName: f.giver?.first_name || "Quelqu'un",
              badgeKey: f.badge_key,
            });
          }
        });

        setBadgeCounts(counts);
        setComments(commentsList.slice(0, 5));
      }

      setLoading(false);
    };
    load();
  }, [userId]);

  if (loading) return null;

  const totalActivity = givenCount + receivedCount;
  const hasBadges = Object.keys(badgeCounts).length > 0;

  if (totalActivity === 0 && !hasBadges && comments.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Handshake className="h-5 w-5 text-primary" />
        <h3 className="font-heading text-lg font-semibold">Entraide</h3>
      </div>

      {/* Counters */}
      <div className="flex items-center gap-4 text-sm">
        <span className="font-medium">{givenCount} coup{givenCount > 1 ? "s" : ""} de main donné{givenCount > 1 ? "s" : ""}</span>
        <span className="text-muted-foreground">·</span>
        <span className="font-medium">{receivedCount} coup{receivedCount > 1 ? "s" : ""} de main reçu{receivedCount > 1 ? "s" : ""}</span>
      </div>

      {/* Badge shields */}
      {hasBadges && (
        <div className="flex flex-wrap gap-3">
          {MISSION_BADGES.filter(b => badgeCounts[b.key]).map((badge) => {
            const Icon = badge.icon;
            const count = badgeCounts[badge.key];
            return (
              <div
                key={badge.key}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border-2 ${badge.borderColor} ${badge.bgColor}`}
              >
                <div className="flex items-center gap-1.5">
                  <Icon className={`h-4 w-4 ${badge.iconColor}`} />
                  <span className="text-sm font-semibold">{badge.label}</span>
                </div>
                {count > 1 && (
                  <span className="text-xs font-bold text-muted-foreground">×{count}</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Comments */}
      {comments.length > 0 && (
        <div className="space-y-2">
          {comments.map((c, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              <span className="text-muted-foreground shrink-0">«</span>
              <div>
                <span className="italic text-foreground/80">{c.comment}</span>
                <span className="text-muted-foreground"> — {c.giverName}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EntraideSection;
