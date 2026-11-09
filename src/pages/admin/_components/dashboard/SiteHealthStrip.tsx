/**
 * Lot ADM6 : encart « État du site » en tête de la vue d'ensemble. Six
 * voyants (tâches, emails, IA, SEO, erreurs, audience). Lot ADM14 : lus dans
 * la liste de travail (admin_work_list), chaque voyant est touchable et mène
 * à sa page ; la phrase d'un voyant rouge est la ligne de la liste.
 */
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkList } from "@/hooks/useWorkList";
import { PrerenderResumeLine } from "./PrerenderResumeLine";

export interface SiteHealthCheck {
  key: string;
  label: string;
  state: "ok" | "alert";
  detail: string;
  link: string | null;
}

/** Garde les voyants bien formés ; un voyant illisible n'est jamais affiché vert. */
export function parseSiteHealth(raw: unknown): SiteHealthCheck[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((c) => {
    if (!c || typeof c !== "object") return [];
    const o = c as Record<string, unknown>;
    if (typeof o.key !== "string" || typeof o.label !== "string") return [];
    return [{
      key: o.key,
      label: o.label,
      state: o.state === "ok" ? "ok" : "alert",
      detail: typeof o.detail === "string" ? o.detail : "",
      link: typeof o.link === "string" && o.link.startsWith("/admin") ? o.link : null,
    }];
  });
}

/** Phrase de tête : « Tout fonctionne » ou le nombre de voyants rouges. */
export function siteHealthHeadline(checks: SiteHealthCheck[]): string {
  const alerts = checks.filter((c) => c.state === "alert").length;
  if (alerts === 0) return "Tout fonctionne";
  return alerts === 1 ? "1 point à regarder" : `${alerts} points à regarder`;
}

export function SiteHealthStrip() {
  // Lot ADM14 : mêmes voyants que la liste de travail, dans la même lecture.
  const { model, loading, error } = useWorkList();

  if (loading) {
    return <Skeleton className="h-[52px] rounded-lg" data-testid="site-health-loading" />;
  }

  const data = model && !model.unavailable.includes("health") ? parseSiteHealth(model.health) : [];
  if (error || !model || data.length === 0) {
    return (
      <section aria-label="État du site" data-testid="site-health" className="rounded-lg border border-destructive/40 bg-destructive/5 p-3">
        <p className="text-sm text-foreground">État du site : lecture impossible. Les voyants restent à vérifier tant qu'elle échoue.</p>
      </section>
    );
  }

  const alerts = data.filter((c) => c.state === "alert");
  const seoAlert = alerts.some((c) => c.key === "seo");

  return (
    <section aria-label="État du site" data-testid="site-health" className="rounded-lg border border-border bg-card p-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className="text-sm font-semibold text-foreground">État du site : {siteHealthHeadline(data)}</p>
        <ul className="flex flex-wrap gap-1.5" aria-label="Voyants">
          {data.map((c) => {
            const cls = `inline-flex min-h-8 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs ${
              c.state === "ok"
                ? "border-border text-muted-foreground"
                : "border-destructive/50 bg-destructive/10 font-medium text-destructive"
            }`;
            const inner = (
              <>
                <span aria-hidden className={`h-2 w-2 rounded-full ${c.state === "ok" ? "bg-success" : "bg-destructive"}`} />
                {c.label}
                <span className="sr-only">{c.state === "ok" ? " : normal" : ` : à regarder. ${c.detail}`}</span>
              </>
            );
            return (
              <li key={c.key} data-state={c.state} title={c.detail}>
                {c.link ? (
                  <Link to={c.link} className={`${cls} hover:underline underline-offset-2`} data-testid="site-health-chip">{inner}</Link>
                ) : (
                  <span className={cls} data-testid="site-health-chip">{inner}</span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
      {/* Lot ADM14 : le détail d'un voyant rouge est la première ligne de la liste, une seule fois. */}
      {alerts.length > 0 && (
        <div className="mt-2 space-y-1" data-testid="site-health-alerts">
          <p className="text-sm text-foreground">
            {alerts.length > 1 ? "Le détail de ces voyants ouvre la liste ci-dessous." : "Le détail de ce voyant ouvre la liste ci-dessous."}
          </p>
          {seoAlert && <PrerenderResumeLine />}
        </div>
      )}
    </section>
  );
}
