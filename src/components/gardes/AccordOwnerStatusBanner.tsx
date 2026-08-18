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
}

interface AccordStatusRow {
  owner_signed: boolean;
  sitter_signed: boolean;
  owner_declined: boolean;
  sitter_declined: boolean;
}

export function AccordOwnerStatusBanner({ sitId, sitStatus, onSignAccord }: AccordOwnerStatusBannerProps) {
  const [status, setStatus] = useState<AccordStatusRow | null>(null);

  useEffect(() => {
    if (!["confirmed", "in_progress", "completed"].includes(sitStatus)) return;
    let cancelled = false;
    supabase
      .rpc("get_garde_accord_status", { p_garde_id: sitId })
      .then(({ data }) => {
        if (cancelled) return;
        const row = Array.isArray(data) ? data[0] : null;
        if (!row) {
          setStatus({ owner_signed: false, sitter_signed: false, owner_declined: false, sitter_declined: false });
          return;
        }
        setStatus({
          owner_signed: !!row.owner_signed,
          sitter_signed: !!row.sitter_signed,
          owner_declined: !!row.owner_declined,
          sitter_declined: !!row.sitter_declined,
        });
      });
    return () => { cancelled = true; };
  }, [sitId, sitStatus]);

  if (!status) return null;

  const description = "Ce document résume les dates, ce que chacun s'engage à faire, et les contacts utiles pour cette garde.";

  if (!status.owner_signed && !status.owner_declined) {
    return (
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-2">
        <p className="font-medium text-sm">Un accord de garde est disponible pour cette réservation.</p>
        <p className="text-sm text-muted-foreground">{description}</p>
        <p className="text-sm text-muted-foreground">
          Il vous reste à le signer : cela verrouille les dates de la garde et rassure votre gardien.
        </p>
        {onSignAccord && (
          <Button size="sm" className="mt-2" onClick={onSignAccord}>
            Signer l'accord de garde
          </Button>
        )}
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
          Vous avez signé l'accord de garde. Nous relançons votre gardien pour qu'il le signe à son tour.
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
