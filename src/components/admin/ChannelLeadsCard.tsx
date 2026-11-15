/**
 * Lot TRF2 (15/11/2026) : onglet Leads de /admin/traffic. D'où viennent les
 * nouveaux membres qui agissent, par réseau puis par publication (campagne).
 * Mesure du site (événements internes, tous visiteurs) et source enregistrée
 * à l'inscription ; maquette Claude Design « Trafic : onglet Leads et ménage ».
 */
import { Fragment, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { reportAdminReadError, UNAVAILABLE_LABEL } from "@/lib/admin/readError";
import { signupSourceRange } from "@/lib/admin/signupSources";
import {
  DEFAULT_LEADS_PERIOD,
  LEADS_PERIODS,
  buildChannelLeads,
  campaignLabel,
  type LeadsPeriod,
} from "@/lib/admin/channelLeads";
import { cn } from "@/lib/utils";

const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(n);

export function ChannelLeadsCard() {
  const [days, setDays] = useState<LeadsPeriod>(DEFAULT_LEADS_PERIOD);
  const [open, setOpen] = useState<string | null>(null);
  const range = signupSourceRange(days);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-channel-leads", range.from, range.to],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data: raw, error } = await (supabase.rpc as any)("admin_channel_leads", { p_from: range.from, p_to: range.to });
      if (error) {
        reportAdminReadError("Leads par réseau", error);
        throw error;
      }
      return buildChannelLeads(raw);
    },
  });

  const periodLabel = `${days} jours`;
  const publishedFromKnown = data?.channels
    .filter((c) => c.channel !== "inconnu")
    .reduce((s, c) => s + c.publishedMembers, 0) ?? 0;

  return (
    <div className="space-y-4" data-testid="channel-leads">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1" role="group" aria-label="Période">
          {LEADS_PERIODS.map((d) => (
            <Button key={d} type="button" size="sm" className="min-h-11 md:min-h-9"
              variant={d === days ? "default" : "outline"} aria-pressed={d === days} onClick={() => setDays(d)}>
              {d} jours
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="py-10 flex items-center justify-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : isError || !data ? (
        <p className="py-6 text-center text-sm text-destructive">{UNAVAILABLE_LABEL}</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[320px_1fr] lg:items-start">
          <Card className="border-primary/30 bg-primary/5" data-testid="leads-hero">
            <CardContent className="pt-6">
              <p className="text-xs text-primary">Annonces de garde publiées · {periodLabel}</p>
              <p className="font-heading text-4xl font-semibold text-primary tabular-nums">{fmt(data.sitsPublished)}</p>
              <p className="mt-1 text-sm text-primary">
                {`Dont ${fmt(publishedFromKnown)} par des membres inscrits sur la période, source connue.`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">D'où viennent les nouveaux membres</CardTitle>
              <p className="text-xs text-muted-foreground">
                Visites : première page de chaque visite, tous visiteurs (suivi des visites depuis le 13/11/2026). Inscrits : comptes créés, canal enregistré à l'inscription. Touchez un réseau pour voir ses publications.
              </p>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="py-2 pr-2 text-left font-medium">Réseau</th>
                    <th className="py-2 px-2 text-right font-medium">Visites</th>
                    <th className="py-2 px-2 text-right font-medium">Inscrits</th>
                    <th className="py-2 px-2 text-right font-medium">Annonces</th>
                    <th className="hidden py-2 px-2 text-right font-medium md:table-cell">Candidatures</th>
                    <th className="hidden py-2 px-2 text-right font-medium md:table-cell">Coups de main</th>
                    <th className="hidden py-2 pl-2 text-right font-medium md:table-cell">Sorties</th>
                  </tr>
                </thead>
                <tbody>
                  {data.channels.map((c) => {
                    const expandable = c.campaigns.length > 0;
                    const isOpen = open === c.channel;
                    return (
                      <Fragment key={c.channel}>
                        <tr className="border-b" data-testid={`leads-row-${c.channel}`}>
                          <td className="py-1 pr-2">
                            {expandable ? (
                              <button type="button" onClick={() => setOpen(isOpen ? null : c.channel)} aria-expanded={isOpen}
                                className="min-h-11 inline-flex items-center gap-1 font-medium text-left">
                                {c.label}
                                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", isOpen && "rotate-180")} aria-hidden="true" />
                              </button>
                            ) : (
                              <span className="min-h-11 inline-flex items-center font-medium">{c.label}</span>
                            )}
                          </td>
                          <td className="px-2 text-right tabular-nums">{fmt(c.visits)}</td>
                          <td className="px-2 text-right tabular-nums">{fmt(c.signups)}</td>
                          <td className="px-2 text-right tabular-nums">{fmt(c.publishedMembers)}</td>
                          <td className="hidden px-2 text-right tabular-nums md:table-cell">{fmt(c.applicants)}</td>
                          <td className="hidden px-2 text-right tabular-nums md:table-cell">{fmt(c.helpers)}</td>
                          <td className="hidden pl-2 text-right tabular-nums md:table-cell">{fmt(c.outingMembers)}</td>
                        </tr>
                        {isOpen && c.campaigns.map((k) => (
                          <tr key={`${c.channel}-${k.campaign ?? "sans"}`} className="border-b bg-muted/40" data-testid={`leads-campaign-${c.channel}`}>
                            <td className="py-2 pl-4 pr-2 text-foreground/80">{campaignLabel(k.campaign)}</td>
                            <td className="px-2 text-right tabular-nums">{fmt(k.visits)}</td>
                            <td className="px-2 text-right tabular-nums">{fmt(k.signups)}</td>
                            <td className="px-2 text-right tabular-nums">{fmt(k.publishedMembers)}</td>
                            <td className="hidden px-2 text-right tabular-nums md:table-cell">{fmt(k.applicants)}</td>
                            <td className="hidden px-2 text-right tabular-nums md:table-cell">{fmt(k.helpers)}</td>
                            <td className="hidden pl-2 text-right tabular-nums md:table-cell">{fmt(k.outingMembers)}</td>
                          </tr>
                        ))}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
              <p className="mt-3 text-xs text-muted-foreground md:hidden">Candidatures, coups de main et sorties s'affichent sur un écran plus large.</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default ChannelLeadsCard;
