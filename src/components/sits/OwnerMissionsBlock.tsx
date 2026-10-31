import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { HandHeart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export interface OwnerMissionRow {
  id: string;
  slug: string | null;
  title: string;
  status: string;
}

/** Adresse de la fiche d'une demande d'entraide (slug quand il existe, sinon identifiant). */
export const missionHref = (m: Pick<OwnerMissionRow, "id" | "slug">) => `/petites-missions/${m.slug || m.id}`;

const STATUS_LABEL: Record<string, string> = {
  open: "En ligne",
  in_progress: "En cours",
};

/**
 * Lot UX-V1 : les demandes d'entraide de l'utilisateur, retrouvables depuis
 * « Mes annonces ». Le bloc reste invisible tant qu'aucune demande n'est en ligne.
 */
export const OwnerMissionsBlock = ({ userId }: { userId: string | undefined }) => {
  const { data } = useQuery({
    queryKey: ["owner_open_missions", userId],
    enabled: Boolean(userId),
    staleTime: 60_000,
    queryFn: async (): Promise<OwnerMissionRow[]> => {
      const { data: rows, error } = await supabase
        .from("small_missions")
        .select("id, slug, title, status")
        .eq("user_id", userId!)
        .in("status", ["open", "in_progress"])
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return (rows ?? []) as OwnerMissionRow[];
    },
  });

  if (!data || data.length === 0) return null;

  return (
    <section aria-labelledby="owner-missions-title" className="mb-6 rounded-card border border-border bg-card p-4" data-testid="owner-missions-block">
      <h2 id="owner-missions-title" className="flex items-center gap-2 font-heading text-base font-semibold text-foreground">
        <HandHeart className="h-4 w-4 text-primary" aria-hidden="true" />
        Mes demandes d'entraide
      </h2>
      <ul className="mt-3 divide-y divide-border">
        {data.map((m) => (
          <li key={m.id}>
            <Link to={missionHref(m)} className="flex items-center justify-between gap-3 py-2 text-sm hover:text-primary transition-colors">
              <span className="min-w-0 truncate font-medium">{m.title}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{STATUS_LABEL[m.status] ?? m.status}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default OwnerMissionsBlock;
