import { Button } from "@/components/ui/button";
import { ShieldCheck, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const tp = (k: string, opts?: any) => t(k, opts) as string;
  const skillCats: string[] = h.skill_categories || [];
  const displayedSkills = skillCats.slice(0, 2);
  const extraCount = skillCats.length - 2;
  const customSkills: string[] = tokenizeSkillPhrases((h.custom_skills as string[]) || []);
  const comps: string[] = tokenizeSkillPhrases((h.competences as string[]) || []);
  const seen = new Set<string>();
  const specialSkills = [...customSkills, ...comps].filter((s) => {
    const k = normalizeSkillKey(s);
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  const bioTeaser = h.bio?.trim() || null;
  const memberName = h.first_name || tp("helper_card.default_member");
  const contactName = h.first_name || tp("helper_card.this_member");

  return (
    <>
      {/* Mobile, 1 carte = 1 ligne, ultra épuré. Tap = profil. */}
      <button
        type="button"
        onClick={onViewProfile}
        className={`md:hidden w-full text-left rounded-lg border bg-card px-3 py-2.5 flex items-center gap-3 transition-colors ${matchesMyNeed ? "border-primary/40" : "border-border"}`}
        aria-label={tp("helper_card.view_profile")}
      >
        {h.avatar_url ? (
          <img src={h.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover border border-border shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground shrink-0">
            {h.first_name?.charAt(0) || "?"}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-heading font-semibold text-foreground truncate">{memberName}</p>
          {h.city && <p className="text-xs text-muted-foreground truncate">{h.city}</p>}
          {bioTeaser && (
            <p className="text-[11px] text-foreground/60 truncate italic mt-0.5">« {bioTeaser} »</p>
          )}
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />

      </button>

      {/* Desktop, carte riche inchangée */}
      <div className={`hidden md:flex rounded-lg border bg-card p-5 space-y-3 transition-colors flex-col ${matchesMyNeed ? "border-primary/40 shadow-sm" : "border-border hover:border-primary/30"}`}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="inline-block text-xs rounded-full bg-primary/10 text-primary px-3 py-1">
            {tp("helper_card.available")}
          </span>
          {h.identity_verified && (
            <span className="inline-flex items-center gap-1 text-xs text-success" title={tp("helper_card.identity_verified")}>
              <ShieldCheck className="h-3.5 w-3.5" />
              {tp("helper_card.identity_verified")}
            </span>
          )}
        </div>
        {matchesMyNeed && (
          <span className="inline-flex items-center self-start gap-1 text-xs font-semibold rounded-full bg-success-soft text-success px-2.5 py-1">
            {tp("helper_card.matches_need")}
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
            <p className="text-base font-heading font-semibold text-foreground">{memberName}</p>
            {h.city && <p className="text-xs text-muted-foreground">{h.city}</p>}
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {displayedSkills.map((key: string) => {
            if (!SKILL_PILL_META[key]) return null;
            return (
              <span key={key} className="rounded-full border border-primary/20 bg-primary/10 text-primary px-2.5 py-0.5 text-xs">
                {tp(`mission_categories.${key === "competences" ? "skills" : key}`)}
              </span>
            );
          })}
          {extraCount > 0 && (
            <span className="text-xs text-muted-foreground px-2 py-0.5">+{extraCount}</span>
          )}
        </div>

        {specialSkills.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-1">
              {tp("helper_card.skills_label")}
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

        {bioTeaser && (
          <p className="text-xs text-foreground/75 leading-snug line-clamp-2 italic">
            « {bioTeaser} »
          </p>
        )}

        {h.sits_count > 0 && (
          <p className="text-xs text-foreground/60">
            {h.review_count > 0
              ? tp(h.sits_count > 1 ? "helper_card.stats_with_rating_other" : "helper_card.stats_with_rating", { rating: h.review_avg.toFixed(1), count: h.sits_count })
              : tp(h.sits_count > 1 ? "helper_card.stats_other" : "helper_card.stats_one", { count: h.sits_count })}
          </p>
        )}

        <div className="flex items-center gap-2 pt-2 mt-auto">
          <Button onClick={onViewProfile} size="sm" variant="outline" className="flex-1">
            {tp("helper_card.view_profile")}
          </Button>
          <Button
            onClick={onPropose}
            size="sm"
            variant="ghost"
            className="shrink-0 text-primary hover:text-primary hover:bg-primary/10"
            aria-label={tp("helper_card.contact_aria", { name: contactName })}
            title={tp("helper_card.contact_aria", { name: contactName })}
          >
            {tp("helper_card.contact")}
            <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </>
  );
};

export default HelperCard;
