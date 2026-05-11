import { SKILL_PILL_META } from "./constants";

interface Props {
  helper: any;
  onPropose: () => void;
  onViewProfile: () => void;
}

const HelperCard = ({ helper: h, onPropose, onViewProfile }: Props) => {
  const skillCats: string[] = h.skill_categories || [];
  const displayedSkills = skillCats.slice(0, 2);
  const extraCount = skillCats.length - 2;
  const comps: string[] = h.competences || [];
  const toShow = comps.length > 0 ? comps : (h.custom_skills as string[] || []);

  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-3 transition-colors hover:border-primary/30">
      <span className="inline-block text-xs rounded-full bg-primary/10 text-primary px-3 py-1">
        Disponible pour aider
      </span>
      <div className="flex items-center gap-3">
        {h.avatar_url ? (
          <img src={h.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover border border-border" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground">
            {h.first_name?.charAt(0) || "?"}
          </div>
        )}
        <div>
          <p className="text-base font-heading font-semibold text-foreground">{h.first_name || "Membre disponible"}</p>
          {h.city && <p className="text-xs text-muted-foreground">{h.city}</p>}
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {displayedSkills.map((key: string) => {
          const meta = SKILL_PILL_META[key];
          if (!meta) return null;
          return (
            <span key={key} className="rounded-full border border-primary/20 bg-primary/10 text-primary px-2.5 py-0.5 text-xs">
              {meta.label}
            </span>
          );
        })}
        {extraCount > 0 && (
          <span className="text-xs text-muted-foreground px-2 py-0.5">+{extraCount}</span>
        )}
      </div>
      {h.sits_count > 0 && (
        <p className="text-xs text-foreground/60">
          {h.review_count > 0 ? `Note ${h.review_avg.toFixed(1)} · ` : ""}{h.sits_count} mission{h.sits_count > 1 ? "s" : ""} accomplie{h.sits_count > 1 ? "s" : ""}
        </p>
      )}
      {toShow.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {toShow.slice(0, 3).map((c: string) => (
            <span key={c} className="text-xs bg-muted text-foreground/70 px-2 py-0.5 rounded-full border border-border">
              {c}
            </span>
          ))}
          {toShow.length > 3 && (
            <span className="text-xs bg-muted text-foreground/70 px-2 py-0.5 rounded-full border border-border">
              +{toShow.length - 3}
            </span>
          )}
        </div>
      )}
      <div className="flex items-center justify-between gap-2 pt-1">
        <button
          onClick={onPropose}
          className="text-sm text-primary font-semibold hover:underline"
        >
          Proposer à {h.first_name || "ce membre"} →
        </button>
        <button
          onClick={onViewProfile}
          className="text-xs text-muted-foreground hover:text-foreground hover:underline"
        >
          Voir le profil
        </button>
      </div>
    </div>
  );
};

export default HelperCard;
