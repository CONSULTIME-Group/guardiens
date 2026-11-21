/**
 * AccordOwnerStatusBanner.tsx
 *
 * Bandeau de statut de l'accord de garde côté propriétaire.
 * Cas gérés :
 *   owner_pending    : accord disponible, pas encore signé par le propriétaire
 *   owner_declined   : refus explicite du propriétaire (tracé en base)
 *   gardien_pending  : propriétaire signé, en attente du gardien
 *   gardien_declined : refus explicite du gardien (visible du propriétaire)
 *   both_signed      : signatures complètes
 * Ne s'affiche que pour les gardes confirmées (confirmed / in_progress / completed).
 *
 * La signature du propriétaire repasse par la modale AccordDeGarde, ouverte
 * par le parent via la prop onSignAccord.
 */
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface AccordOwnerStatusBannerProps {
  sitId: string;
  sitStatus: string;
  onSignAccord?: () => void;
  /** Incrémenté par le parent après signature ou refus pour forcer le rechargement. */
  refreshKey?: number;
}

interface AccordStatusRow {
  owner_signed: boolean;
  sitter_signed: boolean;
  owner_declined: boolean;
  sitter_declined: boolean;
}

export function AccordOwnerStatusBanner({ sitId, sitStatus, onSignAccord, refreshKey }: AccordOwnerStatusBannerProps) {
  const [status, setStatus] = useState<AccordStatusRow | null>(null);
  // Lot ACC1 : « Plus tard » replie le bandeau pour cette visite, sans rien enregistrer.
  const [later, setLater] = useState(false);

  useEffect(() => {
    if (!["confirmed", "in_progress", "completed"].includes(sitStatus)) return;
    let cancelled = false;
    supabase
      .rpc("get_garde_accord_status", { p_garde_id: sitId })
      .then(({ data }) => {
        if (cancelled) return;
        // Le RPC renvoie un objet jsonb unique : { proprio, gardien, document }.
        // Même convention que la vue gardien : un refus suivi d'une signature
        // compte comme signé (accepted prime sur declined).
        const d = (data ?? null) as {
          proprio?: { accepted?: boolean; declined?: boolean } | null;
          gardien?: { accepted?: boolean; declined?: boolean } | null;
        } | null;
        const proprio = d?.proprio ?? null;
        const gardien = d?.gardien ?? null;
        setStatus({
          owner_signed: !!proprio?.accepted,
          sitter_signed: !!gardien?.accepted,
          owner_declined: !!proprio?.declined && !proprio?.accepted,
          sitter_declined: !!gardien?.declined && !gardien?.accepted,
        });
      });
    return () => { cancelled = true; };
  }, [sitId, sitStatus, refreshKey]);

  if (!status) return null;

  const description = "Ce document résume les dates, ce que chacun s'engage à faire, et les contacts utiles pour cette garde.";

  if (!status.owner_signed && !status.owner_declined) {
    if (later) return null;
    // Lot ACC1 (21/11/2026) : l'accord se présente comme facultatif et gratuit.
    return (
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-2" data-testid="accord-owner-pending">
        <p className="font-medium text-sm">Un accord de garde, si vous le souhaitez</p>
        <p className="text-sm text-muted-foreground">
          Facultatif. Il met par écrit les dates, ce que chacun prévoit et les contacts utiles.
        </p>
        <p className="text-sm font-medium text-pastel-sage-ink">
          Guardiens est gratuit, pour vous comme pour votre gardien.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          {onSignAccord && (
            <Button size="sm" className="min-h-11 rounded-full px-5" onClick={onSignAccord}>
              Lire l'accord
            </Button>
          )}
          <Button size="sm" variant="outline" className="min-h-11 rounded-full px-5" onClick={() => setLater(true)}>
            Plus tard
          </Button>
        </div>
      </div>
    );
  }

  if (status.owner_declined) {
    return (
      <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-2">
        <p className="font-medium text-sm">Vous avez choisi de ne pas signer l'accord de garde.</p>
        <p className="text-sm text-muted-foreground">{description}</p>
        <p className="text-sm text-muted-foreground">
          Ce choix est visible de votre gardien. Vous pouvez changer d'avis à tout moment : l'accord reste disponible.
        </p>
        {onSignAccord && (
          <Button size="sm" variant="outline" className="mt-2" onClick={onSignAccord}>
            Relire et signer l'accord
          </Button>
        )}
      </div>
    );
  }

  if (status.sitter_declined) {
    return (
      <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-2">
        <p className="font-medium text-sm">Votre gardien a choisi de ne pas signer l'accord de garde.</p>
        <p className="text-sm text-muted-foreground">{description}</p>
        <p className="text-sm text-muted-foreground">
          C'est un choix explicite, pas un simple oubli. La garde reste confirmée ; un message pour en parler ensemble est souvent la meilleure suite.
        </p>
      </div>
    );
  }

  if (!status.sitter_signed) {
    return (
      <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-2">
        <p className="font-medium text-sm">En attente de signature du gardien.</p>
        <p className="text-sm text-muted-foreground">{description}</p>
        <p className="text-sm text-muted-foreground">
          Vous avez signé l'accord de garde. Votre gardien en a été prévenu et peut le signer à son tour depuis la page de la garde.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-success/30 bg-success/5 p-4 space-y-2">
      <p className="font-medium text-sm text-success">Garde confirmée, accord signé des deux côtés.</p>
      <p className="text-sm text-muted-foreground">
        Vous pouvez retrouver l'accord dans votre espace à tout moment.
      </p>
    </div>
  );
}

export default AccordOwnerStatusBanner;
