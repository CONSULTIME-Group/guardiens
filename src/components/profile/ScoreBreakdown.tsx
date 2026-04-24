import { useState } from "react";
import { ChevronDown, Check, X, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ScoreCriterion {
  label: string;
  points: number;
  ok: boolean;
  hint?: string;
}

interface ScoreBreakdownProps {
  role: "sitter" | "owner";
  total: number;
  essentials: ScoreCriterion[];
  bonuses: ScoreCriterion[];
  defaultOpen?: boolean;
}

const Row = ({ c }: { c: ScoreCriterion }) => (
  <li className="flex items-start gap-2 py-1.5">
    <span
      className={cn(
        "mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full",
        c.ok ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
      )}
      aria-hidden
    >
      {c.ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
    </span>
    <div className="flex-1 min-w-0">
      <div className="flex items-baseline justify-between gap-2">
        <p className={cn("text-xs leading-snug", c.ok ? "text-foreground" : "text-muted-foreground")}>
          {c.label}
        </p>
        <span
          className={cn(
            "text-[11px] tabular-nums shrink-0",
            c.ok ? "text-primary font-medium" : "text-muted-foreground"
          )}
        >
          {c.ok ? `+${c.points}` : `${c.points} pts`}
        </span>
      </div>
      {c.hint && !c.ok && <p className="text-[11px] text-muted-foreground/80 mt-0.5">{c.hint}</p>}
    </div>
  </li>
);

const ScoreBreakdown = ({ role, total, essentials, bonuses, defaultOpen = false }: ScoreBreakdownProps) => {
  const [open, setOpen] = useState(defaultOpen);

  const sumEssentials = essentials.reduce((s, c) => s + (c.ok ? c.points : 0), 0);
  const maxEssentials = essentials.reduce((s, c) => s + c.points, 0);
  const sumBonuses = bonuses.reduce((s, c) => s + (c.ok ? c.points : 0), 0);
  const maxBonuses = bonuses.reduce((s, c) => s + c.points, 0);

  return (
    <div className="rounded-lg border border-border bg-card/50 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-muted/40 transition-colors"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Info className="h-3.5 w-3.5 text-primary shrink-0" />
          <p className="text-xs font-medium text-foreground truncate">
            Pourquoi mon score est comme ça ?
          </p>
        </div>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div className="px-3 pb-3 pt-1 space-y-3 border-t border-border">
          <p className="text-[11px] text-muted-foreground leading-snug pt-2">
            Votre score ({total}/100) suit le barème {role === "sitter" ? "Gardien" : "Propriétaire"}.
            Les <strong className="text-foreground">essentiels</strong> pèsent l'essentiel des points,
            les bonus complètent.
          </p>

          {/* Essentiels */}
          <div>
            <div className="flex items-baseline justify-between mb-1">
              <p className="text-[11px] uppercase tracking-wide font-semibold text-foreground">
                Essentiels
              </p>
              <span className="text-[11px] tabular-nums text-muted-foreground">
                {sumEssentials}/{maxEssentials} pts
              </span>
            </div>
            <ul className="space-y-0">
              {essentials.map((c) => (
                <Row key={c.label} c={c} />
              ))}
            </ul>
          </div>

          {/* Bonus */}
          <div>
            <div className="flex items-baseline justify-between mb-1">
              <p className="text-[11px] uppercase tracking-wide font-semibold text-foreground">
                Bonus
              </p>
              <span className="text-[11px] tabular-nums text-muted-foreground">
                {sumBonuses}/{maxBonuses} pts
              </span>
            </div>
            <ul className="space-y-0">
              {bonuses.map((c) => (
                <Row key={c.label} c={c} />
              ))}
            </ul>
          </div>

          <p className="text-[11px] text-muted-foreground/80 leading-snug pt-1 border-t border-border/60">
            Ignorés du score : préférences détaillées, langues, intérêts, accompagnant, fumeur,
            véhicule, références libres. Ces champs enrichissent votre profil mais ne pèsent pas
            sur la jauge.
          </p>
        </div>
      )}
    </div>
  );
};

export default ScoreBreakdown;
