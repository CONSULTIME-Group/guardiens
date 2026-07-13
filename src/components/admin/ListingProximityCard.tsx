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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";

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
  onClose?: () => void;
}

const ListingProximityCard = ({
  sitId,
  initialRadiusKm = 30,
  autoPreview = false,
  hideHeader = false,
  onClose,
}: ListingProximityCardProps) => {
  const [radiusKm, setRadiusKm] = useState<number>(initialRadiusKm);

  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [descOpen, setDescOpen] = useState(false);


  const extractError = async (error: unknown, data: unknown): Promise<string> => {
    const ctx = (error as { context?: Response } | null)?.context;
    if (ctx && typeof ctx.json === "function") {
      try {
        const body = await ctx.json();
        if (body?.error) return String(body.error);
      } catch { /* ignore */ }
    }
    if ((data as { error?: string })?.error) return String((data as { error: string }).error);
    if ((error as Error)?.message) return String((error as Error).message);
    return "Erreur inconnue.";
  };

  /**
   * Adapte le message d'erreur "coordonnées manquantes" selon l'état réel
   * du profil propriétaire (city/postal_code renseignés ou pas).
   */
  const buildCoordsErrorMessage = async (rawMsg: string): Promise<string> => {
    if (!/coordonn/i.test(rawMsg)) return rawMsg;
    try {
      const { data: sit } = await supabase
        .from("sits")
        .select("user_id")
        .eq("id", sitId)
        .maybeSingle();
      if (!sit?.user_id) return rawMsg;
      const { data: owner } = await supabase
        .from("profiles")
        .select("first_name, city, postal_code")
        .eq("id", sit.user_id)
        .maybeSingle();
      const firstName = owner?.first_name || "le propriétaire";
      const hasCity = !!(owner?.city && String(owner.city).trim().length > 0);
      const hasPostal = !!(owner?.postal_code && String(owner.postal_code).trim().length > 0);
      if (hasCity && hasPostal) {
        return `Cette annonce ne peut pas être diffusée par proximité. Les coordonnées géographiques de ${firstName} ne sont pas encore calculées. Cela devrait se résoudre automatiquement sous 1 minute, réessayez ensuite. Si le problème persiste, un géocodage manuel peut être déclenché depuis /admin/users.`;
      }
      return `Cette annonce ne peut pas être diffusée par proximité. ${firstName} n'a pas complété sa localisation. Demandez-lui de saisir sa ville et son code postal dans son profil.`;
    } catch {
      return rawMsg;
    }
  };

  const handlePreview = async () => {
    if (!sitId) {
      toast.error("sit_id manquant");
      return;
    }
    setLoading(true);
    setPreview(null);
    setWarningMessage(null);
    try {
      const { data, error } = await supabase.functions.invoke(
        "send-listing-proximity",
        {
          body: { mode: "preview", sit_id: sitId, radius_km: radiusKm },
        },
      );
      if (error || (data as { error?: string })?.error) {
        const msg = await extractError(error, data);
        setWarningMessage(await buildCoordsErrorMessage(msg));
        return;
      }
      setPreview(data as PreviewData);
    } catch (err: unknown) {
      setWarningMessage((err as Error)?.message || "Erreur lors de l'aperçu");
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!preview) return;
    setConfirmOpen(false);
    setSending(true);
    setWarningMessage(null);
    try {
      const { data, error } = await supabase.functions.invoke(
        "send-listing-proximity",
        {
          body: { mode: "send", sit_id: sitId, radius_km: radiusKm },
        },
      );
      if (error || (data as { error?: string })?.error) {
        const msg = await extractError(error, data);
        setWarningMessage(await buildCoordsErrorMessage(msg));
        return;
      }
      toast.success(
        `Envoi terminé, ${(data as { sent: number }).sent} email(s) expédié(s)${
          (data as { errors?: number }).errors ? `, ${(data as { errors: number }).errors} erreur(s)` : ""
        }.`,
      );
      setPreview(null);
      setConfirmInput("");
    } catch (err: unknown) {
      setWarningMessage((err as Error)?.message || "Erreur lors de l'envoi");
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

  const recipientCount = preview?.count ?? 0;
  const sendLabel = sending
    ? "Envoi en cours…"
    : recipientCount === 0
      ? "Aucun destinataire"
      : `Envoyer les ${recipientCount} email${recipientCount > 1 ? "s" : ""}`;

  const body = (
    <div className="flex-1 overflow-y-auto px-6 py-3 space-y-3 min-h-0">
      <div className="flex items-end gap-3 flex-wrap">
        <div className="space-y-1.5 w-28 shrink-0">
          <Label htmlFor="listing-prox-radius" className="text-xs">Rayon (km)</Label>
          <Input
            id="listing-prox-radius"
            type="number"
            min={1}
            max={2000}
            value={radiusKm}
            onChange={(e) => setRadiusKm(Math.max(1, Math.min(2000, Number(e.target.value) || 30)))}
          />
        </div>
        <Button onClick={handlePreview} disabled={loading} size="sm" variant="outline">
          {loading ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Calcul…</>
          ) : (
            <><Search className="h-4 w-4 mr-2" />Prévisualiser</>
          )}
        </Button>
      </div>

      {radiusKm > 500 && (
        <Alert variant="default" className="border-warning/40 bg-warning/5 py-2">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Rayon large : l'envoi peut concerner beaucoup de gardiens. Vérifiez votre segment.
          </AlertDescription>
        </Alert>
      )}

      {warningMessage && (
        <Alert variant="default" className="border-warning/40 bg-warning/5 py-2">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-sm">{warningMessage}</AlertDescription>
        </Alert>
      )}

      {preview && (
        <div className="space-y-2 pt-2 border-t border-border">
          <div className="flex flex-wrap gap-1.5 text-xs">
            <span
              className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-foreground max-w-full truncate"
              title={preview.sit.title || "(sans titre)"}
            >
              <strong className="truncate">{preview.sit.title || "(sans titre)"}</strong>
            </span>
            {preview.sit.city && (
              <span className="inline-flex items-center rounded-full bg-muted/60 px-2.5 py-1 text-muted-foreground">
                {preview.sit.city}
              </span>
            )}
            <span className="inline-flex items-center rounded-full bg-muted/60 px-2.5 py-1 text-muted-foreground">
              Propriétaire : {preview.author_first_name || "(inconnu)"}
            </span>
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-primary font-medium">
              {preview.count} gardien{preview.count > 1 ? "s" : ""} ciblé{preview.count > 1 ? "s" : ""}
            </span>
            {preview.sit.date_range && (
              <span className="inline-flex items-center rounded-full bg-muted/60 px-2.5 py-1 text-muted-foreground">
                {preview.sit.date_range}
              </span>
            )}
          </div>

          {preview.sit.excerpt && (
            <Collapsible open={descOpen} onOpenChange={setDescOpen}>
              <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <ChevronDown className={`h-3 w-3 transition-transform ${descOpen ? "rotate-180" : ""}`} />
                {descOpen ? "Masquer la description" : "Voir la description"}
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-1.5 rounded border border-border bg-muted/20 p-2 text-xs italic text-muted-foreground">
                {preview.sit.excerpt}
              </CollapsibleContent>
            </Collapsible>
          )}

          <p
            className="text-xs italic text-muted-foreground truncate"
            title={subject}
          >
            Objet : {subject}
          </p>

          {preview.count === 0 ? (
            <p className="text-sm text-muted-foreground pt-2">
              Aucun gardien dans ce rayon.
            </p>
          ) : (
            <>
              <div className="max-h-[240px] overflow-y-auto border border-border rounded">
                <Table>
                  <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                      <TableHead className="h-8">Prénom</TableHead>
                      <TableHead className="h-8">Ville</TableHead>
                      <TableHead className="h-8 text-right">Distance</TableHead>
                      <TableHead className="h-8">Email</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.recipients.map((r) => (
                      <TableRow key={r.email}>
                        <TableCell className="text-xs py-1.5">{r.first_name || "(sans prénom)"}</TableCell>
                        <TableCell className="text-xs py-1.5">{r.city || "·"}</TableCell>
                        <TableCell className="text-xs py-1.5 text-right tabular-nums">{r.distance_km} km</TableCell>
                        <TableCell className="text-xs py-1.5 font-mono">{r.email}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {preview.truncated && (
                <p className="text-xs italic text-muted-foreground">
                  Liste tronquée pour l'affichage. L'envoi couvrira l'intégralité des {preview.count} destinataires.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );

  const footer = (
    <div className="px-6 py-3 border-t border-border bg-background shrink-0 flex justify-end gap-2">
      {onClose && (
        <Button variant="ghost" onClick={onClose} disabled={sending}>
          Fermer
        </Button>
      )}
      <Button
        onClick={() => {
          setConfirmInput("");
          setConfirmOpen(true);
        }}
        disabled={sending || !preview || recipientCount === 0}
      >
        {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
        {sendLabel}
      </Button>
    </div>
  );

  const content = hideHeader ? (
    <>
      {body}
      {footer}
    </>
  ) : (
    <Card className="border-primary/30 flex flex-col max-h-[85vh] overflow-hidden">
      <CardHeader className="shrink-0">
        <CardTitle className="text-base">
          Envoyer l'annonce aux gardiens du coin
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Cible les gardiens (role sitter/both) dans un rayon autour de l'annonce, exclut le propriétaire,
          les emails supprimés et les opt-out. Aucun envoi tant que vous ne cliquez pas sur Envoyer.
        </p>
      </CardHeader>
      {body}
      {footer}
    </Card>
  );

  return (
    <>
      {content}


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
    </>

  );
};

export default ListingProximityCard;
