import { useNavigate } from "react-router-dom";
import { KpiTile } from "@/components/admin/ui";
import { UNAVAILABLE_LABEL } from "@/lib/admin/readError";
import { useKeyFigures } from "./useDashboardData";
import { buildLiquidityCells, useLiquiditySnapshot } from "./LiquidityBlock";

/**
 * Lot A13 : chiffres clés en tête de la vue d'ensemble, une rangée de
 * KpiTile. Membres et gardes d'un côté, liquidité de l'autre : chaque
 * lecture a son propre état, une panne n'éteint pas l'autre moitié.
 */
export const KeyFiguresRow = () => {
  const navigate = useNavigate();
  const kf = useKeyFigures();
  const liq = useLiquiditySnapshot();
  const cells = buildLiquidityCells(liq.data);

  const val = (loading: boolean, error: unknown, v: string | number | undefined) =>
    error ? <span className="text-base text-destructive">{UNAVAILABLE_LABEL}</span> : loading ? "…" : v;

  const [listings, ...others] = cells;

  return (
    <section aria-label="Chiffres clés" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="overview-key-figures">
      <KpiTile label="Inscrits" value={val(kf.isLoading, kf.error, kf.data?.totalUsers)} hint="Comptes actifs, supprimés exclus" onClick={() => navigate("/admin/users")} />
      <KpiTile label="Nouveaux cette semaine" value={val(kf.isLoading, kf.error, kf.data?.newThisWeek)} hint="Depuis 7 jours" onClick={() => navigate("/admin/users")} />
      <KpiTile label="Annonces en ligne" value={val(liq.isLoading, liq.error, listings?.value)} hint={listings?.sub} onClick={() => navigate("/admin/listings")} />
      <KpiTile
        label="Gardes en cours"
        value={val(kf.isLoading, kf.error, kf.data?.ongoingSits)}
        hint={kf.data ? `${kf.data.confirmedUpcoming} ${kf.data.confirmedUpcoming > 1 ? "confirmées" : "confirmée"} à venir` : undefined}
        onClick={() => navigate("/admin/sits-management")}
      />
      {liq.error ? (
        <KpiTile label="Liquidité de la place de marché" value={<span className="text-base text-destructive">{UNAVAILABLE_LABEL}</span>} />
      ) : liq.isLoading ? (
        <KpiTile label="Liquidité de la place de marché" value="…" />
      ) : (
        others.map((c) => (
          <KpiTile key={c.label} label={c.label} value={c.value} hint={`${c.window} · ${c.sub}`} onClick={() => navigate(c.link)} />
        ))
      )}
    </section>
  );
};
