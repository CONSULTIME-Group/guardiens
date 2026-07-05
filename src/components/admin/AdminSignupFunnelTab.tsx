import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Period = 7 | 30 | 90;

interface FunnelStep {
  step: string;
  volume: number;
  conv_prev: number | null;
  conv_top: number | null;
}
interface BlockedRow {
  reason: string;
  volume: number;
  pct_of_blocked: number;
}
interface FailedRow {
  code: string;
  volume: number;
  last_seen: string | null;
}
interface Metrics {
  period_start: string;
  period_end: string;
  funnel: FunnelStep[];
  blocked_reasons: BlockedRow[];
  failed_by_code: FailedRow[];
  features: {
    password_meter_seen: number;
    password_generated_used: number;
    generated_used_rate: number;
    first_shot_strong_rate: number | null;
  };
}

const STEP_LABELS: Record<string, string> = {
  page_view: "Page vue",
  signup_started: "Inscription démarrée",
  signup_role_selected: "Rôle sélectionné",
  signup_terms_checked: "CGU acceptées (étape 1)",
  signup_form_submitted: "Formulaire soumis",
  signup_email_confirmed: "Email confirmé",
  signup_completed: "Inscription complétée",
  first_action: "Première action",
};

const BLOCK_LABELS: Record<string, string> = {
  min_length: "Longueur insuffisante",
  too_common: "Mot de passe trop commun",
  too_weak: "Mot de passe trop faible",
  terms_unchecked: "CGU non cochées",
  email_invalid: "Email invalide",
  step_1_terms_unchecked_click_continue: "Continuer sans CGU (étape 1)",
  unknown: "Autre",
};

// Baseline pré-fix (juin 2026), à comparer aux valeurs actuelles.
const BASELINE = {
  role_to_submit: 0.198,
  submit_to_confirmed: 0.634,
};
const TARGET = {
  role_to_submit: 0.4,
  submit_to_confirmed: 0.75,
};

function pct(n: number | null | undefined, digits = 1): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "–";
  return `${(n * 100).toFixed(digits)} %`;
}

function convClass(v: number | null | undefined): string {
  if (v === null || v === undefined) return "";
  if (v < 0.3) return "text-destructive font-medium";
  if (v < 0.6) return "text-warning-foreground font-medium";
  return "text-success font-medium";
}

function targetClass(current: number, target: number, higherIsBetter = true): string {
  const ratio = higherIsBetter ? current / target : target / current;
  if (ratio >= 1) return "text-success";
  if (ratio >= 0.75) return "text-warning-foreground";
  return "text-destructive";
}

function csvEscape(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadCsv(m: Metrics) {
  const lines: string[] = [];
  lines.push("# Funnel");
  lines.push("etape,volume,conv_prev,conv_top");
  m.funnel.forEach((r) =>
    lines.push([csvEscape(r.step), r.volume, r.conv_prev ?? "", r.conv_top ?? ""].join(","))
  );
  lines.push("");
  lines.push("# Blocked reasons");
  lines.push("raison,volume,pct_of_blocked");
  m.blocked_reasons.forEach((r) =>
    lines.push([csvEscape(r.reason), r.volume, r.pct_of_blocked].join(","))
  );
  lines.push("");
  lines.push("# Failed by code");
  lines.push("code,volume,last_seen");
  m.failed_by_code.forEach((r) =>
    lines.push([csvEscape(r.code), r.volume, csvEscape(r.last_seen ?? "")].join(","))
  );
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  a.href = url;
  a.download = `signup-funnel-${today}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminSignupFunnelTab() {
  const [period, setPeriod] = useState<Period>(30);
  const [data, setData] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    supabase
      .rpc("get_signup_funnel_metrics" as any, { p_period_days: period })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setError(error.message);
          setData(null);
        } else {
          setData(data as unknown as Metrics);
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [period]);

  const targets = useMemo(() => {
    if (!data) return null;
    const roleSel = data.funnel.find((s) => s.step === "signup_role_selected")?.volume ?? 0;
    const submitted = data.funnel.find((s) => s.step === "signup_form_submitted")?.volume ?? 0;
    const confirmed = data.funnel.find((s) => s.step === "signup_email_confirmed")?.volume ?? 0;
    const roleToSubmit = roleSel > 0 ? submitted / roleSel : 0;
    const submitToConfirmed = submitted > 0 ? confirmed / submitted : 0;
    return { roleToSubmit, submitToConfirmed };
  }, [data]);

  return (
    <div className="space-y-6">
      {/* Bloc entête + sélecteur période */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>Funnel signup, {period} derniers jours</CardTitle>
            {data && (
              <p className="text-xs text-muted-foreground mt-1">
                Du {new Date(data.period_start).toLocaleDateString("fr-FR")} au{" "}
                {new Date(data.period_end).toLocaleDateString("fr-FR")}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {([7, 30, 90] as Period[]).map((p) => (
              <Button
                key={p}
                size="sm"
                variant={period === p ? "default" : "outline"}
                onClick={() => setPeriod(p)}
              >
                {p}j
              </Button>
            ))}
            <Button
              size="sm"
              variant="outline"
              disabled={!data}
              onClick={() => data && downloadCsv(data)}
            >
              <Download className="h-4 w-4 mr-1" /> CSV
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Bandeau cibles */}
      {targets && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cibles vs baseline (juin 2026)</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Métrique</TableHead>
                  <TableHead className="text-right">Baseline</TableHead>
                  <TableHead className="text-right">Aujourd'hui</TableHead>
                  <TableHead className="text-right">Cible</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Rôle sélectionné → formulaire soumis</TableCell>
                  <TableCell className="text-right">{pct(BASELINE.role_to_submit)}</TableCell>
                  <TableCell className={cn("text-right", targetClass(targets.roleToSubmit, TARGET.role_to_submit))}>
                    {pct(targets.roleToSubmit)}
                  </TableCell>
                  <TableCell className="text-right">{pct(TARGET.role_to_submit)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Formulaire soumis → email confirmé</TableCell>
                  <TableCell className="text-right">{pct(BASELINE.submit_to_confirmed)}</TableCell>
                  <TableCell className={cn("text-right", targetClass(targets.submitToConfirmed, TARGET.submit_to_confirmed))}>
                    {pct(targets.submitToConfirmed)}
                  </TableCell>
                  <TableCell className="text-right">{pct(TARGET.submit_to_confirmed)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card>
          <CardContent className="py-4 text-sm text-destructive">
            Erreur de chargement : {error}
          </CardContent>
        </Card>
      )}

      {/* Bloc funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Entonnoir chiffré</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Étape</TableHead>
                  <TableHead className="text-right">Volume</TableHead>
                  <TableHead className="text-right">Conv. étape précédente</TableHead>
                  <TableHead className="text-right">Conv. depuis top</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.funnel.map((row) => (
                  <TableRow key={row.step}>
                    <TableCell className="font-medium">{STEP_LABELS[row.step] ?? row.step}</TableCell>
                    <TableCell className="text-right">{row.volume.toLocaleString("fr-FR")}</TableCell>
                    <TableCell className={cn("text-right", convClass(row.conv_prev))}>
                      {pct(row.conv_prev)}
                    </TableCell>
                    <TableCell className={cn("text-right", convClass(row.conv_top))}>
                      {pct(row.conv_top)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Bloc blocked reasons */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Raisons de blocage (signup_form_blocked)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-24 w-full" />
          ) : data?.blocked_reasons.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Raison</TableHead>
                  <TableHead className="text-right">Volume</TableHead>
                  <TableHead className="text-right">% des blocages</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.blocked_reasons.map((r) => (
                  <TableRow key={r.reason}>
                    <TableCell>{BLOCK_LABELS[r.reason] ?? r.reason}</TableCell>
                    <TableCell className="text-right">{r.volume.toLocaleString("fr-FR")}</TableCell>
                    <TableCell className="text-right">{pct(r.pct_of_blocked)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">Aucun blocage sur la période.</p>
          )}
        </CardContent>
      </Card>

      {/* Bloc failed */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Erreurs signup (signup_failed)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-24 w-full" />
          ) : data?.failed_by_code.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code d'erreur</TableHead>
                  <TableHead className="text-right">Volume</TableHead>
                  <TableHead className="text-right">Dernière occurrence</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.failed_by_code.map((r) => (
                  <TableRow key={r.code}>
                    <TableCell>{r.code}</TableCell>
                    <TableCell className="text-right">{r.volume.toLocaleString("fr-FR")}</TableCell>
                    <TableCell className="text-right">
                      {r.last_seen ? new Date(r.last_seen).toLocaleString("fr-FR") : "–"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">Aucune erreur sur la période.</p>
          )}
        </CardContent>
      </Card>

      {/* Bloc adoption features */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Adoption des features</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-16 w-full" />
          ) : data ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Meter password vu</p>
                <p className="text-2xl font-semibold">
                  {data.features.password_meter_seen.toLocaleString("fr-FR")}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Mot de passe généré utilisé</p>
                <p className="text-2xl font-semibold">
                  {data.features.password_generated_used.toLocaleString("fr-FR")}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Taux d'usage du générateur</p>
                <p className="text-2xl font-semibold">{pct(data.features.generated_used_rate)}</p>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {loading && !data && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
