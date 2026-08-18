import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { trackEvent } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, CheckCircle2, PenLine } from "lucide-react";

interface Props {
  sitId: string;
  sitStatus: string;
  onSignAccord?: () => void;
  /** Incrémenté par le parent pour forcer une relecture après signature ou refus. */
  refreshKey?: number;
}

type AccordState =
  | "owner_pending"
  | "owner_declined"
  | "gardien_pending"
  | "gardien_declined"
  | "both_signed"
  | null;

/**
 * Bandeau contextuel post-acceptation, côté propriétaire :
 * - ni signature ni refus du propriétaire → warning + CTA signer
 * - refus explicite du propriétaire → rappel + possibilité de changer d'avis
 * - propriétaire signé, gardien en attente → info
 * - propriétaire signé, refus explicite du gardien → warning distinct
 * - les deux ont signé → succès
 * N'affiche rien si sit_status != confirmed.
 */
export default function AccordOwnerStatusBanner({ sitId, sitStatus, onSignAccord, refreshKey = 0 }: Props) {
  const { user } = useAuth();
  const [state, setState] = useState<AccordState>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sitStatus !== "confirmed" || !user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc("get_garde_accord_status" as any, { p_garde_id: sitId });
      if (cancelled) return;
      if (error || !data) {
        setLoading(false);
        return;
      }
      const d = data as any;
      const proprio = d?.proprio ?? null;
      const gardien = d?.gardien ?? null;
      let next: AccordState;
      if (proprio?.accepted && gardien?.accepted) next = "both_signed";
      else if (proprio?.accepted && gardien?.declined) next = "gardien_declined";
      else if (proprio?.accepted) next = "gardien_pending";
      else if (proprio?.declined) next = "owner_declined";
      else next = "owner_pending";
      setState(next);
      setLoading(false);
      trackEvent("sit_owner_state_viewed", { metadata: { sit_id: sitId, state: next } });
    })();
    return () => { cancelled = true; };
  }, [sitId, sitStatus, user, refreshKey]);

  if (sitStatus !== "confirmed" || loading || !state) return null;

  if (state === "owner_pending") {
    return (
      <div className="mb-6 rounded-2xl border border-warning/40 bg-warning/10 p-4 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">Il vous reste à signer le commodat.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Vous avez accepté une candidature. Signer le commodat verrouille les dates de la garde et rassure votre gardien.
          </p>
          {onSignAccord && (
            <Button size="sm" className="mt-3" onClick={onSignAccord}>
              Signer le commodat
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (state === "owner_declined") {
    return (
      <div className="mb-6 rounded-2xl border border-warning/40 bg-warning/10 p-4 flex items-start gap-3">
        <PenLine className="h-5 w-5 text-warning shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">Vous avez choisi de ne pas signer le commodat.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Ce choix est visible de votre gardien. Vous pouvez changer d'avis à tout moment : le commodat reste disponible.
          </p>
          {onSignAccord && (
            <Button size="sm" className="mt-3" onClick={onSignAccord}>
              Relire et signer le commodat
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (state === "gardien_pending") {
    return (
      <div className="mb-6 rounded-2xl border border-info/40 bg-info/10 p-4 flex items-start gap-3">
        <Clock className="h-5 w-5 text-info shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">En attente de signature du gardien.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Vous avez signé le commodat. Nous relançons votre gardien pour qu'il le signe à son tour.
          </p>
        </div>
      </div>
    );
  }

  if (state === "gardien_declined") {
    return (
      <div className="mb-6 rounded-2xl border border-warning/40 bg-warning/10 p-4 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">Votre gardien a choisi de ne pas signer le commodat.</p>
          <p className="text-sm text-muted-foreground mt-1">
            C'est un choix explicite, pas un simple oubli. La garde reste confirmée ; un message pour en parler ensemble est souvent la meilleure suite.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-2xl border border-success/40 bg-success/10 p-4 flex items-start gap-3">
      <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">Garde confirmée, commodat signé des deux côtés.</p>
        <p className="text-sm text-muted-foreground mt-1">
          Vous pouvez retrouver le commodat dans votre espace à tout moment.
        </p>
      </div>
    </div>
  );
}
