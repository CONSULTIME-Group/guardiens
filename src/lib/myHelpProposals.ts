/**
 * Lot X3b (C-11) : l'aidant suit ses propositions d'aide (où, statut, lien
 * vers le besoin et vers la conversation).
 *
 * Logique pure : les lignes viennent des deux lectures déjà faites par
 * useMyHelpExchanges (ses réponses, puis les besoins correspondants, lot P1b),
 * aucune lecture de plus sur le tableau de bord.
 */
import { entraideMissionPath } from "@/lib/activeEntraideMission";

export interface MyResponseRow {
  id: string;
  mission_id: string;
  status: string;
  created_at?: string | null;
  conversation_id?: string | null;
}

export interface ProposalMissionRow {
  id: string;
  title?: string | null;
  city?: string | null;
  status?: string | null;
  slug?: string | null;
  category?: string | null;
}

export type HelpProposalState = "waiting" | "chosen" | "closed";

export interface HelpProposal {
  responseId: string;
  missionId: string;
  title: string;
  city: string | null;
  state: HelpProposalState;
  label: string;
  missionPath: string;
  conversationPath: string | null;
  createdAt: string | null;
}

/** Une proposition close reste visible deux semaines, puis laisse la place. */
export const CLOSED_PROPOSAL_DAYS = 14;
export const MAX_PROPOSALS = 5;

const LABELS: Record<HelpProposalState, string> = {
  waiting: "En attente de réponse",
  chosen: "Vous êtes la personne retenue",
  closed: "Besoin clos, merci pour votre proposition",
};

function stateOf(r: MyResponseRow, m: ProposalMissionRow): HelpProposalState | null {
  const live = m.status === "open" || m.status === "in_progress";
  if (r.status === "accepted") return "chosen";
  if (r.status === "pending") return live ? "waiting" : "closed";
  if (r.status === "declined") return "closed";
  return null; // withdrawn : retirée par la personne elle-même
}

const ORDER: Record<HelpProposalState, number> = { waiting: 0, chosen: 1, closed: 2 };

export function buildHelpProposals(
  responses: ReadonlyArray<MyResponseRow> | null | undefined,
  missions: ReadonlyArray<ProposalMissionRow> | null | undefined,
  now: Date = new Date(),
): HelpProposal[] {
  const byId = new Map((missions ?? []).map((m) => [m.id, m]));
  const cutoff = now.getTime() - CLOSED_PROPOSAL_DAYS * 86400_000;
  const out: HelpProposal[] = [];
  for (const r of responses ?? []) {
    const m = r && byId.get(r.mission_id);
    if (!m) continue;
    const state = stateOf(r, m);
    if (!state) continue;
    // Un coup de main en cours ou terminé a déjà sa ligne dans « Vos coups de
    // main » (question de rencontre, avis) : on ne le montre pas deux fois.
    if (state === "chosen" && m.status !== "open") continue;
    const created = r.created_at ? Date.parse(r.created_at) || 0 : 0;
    if (state === "closed" && created && created < cutoff) continue;
    out.push({
      responseId: r.id,
      missionId: m.id,
      title: (m.title ?? "").trim() || "Un coup de main",
      city: m.city ?? null,
      state,
      label: LABELS[state],
      missionPath: entraideMissionPath(m),
      conversationPath: r.conversation_id ? `/messages/${r.conversation_id}` : null,
      createdAt: r.created_at ?? null,
    });
  }
  return out
    .sort((a, b) => ORDER[a.state] - ORDER[b.state]
      || String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")))
    .slice(0, MAX_PROPOSALS);
}
