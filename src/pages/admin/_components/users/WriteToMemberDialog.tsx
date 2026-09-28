import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export interface WriteToMemberTarget {
  userId: string;
  userName: string;
  sitId?: string;
}

interface Props {
  target: WriteToMemberTarget | null;
  onClose: () => void;
}

/**
 * « Écrire à ce membre » : email personnel signé « Jérémie, Guardiens »,
 * aperçu du rendu réel (serveur) puis envoi. Le contrôle admin est fait
 * par la fonction serveur admin-personal-message.
 */
export const WriteToMemberDialog = ({ target, onClose }: Props) => {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [linkLabel, setLinkLabel] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());

  useEffect(() => {
    if (target) {
      setSubject("");
      setBody("");
      setLinkLabel("");
      setLinkUrl(target.sitId ? `https://guardiens.fr/sits/${target.sitId}` : "");
      setPreviewHtml(null);
      setRequestId(crypto.randomUUID());
    }
  }, [target]);

  const payload = (mode: "preview" | "send") => ({
    mode,
    recipientUserId: target?.userId,
    subject,
    body,
    ...(linkLabel.trim() || linkUrl.trim() ? { linkLabel, linkUrl } : {}),
    ...(target?.sitId ? { sitId: target.sitId } : {}),
    requestId,
  });

  const call = async (mode: "preview" | "send") => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("admin-personal-message", { body: payload(mode) });
    setBusy(false);
    if (error) {
      let details = error.message;
      try {
        const ctx = (error as { context?: Response }).context;
        if (ctx) details = (await ctx.json()).error ?? details;
      } catch { /* message générique conservé */ }
      toast.error(details);
      return null;
    }
    return data as Record<string, unknown>;
  };

  const handlePreview = async () => {
    const data = await call("preview");
    if (data?.html) setPreviewHtml(String(data.html));
  };

  const handleSend = async () => {
    const data = await call("send");
    if (!data) return;
    if (data.sent) {
      toast.success(`Email envoyé à ${target?.userName}.`);
      onClose();
    } else if (data.deferred) {
      toast.message("Envoi programmé plus tard par la file d'envoi.");
      onClose();
    } else {
      toast.error(String(data.reason ?? "Envoi non effectué."));
    }
  };

  const canSubmit = subject.trim().length > 0 && body.trim().length > 0 && !busy;

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Écrire à {target?.userName}</DialogTitle>
        </DialogHeader>
        {previewHtml ? (
          <iframe
            title="Aperçu de l'email"
            srcDoc={previewHtml}
            sandbox=""
            className="w-full h-[60vh] rounded-md border border-border bg-background"
          />
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="wtm-subject">Objet</Label>
              <Input id="wtm-subject" value={subject} maxLength={200} onChange={(e) => setSubject(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wtm-body">Texte (une ligne vide sépare deux paragraphes)</Label>
              <Textarea id="wtm-body" rows={10} value={body} maxLength={5000} onChange={(e) => setBody(e.target.value)} />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="wtm-label">Libellé du lien (facultatif)</Label>
                <Input id="wtm-label" value={linkLabel} maxLength={60} onChange={(e) => setLinkLabel(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="wtm-url">Adresse du lien</Label>
                <Input id="wtm-url" value={linkUrl} placeholder="https://guardiens.fr/..." onChange={(e) => setLinkUrl(e.target.value)} />
              </div>
            </div>
          </div>
        )}
        <DialogFooter className="gap-2">
          {previewHtml ? (
            <>
              <Button variant="ghost" onClick={() => setPreviewHtml(null)} disabled={busy}>Modifier</Button>
              <Button onClick={handleSend} disabled={!canSubmit}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Envoyer
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={onClose} disabled={busy}>Annuler</Button>
              <Button onClick={handlePreview} disabled={!canSubmit}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Aperçu
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
