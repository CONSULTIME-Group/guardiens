/**
 * ProximityCampaignCard — envoi ciblé d'une annonce d'entraide de proximité.
 *
 * Flux : saisie mission_id + rayon, "Prévisualiser" (compte + liste), puis clic
 * explicite "Envoyer" pour déclencher l'edge function send-mass-email-proximity.
 * Aucun envoi n'a jamais lieu sans clic sur "Envoyer" après aperçu.
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
import { Loader2, Search, Send } from "lucide-react";

interface PreviewRecipient {
  first_name: string;
  city: string;
  distance_km: number;
  email: string;
}
interface PreviewData {
  count: number;
  author_first_name: string;
  mission: {
    id: string;
    title: string;
    mission_type?: "besoin" | "offre";
    excerpt?: string;
  };
  subject?: string;
  recipients: PreviewRecipient[];
  truncated: boolean;
}

// Pré-remplissage par défaut : offre de Béryl.
const DEFAULT_MISSION_ID = "eeaf2091-e5db-49b8-9402-2513abf316db";
const DEFAULT_RADIUS = 50;

interface ProximityCampaignCardProps {
  initialMissionId?: string;
  initialRadiusKm?: number;
  /** Lance l'aperçu automatiquement au montage (utilisé pour les ouvertures pré-remplies). */
  autoPreview?: boolean;
  /** Masque l'en-tête de la carte (utile quand on l'affiche déjà dans un Dialog). */
  hideHeader?: boolean;
}

const ProximityCampaignCard = ({
  initialMissionId,
  initialRadiusKm,
  autoPreview = false,
  hideHeader = false,
}: ProximityCampaignCardProps = {}) => {
  const [missionId, setMissionId] = useState(initialMissionId ?? DEFAULT_MISSION_ID);
  const [radiusKm, setRadiusKm] = useState<number>(initialRadiusKm ?? DEFAULT_RADIUS);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");

  const handlePreview = async () => {
    if (!missionId.trim()) {
      toast.error("Renseignez un mission_id");
      return;
    }
    setLoading(true);
    setPreview(null);
    try {
      const { data, error } = await supabase.functions.invoke(
        "send-mass-email-proximity",
        {
          body: { mode: "preview", mission_id: missionId.trim(), radius_km: radiusKm },
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
        "send-mass-email-proximity",
        {
          body: { mode: "send", mission_id: missionId.trim(), radius_km: radiusKm },
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

  const subject = preview
    ? `Près de chez vous, ${preview.author_first_name || "un membre"} propose un coup de main, gratuitement`
    : "";

  return (
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle className="text-base">
          Annonce d'entraide à proximité
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Cible les inscrits situés dans un rayon donné autour de l'auteur d'une petite mission.
          Exclut l'auteur, les emails supprimés et les opt-out. Aucun envoi tant que vous ne cliquez pas sur Envoyer.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr,140px,auto] gap-3 items-end">
          <div className="space-y-1.5">
            <Label htmlFor="prox-mission-id">ID de la mission</Label>
            <Input
              id="prox-mission-id"
              value={missionId}
              onChange={(e) => setMissionId(e.target.value)}
              placeholder="uuid de la small_mission"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="prox-radius">Rayon (km)</Label>
            <Input
              id="prox-radius"
              type="number"
              min={1}
              max={500}
              value={radiusKm}
              onChange={(e) => setRadiusKm(Math.max(1, Math.min(500, Number(e.target.value) || 50)))}
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
                Mission : <strong>{preview.mission.title}</strong>
              </span>
              <span className="text-muted-foreground">
                Auteur : {preview.author_first_name || "(inconnu)"}
              </span>
              <span>
                Destinataires : <strong className="text-base">{preview.count}</strong>
              </span>
            </div>

            <div className="rounded border border-border bg-muted/30 p-3 text-xs">
              <div className="font-semibold mb-1">Objet</div>
              <div>{subject}</div>
            </div>

            {preview.count === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun destinataire dans ce rayon.
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
                    Envoyer à {preview.count} destinataire{preview.count > 1 ? "s" : ""}
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
            <AlertDialogTitle>Confirmer l'envoi de proximité</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm">
                <p>
                  Pour confirmer l'envoi à{" "}
                  <strong>{preview?.count ?? 0} destinataire{(preview?.count ?? 0) > 1 ? "s" : ""}</strong>{" "}
                  autour de la mission <strong>{preview?.mission.title}</strong>, saisissez le nombre exact ci-dessous.
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

export default ProximityCampaignCard;
