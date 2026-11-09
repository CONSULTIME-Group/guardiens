/**
 * Lot D4 (09/11/2026, maquette « Tableaux de bord ordinateur v2 ») : tuiles
 * « Depuis votre dernière visite » dans l'accueil ordinateur. Trois tuiles au
 * plus, jamais de zéro (buildMovementBand). Mesure : movement_view une fois par
 * montage, movement_click à chaque tuile.
 */
import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { trackEvent } from "@/lib/analytics";
import type { MovementBand as Band } from "@/lib/dashboardMovement";

export default function MovementBand({ band, space }: { band: Band; space: "owner" | "sitter" }) {
  const seen = useRef(false);
  useEffect(() => {
    if (seen.current) return;
    seen.current = true;
    try {
      trackEvent("movement_view", {
        source: "/dashboard",
        metadata: { space, mode: band.mode, keys: band.tiles.map((t) => t.key) },
      });
    } catch { /* mesure facultative */ }
  }, [band, space]);

  return (
    <div className="mt-[14px]" data-testid="movement-band" data-mode={band.mode}>
      <p className="text-secondary text-[12.5px] font-bold">{band.title}</p>
      <ul className="mt-[8px] flex flex-wrap gap-[10px]">
        {band.tiles.map((t) => (
          <li key={t.key} className="min-w-[150px] flex-1">
            <Link
              to={t.href}
              data-testid={`movement-tile-${t.key}`}
              onClick={() => {
                try {
                  trackEvent("movement_click", { source: "/dashboard", metadata: { space, mode: band.mode, key: t.key } });
                } catch { /* mesure facultative */ }
              }}
              className="flex min-h-[44px] flex-col gap-[2px] rounded-[14px] bg-card px-[14px] py-[10px] transition-shadow hover:ring-2 hover:ring-primary"
            >
              <span className="font-heading text-[24px] font-semibold leading-none text-primary tabular-nums">
                {t.value.toLocaleString("fr-FR")}
              </span>
              <span className="text-[12.5px] leading-snug text-muted-foreground">{t.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
