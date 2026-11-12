/**
 * Lot SRC1 (12/11/2026) : inscriptions par canal d'arrivée, lues depuis
 * profiles par admin_signup_sources (un compte sans source = « Inconnu »).
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { reportAdminReadError, UNAVAILABLE_LABEL } from "@/lib/admin/readError";
import {
  SIGNUP_SOURCE_PERIODS,
  normalizeSignupSourceRows,
  signupChannelLabel,
  signupSourceRange,
  totalSignupSources,
  type SignupSourcePeriod,
} from "@/lib/admin/signupSources";

export function SignupSourcesCard() {
  const [days, setDays] = useState<SignupSourcePeriod>(30);
  const range = signupSourceRange(days);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-signup-sources", range.from, range.to],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data: rows, error } = await (supabase.rpc as any)("admin_signup_sources", { p_from: range.from, p_to: range.to });
      if (error) {
        reportAdminReadError("Inscriptions par canal", error);
        throw error;
      }
      return normalizeSignupSourceRows(rows);
    },
  });

  const rows = data ?? [];
  const total = totalSignupSources(rows);

  return (
    <Card data-testid="signup-sources-card">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base">Inscriptions par canal</CardTitle>
          <div className="flex gap-1" role="group" aria-label="Période">
            {SIGNUP_SOURCE_PERIODS.map((d) => (
              <Button
                key={d}
                type="button"
                size="sm"
                variant={d === days ? "default" : "outline"}
                aria-pressed={d === days}
                onClick={() => setDays(d)}
              >
                {d} jours
              </Button>
            ))}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Comptes créés sur la période (jours de Paris), rangés par canal d'arrivée. « Inconnu » : compte créé sans source enregistrée (avant ce suivi, ou arrivée perdue en route). Une annonce compte dès sa première mise en ligne.
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-8 flex items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : isError ? (
          <p className="py-6 text-center text-sm text-destructive">{UNAVAILABLE_LABEL}</p>
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Aucune inscription sur la période.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Canal</TableHead>
                  <TableHead className="text-right">Inscrits</TableHead>
                  <TableHead className="text-right">Propriétaires</TableHead>
                  <TableHead className="text-right">Gardiens</TableHead>
                  <TableHead className="text-right">Double rôle</TableHead>
                  <TableHead className="text-right">Via Google</TableHead>
                  <TableHead className="text-right">Via email</TableHead>
                  <TableHead className="text-right">Membres avec annonce publiée</TableHead>
                  <TableHead className="text-right">Annonces publiées</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.channel} data-testid={`signup-source-${r.channel}`}>
                    <TableCell className="font-medium">{signupChannelLabel(r.channel)}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.signups}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.owners}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.sitters}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.boths}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.google_accounts}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.email_accounts}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.members_with_published_sit}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.published_sits}</TableCell>
                  </TableRow>
                ))}
                <TableRow data-testid="signup-source-total">
                  <TableCell className="font-semibold">Total</TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">{total.signups}</TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">{total.owners}</TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">{total.sitters}</TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">{total.boths}</TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">{total.google_accounts}</TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">{total.email_accounts}</TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">{total.members_with_published_sit}</TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">{total.published_sits}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default SignupSourcesCard;
