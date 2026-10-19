/**
 * Lot P2 : badge « Propriétaire absent depuis X jours » (last_seen_at de plus
 * de 14 jours). Rien n'est rendu quand le propriétaire est présent.
 */
import { useQuery } from "@tanstack/react-query";
import { Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { ownerAbsentDays, ownerAbsenceLabel } from "@/lib/admin/ownerAbsence";

interface BadgeProps {
  lastSeenAt: string | null | undefined;
  now?: number;
  className?: string;
}

export const OwnerAbsenceBadge = ({ lastSeenAt, now, className }: BadgeProps) => {
  const days = ownerAbsentDays(lastSeenAt, now);
  if (days === null) return null;
  const label = ownerAbsenceLabel(days);
  return (
    <span
      data-testid="owner-absence-badge"
      title={`Dernière visite le ${new Date(lastSeenAt as string).toLocaleDateString("fr-FR")}`}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-warning/40 bg-warning/10 px-2 py-0.5 text-[11px] font-medium text-foreground",
        className,
      )}
    >
      <Clock className="h-3 w-3" aria-hidden="true" />
      {label}
    </span>
  );
};

/**
 * Lecture de la dernière visite du propriétaire d'une annonce, pour les
 * surfaces de diffusion (une requête, mise en cache 5 minutes).
 */
export function useSitOwnerLastSeen(sitId: string | null | undefined) {
  return useQuery({
    queryKey: ["admin-sit-owner-last-seen", sitId],
    enabled: !!sitId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sits")
        .select("user_id, owner:profiles!sits_user_id_fkey(last_seen_at)")
        .eq("id", sitId as string)
        .maybeSingle();
      if (error) throw error;
      const owner = (data as { owner?: { last_seen_at?: string | null } | null } | null)?.owner;
      return owner?.last_seen_at ?? null;
    },
  });
}

/** Indication pour les surfaces de diffusion, lue à partir de l'annonce. */
export const SitOwnerAbsenceNotice = ({ sitId }: { sitId: string | null | undefined }) => {
  const { data } = useSitOwnerLastSeen(sitId);
  const days = ownerAbsentDays(data);
  if (days === null) return null;
  return (
    <div
      data-testid="owner-absence-notice"
      className="rounded-lg border border-warning/40 bg-warning/5 px-3 py-2 text-xs text-foreground space-y-1"
    >
      <OwnerAbsenceBadge lastSeenAt={data} />
      <p className="text-muted-foreground">
        Diffusez quand le propriétaire est présent : les candidatures reçues attendent sa réponse.
      </p>
    </div>
  );
};
