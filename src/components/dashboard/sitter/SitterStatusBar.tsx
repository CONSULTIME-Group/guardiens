import { Link } from "react-router-dom";
import { StatutGardienBadge } from "@/components/profile/StatutGardienBadge";
import { useAuth } from "@/contexts/AuthContext";
import type { ReputationData } from "@/hooks/useSitterDashboardData";

interface SitterStatusBarProps {
  profileCompletion: number;
  completedSits: number;
  avgRating: number;
  reviewsCount: number;
  badgeCount: number;
  totalApps: number;
  reputation: ReputationData | null;
}

const SitterStatusBar = ({
  profileCompletion, completedSits, avgRating, reviewsCount, badgeCount, totalApps, reputation,
}: SitterStatusBarProps) => {
  const { user, activeRole } = useAuth();
  const profilePath = (user?.role === "both" ? activeRole : user?.role) === "owner" ? "/owner-profile" : "/profile";
  return (
  <div className="mx-4 sm:mx-5 md:mx-8 mb-6 md:mb-8 bg-card border border-border rounded-2xl overflow-hidden grid grid-cols-1 md:grid-cols-3">
    {/* Zone 1 — MON PROFIL */}
    <div className="p-4 md:p-5 border-b md:border-b-0 md:border-r border-border">
      <p className="text-xs uppercase tracking-widest text-muted-foreground font-sans mb-3">Mon profil</p>
      <div className="h-1.5 bg-muted rounded-full mb-2">
        <div className="h-1.5 bg-primary rounded-full transition-all duration-500" style={{ width: `${profileCompletion}%` }} />
      </div>
      <p className="text-lg font-heading font-bold text-foreground mb-1">{profileCompletion}% complété</p>
      {profileCompletion >= 60 && (
        <span className="text-xs font-sans bg-primary/10 text-primary rounded-md px-2 py-0.5 inline-block mb-3">Visible par les proprios</span>
      )}
      {profileCompletion < 100 && (
        <Link to={profilePath} className="text-xs text-primary font-sans block">Compléter →</Link>
      )}
    </div>

    {/* Zone 2 — MES STATS */}
    <div className="p-4 md:p-5 border-b md:border-b-0 md:border-r border-border">
      <p className="text-xs uppercase tracking-widest text-muted-foreground font-sans mb-3">Mes stats</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="text-center">
          <p className="text-2xl font-heading font-bold text-foreground">{completedSits}</p>
          <p className="text-xs text-muted-foreground font-sans">Gardes</p>
        </div>
        <div className="text-center">
          {reviewsCount > 0 ? (
            <>
              <p className="text-2xl font-heading font-bold text-foreground">
                {avgRating.toFixed(1)}
                <span className="text-sm font-sans font-normal text-muted-foreground">/5</span>
              </p>
              <p className="text-xs text-muted-foreground font-sans">
                Note ({reviewsCount} avis)
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground font-sans mt-1">–</p>
              <p className="text-xs text-muted-foreground font-sans">Note</p>
            </>
          )}
        </div>
        <div className="text-center">
          <p className="text-2xl font-heading font-bold text-foreground">{badgeCount}</p>
          <p className="text-xs text-muted-foreground font-sans">Badges</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-heading font-bold text-foreground">{totalApps}</p>
          <p className="text-xs text-muted-foreground font-sans">Candidatures</p>
        </div>
      </div>
      {completedSits === 0 && (
        <p className="text-xs text-muted-foreground font-sans italic mt-3 leading-snug">
          Vos statistiques apparaîtront après votre première garde.
        </p>
      )}
    </div>

    {/* Zone 3 — STATUT */}
    <div className="p-4 md:p-5">
      <p className="text-xs uppercase tracking-widest text-muted-foreground font-sans mb-3">Mon Statut</p>
      <div className="mb-4">
        {reputation && reputation.statut_gardien !== "novice" ? (
          <StatutGardienBadge statut={reputation.statut_gardien as "novice" | "confirme" | "super_gardien"} />
        ) : (
          <span className="text-xs text-muted-foreground font-sans">Novice</span>
        )}
      </div>
      <p className="text-xs font-medium text-foreground mb-2">Progression Super Gardien</p>
      <div className="flex flex-col gap-1.5">
        {[
          { label: `3 gardes réalisées (${reputation?.completed_sits ?? 0}/3)`, ok: (reputation?.completed_sits ?? 0) >= 3 },
          { label: `5 badges actifs différents (${reputation?.active_badges ?? 0}/5)`, ok: (reputation?.active_badges ?? 0) >= 5 },
          { label: `Note ≥ 4.8 (${reputation?.note_moyenne ? Number(reputation.note_moyenne).toFixed(1) : "—"}/4.8)`, ok: (reputation?.note_moyenne ?? 0) >= 4.8 },
        ].map((c) => (
          <div key={c.label} className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full shrink-0 ${c.ok ? "bg-primary" : "bg-muted-foreground/30"}`} />
            <span className={`text-xs font-sans ${c.ok ? "line-through text-foreground/60" : "text-foreground/70"}`}>{c.label}</span>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground font-sans italic mt-3 leading-snug">
        Le statut Gardien d'urgence est distinct (note ≥ 4.7) — voir l'éligibilité plus bas.
      </p>
    </div>
  </div>
  );
};

export default SitterStatusBar;
