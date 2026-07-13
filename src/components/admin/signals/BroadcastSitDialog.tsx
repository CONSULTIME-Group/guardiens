import { useEffect, useState } from "react";
import { Loader2, Search, Send, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { AdminSignal } from "./NoApplicationsCard";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  signal: AdminSignal;
  onSent: () => void;
}

interface PreviewData {
  count: number;
  author_first_name?: string;
  sit?: {
    id: string;
    title: string | null;
    city: string | null;
    excerpt?: string;
    date_range?: string;
    pets_sentence?: string;
  };
  subject?: string;
  recipients: Array<{ first_name: string; city: string; distance_km: number; email: string }>;
  truncated: boolean;
}

export const BroadcastSitDialog = ({ open, onOpenChange, signal, onSent }: Props) => {
  const m = signal.metadata ?? {};
  const sitId = signal.entity_id;

  const [radiusKm, setRadiusKm] = useState<number>(m.eligible_radius_km ?? 30);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [sending, setSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setPreview(null);
      setPreviewing(false);
      setSending(false);
      setErrorMessage(null);
    }
  }, [open]);

  const invokeProximity = async (mode: "preview" | "send") => {
    const { data, error } = await supabase.functions.invoke(
      "send-listing-proximity",
      {
        body: {
          mode,
          sit_id: sitId,
          radius_km: radiusKm,
          signal_id: mode === "send" ? signal.id : null,
        },
      },
    );
    if (error) {
      // FunctionsHttpError exposes context.json() with the error body
      const ctx = (error as unknown as { context?: Response }).context;
      if (ctx && typeof ctx.json === "function") {
        try {
          const body = await ctx.json();
          const msg = body?.error ?? error.message;
          throw new Error(String(msg));
        } catch {
          throw error;
        }
      }
      throw error;
    }
    if ((data as { error?: string })?.error) {
      throw new Error((data as { error: string }).error);
    }
    return data;
  };

  const doPreview = async () => {
    setPreviewing(true);
    setErrorMessage(null);
    try {
      const data = await invokeProximity("preview");
      setPreview(data as PreviewData);
    } catch (e) {
      setErrorMessage((e as Error)?.message ?? "Prévisualisation impossible.");
    } finally {
      setPreviewing(false);
    }
  };

  const doSend = async () => {
    if (!preview || preview.count === 0) return;
    setSending(true);
    setErrorMessage(null);
    try {
      const data = await invokeProximity("send");
      const sent = (data as { sent?: number })?.sent ?? 0;
      const errors = (data as { errors?: number })?.errors ?? 0;
      toast.success(
        `${sent} email${sent > 1 ? "s" : ""} envoyé${sent > 1 ? "s" : ""}${errors ? `, ${errors} erreur${errors > 1 ? "s" : ""}` : ""}.`,
      );
      onOpenChange(false);
      onSent();
    } catch (e) {
      setErrorMessage((e as Error)?.message ?? "Envoi impossible.");
    } finally {
      setSending(false);
    }
  };

  const showLargeRadiusWarning = radiusKm > 500;

  const recipientCount = preview?.count ?? 0;
  const sendLabel = sending
    ? "Envoi en cours..."
    : recipientCount === 0
      ? "Aucun destinataire"
      : `Envoyer les ${recipientCount} email${recipientCount > 1 ? "s" : ""}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0 max-h-[95vh] sm:max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <DialogTitle>Diffuser l'annonce aux gardiens du coin</DialogTitle>
          <DialogDescription>
            Envoi individuel avec le template riche (photo, animaux, dates, affinité).
            Prévisualisez avant d'envoyer.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 min-h-0">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="radius">Rayon (km)</Label>
              <Input
                id="radius"
                type="number"
                min={1}
                max={2000}
                value={radiusKm}
                onChange={(e) => setRadiusKm(Math.max(1, Math.min(2000, Number(e.target.value) || 30)))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Annonce</Label>
              <p className="text-sm text-muted-foreground truncate pt-2">
                « {m.sit_title ?? sitId} »
              </p>
            </div>
          </div>

          {showLargeRadiusWarning && (
            <Alert variant="default" className="border-warning/40 bg-warning/5">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Rayon large : l'envoi peut concerner beaucoup de gardiens.
                Vérifiez bien votre segment avant l'envoi.
              </AlertDescription>
            </Alert>
          )}

          {errorMessage && (
            <Alert variant="default" className="border-warning/40 bg-warning/5">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm">{errorMessage}</AlertDescription>
            </Alert>
          )}

          {preview ? (
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="px-3 py-2 bg-muted/40 border-b border-border">
                <p className="text-sm font-medium text-foreground">
                  {preview.count} destinataire{preview.count > 1 ? "s" : ""} ciblé
                  {preview.count > 1 ? "s" : ""}
                </p>
                {preview.subject && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    Objet : {preview.subject}
                  </p>
                )}
              </div>
              {preview.recipients.length > 0 ? (
                <div className="max-h-[40vh] overflow-y-auto">
                  <ul className="divide-y divide-border text-xs">
                    {preview.recipients.map((r) => (
                      <li key={r.email} className="px-3 py-1.5 flex items-center justify-between gap-3">
                        <span className="text-foreground truncate">
                          {r.first_name || "(sans prénom)"}
                          <span className="text-muted-foreground"> · {r.city || "?"}</span>
                        </span>
                        <span className="text-muted-foreground shrink-0 tabular-nums">
                          {r.distance_km} km
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="px-3 py-4 text-sm text-muted-foreground">
                  Aucun gardien éligible dans ce rayon.
                </p>
              )}
              {preview.truncated && (
                <p className="px-3 py-2 text-xs italic text-muted-foreground border-t border-border">
                  Liste tronquée à l'affichage. L'envoi couvrira les {preview.count} destinataires.
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground bg-muted/20">
              Cliquez sur « Prévisualiser » pour obtenir la liste réelle.
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border bg-background gap-2 shrink-0 sm:justify-between">
          <Button variant="outline" onClick={doPreview} disabled={previewing || sending}>
            {previewing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
            Prévisualiser
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={sending}>
              Fermer
            </Button>
            <Button
              onClick={doSend}
              disabled={sending || !preview || recipientCount === 0}
            >
              {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              {sendLabel}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
