import { Button } from "@/components/ui/button";
import { ShieldCheck, ArrowRight } from "lucide-react";
import { SKILL_PILL_META } from "./constants";
import { tokenizeSkillPhrases } from "@/lib/skills/tokenize";

interface Props {
  helper: any;
  onPropose: () => void;
  onViewProfile: () => void;
}

const HelperCard = ({ helper: h, onPropose, onViewProfile }: Props) => {
  const skillCats: string[] = h.skill_categories || [];
  const displayedSkills = skillCats.slice(0, 2);
  const extraCount = skillCats.length - 2;
  const customSkills: string[] = (h.custom_skills as string[]) || [];
  const comps: string[] = h.competences || [];
  // Compétences "spéciales" = saisies en libre (savoir-faire unique).
  // On affiche d'abord les custom (signature de la personne), puis les comps
  // générales en complément, dédupliquées (insensible à la casse).
  const seen = new Set<string>();
  const specialSkills = [...customSkills, ...comps].filter((s) => {
    const k = s?.trim().toLowerCase();
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  const bioTeaser = h.bio?.trim() || null;

  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-3 transition-colors hover:border-primary/30 flex flex-col">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-block text-xs rounded-full bg-primary/10 text-primary px-3 py-1">
          Disponible pour aider
        </span>
        {h.identity_verified && (
          <span className="inline-flex items-center gap-1 text-xs text-success" title="Identité vérifiée">
            <ShieldCheck className="h-3.5 w-3.5" />
            Identité vérifiée
          </span>
        )}
      </div>
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

      {/* Catégories génériques */}
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

      {/* Compétences spéciales (savoir-faire unique) */}
      {specialSkills.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-1">
            Savoir-faire
          </p>
          <div className="flex flex-wrap gap-1">
            {specialSkills.slice(0, 3).map((c: string) => (
              <span key={c} className="text-xs bg-muted text-foreground/80 px-2 py-0.5 rounded-full border border-border">
                {c}
              </span>
            ))}
            {specialSkills.length > 3 && (
              <span className="text-xs bg-muted text-foreground/60 px-2 py-0.5 rounded-full border border-border">
                +{specialSkills.length - 3}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Mini bio */}
      {bioTeaser && (
        <p className="text-xs text-foreground/75 leading-snug line-clamp-2 italic">
          « {bioTeaser} »
        </p>
      )}

      {h.sits_count > 0 && (
        <p className="text-xs text-foreground/60">
          {h.review_count > 0 ? `Note ${h.review_avg.toFixed(1)} · ` : ""}{h.sits_count} mission{h.sits_count > 1 ? "s" : ""} accomplie{h.sits_count > 1 ? "s" : ""}
        </p>
      )}

      <div className="flex flex-col gap-2 pt-2 mt-auto">
        <Button onClick={onPropose} size="sm" className="w-full">
          Proposer à {h.first_name || "ce membre"}
          <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
        </Button>
        <button
          onClick={onViewProfile}
          className="text-xs text-muted-foreground hover:text-foreground hover:underline self-center"
        >
          Voir le profil
        </button>
      </div>
    </div>
  );
};

export default HelperCard;
