import { useEffect, useState } from "react";
import { Loader2, Search, Send } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import type { AdminSignal } from "./NoApplicationsCard";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  signal: AdminSignal;
  onSent: () => void;
}

interface PreviewData {
  count: number;
  recipients: Array<{ first_name: string; city: string; distance_km: number; email: string }>;
  truncated: boolean;
}

export const BroadcastSitDialog = ({ open, onOpenChange, signal, onSent }: Props) => {
  const m = signal.metadata ?? {};
  const sitCity = m.sit_city ?? "";
  const sitId = signal.entity_id;
  const sitUrl = `https://guardiens.fr/annonces/${sitId}`;

  const [radiusKm, setRadiusKm] = useState<number>(m.eligible_radius_km ?? 30);
  const [subject, setSubject] = useState<string>(
    "Une garde vient de s'ouvrir près de chez vous",
  );
  const [body, setBody] = useState<string>(
    `Une nouvelle annonce vient d'être publiée${sitCity ? ` à ${sitCity}` : ""}.

Si vous êtes disponible, jetez-y un œil et candidatez : [Voir l'annonce](${sitUrl})

On se rencontre autour d'un café avant la garde.

L'équipe Guardiens.`,
  );
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) {
      setPreview(null);
      setPreviewing(false);
      setSending(false);
    }
  }, [open]);

  const doPreview = async () => {
    setPreviewing(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "broadcast-sit-to-sitters",
        { body: { mode: "preview", sit_id: sitId, radius_km: radiusKm } },
      );
      if (error) throw error;
      setPreview(data as PreviewData);
    } catch (e) {
      toast.error(
        `Prévisualisation impossible : ${(e as Error)?.message ?? "erreur inconnue"}`,
      );
    } finally {
      setPreviewing(false);
    }
  };

  const doSend = async () => {
    if (!preview || preview.count === 0) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "broadcast-sit-to-sitters",
        {
          body: {
            mode: "send",
            sit_id: sitId,
            radius_km: radiusKm,
            subject,
            body,
            signal_id: signal.id,
          },
        },
      );
      if (error) throw error;
      const sent = (data as { sent?: number })?.sent ?? 0;
      toast.success(`Broadcast envoyé à ${sent} gardien${sent > 1 ? "s" : ""}.`);
      onOpenChange(false);
      onSent();
    } catch (e) {
      toast.error(
        `Envoi impossible : ${(e as Error)?.message ?? "erreur inconnue"}`,
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Broadcast aux gardiens de proximité</DialogTitle>
          <DialogDescription>
            Prévisualisez la liste des destinataires avant d'envoyer. Aucune
            mention de tarif ni de concurrent.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="radius">Rayon (km)</Label>
              <Input
                id="radius"
                type="number"
                min={1}
                max={200}
                value={radiusKm}
                onChange={(e) => setRadiusKm(Math.max(1, Math.min(200, Number(e.target.value) || 30)))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Annonce</Label>
              <p className="text-sm text-muted-foreground truncate pt-2">
                « {m.sit_title ?? sitId} »
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="subject">Sujet</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="body">Message (Markdown léger)</Label>
            <Textarea
              id="body"
              rows={8}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>

          <div className="rounded-lg border p-3 bg-muted/30">
            {preview ? (
              <div className="text-sm">
                <p className="font-medium text-foreground">
                  {preview.count} destinataire{preview.count > 1 ? "s" : ""} éligible
                  {preview.count > 1 ? "s" : ""}
                </p>
                {preview.recipients.length > 0 && (
                  <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground max-h-40 overflow-y-auto">
                    {preview.recipients.slice(0, 10).map((r) => (
                      <li key={r.email}>
                        {r.first_name || "—"} · {r.city || "?"} · {r.distance_km} km
                      </li>
                    ))}
                    {preview.count > 10 && (
                      <li className="italic">… et {preview.count - 10} autres</li>
                    )}
                  </ul>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Cliquez sur « Prévisualiser » pour obtenir la liste réelle.
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={doPreview} disabled={previewing || sending}>
            {previewing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
            Prévisualiser
          </Button>
          <Button
            onClick={doSend}
            disabled={sending || !preview || preview.count === 0}
          >
            {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Envoyer le broadcast
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
