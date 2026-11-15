/**
 * Lot TRF-5 (15/11/2026) : journal des actions SEO. Ce qui a été changé, les
 * clics du relevé d'avant, et ceux du relevé pris quatre semaines plus tard
 * (seo_gsc_snapshots, un relevé par semaine).
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSeoSnapshotPoints } from "@/hooks/useSeoActionLog";
import { SEO_ACTION_LABELS, clicksBeforeAfter, frDay, reviewDate, type SeoLogEntry } from "@/lib/admin/seoActionLog";

const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(n);

export function SeoActionJournal({ log }: { log: SeoLogEntry[] }) {
  // « Garder » et les envois IndexNow restent au journal en base, hors de ce tableau d'effets.
  const rows = log.filter((e) => e.kind !== "indexnow" && !(e.kind === "traite" && e.note === "Article gardé tel quel")).slice(0, 20);
  const { data: points = [] } = useSeoSnapshotPoints(rows.map((r) => r.path));
  if (rows.length === 0) return null;

  return (
    <Card data-testid="seo-journal">
      <CardHeader>
        <CardTitle className="text-lg">Journal des actions</CardTitle>
        <p className="text-xs text-muted-foreground">
          Ce qui a été changé, et les clics Google avant puis quatre semaines après (relevé hebdomadaire de Search Console, fenêtre de 28 jours).
        </p>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-xs text-muted-foreground">
              <th scope="col" className="py-2 pr-2 text-left font-medium">Action</th>
              <th scope="col" className="py-2 px-2 text-right font-medium">Avant</th>
              <th scope="col" className="py-2 pl-2 text-right font-medium">Après</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => {
              const ba = clicksBeforeAfter(e, points);
              return (
                <tr key={e.id} className="border-b last:border-b-0 align-top">
                  <td className="py-2 pr-2">
                    <span className="font-medium">{frDay(e.created_at)} · {SEO_ACTION_LABELS[e.kind]}</span>
                    <span className="block text-xs text-muted-foreground break-all">{e.path}{e.note ? ` · ${e.note}` : ""}</span>
                  </td>
                  <td className="py-2 px-2 text-right tabular-nums whitespace-nowrap">
                    {ba.before !== null ? `${fmt(ba.before)} clic${ba.before > 1 ? "s" : ""}` : "relevé à venir"}
                  </td>
                  <td className="py-2 pl-2 text-right tabular-nums whitespace-nowrap">
                    {ba.after !== null ? `${fmt(ba.after)} clic${ba.after > 1 ? "s" : ""}` : `le ${frDay(reviewDate(e.created_at))}`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

export default SeoActionJournal;
