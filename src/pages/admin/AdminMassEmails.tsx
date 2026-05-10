import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, Eye, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { MassEmailFiltersPanel } from "@/components/admin/mass-email/MassEmailFilters";
import type { MassEmailFilters, Segment } from "@/components/admin/mass-email/filters.types";
import { SEGMENT_LABELS } from "@/components/admin/mass-email/filters.types";

interface MassEmail {
  id: string;
  created_at: string;
  segment: string;
  subject: string;
  recipients_count: number;
  status: string;
}

const AdminMassEmails = () => {
  // Form state
  const [segment, setSegment] = useState<Segment>("tous");
  const [filters, setFilters] = useState<MassEmailFilters>({});
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [ctaEnabled, setCtaEnabled] = useState(false);
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [utmEnabled, setUtmEnabled] = useState(true);
  const [utmCampaign, setUtmCampaign] = useState("");
  const [utmContent, setUtmContent] = useState("cta");

  // UI state
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [countLoading, setCountLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");
  const [sending, setSending] = useState(false);

  // History
  const [history, setHistory] = useState<MassEmail[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

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
        const { data, error } = await supabase.functions.invoke("send-mass-email", {
          body: { mode: "count", segment, filters },
        });
        if (error) throw error;
        setRecipientCount(data?.count ?? 0);
      } catch {
        setRecipientCount(null);
      }
      setCountLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [segment, filters]);

  const isValid =
    subject.trim().length > 0 &&
    body.trim().length >= 20 &&
    (recipientCount ?? 0) > 0 &&
    (!ctaEnabled || (ctaLabel.trim().length > 0 && ctaUrl.startsWith("https://")));

  /** Slugifie l'objet pour générer un utm_campaign par défaut. */
  const autoCampaign = subject
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    .slice(0, 40) || "campagne";

  const effectiveCampaign = (utmCampaign.trim() || autoCampaign);

  /** Ajoute les UTM à une URL guardiens.fr ; laisse intacte une URL externe. */
  const withUtm = (rawUrl: string): string => {
    try {
      const u = new URL(rawUrl);
      const isInternal = /(^|\.)guardiens\.fr$|lovable\.app$/.test(u.hostname);
      if (!isInternal || !utmEnabled) return rawUrl;
      u.searchParams.set("utm_source", "email");
      u.searchParams.set("utm_medium", "transac");
      u.searchParams.set("utm_campaign", effectiveCampaign);
      u.searchParams.set("utm_content", utmContent.trim() || "cta");
      return u.toString();
    } catch {
      return rawUrl;
    }
  };

  const handleSend = async () => {
    setConfirmOpen(false);
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-mass-email", {
        body: {
          mode: "send",
          segment,
          filters,
          subject: subject.trim(),
          body: body.trim(),
          cta_label: ctaEnabled ? ctaLabel.trim() : undefined,
          cta_url: ctaEnabled ? withUtm(ctaUrl.trim()) : undefined,
        },
      });
      if (error) throw error;
      toast.success(`Envoi lancé — ${data.sent} emails en cours d'expédition`);
      setSubject(""); setBody(""); setCtaEnabled(false); setCtaLabel(""); setCtaUrl("");
      loadHistory();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'envoi");
    } finally {
      setSending(false);
    }
  };

  const previewHtml = buildPreviewHtml(subject, body, ctaEnabled ? ctaLabel : undefined, ctaEnabled ? withUtm(ctaUrl) : undefined);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Envois groupés</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          <MassEmailFiltersPanel
            segment={segment}
            setSegment={setSegment}
            filters={filters}
            setFilters={setFilters}
          />

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Estimation</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium text-primary">
                {countLoading ? (
                  <span className="flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> Calcul…
                  </span>
                ) : (
                  `→ ${recipientCount ?? "—"} destinataires correspondent à ces critères`
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
                <Label htmlFor="cta-toggle" className="text-sm">Ajouter un bouton CTA</Label>
                <Switch id="cta-toggle" checked={ctaEnabled} onCheckedChange={setCtaEnabled} />
              </div>

              {ctaEnabled && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="cta-label">Libellé du bouton</Label>
                      <Input id="cta-label" placeholder="Découvrir" value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="cta-url">URL cible</Label>
                      <Input id="cta-url" placeholder="https://guardiens.fr/..." value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} />
                      {ctaUrl && !ctaUrl.startsWith("https://") && (
                        <p className="text-xs text-destructive">L'URL doit commencer par https://</p>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="utm-toggle" className="text-sm">Tracking UTM (liens internes)</Label>
                        <p className="text-xs text-muted-foreground">Ajouté automatiquement aux URL guardiens.fr</p>
                      </div>
                      <Switch id="utm-toggle" checked={utmEnabled} onCheckedChange={setUtmEnabled} />
                    </div>

                    {utmEnabled && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="utm-campaign">utm_campaign</Label>
                          <Input
                            id="utm-campaign"
                            placeholder={autoCampaign}
                            value={utmCampaign}
                            onChange={(e) => setUtmCampaign(e.target.value.replace(/[^a-z0-9-]/gi, "-").toLowerCase())}
                          />
                          <p className="text-xs text-muted-foreground">Auto depuis l'objet si vide</p>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="utm-content">utm_content</Label>
                          <Input
                            id="utm-content"
                            placeholder="cta"
                            value={utmContent}
                            onChange={(e) => setUtmContent(e.target.value.replace(/[^a-z0-9-_]/gi, "-").toLowerCase())}
                          />
                          <p className="text-xs text-muted-foreground">Ex : cta, article, footer</p>
                        </div>
                        {ctaUrl.startsWith("https://") && (
                          <div className="col-span-2 text-xs text-muted-foreground break-all bg-muted/40 p-2 rounded">
                            <span className="font-medium">URL finale :</span> {withUtm(ctaUrl)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <div className="space-y-3">
            <Button
              className="w-full"
              size="lg"
              disabled={!isValid || sending}
              onClick={() => setPreviewOpen(true)}
            >
              <Eye className="h-4 w-4 mr-2" />
              Aperçu complet avant envoi
            </Button>
            {!isValid && (
              <p className="text-xs text-muted-foreground text-center">
                Renseignez l'objet, un corps d'au moins 20 caractères, et au moins 1 destinataire.
              </p>
            )}
          </div>
        </div>

        {/* Right column – History */}
        <div>
          <Card>
            <CardHeader><CardTitle className="text-base">Envois précédents</CardTitle></CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : history.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Aucun envoi pour l'instant.</p>
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
                        <TableCell className="text-xs">{SEGMENT_LABELS[row.segment] || row.segment}</TableCell>
                        <TableCell className="text-xs max-w-[120px] truncate">{row.subject}</TableCell>
                        <TableCell className="text-xs text-right">{row.recipients_count}</TableCell>
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

      {/* Écran d'aperçu complet (récap + rendu) avant la confirmation finale */}
      <Dialog
        open={previewOpen}
        onOpenChange={(open) => {
          setPreviewOpen(open);
          if (!open) setConfirmInput("");
        }}
      >
        <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto p-0">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle>Aperçu complet de l'envoi</DialogTitle>
            <DialogDescription>
              Vérifiez chaque élément. L'envoi est définitif et irréversible une fois confirmé.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 px-6 pb-6">
            {/* Colonne récap */}
            <div className="space-y-4">
              <div className="rounded-lg border border-border p-4 space-y-3">
                <h3 className="text-sm font-semibold">Audience</h3>
                <div className="text-sm space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Segment</span>
                    <Badge variant="outline">{SEGMENT_LABELS[segment] || segment}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Destinataires</span>
                    <span className="font-semibold text-base">{recipientCount ?? 0}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-border p-4 space-y-3">
                <h3 className="text-sm font-semibold">Contenu</h3>
                <div className="text-sm space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Objet</span>
                    <span className="font-medium text-right max-w-[60%] truncate">{subject || "—"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Corps</span>
                    <span>{body.length} car.</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Bouton CTA</span>
                    <span>{ctaEnabled ? `« ${ctaLabel} »` : "Aucun"}</span>
                  </div>
                </div>
              </div>

              {ctaEnabled && (
                <div className="rounded-lg border border-border p-4 space-y-2">
                  <h3 className="text-sm font-semibold">Lien & tracking</h3>
                  <div className="text-xs text-muted-foreground break-all bg-muted/40 p-2 rounded">
                    {withUtm(ctaUrl) || "—"}
                  </div>
                  {utmEnabled && (
                    <div className="flex flex-wrap gap-1.5 text-xs">
                      <Badge variant="secondary">campaign : {effectiveCampaign}</Badge>
                      <Badge variant="secondary">content : {utmContent || "cta"}</Badge>
                    </div>
                  )}
                </div>
              )}

              <div className="rounded-lg border border-amber-500/40 bg-amber-50/40 dark:bg-amber-950/10 p-4 text-xs text-amber-900 dark:text-amber-200">
                <strong>Action irréversible.</strong> Une fois confirmé, l'email part immédiatement
                vers <strong>{recipientCount ?? 0}</strong> destinataires. Aucun rappel possible.
              </div>
            </div>

            {/* Colonne rendu HTML */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Rendu de l'email</h3>
              <div
                className="border border-border rounded-lg overflow-hidden bg-white max-h-[60vh] overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </div>
          </div>

          <div className="border-t border-border px-6 py-4 flex flex-col sm:flex-row gap-2 justify-end bg-muted/30">
            <Button variant="ghost" onClick={() => setPreviewOpen(false)}>
              Retour à l'édition
            </Button>
            <Button
              onClick={() => {
                setConfirmInput("");
                setConfirmOpen(true);
              }}
              disabled={!isValid}
            >
              Procéder à la confirmation finale
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation finale — saisie obligatoire du nombre de destinataires */}
      <AlertDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open);
          if (!open) setConfirmInput("");
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dernier feu vert</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm">
                <p>
                  Pour confirmer l'envoi à <strong>{recipientCount ?? 0} destinataires</strong>{" "}
                  ({SEGMENT_LABELS[segment] || segment}), saisissez le nombre exact ci-dessous.
                </p>
                <Input
                  autoFocus
                  inputMode="numeric"
                  placeholder={String(recipientCount ?? 0)}
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value.replace(/\D/g, ""))}
                />
                {ctaEnabled && utmEnabled && ctaUrl.startsWith("https://") && (
                  <p className="text-xs text-muted-foreground">
                    Tracking : <code>{effectiveCampaign}</code> / <code>{utmContent || "cta"}</code>
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSend}
              disabled={
                sending ||
                recipientCount === null ||
                Number(confirmInput) !== recipientCount
              }
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Envoi en cours…
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
