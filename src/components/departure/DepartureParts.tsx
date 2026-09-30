/** Briques partagées page « C'est noté » et carte Alma (lot N4). */
import { useState } from "react";
import { Check } from "lucide-react";
import { PERIOD_BUTTONS, type DeparturePeriod, type Readiness } from "@/lib/ownerDeparture";
import { cn } from "@/lib/utils";
import { avatarImageUrl } from "@/lib/storageImage";

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

type NearbySitter = { id: string; firstName: string; avatarUrl?: string; distanceKm?: number };

/** Photo du gardien, ou initiale sur fond vert pâle si la photo manque ou ne charge pas. */
export const SitterAvatar = ({ s, size = 32, className }: { s: NearbySitter; size?: number; className?: string }) => {
  const [broken, setBroken] = useState(false);
  const style = { width: size, height: size };
  if (s.avatarUrl && !broken) {
    return (
      <img src={avatarImageUrl(s.avatarUrl, size * 2)} alt="" style={style} onError={() => setBroken(true)}
        className={cn("shrink-0 rounded-full object-cover", className)} loading="lazy" />
    );
  }
  return (
    <span style={style} data-testid="sitter-initial" className={cn("flex shrink-0 items-center justify-center rounded-full bg-primary/15 font-heading text-[13px] text-primary", className)}>
      {(s.firstName.charAt(0) || "G").toUpperCase()}
    </span>
  );
};

export const Faces = ({ sitters }: { sitters: NearbySitter[] }) => (
  <div className="flex -space-x-2">
    {sitters.slice(0, 3).map((s) => <SitterAvatar key={s.id} s={s} className="border-2 border-card" />)}
  </div>
);

/** Les trois gardiens les plus proches : avatar, prénom, distance. Rien si la liste est vide. */
export const NearbyList = ({ sitters }: { sitters: NearbySitter[] }) => {
  const shown = sitters.filter((s) => s.firstName).slice(0, 3);
  if (shown.length === 0) return null;
  return (
    <ul className="mt-3 flex flex-wrap gap-4" data-testid="noted-nearby-list">
      {shown.map((s) => (
        <li key={s.id} className="flex items-center gap-2">
          <SitterAvatar s={s} size={40} />
          <span className="text-[14px] leading-tight">
            <span className="block font-semibold text-foreground">{s.firstName}</span>
            {typeof s.distanceKm === "number" && <span className="block text-muted-foreground">à {s.distanceKm} km</span>}
          </span>
        </li>
      ))}
    </ul>
  );
};
