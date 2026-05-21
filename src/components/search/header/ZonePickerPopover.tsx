import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { ALLOWED_ALERT_RADII } from "@/lib/alertRadius";
import { getDeptCode, DEPT_NAMES } from "@/lib/departments";

export type ZoneMode = "radius" | "dept" | "region" | "france";

const RADIUS_SHORTCUTS = [5, 10, 15, 30, 50];

interface Props {
  pillClass: string;
  zoneMode: ZoneMode;
  setZoneMode: (m: ZoneMode) => void;
  radius: number[];
  setRadius: (v: number[]) => void;
  userPostalCode: string | null;
  densityCounts: { radius: number; dept: number; france: number };
}

export default function ZonePickerPopover({
  pillClass, zoneMode, setZoneMode, radius, setRadius, userPostalCode, densityCounts,
}: Props) {
  const deptCode = getDeptCode(userPostalCode);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className={pillClass} aria-label="Choisir la zone de recherche">
          <span className="text-foreground">
            {zoneMode === "radius" && `${radius[0]} km`}
            {zoneMode === "dept" && (deptCode ? `Dépt ${deptCode}` : "Mon département")}
            {zoneMode === "region" && "Ma région"}
            {zoneMode === "france" && "Toute la France"}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <div className="space-y-1 mb-3">
          <button
            onClick={() => setZoneMode("radius")}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${zoneMode === "radius" ? "bg-primary/10 text-primary font-medium" : "hover:bg-accent text-foreground"}`}
          >
            Autour de moi <span className="text-xs text-muted-foreground">({radius[0]} km · {densityCounts.radius} {densityCounts.radius > 1 ? "résultats" : "résultat"})</span>
          </button>
          <button
            onClick={() => setZoneMode("dept")}
            disabled={!deptCode}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${zoneMode === "dept" ? "bg-primary/10 text-primary font-medium" : "hover:bg-accent text-foreground"}`}
          >
            Mon département {deptCode && (
              <span className="text-xs text-muted-foreground">
                ({deptCode} {DEPT_NAMES[deptCode]} · {densityCounts.dept})
              </span>
            )}
          </button>
          {/* L'option "Ma région" est volontairement masquée : la promesse produit
              est « France entière », pas régionale (mémoire core "No AURA"). */}
          <button
            onClick={() => setZoneMode("france")}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${zoneMode === "france" ? "bg-primary/10 text-primary font-medium" : "hover:bg-accent text-foreground"}`}
          >
            Toute la France <span className="text-xs text-muted-foreground">({densityCounts.france})</span>
          </button>
        </div>
        {zoneMode === "radius" && (
          <div className="border-t border-border pt-3 space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {RADIUS_SHORTCUTS.map(r => (
                <button
                  key={r}
                  onClick={() => setRadius([r])}
                  className={`rounded-full px-3 py-1 text-xs transition-colors ${
                    radius[0] === r
                      ? "bg-primary text-primary-foreground"
                      : "border border-border text-muted-foreground hover:border-primary"
                  }`}
                >
                  {r === 50 ? "50 km+" : `${r} km`}
                </button>
              ))}
            </div>
            {(() => {
              const currentIdx = Math.max(0, ALLOWED_ALERT_RADII.indexOf(radius[0] as any));
              return (
                <Slider
                  value={[currentIdx]}
                  onValueChange={(v) => setRadius([ALLOWED_ALERT_RADII[v[0]]])}
                  min={0}
                  max={ALLOWED_ALERT_RADII.length - 1}
                  step={1}
                />
              );
            })()}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
