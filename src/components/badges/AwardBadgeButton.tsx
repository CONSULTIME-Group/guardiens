/**
 * Bouton "Attribuer un écusson" affiché sur la fiche d'une garde terminée.
 *
 * Permet d'ajouter des écussons après coup (indépendamment de l'avis), tant que
 * la garde est `completed`. Les écussons déjà attribués pour ce trio
 * (giver, reviewee, sit) sont pré-cochés et désactivés (RLS = INSERT only).
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { BadgeSelector } from "@/components/badges/BadgeSelector";
import { buildBadgeAttributionRows } from "@/lib/buildBadgeAttributionRows";

interface AwardBadgeButtonProps {
  sitId: string;
  sitOwnerId: string;
  currentUserId: string;
}

const AwardBadgeButton = ({ sitId, sitOwnerId, currentUserId }: AwardBadgeButtonProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [revieweeId, setRevieweeId] = useState<string | null>(null);
  const [existingBadges, setExistingBadges] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);

  const isOwner = currentUserId === sitOwnerId;
  const target: "gardien" | "proprio" = isOwner ? "gardien" : "proprio";

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);

      // Identifier la personne à récompenser
      let other: string | null = null;
      if (isOwner) {
        const { data } = await supabase
          .from("applications")
          .select("sitter_id")
          .eq("sit_id", sitId)
          .eq("status", "accepted")
          .limit(1);
        other = data?.[0]?.sitter_id ?? null;
      } else {
        other = sitOwnerId;
      }

      if (!other) {
        if (!cancelled) {
          setLoading(false);
          toast({
            variant: "destructive",
            title: "Impossible d'attribuer",
            description: "Aucun destinataire trouvé pour cette garde.",
          });
          setOpen(false);
        }
        return;
      }

      // Charger les écussons déjà attribués par moi pour ce sit/destinataire
      const { data: prior } = await supabase
        .from("badge_attributions")
        .select("badge_id")
        .eq("sit_id", sitId)
        .eq("giver_id", currentUserId)
        .eq("user_id", other);

      if (cancelled) return;
      const priorIds = (prior || []).map((r: any) => r.badge_id);
      setRevieweeId(other);
      setExistingBadges(priorIds);
      setSelected(priorIds);
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [open, sitId, sitOwnerId, currentUserId, isOwner, toast]);

  const newBadges = selected.filter((id) => !existingBadges.includes(id));

  const handleSubmit = async () => {
    if (!revieweeId || newBadges.length === 0) return;
    setSubmitting(true);
    const rows = buildBadgeAttributionRows({
      selectedBadges: newBadges,
      revieweeId,
      reviewerId: currentUserId,
      sitId,
    });
    const { error } = await supabase.from("badge_attributions").insert(rows);
    setSubmitting(false);
    if (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible d'attribuer les écussons.",
      });
      return;
    }
    toast({
      title: "Écussons attribués",
      description:
        newBadges.length === 1
          ? "Votre écusson a bien été enregistré."
          : `${newBadges.length} écussons enregistrés.`,
    });
    setExistingBadges([...existingBadges, ...newBadges]);
    setOpen(false);
  };

  return (
    <>
      <Button variant="outline" className="w-full mt-2" onClick={() => setOpen(true)}>
        Attribuer un écusson
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg">Attribuer un écusson</DialogTitle>
            <DialogDescription>
              Mettez en valeur ce qui a particulièrement marqué cette garde. Les
              écussons déjà attribués restent visibles et ne peuvent pas être
              retirés.
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Chargement…</p>
          ) : (
            <div className="py-2">
              <BadgeSelector
                target={target}
                selected={selected}
                onChange={(next) => {
                  // empêcher la désélection d'un écusson déjà attribué
                  const preserved = existingBadges.filter((id) => !next.includes(id));
                  setSelected([...next, ...preserved]);
                }}
                max={3}
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={submitting}>
              Fermer
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || submitting || newBadges.length === 0}
            >
              {submitting
                ? "Envoi…"
                : newBadges.length === 0
                ? "Aucun nouvel écusson"
                : `Attribuer ${newBadges.length} écusson${newBadges.length > 1 ? "s" : ""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AwardBadgeButton;
