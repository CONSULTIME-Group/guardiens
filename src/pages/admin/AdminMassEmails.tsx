import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, Eye, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

type Segment = "tous" | "gardiens" | "proprios" | "fondateurs";

const SEGMENT_OPTIONS: { value: Segment; label: string }[] = [
  { value: "tous", label: "Tous les inscrits" },
  { value: "gardiens", label: "Gardiens uniquement" },
  { value: "proprios", label: "Proprios uniquement" },
  { value: "fondateurs", label: "Fondateurs uniquement" },
];

const SEGMENT_LABELS: Record<string, string> = {
  tous: "Tous",
  gardiens: "Gardiens",
  proprios: "Proprios",
  fondateurs: "Fondateurs",
};

interface MassEmail {
  id: string;
  created_at: string;
  segment: string;
  subject: string;
  recipients_count: number;
  status: string;
}

const AdminMassEmails = () => {
  const { user } = useAuth();

  // Form state
  const [segment, setSegment] = useState<Segment>("tous");
  const [abonnesActifs, setAbonnesActifs] = useState(false);
  const [idVerifiee, setIdVerifiee] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [ctaEnabled, setCtaEnabled] = useState(false);
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");

  // UI state
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [countLoading, setCountLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);

  // History
  const [history, setHistory] = useState<MassEmail[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // Load history
  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    const { data } = await supabase
      .from("mass_emails")
      .select("id, created_at, segment, subject, recipients_count, status")
      .order("created_at", { ascending: false })
      .limit(20);
    setHistory((data as MassEmail[]) || []);
    setHistoryLoading(false);
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  // Debounced recipient count
  useEffect(() => {
    const timer = setTimeout(async () => {
      setCountLoading(true);
      try {
        let query = supabase.from("profiles").select("id", { count: "exact", head: true });

        if (segment === "gardiens") query = query.in("role", ["sitter", "both"]);
        else if (segment === "proprios") query = query.in("role", ["owner", "both"]);
        else if (segment === "fondateurs") query = query.eq("is_founder", true);

        if (idVerifiee) query = query.eq("identity_verified", true);

        const { count } = await query;
        // Note: abonnes_actifs filter is done server-side, approximate here
        setRecipientCount(count ?? 0);
      } catch {
        setRecipientCount(null);
      }
      setCountLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [segment, abonnesActifs, idVerifiee]);

  const isValid =
    subject.trim().length > 0 &&
    body.trim().length >= 20 &&
    (recipientCount ?? 0) > 0 &&
    (!ctaEnabled || (ctaLabel.trim().length > 0 && ctaUrl.startsWith("https://")));

  const handleSend = async () => {
    setConfirmOpen(false);
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-mass-email", {
        body: {
          segment,
          filters: { abonnes_actifs: abonnesActifs, id_verifiee: idVerifiee },
          subject: subject.trim(),
          body: body.trim(),
          cta_label: ctaEnabled ? ctaLabel.trim() : undefined,
          cta_url: ctaEnabled ? ctaUrl.trim() : undefined,
        },
      });
      if (error) throw error;
      toast.success(`Envoi lancé — ${data.sent} emails en cours d'expédition`);
      // Reset form
      setSubject("");
      setBody("");
      setCtaEnabled(false);
      setCtaLabel("");
      setCtaUrl("");
      loadHistory();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'envoi");
    } finally {
      setSending(false);
    }
  };

  const previewHtml = buildPreviewHtml(subject, body, ctaEnabled ? ctaLabel : undefined, ctaEnabled ? ctaUrl : undefined);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Envois groupés</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column – Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Destinataires */}
          <Card>
            <CardHeader><CardTitle className="text-base">Destinataires</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup
                value={segment}
                onValueChange={(v) => setSegment(v as Segment)}
                className="grid grid-cols-2 gap-3"
              >
                {SEGMENT_OPTIONS.map((opt) => (
                  <div key={opt.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={opt.value} id={`seg-${opt.value}`} />
                    <Label htmlFor={`seg-${opt.value}`} className="cursor-pointer text-sm">
                      {opt.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>

              <div className="space-y-2 pt-2 border-t border-border">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Filtres optionnels
                </p>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="abonnes"
                    checked={abonnesActifs}
                    onCheckedChange={(c) => setAbonnesActifs(!!c)}
                  />
                  <Label htmlFor="abonnes" className="text-sm cursor-pointer">
                    Abonnés actifs uniquement
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="verified"
                    checked={idVerifiee}
                    onCheckedChange={(c) => setIdVerifiee(!!c)}
                  />
                  <Label htmlFor="verified" className="text-sm cursor-pointer">
                    Identité vérifiée uniquement
                  </Label>
                </div>
              </div>

              <p className="text-sm font-medium text-primary">
                {countLoading ? (
                  <span className="flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> Calcul…
                  </span>
                ) : (
                  `→ ${recipientCount ?? "—"} destinataires estimés`
                )}
              </p>
            </CardContent>
          </Card>

          {/* Message */}
          <Card>
            <CardHeader><CardTitle className="text-base">Message</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="subject">Objet</Label>
                <Input
                  id="subject"
                  placeholder="Objet de l'email"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value.slice(0, 100))}
                  maxLength={100}
                />
                <p className="text-xs text-muted-foreground text-right">{subject.length}/100</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="body">Corps du message</Label>
                <Textarea
                  id="body"
                  placeholder="Rédigez votre message ici…"
                  value={body}
                  onChange={(e) => setBody(e.target.value.slice(0, 2000))}
                  maxLength={2000}
                  rows={8}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground text-right">{body.length}/2000</p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border">
                <Label htmlFor="cta-toggle" className="text-sm">
                  Ajouter un bouton CTA
                </Label>
                <Switch id="cta-toggle" checked={ctaEnabled} onCheckedChange={setCtaEnabled} />
              </div>

              {ctaEnabled && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="cta-label">Libellé du bouton</Label>
                    <Input
                      id="cta-label"
                      placeholder="Découvrir"
                      value={ctaLabel}
                      onChange={(e) => setCtaLabel(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cta-url">URL cible</Label>
                    <Input
                      id="cta-url"
                      placeholder="https://guardiens.fr/..."
                      value={ctaUrl}
                      onChange={(e) => setCtaUrl(e.target.value)}
                    />
                    {ctaUrl && !ctaUrl.startsWith("https://") && (
                      <p className="text-xs text-destructive">L'URL doit commencer par https://</p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action buttons */}
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setPreviewOpen(true)}
              disabled={!subject.trim()}
            >
              <Eye className="h-4 w-4 mr-2" />
              Prévisualiser l'email
            </Button>
            <Button
              className="w-full"
              disabled={!isValid || sending}
              onClick={() => setConfirmOpen(true)}
            >
              {sending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Envoyer à {recipientCount ?? 0} destinataires
            </Button>
          </div>
        </div>

        {/* Right column – History */}
        <div>
          <Card>
            <CardHeader><CardTitle className="text-base">Envois précédents</CardTitle></CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : history.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Aucun envoi pour l'instant.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Segment</TableHead>
                      <TableHead>Objet</TableHead>
                      <TableHead className="text-right">Dest.</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="text-xs whitespace-nowrap">
                          {format(new Date(row.created_at), "dd MMM yyyy", { locale: fr })}
                        </TableCell>
                        <TableCell className="text-xs">
                          {SEGMENT_LABELS[row.segment] || row.segment}
                        </TableCell>
                        <TableCell className="text-xs max-w-[120px] truncate">
                          {row.subject}
                        </TableCell>
                        <TableCell className="text-xs text-right">
                          {row.recipients_count}
                        </TableCell>
                        <TableCell>
                          <Badge variant={row.status === "sent" ? "default" : "destructive"} className="text-[10px]">
                            {row.status === "sent" ? "Envoyé" : "Erreur"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Preview dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Prévisualisation</DialogTitle>
            <DialogDescription>Aperçu de l'email tel qu'il sera reçu.</DialogDescription>
          </DialogHeader>
          <div
            className="border border-border rounded-lg overflow-hidden"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </DialogContent>
      </Dialog>

      {/* Confirm dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer l'envoi</AlertDialogTitle>
            <AlertDialogDescription>
              Vous êtes sur le point d'envoyer cet email à {recipientCount ?? 0} inscrits.
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleSend}>Confirmer l'envoi</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

function buildPreviewHtml(subject: string, body: string, ctaLabel?: string, ctaUrl?: string): string {
  const escapedSubject = (subject || "Objet de l'email").replace(/</g, "&lt;");
  const escapedBody = (body || "Corps du message…").replace(/</g, "&lt;");
  const ctaBlock = ctaLabel && ctaUrl
    ? `<tr><td style="padding:24px 0 0"><a href="${ctaUrl}" style="display:inline-block;padding:12px 28px;background-color:#16a34a;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px">${ctaLabel.replace(/</g, "&lt;")}</a></td></tr>`
    : "";

  return `<div style="background-color:#FAF9F6;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:12px;overflow:hidden">
<tr><td style="padding:24px 32px 16px;text-align:center;background-color:#FAF9F6">
<strong style="font-size:18px;color:#1a1a1a">🐾 Guardiens</strong>
</td></tr>
<tr><td style="padding:24px 32px">
<h1 style="margin:0 0 16px;font-size:20px;color:#1a1a1a">${escapedSubject}</h1>
<p style="margin:0;font-size:14px;line-height:1.7;color:#333333;white-space:pre-line">${escapedBody}</p>
${ctaBlock}
</td></tr>
<tr><td style="padding:16px 32px;border-top:1px solid #e5e5e5;text-align:center">
<p style="margin:0;font-size:11px;color:#999999">Guardiens — La communauté d'entraide</p>
</td></tr>
</table>
</td></tr></table></div>`;
}

export default AdminMassEmails;
