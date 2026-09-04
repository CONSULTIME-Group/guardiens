/**
 * Badge public de réactivité, affiché sous le nom sur le profil public,
 * dans la même famille visuelle que les indicateurs de confiance.
 *
 * Contrat produit, non négociable :
 *  - Aucun pourcentage, aucun délai chiffré, aucune formulation négative.
 *  - Le badge apparaît ou n'apparaît pas, il n'est jamais une pénalité.
 *  - La vue publique `public_responsiveness` filtre déjà les seuils
 *    (5 contacts minimum sur 90 jours, taux de réponse >= 70 pourcent,
 *    médiane inférieure à 72 h). Le front n'affiche que le palier reçu.
 *
 * À ne pas confondre avec l'écusson "Toujours joignable", qui reste un
 * écusson subjectif attribué après une garde.
 */
import { useQuery } from "@tanstack/react-query";
import { Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export type ResponsivenessTier =
  | "under_1h"
  | "few_hours"
  | "under_1d"
  | "two_three_days";

export const RESPONSIVENESS_LABELS: Record<ResponsivenessTier, string> = {
  under_1h: "Répond généralement en moins d'une heure",
  few_hours: "Répond généralement en quelques heures",
  under_1d: "Répond généralement en moins d'une journée",
  two_three_days: "Répond généralement en 2 à 3 jours",
};

export const responsivenessLabel = (tier: string | null | undefined): string | null =>
  tier && tier in RESPONSIVENESS_LABELS
    ? RESPONSIVENESS_LABELS[tier as ResponsivenessTier]
    : null;

export function useResponsiveness(userId: string | undefined) {
  return useQuery({
    queryKey: ["public_responsiveness", userId],
    enabled: !!userId,
    staleTime: 30 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("public_responsiveness")
        .select("tier")
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return (data?.tier as string | null) ?? null;
    },
  });
}

interface Props {
  userId?: string;
  /** Palier déjà connu, évite une requête. */
  tier?: string | null;
  className?: string;
}

const ResponsivenessBadge = ({ userId, tier, className = "" }: Props) => {
  const { data } = useResponsiveness(tier === undefined ? userId : undefined);
  const label = responsivenessLabel(tier === undefined ? data : tier);
  if (!label) return null;

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-2.5 py-1 bg-success-soft text-success border border-success-border ${className}`}
    >
      <Clock className="w-3 h-3 shrink-0" aria-hidden="true" />
      {label}
    </span>
  );
};

export default ResponsivenessBadge;
