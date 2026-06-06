/**
 * Récapitulatif post-publication.
 * S'ouvre automatiquement dès que l'annonce passe à `published` et indique
 * de manière claire quels gardiens vont être atteints :
 *  - Vos favoris (gardiens sauvegardés)
 *  - Les gardiens du département (déduit du code postal du propriétaire)
 *  - Le total potentiel (gardiens actifs en France)
 *
 * Deux CTA permettent de lancer immédiatement les invitations sans devoir
 * scroller ou changer d'onglet :
 *  - « Inviter mes favoris » → ouvre l'onglet favoris
 *  - « Cibler le département » → pré-sélectionne le département dans la
 *    recherche et ouvre l'onglet correspondant
 */
import { useEffect, useState } from "react";
import { Heart, MapPin, Users, Send, ArrowRight, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { DEPT_NAMES } from "@/lib/departments";

interface PostPublishRecapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ownerId: string;
  ownerPostalCode: string | null;
  /** Déclenche la sélection de l'onglet « favoris » dans le bloc parent. */
  onInviteFavorites: () => void;
  /** Déclenche le pré-réglage département + ouverture de l'onglet recherche. */
  onTargetDepartment: (deptCode: string) => void;
}

const getDeptCodeFromPostal = (postal: string | null): string | null => {
  if (!postal || postal.length < 2) return null;
  // Codes spéciaux : Corse 2A/2B, DOM-TOM 97x/98x
  const p2 = postal.slice(0, 2);
  if (postal.startsWith("20")) {
    // Approximation : 200xx & 201xx → 2A, 202xx-206xx → 2B (heuristique simple)
    const num = parseInt(postal.slice(0, 5), 10);
    if (!isNaN(num)) {
      return num >= 20200 ? "2B" : "2A";
    }
    return "2A";
  }
  if (postal.startsWith("97") || postal.startsWith("98")) {
    return postal.slice(0, 3);
  }
  return p2;
};

const PostPublishRecapDialog = ({
  open,
  onOpenChange,
  ownerId,
  ownerPostalCode,
  onInviteFavorites,
  onTargetDepartment,
}: PostPublishRecapDialogProps) => {
  const [loading, setLoading] = useState(true);
  const [favCount, setFavCount] = useState(0);
  const [deptCount, setDeptCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const deptCode = getDeptCodeFromPostal(ownerPostalCode);
  const deptName = deptCode ? DEPT_NAMES[deptCode] : null;

  useEffect(() => {
    if (!open) return;
    let cancel = false;
    setLoading(true);
    (async () => {
      // 1) Favoris (target_type='sitter')
      const favRes = await supabase
        .from("favorites")
        .select("target_id", { count: "exact", head: false })
        .eq("user_id", ownerId)
        .eq("target_type", "sitter");

      // 2) Total gardiens actifs en France
      const totalRes = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "sitter")
        .neq("id", ownerId);

      // 3) Département : préfixe code postal
      let deptRes: { count: number | null } = { count: 0 };
      if (deptCode) {
        const r = await supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("role", "sitter")
          .neq("id", ownerId)
          .like("postal_code", `${deptCode}%`);
        deptRes = { count: r.count ?? 0 };
      }

      if (cancel) return;
      setFavCount(favRes.data?.length ?? 0);
      setTotalCount(totalRes.count ?? 0);
      setDeptCount(deptRes.count ?? 0);
      setLoading(false);
    })();
    return () => {
      cancel = true;
    };
  }, [open, ownerId, deptCode]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="h-5 w-5 text-success" />
            <Badge className="text-[11px] bg-success/10 text-success border-success/30" variant="outline">
              Annonce publiée
            </Badge>
          </div>
          <DialogTitle className="text-xl">Votre annonce est en ligne</DialogTitle>
          <DialogDescription>
            Voici les gardiens que vous pouvez contacter dès maintenant. Le bouche-à-oreille démarre toujours mieux quand vous proposez vous-même votre annonce.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <RecapRow
            icon={Heart}
            label="Vos gardiens favoris"
            value={loading ? "…" : favCount.toString()}
            hint={
              favCount === 0
                ? "Aucun favori, sauvegardez les profils qui vous plaisent en parcourant la recherche."
                : "Profils que vous avez sauvegardés."
            }
          />
          <RecapRow
            icon={MapPin}
            label={deptName ? `Dans votre département (${deptCode}, ${deptName})` : "Dans votre département"}
            value={loading ? "…" : deptCount.toString()}
            hint={
              !deptCode
                ? "Renseignez votre code postal pour cibler les gardiens de votre département."
                : deptCount === 0
                  ? "Aucun gardien recensé pour l'instant. Élargissez la zone."
                  : "Gardiens du coin, pertinents pour une rencontre rapide."
            }
          />
          <RecapRow
            icon={Users}
            label="Réseau total en France"
            value={loading ? "…" : totalCount.toString()}
            hint="Tous les gardiens actifs accessibles via la recherche avancée."
          />
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="sm:order-1 order-3"
          >
            Plus tard
          </Button>
          {deptCode && deptCount > 0 && (
            <Button
              variant="outline"
              onClick={() => {
                onTargetDepartment(deptCode);
                onOpenChange(false);
              }}
              className="gap-1.5 order-2"
            >
              <MapPin className="h-3.5 w-3.5" />
              Cibler le {deptCode}
            </Button>
          )}
          <Button
            onClick={() => {
              onInviteFavorites();
              onOpenChange(false);
            }}
            className="gap-1.5 order-1 sm:order-3"
            disabled={favCount === 0 && deptCount === 0}
          >
            <Send className="h-3.5 w-3.5" />
            {favCount > 0 ? "Inviter mes favoris" : "Lancer les invitations"}
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const RecapRow = ({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint: string;
}) => (
  <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-3">
    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
      <Icon className="h-4 w-4 text-primary" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">{label}</p>
        <span className="text-base font-heading font-semibold text-primary tabular-nums">{value}</span>
      </div>
      <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>
    </div>
  </div>
);

export default PostPublishRecapDialog;
