import { useState } from "react";
import { ChevronDown, Check, X, Info, Sparkles, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ScoreCriterion {
  label: string;
  points: number;
  ok: boolean;
  hint?: string;
}

interface ScoreBreakdownProps {
  role: "sitter" | "owner";
  /** Score live calculé sur l'état affiché (mergedData). C'est ce qui pilote la jauge. */
  total: number;
  /** Score réellement enregistré en base (référence pour la pédagogie). */
  savedTotal?: number;
  essentials: ScoreCriterion[];
  bonuses: ScoreCriterion[];
  defaultOpen?: boolean;
  /** Quand un brouillon est en cours, on a un score simulé différent du score sauvegardé. */
  isDirty?: boolean;
  /** Réinitialise les modifications locales (annule le brouillon). */
  onReset?: () => void;
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

const ScoreBreakdown = ({
  role,
  total,
  savedTotal,
  essentials,
  bonuses,
  defaultOpen = false,
  isDirty = false,
  onReset,
}: ScoreBreakdownProps) => {
  const [open, setOpen] = useState(defaultOpen);

  const sumEssentials = essentials.reduce((s, c) => s + (c.ok ? c.points : 0), 0);
  const maxEssentials = essentials.reduce((s, c) => s + c.points, 0);
  const sumBonuses = bonuses.reduce((s, c) => s + (c.ok ? c.points : 0), 0);
  const maxBonuses = bonuses.reduce((s, c) => s + c.points, 0);

  // `total` est désormais le score live (essentials + bonuses, déterministe).
  // `savedTotal` (optionnel) est la valeur enregistrée en base. Le badge d'aperçu
  // s'affiche dès qu'il y a un brouillon ET un écart entre live et DB.
  const previewTotal = total;
  const referenceTotal = savedTotal ?? total;
  const delta = previewTotal - referenceTotal;
  const showPreview = isDirty && delta !== 0;

  return (
    <div
      className={cn(
        "rounded-lg border bg-card/50 overflow-hidden transition-colors",
        showPreview ? "border-primary/40 shadow-sm" : "border-border"
      )}
    >
      {/* Aperçu badge — visible quand le brouillon change le score */}
      {showPreview && (
        <div className="flex items-center justify-between gap-2 px-3 py-2 bg-primary/5 border-b border-primary/20">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden />
            <p className="text-xs text-foreground truncate">
              <span className="text-muted-foreground">Aperçu&nbsp;: </span>
              <span className="tabular-nums font-medium">{total}</span>
              <span className="text-muted-foreground"> → </span>
              <span
                className={cn(
                  "tabular-nums font-semibold",
                  delta > 0 ? "text-primary" : "text-destructive"
                )}
              >
                {previewTotal}
              </span>
              <span
                className={cn(
                  "ml-1.5 text-[11px] tabular-nums",
                  delta > 0 ? "text-primary" : "text-destructive"
                )}
              >
                ({delta > 0 ? "+" : ""}
                {delta})
              </span>
            </p>
          </div>
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors shrink-0"
              aria-label="Annuler les modifications non sauvegardées"
            >
              <RotateCcw className="h-3 w-3" aria-hidden />
              Réinitialiser
            </button>
          )}
        </div>
      )}

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
            {showPreview ? (
              <>
                Aperçu du score si vous sauvegardez maintenant&nbsp;:
                {" "}
                <strong className="text-foreground tabular-nums">{previewTotal}/100</strong>.
                {" "}
                Score actuellement enregistré&nbsp;:
                {" "}
                <span className="tabular-nums">{total}/100</span>.
              </>
            ) : (
              <>
                Votre score ({total}/100) suit le barème {role === "sitter" ? "Gardien" : "Propriétaire"}.
                Les <strong className="text-foreground">essentiels</strong> pèsent l'essentiel des points,
                les bonus complètent.
              </>
            )}
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
