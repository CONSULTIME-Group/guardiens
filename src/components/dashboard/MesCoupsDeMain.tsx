import { formatCityLabel } from "@/lib/cityLabel";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import MeetupAnswer from "@/components/entraide/MeetupAnswer";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { fetchMySmallMissionsIndex } from "@/lib/dashboardShared";
import { getAppQueryClient } from "@/lib/appQueryClient";

const invalidateMine = (uid?: string) => {
  if (uid) void getAppQueryClient()?.invalidateQueries({ queryKey: ["my-small-missions-index", uid] });
};
import { toast } from "sonner";

export interface HelpRow {
  id: string;
  title: string;
  city: string | null;
  status: string;
  close_reason: string | null;
  role: "owner" | "helper";
  other_id: string | null;
  other_first_name: string;
  word: string | null;
  answered: boolean;
}

/**
 * Données et action de « Vos coups de main », partagées avec le bandeau
 * entraide du tableau de bord propriétaire (lot D1).
 */
export function useMyHelpExchanges() {
  const { user } = useAuth();
  const [rows, setRows] = useState<HelpRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) return;

    const [mine, answered] = await Promise.all([
      supabase
        .from("small_mission_responses")
        .select("mission_id")
        .eq("responder_id", user.id)
        .eq("status", "accepted"),
      supabase.from("mission_feedbacks").select("mission_id, comment, receiver_id, giver_id"),
    ]);

    const helperMissionIds = (mine.data || []).map((r) => r.mission_id);
    // Lot P1b : mes propres coups de main viennent de la lecture partagée du
    // tableau de bord ; seuls ceux où j'ai aidé sont lus ici, par identifiants.
    const [mineAll, helped] = await Promise.all([
      fetchMySmallMissionsIndex(user.id).catch(() => []),
      helperMissionIds.length
        ? supabase
          .from("small_missions")
          .select("id, title, city, status, close_reason, user_id, updated_at")
          .in("id", helperMissionIds)
          .in("status", ["in_progress", "completed"])
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const byId = new Map<string, any>();
    for (const m of mineAll) if (m.status === "in_progress" || m.status === "completed") byId.set(m.id, m);
    for (const m of (helped.data || []) as any[]) byId.set(m.id, m);
    const missions = Array.from(byId.values())
      .sort((a, b) => String(b.updated_at ?? "").localeCompare(String(a.updated_at ?? "")))
      .slice(0, 20) as Array<{ id: string; title: string; city: string | null; status: string; close_reason: string | null; user_id: string }>;

    const missionIds = (missions || []).map((m) => m.id);
    const { data: responses } = missionIds.length
      ? await supabase
        .from("small_mission_responses")
        .select("mission_id, responder_id")
        .in("mission_id", missionIds)
        .eq("status", "accepted")
      : { data: [] as Array<{ mission_id: string; responder_id: string }> };

    const helperByMission = new Map((responses || []).map((r) => [r.mission_id, r.responder_id]));
    const otherIds = Array.from(new Set([
      ...(missions || []).map((m) => m.user_id),
      ...(responses || []).map((r) => r.responder_id),
    ]));
    const { data: profiles } = otherIds.length
      ? await supabase.from("profiles").select("id, first_name").in("id", otherIds)
      : { data: [] as Array<{ id: string; first_name: string | null }> };
    const nameById = new Map((profiles || []).map((p) => [p.id, p.first_name || "un membre"]));
    const feedbacks = answered.data || [];

    setRows((missions || []).flatMap((m) => {
      const helperId = helperByMission.get(m.id) || null;
      const role: "owner" | "helper" = m.user_id === user.id ? "owner" : "helper";
      if (role === "helper" && helperId !== user.id) return [];
      const otherId = role === "owner" ? helperId : m.user_id;
      const received = feedbacks.find((f) => f.mission_id === m.id && f.receiver_id === user.id);
      return [{
        id: m.id,
        title: m.title,
        city: m.city,
        status: m.status,
        close_reason: m.close_reason,
        role,
        other_id: otherId,
        other_first_name: otherId ? nameById.get(otherId) || "un membre" : "un membre",
        word: received?.comment || null,
        answered: feedbacks.some((f) => f.mission_id === m.id && f.giver_id === user.id),
      }];
    }));
  }, [user?.id]);

  useEffect(() => { void load(); }, [load]);

  const answer = async (missionId: string, happened: boolean, word: string, publicOk: boolean) => {
    setBusy(missionId);
    const { data: tokens, error } = await supabase.rpc("my_mission_meetup_tokens", { p_mission_id: missionId });
    const parsed = tokens as { ok?: boolean; yes_token?: string; no_token?: string } | null;
    if (error || !parsed?.ok) {
      setBusy(null);
      toast.error("Cette réponse sera enregistrée dans un instant. Réessayez.");
      return;
    }
    const token = happened ? parsed.yes_token : parsed.no_token;
    const { data } = await supabase.functions.invoke("mission-quick-action", {
      body: { token, kind: "meetup", mode: "confirm", word, public_ok: publicOk },
    });
    setBusy(null);
    if ((data as { ok?: boolean })?.ok) {
      invalidateMine(user?.id);
      toast.success(happened ? "C'est noté, merci." : "C'est noté. Votre besoin reste suivi.");
      await load();
    } else {
      toast.error("Cette réponse sera enregistrée dans un instant. Réessayez.");
    }
  };

  return { rows, busy, answer };
}

/**
 * « Vos coups de main » : ce qui est en cours, ce qui reste à confirmer, et le
 * mot reçu quand la rencontre a eu lieu.
 */
const MesCoupsDeMain = () => {
  const { rows, busy, answer } = useMyHelpExchanges();
  if (rows.length === 0) return null;

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="font-heading text-xl">Vos coups de main</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.map((row) => (
          <div key={row.id} className="rounded-lg border border-border p-4">
            <p className="text-xs font-semibold text-primary">
              {formatCityLabel(row.city) || "Près de chez vous"}
              {row.role === "owner" ? ", avec " : ", pour "}
              {row.other_first_name}
            </p>
            <h3 className="mt-1 font-heading text-base font-semibold text-foreground">{row.title}</h3>

            {row.status === "in_progress" && !row.answered && (
              <div className="mt-3 space-y-3">
                <p className="text-sm text-muted-foreground">Vous vous êtes rencontrés ?</p>
                <MeetupAnswer
                  otherFirstName={row.other_first_name}
                  busy={busy === row.id}
                  onYes={(word, publicOk) => void answer(row.id, true, word, publicOk)}
                  onNo={() => void answer(row.id, false, "", false)}
                />
              </div>
            )}

            {row.status === "in_progress" && row.answered && (
              <p className="mt-2 text-sm text-muted-foreground">Votre réponse est enregistrée, merci.</p>
            )}

            {row.status === "completed" && (
              <p className="mt-2 text-sm text-muted-foreground">
                {row.close_reason === "meetup_confirmed" ? "Rencontre confirmée." : "Échange terminé."}
              </p>
            )}

            {row.word && (
              <p className="mt-3 border-l-2 border-primary/40 pl-3 text-sm italic leading-relaxed text-muted-foreground">
                « {row.word} »
              </p>
            )}

            <Button asChild variant="outline" size="sm" className="mt-3">
              <Link to={`/petites-missions/${row.id}`}>Voir le détail</Link>
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default MesCoupsDeMain;
