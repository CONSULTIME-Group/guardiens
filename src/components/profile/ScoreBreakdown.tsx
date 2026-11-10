import { useState } from "react";
import { ChevronDown, Check, Info, Sparkles, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import SectionBadge from "./SectionBadge";

export interface ScoreCriterion {
  label: string;
  points: number;
  ok: boolean;
  hint?: string;
}

/**
 * Lot SC1 (10/11/2026, arène claude/arene/2026-11-10-score-completion) :
 * le panneau range le score par rôle, plus par « Essentiels » et « Bonus ».
 * Trois groupes : ce qui rassure sur la fiche, ce qui affine les matchs,
 * ce qui sert l'entraide. Les points ne changent pas (barème partagé de
 * src/lib/profileCompletion.ts), seule la lecture change.
 */
export type ScoreGroupId = "trust" | "match" | "help";

export interface ScoreGroup {
  id: ScoreGroupId;
  title: string;
  criteria: ScoreCriterion[];
}

/**
 * Réponse hors jauge qui pèse dans le calcul d'affinité (présence, trajets).
 * Elle s'affiche dans le groupe « Ce qui affine vos matchs » avec son effet
 * en mots, sans points de profil.
 */
export interface MatchSignal {
  label: string;
  effect: string;
  ok: boolean;
}

export const SCORE_GROUP_ORDER: ScoreGroupId[] = ["trust", "match", "help"];

interface ScoreBreakdownProps {
  role: "sitter" | "owner";
  /** Score live calculé sur l'état affiché (mergedData). C'est ce qui pilote la jauge. */
  total: number;
  /** Score réellement enregistré en base (référence pour la pédagogie). */
  savedTotal?: number;
  groups: ScoreGroup[];
  /** Réponses hors jauge lues par le calcul d'affinité, affichées dans le groupe « match ». */
  matchSignals?: MatchSignal[];
  /** Phrase de bas de panneau : ce qui sert hors jauge. */
  footnote: string;
  defaultOpen?: boolean;
  /** Quand un brouillon est en cours, on a un score simulé différent du score sauvegardé. */
  isDirty?: boolean;
  /** Réinitialise les modifications locales (annule le brouillon). */
  onReset?: () => void;
}

/** Couleur de chaque groupe (design pastel du 10/11/2026). */
export const SCORE_GROUP_TONE: Record<ScoreGroupId, { box: string; ink: string; bar: string; icon: "heart" | "paw" | "hand" }> = {
  trust: { box: "bg-pastel-peach", ink: "text-pastel-peach-ink", bar: "bg-pastel-peach-mid", icon: "heart" },
  match: { box: "bg-pastel-sage", ink: "text-pastel-sage-ink", bar: "bg-pastel-sage-mid", icon: "paw" },
  help: { box: "bg-pastel-honey", ink: "text-pastel-honey-ink", bar: "bg-pastel-honey-mid", icon: "hand" },
};

const Mark = ({ ok }: { ok: boolean }) =>
  ok ? (
    <span aria-hidden className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
      <Check className="h-3.5 w-3.5" />
    </span>
  ) : (
    <span aria-hidden className="mt-0.5 inline-block h-6 w-6 shrink-0 rounded-full border-2 border-dashed border-muted-foreground/40" />
  );

const Row = ({ c }: { c: ScoreCriterion }) => (
  <li className="flex items-start gap-3 py-2">
    <Mark ok={c.ok} />
    <div className="flex-1 min-w-0">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[15px] leading-snug text-foreground">
          {c.label}
          <span className="sr-only">{c.ok ? ", fait" : ", à compléter"}</span>
        </p>
        <span
          className={cn(
            "text-sm tabular-nums shrink-0",
            c.ok ? "text-primary font-semibold" : "text-muted-foreground"
          )}
        >
          {c.ok ? `+${c.points}` : `${c.points} pts`}
        </span>
      </div>
      {c.hint && !c.ok && <p className="text-[13px] text-muted-foreground mt-0.5">{c.hint}</p>}
    </div>
  </li>
);

const SignalRow = ({ s }: { s: MatchSignal }) => (
  <li className="flex items-start gap-3 py-2" data-testid="match-signal">
    <Mark ok={s.ok} />
    <div className="flex-1 min-w-0">
      <p className="text-[15px] leading-snug text-foreground">
        {s.label}
        <span className="sr-only">{s.ok ? ", répondu" : ", à compléter"}</span>
      </p>
      <p className="text-[13px] text-muted-foreground mt-0.5">{s.effect}</p>
    </div>
  </li>
);

const sumOf = (criteria: ScoreCriterion[], onlyOk: boolean) =>
  criteria.reduce((s, c) => s + (!onlyOk || c.ok ? c.points : 0), 0);

const ScoreBreakdown = ({
  role,
  total,
  savedTotal,
  groups,
  matchSignals = [],
  footnote,
  defaultOpen = false,
  isDirty = false,
  onReset,
}: ScoreBreakdownProps) => {
  const [open, setOpen] = useState(defaultOpen);

  const ordered = SCORE_GROUP_ORDER
    .map(id => groups.find(g => g.id === id))
    .filter((g): g is ScoreGroup => !!g && (g.criteria.length > 0 || (g.id === "match" && matchSignals.length > 0)));

  // `total` est le score live (déterministe). `savedTotal` (optionnel) est la
  // valeur enregistrée en base. Le badge d'aperçu s'affiche dès qu'il y a un
  // brouillon ET un écart entre live et base.
  const previewTotal = total;
  const referenceTotal = savedTotal ?? total;
  const delta = previewTotal - referenceTotal;
  const showPreview = isDirty && delta !== 0;

  return (
    <div
      className={cn(
        "rounded-[20px] border bg-card overflow-hidden transition-colors",
        showPreview ? "border-primary/40 shadow-sm" : "border-border"
      )}
    >
      {/* Aperçu badge, visible quand le brouillon change le score */}
      {showPreview && (
        <div className="flex items-center justify-between gap-2 px-3 py-2 bg-primary/5 border-b border-primary/20">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden />
            <p className="text-xs text-foreground truncate">
              <span className="text-muted-foreground">Aperçu&nbsp;: </span>
              <span className="tabular-nums font-medium">{referenceTotal}</span>
              <span className="text-muted-foreground"> puis </span>
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
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-muted/40 transition-colors min-h-11"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Info className="h-4 w-4 text-primary shrink-0" aria-hidden />
          <p className="text-sm font-medium text-foreground truncate">
            Ce que mesure votre score
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
        <div className="px-3 pb-3 pt-1 space-y-3.5 border-t border-border">
          <p className="text-sm text-muted-foreground leading-snug pt-2">
            {showPreview ? (
              <>
                Aperçu du score si vous sauvegardez maintenant&nbsp;:
                {" "}
                <strong className="text-foreground tabular-nums">{previewTotal}/100</strong>.
                {" "}
                Score actuellement enregistré&nbsp;:
                {" "}
                <span className="tabular-nums">{referenceTotal}/100</span>.
              </>
            ) : (
              <>
                Votre score ({previewTotal}/100) suit le barème {role === "sitter" ? "Gardien" : "Propriétaire"},
                en trois parts.
                {savedTotal !== undefined && savedTotal !== previewTotal && (
                  <>
                    {" "}<span className="text-muted-foreground/80">Dernière valeur enregistrée&nbsp;: {savedTotal}/100.</span>
                  </>
                )}
              </>
            )}
          </p>

          <div
            role="img"
            aria-label={ordered.map(g => `${g.title} ${sumOf(g.criteria, true)} sur ${sumOf(g.criteria, false)}`).join(", ")}
            className="flex h-3 gap-0.5 overflow-hidden rounded-full bg-muted"
            data-testid="score-bar"
          >
            {ordered.map(g => (
              <div key={g.id} className={SCORE_GROUP_TONE[g.id].bar} style={{ width: `${sumOf(g.criteria, true)}%` }} />
            ))}
          </div>

          {ordered.map(g => {
            const tone = SCORE_GROUP_TONE[g.id];
            return (
              <section key={g.id} data-testid={`score-group-${g.id}`} className={cn("rounded-[18px] px-3 pt-3 pb-1.5", tone.box)}>
                <div className="flex items-center gap-2.5 pb-2">
                  <SectionBadge icon={tone.icon} tone={g.id === "trust" ? "peach" : g.id === "match" ? "sage" : "honey"} size={32} className="bg-card" />
                  <p className={cn("flex-1 text-[15px] font-semibold leading-snug", tone.ink)}>{g.title}</p>
                  <span className={cn("text-sm font-semibold tabular-nums shrink-0", tone.ink)}>
                    {sumOf(g.criteria, true)}/{sumOf(g.criteria, false)}
                  </span>
                </div>
                <ul className="mb-1.5 rounded-[14px] bg-card px-3 py-1">
                  {g.criteria.map((c) => (
                    <Row key={c.label} c={c} />
                  ))}
                  {g.id === "match" && matchSignals.map(s => (
                    <SignalRow key={s.label} s={s} />
                  ))}
                </ul>
              </section>
            );
          })}

          <p className="text-[13px] text-muted-foreground leading-snug pt-1">
            {footnote}
          </p>
        </div>
      )}
    </div>
  );
};

export default ScoreBreakdown;
