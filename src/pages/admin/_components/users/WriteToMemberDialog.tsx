import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { checkLink, prefilledLink } from "@/lib/admin/personalMessageLink";

export interface WriteToMemberTarget {
  userId: string;
  userName: string;
  sitId?: string;
  /** Lot ADM11 : objet et texte proposés à l'ouverture, modifiables avant l'envoi. */
  draft?: { subject: string; body: string };
  /** Lot VE-2 : plusieurs versions du texte, « Autre version » passe à la suivante. */
  drafts?: { subject: string; body: string }[];
  /** Lot VE-2 : ce que le membre a écrit ou vécu, rappelé au-dessus du texte. */
  context?: { lines: string[]; link?: { label: string; to: string } };
  /** Lot VE-2 : canal proposé à l'ouverture (email par défaut, comme avant). */
  channel?: WriteChannel;
  /** Lot VE-2 : signaux fermés à l'envoi (action « member_written »). */
  signalIds?: string[];
}

export type WriteChannel = "message" | "email";

interface Props {
  target: WriteToMemberTarget | null;
  onClose: () => void;
  /** Lot ADM2 : appelé seulement après un envoi accepté (envoyé ou programmé), jamais à l'annulation. */
  onSent?: () => void;
}

/**
 * « Écrire à ce membre » : email personnel signé « Jérémie, Guardiens »,
 * aperçu du rendu réel (serveur) puis envoi. Le contrôle admin est fait
 * par la fonction serveur admin-personal-message.
 */
export const WriteToMemberDialog = ({ target, onClose, onSent }: Props) => {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [linkLabel, setLinkLabel] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [channel, setChannel] = useState<WriteChannel>("email");
  const [version, setVersion] = useState(0);
  const qc = useQueryClient();
  const versions = target?.drafts?.length ? target.drafts : target?.draft ? [target.draft] : [];

  const nextVersion = () => {
    if (versions.length < 2) return;
    const i = (version + 1) % versions.length;
    setVersion(i);
    setSubject(versions[i].subject);
    setBody(versions[i].body);
    setPreviewHtml(null);
  };

  /** Lot VE-2 : la ligne quitte la liste dès que le message est parti. */
  const closeSignals = async () => {
    const ids = target?.signalIds ?? [];
    if (ids.length === 0) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("admin_signals")
      .update({ resolved_at: new Date().toISOString(), action_taken: "member_written", admin_id: user?.id ?? null })
      .in("id", ids);
    if (error) toast.error("Message parti, mais la ligne reste dans la liste : classez-la à la main.");
    void qc.invalidateQueries({ queryKey: ["admin_dashboard_snapshot"] });
  };

  const handleSendMessage = async () => {
    if (!target) return;
    setBusy(true);
    const { error } = await supabase.rpc("admin_send_message_to_user", {
      p_target_user_id: target.userId,
      p_content: body.trim(),
    });
    setBusy(false);
    if (error) {
      toast.error(error.message || "Envoi non effectué.");
      return;
    }
    toast.success(`Message envoyé à ${target.userName}.`);
    await closeSignals();
    onSent?.();
    onClose();
  };

  useEffect(() => {
    if (target) {
      const first = target.drafts?.[0] ?? target.draft;
      setSubject(first?.subject ?? "");
      setBody(first?.body ?? "");
      setChannel(target.channel ?? "email");
      setVersion(0);
      // Lot ADM9 : adresse de l'annonce préremplie avec son libellé, le lien part entier.
      const link = prefilledLink(target.sitId);
      setLinkLabel(link.linkLabel);
      setLinkUrl(link.linkUrl);
      setPreviewHtml(null);
      setRequestId(crypto.randomUUID());
    }
  }, [target]);

  // Lot ADM9 : même règle que le serveur, un lien entier ou aucun lien.
  const linkCheck = checkLink(linkLabel, linkUrl);

  const payload = (mode: "preview" | "send") => ({
    mode,
    recipientUserId: target?.userId,
    subject,
    body,
    ...(linkCheck.ok && linkCheck.link ? linkCheck.link : {}),
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
      await closeSignals();
      onSent?.();
      onClose();
    } else if (data.deferred) {
      toast.message("Envoi programmé plus tard par la file d'envoi.");
      await closeSignals();
      onSent?.();
      onClose();
    } else {
      toast.error(String(data.reason ?? "Envoi non effectué."));
    }
  };

  const byMessage = channel === "message";
  const canSubmit = byMessage
    ? body.trim().length > 0 && !busy
    : subject.trim().length > 0 && body.trim().length > 0 && linkCheck.ok && !busy;

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
            {target?.context && target.context.lines.length > 0 && (
              <div className="rounded-xl bg-muted/60 px-4 py-3 text-sm text-foreground" data-testid="wtm-context">
                <p className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">Ce qui s'est passé</p>
                {target.context.lines.map((l, i) => <p key={i} className="mt-1.5">{l}</p>)}
                {target.context.link && (
                  <Link to={target.context.link.to} className="mt-1 inline-flex min-h-11 items-center text-[13px] font-semibold text-primary underline underline-offset-2">
                    {target.context.link.label}
                  </Link>
                )}
              </div>
            )}
            {target?.channel && (
              <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Canal d'envoi">
                <span className="text-sm text-muted-foreground">Envoyer par</span>
                <Button type="button" className="min-h-11 rounded-full" variant={byMessage ? "default" : "outline"} aria-pressed={byMessage} onClick={() => setChannel("message")}>
                  Messagerie Guardiens
                </Button>
                <Button type="button" className="min-h-11 rounded-full" variant={byMessage ? "outline" : "default"} aria-pressed={!byMessage} onClick={() => setChannel("email")}>
                  Email signé Jérémie
                </Button>
              </div>
            )}
            {!byMessage && (
            <div className="space-y-1.5">
              <Label htmlFor="wtm-subject">Objet</Label>
              <Input id="wtm-subject" value={subject} maxLength={200} onChange={(e) => setSubject(e.target.value)} />
            </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="wtm-body">{target?.drafts?.length ? "Votre message, prêt à relire" : "Texte (une ligne vide sépare deux paragraphes)"}</Label>
              <Textarea id="wtm-body" rows={12} value={body} maxLength={5000} onChange={(e) => setBody(e.target.value)} />
              {versions.length > 1 && (
                <Button type="button" variant="outline" className="min-h-11 rounded-full" onClick={nextVersion} data-testid="wtm-next-version">
                  Autre version ({version + 1} sur {versions.length})
                </Button>
              )}
            </div>
            {!byMessage && (<>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="wtm-label">Libellé du lien</Label>
                <Input id="wtm-label" value={linkLabel} maxLength={60} onChange={(e) => setLinkLabel(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="wtm-url">Adresse du lien</Label>
                <Input id="wtm-url" value={linkUrl} placeholder="https://guardiens.fr/..." onChange={(e) => setLinkUrl(e.target.value)} />
              </div>
            </div>
            {linkCheck.ok ? (
              <p className="text-xs text-muted-foreground">Lien facultatif : remplissez les deux champs, ou videz les deux.</p>
            ) : (
              <p role="alert" data-testid="wtm-link-error" className="text-xs text-destructive">{linkCheck.error}</p>
            )}
            </>)}
            {target?.signalIds && target.signalIds.length > 0 && (
              <p className="text-xs text-muted-foreground">À l'envoi, la ligne quitte la liste.</p>
            )}
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
              {byMessage ? (
                <Button onClick={handleSendMessage} disabled={!canSubmit}>
                  {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Envoyer
                </Button>
              ) : (
                <Button onClick={handlePreview} disabled={!canSubmit}>
                  {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Aperçu
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
