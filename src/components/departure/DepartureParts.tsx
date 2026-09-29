/** Briques partagées page « C'est noté » et carte Alma (lot N4). */
import { Check } from "lucide-react";
import { PERIOD_BUTTONS, type DeparturePeriod, type Readiness } from "@/lib/ownerDeparture";
import { cn } from "@/lib/utils";

export const PeriodChoices = ({
  onPick, busy, variant = "stack",
}: { onPick: (p: DeparturePeriod) => void; busy?: boolean; variant?: "stack" | "pills" }) => (
  <div className={cn(variant === "stack" ? "flex flex-col gap-[10px]" : "flex flex-wrap gap-[8px]")} data-testid="period-choices">
    {PERIOD_BUTTONS.map((b) => (
      <button
        key={b.period}
        type="button"
        disabled={busy}
        onClick={() => onPick(b.period)}
        className={cn(
          "min-h-[46px] rounded-full px-5 text-[15px] font-semibold transition-opacity disabled:opacity-60",
          variant === "stack" && "w-full",
          b.period === "noel" && "bg-primary text-primary-foreground",
          b.period !== "noel" && b.period !== "plus_tard" && "border-[1.5px] border-border bg-card text-foreground",
          b.period === "plus_tard" && "border-[1.5px] border-dashed border-border bg-card font-medium text-muted-foreground",
        )}
      >
        {b.label}
      </button>
    ))}
  </div>
);

export const ProgressBar = ({ percent }: { percent: number }) => (
  <div className="h-[8px] w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
    <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
  </div>
);

export const ReadinessList = ({ readiness }: { readiness: Readiness }) => (
  <ul className="mt-4 space-y-[10px]" data-testid="readiness-list">
    {readiness.items.map((it) => (
      <li key={it.key} className="flex items-center gap-3 text-[15px]" data-done={it.done}>
        {it.done ? (
          <span className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Check className="h-[14px] w-[14px]" aria-hidden="true" />
          </span>
        ) : (
          <span className="h-[24px] w-[24px] shrink-0 rounded-full border-[1.5px] border-secondary" aria-hidden="true" />
        )}
        <span className={cn(it.done ? "text-muted-foreground" : "font-semibold text-foreground")}>{it.label}</span>
      </li>
    ))}
  </ul>
);

export const Faces = ({ sitters }: { sitters: Array<{ id: string; firstName: string; avatarUrl?: string }> }) => (
  <div className="flex -space-x-2">
    {sitters.slice(0, 3).map((s) => s.avatarUrl ? (
      <img key={s.id} src={s.avatarUrl} alt={s.firstName} className="h-[32px] w-[32px] rounded-full border-2 border-card object-cover" loading="lazy" />
    ) : (
      <span key={s.id} className="flex h-[32px] w-[32px] items-center justify-center rounded-full border-2 border-card bg-primary/15 font-heading text-[13px] text-primary">
        {(s.firstName.charAt(0) || "G").toUpperCase()}
      </span>
    ))}
  </div>
);
