import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { hasOwnerResponsePending, OWNER_RESPONSE_PENDING_LABEL, showsOwnerResponsePending } from "@/lib/ownerResponsePending";

interface Props {
  sitId: string;
  /** Statut de la candidature du membre connecté sur cette annonce. */
  applicationStatus: string | null | undefined;
  className?: string;
}

/**
 * Lot REL1 : mention lue par le seul candidat, sous « Candidature envoyée ».
 * Un gardien sans candidature en attente sur l'annonce ne lit rien.
 */
export default function OwnerResponsePendingNote({ sitId, applicationStatus, className = "" }: Props) {
  const open = applicationStatus === "pending" || applicationStatus === "viewed";
  const [marked, setMarked] = useState(false);

  useEffect(() => {
    let alive = true;
    setMarked(false);
    if (!open || !sitId) return;
    hasOwnerResponsePending(sitId).then((value) => { if (alive) setMarked(value); });
    return () => { alive = false; };
  }, [sitId, open]);

  if (!showsOwnerResponsePending(applicationStatus, marked)) return null;
  return (
    <p
      data-testid="owner-response-pending"
      className={`inline-flex items-center gap-1.5 text-sm text-muted-foreground ${className}`}
    >
      <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
      {OWNER_RESPONSE_PENDING_LABEL}
    </p>
  );
}
