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
import {
  DEFAULT_LEADS_PERIOD,
  LEADS_PERIODS,
  buildChannelLeads,
  campaignLabel,
  leadsCoverage,
  leadsPeriodLabel,
  leadsRange,
  type LeadsPeriod,
} from "@/lib/admin/channelLeads";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import TabSynthesis from "@/components/admin/traffic/TabSynthesis";
import { SHORT_LINK_BY_CHANNEL, publicationShortLink } from "@/lib/admin/seoActionLog";
import { leadsPhrase, totalVisits } from "@/lib/admin/trafficSynthesis";
import { trafficPeriodPhrase } from "@/lib/admin/trafficPeriod";

const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(n);

/** Lot TRF-5 : lien court d'une publication, à coller dans la publication (guardiens.fr/fb?utm_campaign=…). */
function ShortLinkBuilder({ channel, label }: { channel: string; label: string }) {
  const [name, setName] = useState("");
  const link = publicationShortLink(channel, name);
  const copy = async () => {
    if (!link) return;
    try { await navigator.clipboard.writeText(link); toast.success("Lien copié."); }
    catch { toast.error("Copie impossible, sélectionnez le lien à la main."); }
  };
  return (
    <div className="space-y-2" data-testid={`leads-shortlink-${channel}`}>
      <label htmlFor={`pub-${channel}`} className="block text-xs font-medium text-foreground">
        Lien court pour une publication {label}
      </label>
      <div className="flex flex-col sm:flex-row gap-2">
        <input id={`pub-${channel}`} value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom de la publication, par exemple : groupe Toulon 16/11"
          className="min-h-11 flex-1 min-w-0 rounded-md border border-input bg-background px-3 text-sm" />
        <Button type="button" className="min-h-11" disabled={!link} onClick={copy}>Copier le lien</Button>
      </div>
      <p className="text-xs text-muted-foreground break-all">
        {link ?? "Le lien se compose avec le nom saisi. La publication apparaît dans ce tableau dès sa première visite."}
      </p>
    </div>
  );
}

function exportLeadsCsv(channels: { label: string; visits: number; signups: number; publishedMembers: number; applicants: number; helpers: number; outingMembers: number }[]) {
  const head = ["reseau", "visites", "inscrits", "annonces", "candidatures", "coups_de_main", "sorties"];
  const lines = channels.map((c) => [`"${c.label.replace(/"/g, '""')}"`, c.visits, c.signups, c.publishedMembers, c.applicants, c.helpers, c.outingMembers].join(","));
  const blob = new Blob(["\ufeff" + [head.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "guardiens-leads-par-reseau.csv"; a.click();
  URL.revokeObjectURL(url);
}

export function ChannelLeadsCard({ period }: { period?: LeadsPeriod } = {}) {
  const [ownDays, setDays] = useState<LeadsPeriod>(DEFAULT_LEADS_PERIOD);
  // Lot TRF-6 : la période commune de /admin/traffic l'emporte quand elle est fournie.
  const days = period ?? ownDays;
  const [open, setOpen] = useState<string | null>(null);
  const range = leadsRange(days);

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

  const coverage = leadsCoverage(data?.channels ?? []);

  return (
    <div className="space-y-4" data-testid="channel-leads">
      {!period && <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1" role="group" aria-label="Période">
          {LEADS_PERIODS.map((d) => (
            <Button key={d} type="button" size="sm" className="min-h-11 md:min-h-9"
              variant={d === days ? "default" : "outline"} aria-pressed={d === days} onClick={() => setDays(d)}>
              {leadsPeriodLabel(d)}
            </Button>
          ))}
        </div>
      </div>}

      {isLoading ? (
        <div className="py-10 flex items-center justify-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : isError || !data ? (
        <p className="py-6 text-center text-sm text-destructive">{UNAVAILABLE_LABEL}</p>
      ) : (
        <div className="space-y-4">
          <TabSynthesis
            testid="leads-synthesis"
            phrase={leadsPhrase(data.channels, trafficPeriodPhrase(days))}
            kpis={[
              { label: "Inscrits", value: fmt(coverage.signups), hint: `source connue : ${Math.round(coverage.share * 100)} %` },
              { label: "Annonces de garde", value: fmt(data.sitsPublished), hint: "publiées sur la période" },
              { label: "Visites", value: fmt(totalVisits(data.channels)), hint: "suivies depuis le 13/11" },
            ]}
          />
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">D'où viennent les nouveaux membres</CardTitle>
              <p className="text-xs text-muted-foreground">
                Visites : première page de chaque visite, tous visiteurs (suivi des visites depuis le 13/11/2026). Inscrits : comptes créés, canal enregistré à l'inscription. Touchez un réseau pour voir ses publications.
              </p>
              <p className="text-xs font-medium text-foreground" data-testid="leads-coverage">
                {`Source enregistrée pour ${fmt(coverage.known)} inscrit${coverage.known > 1 ? "s" : ""} sur ${fmt(coverage.signups)} (${Math.round(coverage.share * 100)} %). La source s'enregistre depuis le 12/11/2026.`}
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
                    const social = c.channel in SHORT_LINK_BY_CHANNEL;
                    const expandable = c.campaigns.length > 0 || social;
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
                        {isOpen && social && (
                          <tr className="border-b bg-muted/40">
                            <td colSpan={7} className="py-3 px-4"><ShortLinkBuilder channel={c.channel} label={c.label} /></td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
              <p className="mt-3 text-xs text-muted-foreground md:hidden">Candidatures, coups de main et sorties s'affichent sur un écran plus large.</p>
              <Button type="button" variant="outline" className="mt-3 min-h-11 md:min-h-9" onClick={() => exportLeadsCsv(data.channels)} data-testid="leads-csv">
                Exporter en CSV
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default ChannelLeadsCard;
