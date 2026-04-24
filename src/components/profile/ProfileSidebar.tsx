import { CheckCircle2, Circle, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, type ReactNode, type MouseEvent } from "react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";


export interface SidebarSection {
  id: string;
  num: number;
  label: string;
  subtitle: string;
  missingCount: number;
  /** Labels exacts des champs manquants pour cette section (ex: ["Permis ou véhicule"]). */
  missingLabels?: string[];
  complete: boolean;
  optional?: boolean;
}

interface ProfileSidebarProps {
  firstName?: string;
  city?: string;
  completion: number;
  sections: SidebarSection[];
  activeSection: string;
  onSectionClick: (id: string) => void;
  publicProfileUrl: string;
  role: "sitter" | "owner";
  isFounder?: boolean;
  scoreBreakdown?: ReactNode;
}

const ProfileSidebar = ({
  firstName, city, completion, sections,
  activeSection, onSectionClick, publicProfileUrl, role, isFounder,
  scoreBreakdown,
}: ProfileSidebarProps) => {
  const [expandedMissing, setExpandedMissing] = useState<Record<string, boolean>>({});

  const toggleExpanded = (id: string) => (e: MouseEvent) => {
    e.stopPropagation();
    setExpandedMissing(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <TooltipProvider delayDuration={200}>
    <aside className="w-full lg:w-[280px] lg:sticky lg:top-24 lg:self-start space-y-5 shrink-0">
      {/* Name + city + founder badge */}
      <div className="text-center space-y-1">
        <p className="text-base font-semibold text-foreground">
          {firstName ? firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase() : "Votre profil"}
        </p>
        {city && <p className="text-sm text-muted-foreground">{city}</p>}
        {/* Badge fondateur — migration en cours */}
      </div>

      {/* Completion */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Complétion du profil</p>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${completion}%` }} />
        </div>
        <p className="text-sm font-semibold text-foreground">{completion}% complété</p>
        {completion >= 60 ? (
          <span className="inline-block text-xs text-primary bg-primary/10 rounded-full px-2 py-0.5">
            ✓ Profil visible par les {role === "sitter" ? "proprios" : "gardiens"}
          </span>
        ) : (
          <span className="inline-block text-xs text-amber-700 bg-amber-50 rounded-full px-2 py-0.5">
            ⚠ Profil non visible — complétez à 60%
          </span>
        )}
      </div>

      {/* Score breakdown (optional) */}
      {scoreBreakdown}

      {/* Section nav — vertical on desktop, horizontal scroll on mobile */}
      <nav className="flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 -mx-1 px-1">
        {sections.map((s) => {
          const isActive = activeSection === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSectionClick(s.id)}
              className={cn(
                "flex items-center gap-2.5 text-left rounded-lg px-3 py-2 transition-colors whitespace-nowrap lg:whitespace-normal lg:w-full shrink-0",
                isActive && "bg-primary/10 border-l-2 border-primary",
                !isActive && "hover:bg-muted/50"
              )}
            >
              {s.complete ? (
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <div className="min-w-0">
                <p className={cn("text-sm font-medium", isActive ? "text-foreground" : "text-foreground")}>
                  {s.label}
                  {s.optional && <span className="text-xs font-normal text-muted-foreground ml-1">(optionnel)</span>}
                </p>
                <p className={cn("text-xs hidden lg:block", s.complete ? "text-primary" : "text-muted-foreground")}>
                  {s.complete ? "Complété ✓" : s.missingCount > 0 ? `${s.missingCount} point${s.missingCount > 1 ? "s" : ""} manquant${s.missingCount > 1 ? "s" : ""}` : s.subtitle}
                </p>
                {!s.complete && s.missingLabels && s.missingLabels.length > 0 && (
                  (() => {
                    const labels = s.missingLabels!;
                    const isExpanded = !!expandedMissing[s.id];
                    const summary = labels.join(", ");
                    return (
                      <div className="hidden lg:block mt-0.5">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <p
                              className={cn(
                                "text-[11px] text-amber-700 leading-snug",
                                !isExpanded && "truncate"
                              )}
                            >
                              → {isExpanded
                                ? labels.map((l, i) => (
                                    <span key={l} className="block">• {l}{i < labels.length - 1 ? "" : ""}</span>
                                  ))
                                : summary}
                            </p>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-[260px]">
                            <ul className="text-xs space-y-0.5">
                              {labels.map(l => (
                                <li key={l}>• {l}</li>
                              ))}
                            </ul>
                          </TooltipContent>
                        </Tooltip>
                        {labels.length > 1 && (
                          <button
                            type="button"
                            onClick={toggleExpanded(s.id)}
                            className="text-[11px] text-primary hover:underline mt-0.5"
                          >
                            {isExpanded ? "Réduire" : `Voir tout (${labels.length})`}
                          </button>
                        )}
                      </div>
                    );
                  })()
                )}
              </div>
            </button>
          );
        })}
      </nav>

      {/* Mobile-only : panneau détaillé pour la section active.
          Sur mobile la nav est en scroll horizontal et n'a pas la place
          d'afficher la liste des champs manquants sous chaque pilule.
          On affiche donc ici, sous la nav, la liste complète pour la section
          actuellement sélectionnée (ex: Mobilité & Rayon). */}
      {(() => {
        const active = sections.find(s => s.id === activeSection);
        if (!active) return null;
        const labels = active.missingLabels ?? [];
        if (active.complete || labels.length === 0) return null;
        return (
          <div className="lg:hidden rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
            <p className="text-xs font-medium text-amber-900">
              {active.label} — {labels.length} point{labels.length > 1 ? "s" : ""} manquant{labels.length > 1 ? "s" : ""}
            </p>
            <ul className="mt-1.5 space-y-0.5">
              {labels.map(l => (
                <li key={l} className="text-xs text-amber-800 leading-snug">• {l}</li>
              ))}
            </ul>
          </div>
        );
      })()}

      {/* Public profile link */}
      <Link
        to={publicProfileUrl}
        target="_blank"
        className="flex items-center justify-center gap-2 border border-border rounded-full px-4 py-2 text-sm text-foreground hover:border-primary transition-colors w-full"
      >
        <Eye className="h-3.5 w-3.5" /> Voir mon profil public →
      </Link>
    </aside>
    </TooltipProvider>
  );
};

export default ProfileSidebar;
