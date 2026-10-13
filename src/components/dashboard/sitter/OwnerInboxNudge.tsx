/**
 * Lot X3a (13/10/2026), constat A-07 : un compte double rôle en espace
 * gardien ne voyait ses candidatures reçues que par la cloche ou l'email.
 * Ce repère les annonce et mène à l'annonce concernée, dans l'espace
 * propriétaire. Compte partagé avec la navigation (useNavBadgeCounts, même
 * cache) : aucune lecture de plus.
 */
import { Link } from "react-router-dom";
import { Inbox } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavBadgeCounts } from "@/hooks/useNavBadgeCounts";

export function ownerInboxNudgeText(count: number): string {
  return count > 1
    ? `${count} candidatures attendent votre réponse sur vos annonces.`
    : "Une candidature attend votre réponse sur votre annonce.";
}

export function ownerInboxNudgeLink(sitId: string | null | undefined): string {
  return sitId ? `/sits/${sitId}#candidatures` : "/sits";
}

const OwnerInboxNudge = () => {
  const { user, switchRole } = useAuth();
  const isBoth = (user as { role?: string } | null)?.role === "both";
  const { ownerInboxCount, ownerInboxSitId } = useNavBadgeCounts(isBoth ? user?.id : undefined);
  if (!isBoth || !ownerInboxCount || ownerInboxCount <= 0) return null;
  return (
    <aside
      data-testid="owner-inbox-nudge"
      aria-label="Candidatures reçues sur vos annonces"
      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3"
    >
      <p className="flex items-center gap-2 text-sm text-foreground">
        <Inbox className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
        {ownerInboxNudgeText(ownerInboxCount)}
      </p>
      <Link
        to={ownerInboxNudgeLink(ownerInboxSitId)}
        onClick={() => switchRole("owner")}
        className="text-sm font-semibold text-primary hover:underline underline-offset-4"
      >
        Voir dans l'espace propriétaire
      </Link>
    </aside>
  );
};

export default OwnerInboxNudge;
