/**
 * ListingProximityCard — envoi ciblé d'une annonce de garde aux gardiens
 * de proximité.
 *
 * Flux : preview (compte + liste) → confirmation explicite (saisie du nombre
 * exact) → send. Aucun envoi tant que l'admin ne clique pas sur Envoyer.
 */
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Search, Send, AlertTriangle } from "lucide-react";

interface PreviewRecipient {
  first_name: string;
  city: string;
  distance_km: number;
  email: string;
}
interface PreviewData {
  count: number;
  author_first_name: string;
  sit: {
    id: string;
    title: string | null;
    city: string | null;
    excerpt?: string;
    date_range?: string;
  };
  subject?: string;
  recipients: PreviewRecipient[];
  truncated: boolean;
}

interface ListingProximityCardProps {
  sitId: string;
  initialRadiusKm?: number;
  autoPreview?: boolean;
  hideHeader?: boolean;
}

const ListingProximityCard = ({
  sitId,
  initialRadiusKm = 30,
  autoPreview = false,
  hideHeader = false,
}: ListingProximityCardProps) => {
  const [radiusKm, setRadiusKm] = useState<number>(initialRadiusKm);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");

  const handlePreview = async () => {
    if (!sitId) {
      toast.error("sit_id manquant");
      return;
    }
    setLoading(true);
    setPreview(null);
    try {
      const { data, error } = await supabase.functions.invoke(
        "send-listing-proximity",
        {
          body: { mode: "preview", sit_id: sitId, radius_km: radiusKm },
        },
      );
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setPreview(data as PreviewData);
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'aperçu");
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!preview) return;
    setConfirmOpen(false);
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "send-listing-proximity",
        {
          body: { mode: "send", sit_id: sitId, radius_km: radiusKm },
        },
      );
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success(
        `Envoi terminé, ${(data as any).sent} email(s) expédié(s)${
          (data as any).errors ? `, ${(data as any).errors} erreur(s)` : ""
        }.`,
      );
      setPreview(null);
      setConfirmInput("");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'envoi");
    } finally {
      setSending(false);
    }
  };

  const autoPreviewRef = useRef(false);
  useEffect(() => {
    if (!autoPreview || autoPreviewRef.current) return;
    if (!sitId) return;
    autoPreviewRef.current = true;
    void handlePreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPreview]);

  const subject = preview?.subject
    ?? (preview
      ? `${preview.author_first_name || "Un propriétaire"} cherche un gardien près de chez vous`
      : "");

  return (
    <Card className="border-primary/30">
      {!hideHeader && (
        <CardHeader>
          <CardTitle className="text-base">
            Envoyer l'annonce aux gardiens du coin
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Cible les gardiens (role sitter/both) dans un rayon autour de l'annonce, exclut le propriétaire,
            les emails supprimés et les opt-out. Aucun envoi tant que vous ne cliquez pas sur Envoyer.
          </p>
        </CardHeader>
      )}
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-[140px,auto] gap-3 items-end">
          <div className="space-y-1.5">
            <Label htmlFor="listing-prox-radius">Rayon (km)</Label>
            <Input
              id="listing-prox-radius"
              type="number"
              min={1}
              max={500}
              value={radiusKm}
              onChange={(e) => setRadiusKm(Math.max(1, Math.min(500, Number(e.target.value) || 30)))}
            />
          </div>
          <Button onClick={handlePreview} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Calcul,
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Prévisualiser
              </>
            )}
          </Button>
        </div>

        {preview && (
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 text-sm">
              <span>
                Annonce : <strong>{preview.sit.title || "(sans titre)"}</strong>
              </span>
              {preview.sit.city && (
                <span className="text-muted-foreground">Ville : {preview.sit.city}</span>
              )}
              <span className="text-muted-foreground">
                Propriétaire : {preview.author_first_name || "(inconnu)"}
              </span>
              <span>
                Gardiens ciblés : <strong className="text-base">{preview.count}</strong>
              </span>
            </div>

            {preview.sit.date_range && (
              <div className="rounded border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
                Dates : {preview.sit.date_range}
              </div>
            )}

            {preview.sit.excerpt && (
              <div className="rounded border border-border bg-muted/20 p-3 text-xs italic text-muted-foreground">
                {preview.sit.excerpt}
              </div>
            )}

            <div className="rounded border border-border bg-muted/30 p-3 text-xs">
              <div className="font-semibold mb-1">Objet</div>
              <div>{subject}</div>
            </div>

            {preview.count === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun gardien dans ce rayon.
              </p>
            ) : (
              <>
                <div className="max-h-[380px] overflow-y-auto border border-border rounded">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background">
                      <TableRow>
                        <TableHead>Prénom</TableHead>
                        <TableHead>Ville</TableHead>
                        <TableHead className="text-right">Distance</TableHead>
                        <TableHead>Email</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.recipients.map((r) => (
                        <TableRow key={r.email}>
                          <TableCell className="text-xs">{r.first_name || "(sans prénom)"}</TableCell>
                          <TableCell className="text-xs">{r.city || ","}</TableCell>
                          <TableCell className="text-xs text-right">{r.distance_km} km</TableCell>
                          <TableCell className="text-xs font-mono">{r.email}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {preview.truncated && (
                  <p className="text-xs text-muted-foreground">
                    Liste tronquée pour l'affichage. L'envoi couvrira l'intégralité des {preview.count} destinataires.
                  </p>
                )}
                <div className="flex justify-end">
                  <Button
                    onClick={() => {
                      setConfirmInput("");
                      setConfirmOpen(true);
                    }}
                    disabled={sending || preview.count === 0}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Envoyer à {preview.count} gardien{preview.count > 1 ? "s" : ""}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>

      <AlertDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open);
          if (!open) setConfirmInput("");
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer l'envoi aux gardiens du coin</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm">
                <p>
                  Pour confirmer l'envoi à{" "}
                  <strong>{preview?.count ?? 0} gardien{(preview?.count ?? 0) > 1 ? "s" : ""}</strong>{" "}
                  autour de l'annonce <strong>{preview?.sit.title || "(sans titre)"}</strong>, saisissez le nombre exact ci-dessous.
                </p>
                <Input
                  autoFocus
                  inputMode="numeric"
                  placeholder={String(preview?.count ?? 0)}
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value.replace(/\D/g, ""))}
                />
                <p className="text-xs text-muted-foreground">
                  Un email personnalisé par destinataire, jamais de copie groupée. Action irréversible.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSend}
              disabled={
                sending ||
                !preview ||
                Number(confirmInput) !== preview.count
              }
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Envoi,
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" /> Envoyer maintenant
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default ListingProximityCard;
