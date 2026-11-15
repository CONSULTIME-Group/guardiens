import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { reportAdminReadError } from "@/lib/admin/readError";
import { fmtInt, type PageTotals } from "@/lib/admin/seoMetrics";
import {
  PAGE_TEMPLATE_LABELS,
  STRIKING_MAX_POSITION,
  STRIKING_MIN_IMPRESSIONS,
  STRIKING_MIN_POSITION,
  nonBrandClicks,
  positionDelta,
  readLandingOutcomes,
  sitemapPaths,
  strikingQueries,
  templateTable,
  type LandingOutcomes,
  type PageTemplate,
  type QueryRow,
} from "@/lib/admin/seoPilot";

const pct = (x: number) => `${(x * 100).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`;
const TH = "py-2 px-2 text-xs font-medium text-muted-foreground text-right";
const TD = "py-2.5 px-2 text-sm text-right tabular-nums";

/* ───────────── Google, tuiles ───────────── */

interface GscTotals { clicks: number; impressions: number; position: number }

export function SeoGoogleKpis({
  current, previous, period, queries,
}: { current: GscTotals; previous: GscTotals; period: string; queries: QueryRow[] | undefined }) {
  const change = (c: number, p: number) => (p > 0 ? ((c - p) / p) * 100 : null);
  const clicksChange = change(current.clicks, previous.clicks);
  const impChange = change(current.impressions, previous.impressions);
  const delta = positionDelta(current.position, previous.position);
  const nonBrand = queries ? nonBrandClicks(current.clicks, queries) : null;
  const tile = (label: string, value: string, sub: string, tone: "up" | "down" | "flat" = "flat", testid?: string) => (
    <div className="rounded-2xl border bg-card p-4" data-testid={testid}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-heading text-2xl font-semibold mt-1">{value}</p>
      <p className={`text-xs mt-1 ${tone === "up" ? "text-success" : tone === "down" ? "text-destructive" : "text-muted-foreground"}`}>{sub}</p>
    </div>
  );
  const signed = (n: number) => `${n > 0 ? "+" : ""}${n.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`;
  return (
    <section className="space-y-3" data-testid="seo-google-kpis">
      <h2 className="text-lg font-semibold text-foreground">Google, {period}</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {tile("Clics", fmtInt(current.clicks), clicksChange === null ? "période précédente vide" : `${signed(clicksChange)} sur la période précédente`, clicksChange === null ? "flat" : clicksChange >= 0 ? "up" : "down")}
        {tile("Impressions", fmtInt(current.impressions), impChange === null ? "période précédente vide" : signed(impChange), impChange === null ? "flat" : impChange >= 0 ? "up" : "down")}
        {tile(
          "Position moyenne",
          current.position.toLocaleString("fr-FR", { maximumFractionDigits: 1 }),
          delta === null ? "plus bas = mieux" : delta > 0 ? `en recul de ${delta.toLocaleString("fr-FR")} place${delta >= 2 ? "s" : ""}` : delta < 0 ? `en progrès de ${(-delta).toLocaleString("fr-FR")} place${-delta >= 2 ? "s" : ""}` : "stable",
          delta === null || delta === 0 ? "flat" : delta > 0 ? "down" : "up",
        )}
        {tile(
          "Clics hors marque",
          nonBrand === null ? "·" : fmtInt(nonBrand),
          nonBrand === null ? "lu au prochain rafraîchissement des données" : `${pct(current.clicks > 0 ? nonBrand / current.clicks : 0)} des clics, hors « guardiens »`,
          "flat",
          "seo-non-brand",
        )}
      </div>
    </section>
  );
}

/* ───────────── Où Google nous voit ───────────── */

export function SeoTemplatesCard({ totals, period }: { totals: Map<string, PageTotals>; period: string }) {
  const [sitemap, setSitemap] = useState<string[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState<PageTemplate | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/sitemap.xml", { cache: "no-store" })
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(`sitemap ${r.status}`))))
      .then((xml) => { if (!cancelled) setSitemap(sitemapPaths(xml)); })
      .catch((e) => { if (!cancelled) { setFailed(true); reportAdminReadError("Trafic : sitemap", e); } });
    return () => { cancelled = true; };
  }, []);

  const rows = useMemo(() => templateTable(sitemap ?? [], totals), [sitemap, totals]);
  const unseenVilles = rows.find((r) => r.template === "villes")?.unseen.length ?? 0;
  const unseenFiches = rows.find((r) => r.template === "fiches_gardien")?.unseen.length ?? 0;

  return (
    <Card data-testid="seo-templates">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Où Google nous voit, par type de page</CardTitle>
        <p className="text-xs text-muted-foreground">
          Pages vues au moins une fois par Google ({period}), sur les pages du sitemap. Touchez une ligne pour voir ses pages jamais vues.
        </p>
      </CardHeader>
      <CardContent>
        {failed && <p className="text-sm text-muted-foreground">Sitemap illisible pour le moment : la colonne « sitemap » reste vide.</p>}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th scope="col" className={`${TH} text-left`}>Type de page</th>
                <th scope="col" className={TH}>Vues par Google</th>
                <th scope="col" className={`${TH} hidden sm:table-cell`}>Impressions</th>
                <th scope="col" className={TH}>Clics</th>
                <th scope="col" className={`${TH} hidden sm:table-cell`}>Taux de clic</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const weak = r.inSitemap >= 20 && r.unseen.length / r.inSitemap > 0.5;
                const expanded = open === r.template;
                return (
                  <FragmentRow key={r.template}>
                    <tr className={`border-b ${weak ? "bg-warning-soft" : ""}`}>
                      <td className="py-1 px-2 text-sm text-left">
                        <button
                          type="button"
                          className="min-h-11 text-left font-medium hover:underline disabled:no-underline disabled:cursor-default"
                          aria-expanded={expanded}
                          disabled={r.unseen.length === 0}
                          onClick={() => setOpen(expanded ? null : r.template)}
                        >
                          {PAGE_TEMPLATE_LABELS[r.template]}
                        </button>
                      </td>
                      <td className={`${TD} ${weak ? "font-semibold" : ""}`}>
                        {sitemap ? `${r.seenInSitemap} / ${r.inSitemap}` : r.seen}
                        {sitemap && r.offSitemap > 0 && (
                          <span className="block text-[11px] font-normal text-muted-foreground">+ {r.offSitemap} hors sitemap</span>
                        )}
                      </td>
                      <td className={`${TD} hidden sm:table-cell`}>{fmtInt(r.impressions)}</td>
                      <td className={TD}>{fmtInt(r.clicks)}</td>
                      <td className={`${TD} hidden sm:table-cell`}>{pct(r.ctr)}</td>
                    </tr>
                    {expanded && (
                      <tr className="border-b bg-muted/30">
                        <td colSpan={5} className="py-2 px-2">
                          <p className="text-xs text-muted-foreground mb-1">{r.unseen.length} page{r.unseen.length > 1 ? "s" : ""} du sitemap sans impression :</p>
                          <ul className="text-xs font-mono max-h-56 overflow-y-auto space-y-0.5">
                            {r.unseen.map((p) => (
                              <li key={p}><a href={p} target="_blank" rel="noreferrer" className="hover:underline">{p}</a></li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    )}
                  </FragmentRow>
                );
              })}
            </tbody>
          </table>
        </div>
        {sitemap && (unseenVilles > 0 || unseenFiches > 0) && (
          <p className="text-sm mt-3" data-testid="seo-templates-summary">
            {unseenVilles} page{unseenVilles > 1 ? "s" : ""} villes et {unseenFiches} fiche{unseenFiches > 1 ? "s" : ""} gardien sans aucune impression sur la période.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function FragmentRow({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

/* ───────────── Ce que Google (ou une IA) fait venir ───────────── */

function parisDayOffset(days: number): string {
  const d = new Date(Date.now() - days * 86_400_000);
  return d.toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" });
}

export function LandingOutcomesCard({
  channel, title, intro, testid,
}: { channel: "recherche_naturelle" | "ia"; title: string; intro: string; testid: string }) {
  const [data, setData] = useState<LandingOutcomes | null>(null);
  const [failed, setFailed] = useState(false);
  const [byPage, setByPage] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabase
      .rpc("admin_landing_outcomes" as never, { p_from: parisDayOffset(29), p_to: parisDayOffset(0), p_channel: channel } as never)
      .then(({ data: raw, error }) => {
        if (cancelled) return;
        if (error) { setFailed(true); reportAdminReadError(`Trafic : arrivées ${channel}`, error); return; }
        setData(readLandingOutcomes(raw));
      });
    return () => { cancelled = true; };
  }, [channel]);

  const rows = data
    ? byPage
      ? data.pages.map((p) => ({ key: p.path, label: p.path, visits: p.visits, signups: p.signups, published: p.published_members }))
      : data.templates.map((t) => ({ key: t.template, label: PAGE_TEMPLATE_LABELS[t.template], visits: t.visits, signups: t.signups, published: t.published_members }))
    : [];

  return (
    <Card data-testid={testid}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{title}</CardTitle>
        <p className="text-xs text-muted-foreground">{intro}</p>
      </CardHeader>
      <CardContent>
        {failed ? (
          <p className="text-sm text-muted-foreground">Lecture impossible pour le moment.</p>
        ) : !data ? (
          <p className="text-sm text-muted-foreground">…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune arrivée sur la période.</p>
        ) : (
          <>
            <div className="flex gap-2 mb-2">
              <button type="button" aria-pressed={!byPage} onClick={() => setByPage(false)} className={`min-h-11 px-3 rounded-full text-sm ${!byPage ? "bg-primary text-primary-foreground" : "bg-muted"}`}>Par type de page</button>
              <button type="button" aria-pressed={byPage} onClick={() => setByPage(true)} className={`min-h-11 px-3 rounded-full text-sm ${byPage ? "bg-primary text-primary-foreground" : "bg-muted"}`}>Par page</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th scope="col" className={`${TH} text-left`}>Arrivée sur</th>
                    <th scope="col" className={TH}>Visites</th>
                    <th scope="col" className={TH}>Inscrits</th>
                    <th scope="col" className={`${TH} hidden sm:table-cell`}>Avec une annonce de garde</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.key} className="border-b">
                      <td className={`${TD} text-left ${byPage ? "font-mono text-xs break-all" : ""}`}>{r.label}</td>
                      <td className={TD}>{fmtInt(r.visits)}</td>
                      <td className={`${TD} ${r.signups > 0 ? "font-semibold" : ""}`}>{fmtInt(r.signups)}</td>
                      <td className={`${TD} hidden sm:table-cell`}>{fmtInt(r.published)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/* ───────────── À portée de la première page ───────────── */

export function StrikingQueriesCard({
  queries, topPages,
}: { queries: QueryRow[] | undefined; topPages: Record<string, string> | null | undefined }) {
  const rows = queries ? strikingQueries(queries, topPages) : [];
  return (
    <Card data-testid="seo-striking">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">À portée de la première page</CardTitle>
        <p className="text-xs text-muted-foreground">
          Requêtes hors marque en position {STRIKING_MIN_POSITION} à {STRIKING_MAX_POSITION}, vues {STRIKING_MIN_IMPRESSIONS} fois au moins, avec la page qui ressort. Le levier : enrichir cette page, son titre ou sa description.
        </p>
      </CardHeader>
      <CardContent>
        {!queries ? (
          <p className="text-sm text-muted-foreground">Requêtes lues au prochain rafraîchissement des données.</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune requête dans cette zone sur la période.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th scope="col" className={`${TH} text-left`}>Requête</th>
                  <th scope="col" className={TH}>Impressions</th>
                  <th scope="col" className={TH}>Position</th>
                  <th scope="col" className={`${TH} hidden sm:table-cell`}>Clics</th>
                  <th scope="col" className={`${TH} text-left hidden md:table-cell`}>Page qui ressort</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((q) => (
                  <tr key={q.query} className="border-b align-top">
                    <td className={`${TD} text-left`}>
                      {q.query}
                      {q.page && <span className="block md:hidden text-xs font-mono text-muted-foreground break-all">{q.page}</span>}
                    </td>
                    <td className={TD}>{fmtInt(q.impressions)}</td>
                    <td className={TD}>{q.position.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}</td>
                    <td className={`${TD} hidden sm:table-cell`}>{fmtInt(q.clicks)}</td>
                    <td className={`${TD} text-left hidden md:table-cell font-mono text-xs break-all`}>
                      {q.page ? <a href={q.page} target="_blank" rel="noreferrer" className="hover:underline">{q.page}</a> : "·"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
