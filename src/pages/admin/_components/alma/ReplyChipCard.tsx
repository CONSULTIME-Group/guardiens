/**
 * Lot ALMA4b (13/11/2026) : carte « L'aperçu qui se répond » de l'onglet
 * Murmures. Aperçus rendus avec une puce, puces touchées, taux et objectif
 * de l'arène (3 % à J+14). Comptes de l'équipe exclus.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fetchAllRows } from "@/lib/admin/fetchAllRows";
import { reportAdminReadError, UNAVAILABLE_LABEL } from "@/lib/admin/readError";
import {
  REPLY_CHIP_EVENTS,
  REPLY_CHIP_KIND_LABELS,
  REPLY_CHIP_MEASURED_SINCE,
  REPLY_CHIP_TARGET,
  replyChipMeasure,
  replyChipRateLabel,
  type ReplyChipEventRow,
  type ReplyChipKind,
} from "@/lib/admin/alma-reply-chip";

const ROW_CAP = 10_000;
const people = (n: number) => `${n} personne${n > 1 ? "s" : ""}`;

export function ReplyChipCard({ since }: { since: string }) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-alma-reply-chip", since],
    queryFn: async () => {
      try {
        const [events, team] = await Promise.all([
          fetchAllRows<ReplyChipEventRow>((from, to) =>
            supabase.from("analytics_events")
              .select("user_id, event_type, metadata")
              .in("event_type", [...REPLY_CHIP_EVENTS])
              .gte("created_at", since)
              .order("created_at", { ascending: false })
              .order("id", { ascending: false })
              .range(from, to) as any, { cap: ROW_CAP }),
          (supabase.from as any)("user_roles").select("user_id").eq("role", "admin"),
        ]);
        if (team.error) throw team.error;
        const teamIds = ((team.data ?? []) as Array<{ user_id: string }>).map((r) => r.user_id);
        return { measure: replyChipMeasure(events.rows, teamIds), truncated: events.truncated };
      } catch (error) {
        reportAdminReadError("Alma : aperçu qui se répond", error);
        throw error;
      }
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const m = data?.measure;
  return (
    <Card data-testid="alma-reply-chip-card">
      <CardContent className="p-6 space-y-3">
        <h3 className="text-sm font-semibold">L'aperçu qui se répond</h3>
        {isLoading && <p className="text-sm text-muted-foreground">Lecture en cours.</p>}
        {isError && (
          <div className="flex flex-wrap items-center gap-2 text-sm text-destructive">
            <span>{UNAVAILABLE_LABEL} : la lecture a échoué, aucun chiffre calculé.</span>
            <Button variant="outline" size="sm" onClick={() => void refetch()}>Réessayer</Button>
          </div>
        )}
        {m && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">Aperçus affichés avec une puce</p>
                <p className="text-2xl font-semibold">{m.peeks}</p>
                <p className="text-xs text-muted-foreground">{people(m.peekPeople)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Puces touchées</p>
                <p className="text-2xl font-semibold">{m.clicks}</p>
                <p className="text-xs text-muted-foreground">{people(m.clickPeople)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Taux de réponse</p>
                <p className="text-2xl font-semibold">{replyChipRateLabel(m.rate)}</p>
                <p className="text-xs text-muted-foreground">Objectif : {Math.round(REPLY_CHIP_TARGET * 100)} % des aperçus</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {(Object.keys(REPLY_CHIP_KIND_LABELS) as ReplyChipKind[])
                .map((k) => `« ${REPLY_CHIP_KIND_LABELS[k]} » : ${m.byKind[k].clicks} sur ${m.byKind[k].peeks}`)
                .join(" · ")}
            </p>
            <p className="text-xs text-muted-foreground">
              Sur téléphone, sous un fait d'Alma. Comptes de l'équipe exclus. Mesure ouverte le{" "}
              {new Date(`${REPLY_CHIP_MEASURED_SINCE}T12:00:00`).toLocaleDateString("fr-FR")}.
              {data?.truncated ? ` Données partielles : ${ROW_CAP} événements lus.` : ""}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default ReplyChipCard;
