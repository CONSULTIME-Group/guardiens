import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { trackEvent } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, CheckCircle2 } from "lucide-react";

interface Props {
  sitId: string;
  sitStatus: string;
  onSignAccord?: () => void;
}

type AccordState = "owner_pending" | "gardien_pending" | "both_signed" | null;

/**
 * Bandeau contextuel post-acceptation :
 * - Owner a accepté mais pas signé l'accord → warning + CTA
 * - Owner a signé, en attente gardien → info
 * - Les deux ont signé → succès
 * N'affiche rien si sit_status != confirmed.
 */
export default function AccordOwnerStatusBanner({ sitId, sitStatus, onSignAccord }: Props) {
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
      const { data } = await supabase
        .from("garde_accords")
        .select("role, accepted")
        .eq("garde_id", sitId)
        .eq("accepted", true);
      if (cancelled) return;
      const roles = new Set((data ?? []).map((r: any) => r.role));
      let next: AccordState;
      if (roles.has("proprio") && roles.has("gardien")) next = "both_signed";
      else if (roles.has("proprio")) next = "gardien_pending";
      else next = "owner_pending";
      setState(next);
      setLoading(false);
      trackEvent("sit_owner_state_viewed", { metadata: { sit_id: sitId, state: next } });
    })();
    return () => { cancelled = true; };
  }, [sitId, sitStatus, user]);

  if (sitStatus !== "confirmed" || loading || !state) return null;

  if (state === "owner_pending") {
    return (
      <div className="mb-6 rounded-2xl border border-warning/40 bg-warning/10 p-4 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">Il vous reste à signer l'accord de garde.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Vous avez accepté une candidature. Signer l'accord verrouille la réservation et rassure votre gardien.
          </p>
          {onSignAccord && (
            <Button size="sm" className="mt-3" onClick={onSignAccord}>
              Signer l'accord de garde
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
            Vous avez signé l'accord de garde. Nous relançons votre gardien pour qu'il le signe à son tour.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-2xl border border-success/40 bg-success/10 p-4 flex items-start gap-3">
      <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">Garde confirmée, accord signé des deux côtés.</p>
        <p className="text-sm text-muted-foreground mt-1">
          Vous pouvez retrouver l'accord dans votre espace à tout moment.
        </p>
      </div>
    </div>
  );
}
