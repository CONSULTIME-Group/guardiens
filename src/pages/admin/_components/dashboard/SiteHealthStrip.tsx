/**
 * Lot ADM6 : encart « État du site » en tête de la vue d'ensemble. Six
 * voyants (tâches, emails, IA, SEO, erreurs, audience), une seule lecture
 * (admin_site_health). Vert : rien à lire. Rouge : une phrase et un lien.
 */
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export interface SiteHealthCheck {
  key: string;
  label: string;
  state: "ok" | "alert";
  detail: string;
  link: string | null;
}

export const SITE_HEALTH_QUERY_KEY = ["admin_site_health"] as const;

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
  const { data, isLoading, isError } = useQuery({
    queryKey: SITE_HEALTH_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("admin_site_health");
      if (error) throw error;
      return parseSiteHealth(data);
    },
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });

  if (isLoading) return null;

  if (isError || !data || data.length === 0) {
    return (
      <section aria-label="État du site" data-testid="site-health" className="rounded-lg border border-destructive/40 bg-destructive/5 p-3">
        <p className="text-sm text-foreground">État du site : lecture impossible. Les voyants ne sont pas fiables tant qu'elle échoue.</p>
      </section>
    );
  }

  const alerts = data.filter((c) => c.state === "alert");

  return (
    <section aria-label="État du site" data-testid="site-health" className="rounded-lg border border-border bg-card p-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className="text-sm font-semibold text-foreground">État du site : {siteHealthHeadline(data)}</p>
        <ul className="flex flex-wrap gap-1.5" aria-label="Voyants">
          {data.map((c) => (
            <li
              key={c.key}
              data-state={c.state}
              title={c.detail}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs ${
                c.state === "ok"
                  ? "border-border text-muted-foreground"
                  : "border-destructive/50 bg-destructive/10 font-medium text-destructive"
              }`}
            >
              <span aria-hidden className={`h-2 w-2 rounded-full ${c.state === "ok" ? "bg-success" : "bg-destructive"}`} />
              {c.label}
              <span className="sr-only">{c.state === "ok" ? " : normal" : " : à regarder"}</span>
            </li>
          ))}
        </ul>
      </div>
      {alerts.length > 0 && (
        <ul className="mt-2 space-y-1" data-testid="site-health-alerts">
          {alerts.map((c) => (
            <li key={c.key} className="text-sm text-foreground">
              <span className="font-medium">{c.label} : </span>
              {c.detail}
              {c.link && (
                <>
                  {" "}
                  <Link to={c.link} className="text-primary underline underline-offset-2">Voir</Link>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
