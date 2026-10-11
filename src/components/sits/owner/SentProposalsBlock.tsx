/**
 * Propositions privées envoyées pour une garde, vues par son
 * propriétaire (état, délai restant, lien vers chaque proposition).
 * Ne rend rien tant qu'aucune proposition n'a été envoyée.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { proposalTimeLeft } from "@/lib/sitProposal";

type Row = {
  id: string;
  sitter_id: string;
  status: "sent" | "viewed" | "applied" | "declined" | "closed";
  expires_at: string | null;
  first_name?: string | null;
};

/** Libellé de l'état d'une proposition, du point de vue du propriétaire. */
export function sentProposalStateLabel(row: Pick<Row, "status" | "expires_at">, now: Date = new Date()): string {
  if (row.status === "applied") return "A dit oui : confirmez la garde dans les candidatures";
  if (row.status === "declined") return "A décliné";
  if (row.status === "closed") return "Proposition close";
  const left = row.expires_at ? proposalTimeLeft(row.expires_at, now) : null;
  if (!left) return "Expirée sans réponse";
  return `${row.status === "viewed" ? "Vue" : "Envoyée"}, ${left.charAt(0).toLowerCase()}${left.slice(1)}`;
}

const SentProposalsBlock = ({ sitId, isDraft }: { sitId: string; isDraft: boolean }) => {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await (supabase as any)
        .from("sit_invitations")
        .select("id, sitter_id, status, expires_at")
        .eq("sit_id", sitId)
        .eq("kind", "private")
        .order("created_at", { ascending: true });
      const list = ((data as Row[] | null) ?? []);
      if (list.length > 0) {
        const { data: people } = await supabase
          .from("public_profiles")
          .select("id, first_name")
          .in("id", list.map((r) => r.sitter_id));
        const names = new Map(((people as { id: string; first_name: string | null }[] | null) ?? []).map((p) => [p.id, p.first_name]));
        list.forEach((r) => (r.first_name = names.get(r.sitter_id) ?? null));
      }
      if (!cancelled) setRows(list);
    })();
    return () => {
      cancelled = true;
    };
  }, [sitId]);

  if (rows.length === 0) return null;

  return (
    <section aria-labelledby="propositions-envoyees" className="mt-6 rounded-2xl border border-border bg-card p-5" data-sent-proposals>
      <h2 id="propositions-envoyees" className="text-lg font-semibold text-foreground">
        Propositions envoyées
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {isDraft
          ? "Cette garde n'est visible que par les gardiens à qui vous l'avez proposée."
          : "Ces gardiens ont reçu votre garde en proposition personnelle."}
      </p>
      <ul className="mt-3 divide-y divide-border">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
            <span className="text-[15px] font-medium text-foreground">{r.first_name || "Gardien"}</span>
            <span className="text-sm text-muted-foreground">{sentProposalStateLabel(r)}</span>
            <Link to={`/propositions/${r.id}`} className="text-sm font-semibold text-primary">
              Voir la proposition
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default SentProposalsBlock;
