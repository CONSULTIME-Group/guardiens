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
import { buildHelpProposals, type HelpProposal, type MyResponseRow } from "@/lib/myHelpProposals";

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
  const [proposals, setProposals] = useState<HelpProposal[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) return;

    // Lot X3b (C-11) : une seule lecture de mes réponses, tous statuts utiles,
    // sert aux coups de main retenus et au suivi de mes propositions.
    const [mine, answered] = await Promise.all([
      supabase
        .from("small_mission_responses")
        .select("id, mission_id, status, created_at, conversation_id")
        .eq("responder_id", user.id)
        .in("status", ["pending", "accepted", "declined"])
        .order("created_at", { ascending: false })
        .limit(40),
      supabase.from("mission_feedbacks").select("mission_id, comment, receiver_id, giver_id"),
    ]);

    const myResponses = ((mine.data || []) as MyResponseRow[]);
    const acceptedIds = new Set(myResponses.filter((r) => r.status === "accepted").map((r) => r.mission_id));
    const answeredMissionIds = Array.from(new Set(myResponses.map((r) => r.mission_id)));
    // Lot P1b : mes propres coups de main viennent de la lecture partagée du
    // tableau de bord ; ceux où j'ai proposé mon aide sont lus ici, par
    // identifiants, en une lecture (politique « Responders can read missions
    // they answered », lot X1).
    const [mineAll, helped] = await Promise.all([
      fetchMySmallMissionsIndex(user.id).catch(() => []),
      answeredMissionIds.length
        ? supabase
          .from("small_missions")
          .select("id, title, city, status, close_reason, user_id, updated_at, slug, category")
          .in("id", answeredMissionIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const helpedRows = ((helped.data || []) as any[]);
    setProposals(buildHelpProposals(myResponses, helpedRows));
    const byId = new Map<string, any>();
    for (const m of mineAll) if (m.status === "in_progress" || m.status === "completed") byId.set(m.id, m);
    for (const m of helpedRows) {
      if (acceptedIds.has(m.id) && (m.status === "in_progress" || m.status === "completed")) byId.set(m.id, m);
    }
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
    // Lot Y2 (P3-12) : profiles n'est lisible que de son titulaire ; le
    // prénom de l'autre partie vient de get_member_display (vue membre).
    const { data: profiles } = otherIds.length
      ? await (supabase as any).rpc("get_member_display", { _ids: otherIds })
      : { data: [] as Array<{ id: string; first_name: string | null }> };
    const nameById = new Map<string, string>(((profiles || []) as Array<{ id: string; first_name: string | null }>).map((p) => [p.id, p.first_name || "un membre"] as [string, string]));
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

  return { rows, proposals, busy, answer };
}

/**
 * Lot X3b (C-11) : « Vos propositions d'aide » : où la personne a proposé son
 * aide, où en est chaque proposition, avec le besoin et la conversation.
 */
export function HelpProposalsList({ proposals }: { proposals: HelpProposal[] }) {
  if (proposals.length === 0) return null;
  return (
    <div className="mt-[14px] rounded-[14px] bg-card px-[16px] py-[12px]" data-testid="help-proposals">
      <p className="text-foreground text-[14px] font-semibold">Vos propositions d'aide</p>
      <ul className="mt-[8px] space-y-[10px] list-none p-0">
        {proposals.map((p) => (
          <li key={p.responseId} className="flex flex-col sm:flex-row sm:items-center gap-[8px]" data-state={p.state}>
            <div className="min-w-0 flex-1">
              <p className="text-foreground text-[13.5px] font-medium">
                {p.title}
                {p.city ? <span className="font-normal text-muted-foreground">, {formatCityLabel(p.city)}</span> : null}
              </p>
              <p className="text-muted-foreground text-[12.5px]">{p.label}</p>
            </div>
            <div className="flex items-center gap-[12px] shrink-0">
              <Link to={p.missionPath} className="text-primary text-[13px] font-semibold hover:underline underline-offset-4">
                Voir le besoin
              </Link>
              {p.conversationPath && (
                <Link to={p.conversationPath} className="text-primary text-[13px] font-semibold hover:underline underline-offset-4">
                  Conversation
                </Link>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * « Vos coups de main » : ce qui est en cours, ce qui reste à confirmer, et le
 * mot reçu quand la rencontre a eu lieu.
 */
const MesCoupsDeMain = () => {
  const { rows, proposals, busy, answer } = useMyHelpExchanges();
  if (rows.length === 0 && proposals.length === 0) return null;

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="font-heading text-xl">Vos coups de main</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <HelpProposalsList proposals={proposals} />
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
