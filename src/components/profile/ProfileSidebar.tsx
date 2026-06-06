import { CheckCircle2, Circle, Eye, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, type ReactNode, type MouseEvent } from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  avatarUrl?: string;
  completion: number;
  sections: SidebarSection[];
  activeSection: string;
  /** Id de la section qui contient des modifications non sauvegardées (point orange). */
  dirtySection?: string;
  onSectionClick: (id: string) => void;
  publicProfileUrl: string;
  role: "sitter" | "owner";
  isFounder?: boolean;
  scoreBreakdown?: ReactNode;
}

const ProfileSidebar = ({
  firstName, city, avatarUrl, completion, sections,
  activeSection, dirtySection, onSectionClick, publicProfileUrl, role, isFounder,
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
      {/* Avatar + nom + ville */}
      <div className="flex flex-col items-center text-center space-y-2">
        <Avatar className="h-16 w-16 border border-border">
          {avatarUrl && <AvatarImage src={avatarUrl} alt={firstName ?? "Profil"} />}
          <AvatarFallback className="text-base font-semibold bg-muted">
            {firstName ? firstName.charAt(0).toUpperCase() : "?"}
          </AvatarFallback>
        </Avatar>
        <div className="space-y-0.5">
          <p className="text-base font-semibold text-foreground">
            {firstName ? firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase() : "Votre profil"}
          </p>
          {city && <p className="text-sm text-muted-foreground">{city}</p>}
        </div>
      </div>

      {/* Completion */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Complétion du profil</p>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${completion}%` }} />
        </div>
        <p className="text-sm font-semibold text-foreground">{completion}% complété</p>
        {completion >= 60 ? (
          <span className="inline-flex items-center gap-1 text-xs text-primary bg-primary/10 rounded-full px-2 py-0.5">
            <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
            Profil visible par les {role === "sitter" ? "propriétaires" : "gardiens"}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-warning-foreground bg-warning-soft border border-warning-border rounded-full px-2 py-0.5">
            <AlertTriangle className="h-3 w-3" aria-hidden="true" />
            Profil non visible, complétez à 60 %
          </span>
        )}
      </div>

      {/* Score breakdown (optional) */}
      {scoreBreakdown}

      {/* Section nav, vertical on desktop, horizontal scroll on mobile */}
      <div className="relative lg:static -mr-4 lg:mr-0">
      <nav className="flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-x-visible no-scrollbar pb-2 lg:pb-0 pr-8 lg:pr-0 -mx-1 px-1">
        {sections.map((s) => {
          const isActive = activeSection === s.id;
          const isDirty = dirtySection === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSectionClick(s.id)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative flex items-center gap-2.5 text-left rounded-lg px-3 py-2 transition-colors whitespace-nowrap lg:whitespace-normal lg:w-full shrink-0",
                isActive && "bg-primary/10 border-l-2 border-primary",
                !isActive && "hover:bg-muted/50"
              )}
            >
              {/* Numéro de section + statut */}
              <span className="relative shrink-0">
                {s.complete ? (
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                ) : (
                  <span
                    className={cn(
                      "inline-flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-semibold",
                      isActive
                        ? "border-primary text-primary"
                        : "border-muted-foreground/40 text-muted-foreground"
                    )}
                  >
                    {s.num}
                  </span>
                )}
                {isDirty && (
                  <span
                    aria-label="Modifications non sauvegardées"
                    className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-warning ring-2 ring-background"
                  />
                )}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {s.label}
                  {s.optional && <span className="text-xs font-normal text-muted-foreground ml-1">(optionnel)</span>}
                </p>
                <p className={cn("text-xs hidden lg:block", s.complete ? "text-primary" : "text-muted-foreground")}>
                  {s.complete ? "Complété" : s.missingCount > 0 ? `${s.missingCount} point${s.missingCount > 1 ? "s" : ""} manquant${s.missingCount > 1 ? "s" : ""}` : s.subtitle}
                </p>
                {!s.complete && s.missingLabels && s.missingLabels.length > 0 && (
                  (() => {
                    const labels = s.missingLabels!;
                    const isExpanded = !!expandedMissing[s.id];
                    const hasMany = labels.length > 1;
                    // Vue compacte (1 label) : ligne unique avec flèche.
                    // Vue multiple (≥ 2 labels) : liste à puces, toujours sur
                    // plusieurs lignes pour ne plus jamais tout concaténer.
                    return (
                      <div className="hidden lg:block mt-0.5">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            {hasMany ? (
                              <ul className="text-[11px] text-warning-foreground leading-snug space-y-0.5">
                                {(isExpanded ? labels : labels.slice(0, 2)).map(l => (
                                  <li key={l} className="flex gap-1">
                                    <span aria-hidden>•</span>
                                    <span className="break-words">{l}</span>
                                  </li>
                                ))}
                                {!isExpanded && labels.length > 2 && (
                                  <li className="text-muted-foreground">…</li>
                                )}
                              </ul>
                            ) : (
                              <p className="text-[11px] text-warning-foreground leading-snug break-words">
                                Il manque : <span className="font-medium">{labels[0]}</span>
                              </p>
                            )}
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-[260px]">
                            <ul className="text-xs space-y-0.5">
                              {labels.map(l => (
                                <li key={l}>• {l}</li>
                              ))}
                            </ul>
                          </TooltipContent>
                        </Tooltip>
                        {hasMany && (
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
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent lg:hidden" />
      </div>

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
          <div className="lg:hidden rounded-lg border border-warning-border bg-warning-soft px-3 py-2.5">
            <p className="text-xs font-medium text-warning-foreground flex items-center gap-1.5">
              <AlertTriangle className="h-3 w-3" aria-hidden="true" />
              {active.label}, {labels.length} point{labels.length > 1 ? "s" : ""} manquant{labels.length > 1 ? "s" : ""}
            </p>
            {labels.length === 1 ? (
              <p className="mt-1.5 text-xs text-warning-foreground/90 leading-snug">
                Il manque : <span className="font-medium">{labels[0]}</span>
              </p>
            ) : (
              <ul className="mt-1.5 space-y-0.5">
                {labels.map(l => (
                  <li key={l} className="text-xs text-warning-foreground/90 leading-snug">• {l}</li>
                ))}
              </ul>
            )}
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
