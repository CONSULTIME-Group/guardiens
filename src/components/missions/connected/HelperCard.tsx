import { Button } from "@/components/ui/button";
import { ShieldCheck, ArrowRight } from "lucide-react";
import { SKILL_PILL_META } from "./constants";
import { tokenizeSkillPhrases, normalizeSkillKey } from "@/lib/skills/tokenize";

interface Props {
  helper: any;
  onPropose: () => void;
  onViewProfile: () => void;
  /** True si l'aidant possède au moins une compétence correspondant à une demande active du user. */
  matchesMyNeed?: boolean;
}

const HelperCard = ({ helper: h, onPropose, onViewProfile, matchesMyNeed = false }: Props) => {
  const skillCats: string[] = h.skill_categories || [];
  const displayedSkills = skillCats.slice(0, 2);
  const extraCount = skillCats.length - 2;
  const customSkills: string[] = tokenizeSkillPhrases((h.custom_skills as string[]) || []);
  const comps: string[] = tokenizeSkillPhrases((h.competences as string[]) || []);
  // Compétences "spéciales" = saisies en libre (savoir-faire unique).
  // Custom prioritaire, dédup insensible à la casse ET aux diacritiques
  // (« Cuisine » == « cuisiné » == « CUISINE  »).
  const seen = new Set<string>();
  const specialSkills = [...customSkills, ...comps].filter((s) => {
    const k = normalizeSkillKey(s);
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  const bioTeaser = h.bio?.trim() || null;

  return (
    <div className={`rounded-lg border bg-card p-5 space-y-3 transition-colors flex flex-col ${matchesMyNeed ? "border-primary/40 shadow-sm" : "border-border hover:border-primary/30"}`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
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
      {matchesMyNeed && (
        <span className="inline-flex items-center self-start gap-1 text-xs font-semibold rounded-full bg-success-soft text-success px-2.5 py-1">
          Correspond à votre demande
        </span>
      )}
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

      {/* Item 9 — éviter le mur de CTAs verts répétés.
          Action primaire = découvrir le profil (chemin naturel) ;
          contact en secondaire/outline pour qui sait déjà. */}
      <div className="flex items-center gap-2 pt-2 mt-auto">
        <Button onClick={onViewProfile} size="sm" variant="outline" className="flex-1">
          Voir le profil
        </Button>
        <Button
          onClick={onPropose}
          size="sm"
          variant="ghost"
          className="shrink-0 text-primary hover:text-primary hover:bg-primary/10"
          aria-label={`Contacter ${h.first_name || "ce membre"}`}
          title={`Contacter ${h.first_name || "ce membre"}`}
        >
          Contacter
          <ArrowRight className="ml-1 h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};

export default HelperCard;
