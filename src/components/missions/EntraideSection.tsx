import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Handshake, ThumbsUp, Star, Sprout, PawPrint, GraduationCap } from "lucide-react";
import { MISSION_BADGES } from "./MissionFeedbackModal";

interface EntraideSectionProps {
  userId: string;
}

const CATEGORY_META: Record<string, { label: string; icon: typeof Sprout }> = {
  animals: { label: "Animaux", icon: PawPrint },
  garden: { label: "Jardin", icon: Sprout },
  house: { label: "Coups de main", icon: Handshake },
  skills: { label: "Compétences", icon: GraduationCap },
};

const EntraideSection = ({ userId }: EntraideSectionProps) => {
  const [givenCount, setGivenCount] = useState(0);
  const [receivedCount, setReceivedCount] = useState(0);
  const [badgeCounts, setBadgeCounts] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<{ comment: string; giverName: string; giverAvatar: string | null; giverCity: string | null; badgeKey: string | null; createdAt: string }[]>([]);
  const [activeMissions, setActiveMissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [helpedRes, postedRes, feedbacksRes, activeMissionsRes] = await Promise.all([
        supabase
          .from("small_mission_responses")
          .select("id", { count: "exact", head: true })
          .eq("responder_id", userId)
          .eq("status", "accepted"),
        supabase
          .from("small_missions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("status", "completed"),
        supabase
          .from("mission_feedbacks" as any)
          .select("badge_key, comment, created_at, giver_id, giver:giver_id(first_name, avatar_url, city)")
          .eq("receiver_id", userId)
          .order("created_at", { ascending: false }),
        supabase
          .from("small_missions")
          .select("id, title, category, mission_type, city")
          .eq("user_id", userId)
          .eq("status", "open")
          .order("created_at", { ascending: false })
          .limit(3),
      ]);

      setGivenCount(helpedRes.count || 0);
      setReceivedCount(postedRes.count || 0);
      setActiveMissions(activeMissionsRes.data || []);

      if (feedbacksRes.data && feedbacksRes.data.length > 0) {
        const counts: Record<string, number> = {};
        const commentsList: typeof comments = [];

        (feedbacksRes.data as any[]).forEach((f: any) => {
          if (f.badge_key) {
            counts[f.badge_key] = (counts[f.badge_key] || 0) + 1;
          }
          if (f.comment) {
            commentsList.push({
              comment: f.comment.length > 100 ? f.comment.slice(0, 100) + "…" : f.comment,
              giverName: f.giver?.first_name || "Quelqu'un",
              giverAvatar: f.giver?.avatar_url || null,
              giverCity: f.giver?.city || null,
              badgeKey: f.badge_key,
              createdAt: f.created_at,
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
  const hasActiveMissions = activeMissions.length > 0;

  if (totalActivity === 0 && !hasBadges && comments.length === 0 && !hasActiveMissions) return null;

  const feedbackCount = comments.length;

  return (
    <div className="border-t border-border mt-8 pt-8 space-y-6">
      <div>
        <h3 className="font-heading text-lg font-semibold">Échanges réalisés</h3>
        {totalActivity > 0 && (
          <p className="text-sm text-foreground/50 mt-1">
            {totalActivity} échange{totalActivity > 1 ? "s" : ""} · {feedbackCount} avis reçu{feedbackCount > 1 ? "s" : ""}
          </p>
        )}
      </div>

      {/* Active missions from this member */}
      {hasActiveMissions && (
        <div>
          <h4 className="text-base font-heading font-semibold mb-4">Ses échanges en cours</h4>
          <div className="space-y-2">
            {activeMissions.map((m: any) => {
              const meta = CATEGORY_META[m.category] || CATEGORY_META.animals;
              const Icon = meta.icon;
              const isBesoin = m.mission_type !== "offre";
              return (
                <Link
                  key={m.id}
                  to={`/petites-missions/${m.id}`}
                  className="flex items-center gap-3 p-3 rounded-xl bg-card border border-primary/20 hover:bg-accent/50 transition-colors"
                >
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    isBesoin ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                  }`}>
                    {isBesoin ? "Besoin" : "Offre"}
                  </span>
                  <Icon className="h-4 w-4 text-primary shrink-0" />
                  <p className="text-sm font-heading font-semibold truncate flex-1">{m.title}</p>
                  <span className="text-sm text-primary font-semibold shrink-0">Proposer un échange →</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

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

      {/* Comments / feedback */}
      {comments.length > 0 && (
        <div className="space-y-3">
          {comments.map((c, i) => (
            <div key={i} className="flex items-start gap-3">
              {c.giverAvatar ? (
                <img src={c.giverAvatar} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">
                  {c.giverName.charAt(0)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{c.giverName}</span>
                  {c.giverCity && <span className="text-xs text-foreground/40">{c.giverCity}</span>}
                </div>
                <p className="text-sm text-foreground/80 italic mt-0.5">{c.comment}</p>
                {c.badgeKey && (
                  <span className="text-xs text-primary/60 mt-0.5 inline-block">
                    {MISSION_BADGES.find(b => b.key === c.badgeKey)?.label}
                  </span>
                )}
              </div>
              <ThumbsUp className="h-3.5 w-3.5 text-green-500 shrink-0 mt-1" />
            </div>
          ))}
        </div>
      )}

      {totalActivity === 0 && !hasBadges && comments.length === 0 && !hasActiveMissions && (
        <p className="text-sm text-foreground/40">Pas encore d'échange réalisé.</p>
      )}
    </div>
  );
};

export default EntraideSection;
