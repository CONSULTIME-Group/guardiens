import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Mail, Eye, CheckCircle2, Clock, MessageSquare, XCircle, Send, Loader2, AlertCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const escapeHtml = (text: string): string =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\n/g, '<br/>');

type StatusFilter = "all" | "new" | "read" | "replied" | "closed";

const AdminContactMessages = () => {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 20;

  const [viewModal, setViewModal] = useState<{ open: boolean; msg: any | null }>({ open: false, msg: null });
  const [adminNotes, setAdminNotes] = useState("");
  const [replyText, setReplyText] = useState("");
  const [sendLoading, setSendLoading] = useState(false);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("contact_messages")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (filter !== "all") {
      query = query.eq("status", filter);
    }

    const { data, count } = await query;
    setMessages(data || []);
    setTotal(count || 0);
    setLoading(false);
  }, [filter, page]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  const updateStatus = async (id: string, status: string, notes?: string) => {
    const update: any = { status };
    if (status === "closed") update.resolved_at = new Date().toISOString();
    if (notes !== undefined) update.admin_notes = notes;

    const { error } = await supabase.from("contact_messages").update(update).eq("id", id);
    if (error) { toast.error("Erreur"); return; }
    toast.success("Statut mis à jour");
    fetchMessages();
    window.dispatchEvent(new Event("admin-badges-refresh"));
  };

  const handleView = async (msg: any) => {
    setViewModal({ open: true, msg });
    setAdminNotes(msg.admin_notes || "");
    setReplyText("");
    if (msg.status === "new") {
      await updateStatus(msg.id, "read");
    }
  };

  const handleSendReply = async () => {
    if (!viewModal.msg || !replyText.trim() || sendLoading) return;
    setSendLoading(true);
    const msg = viewModal.msg;
    const firstName = msg.name?.split(' ')[0]?.trim() || '';

    try {
      const { error: emailError } = await supabase.functions.invoke(
        'send-transactional-email',
        {
          body: {
            templateName: 'contact-reply',
            recipientEmail: msg.email,
            idempotencyKey: `contact-reply-${msg.id}-${Date.now()}`,
            templateData: {
              firstName,
              originalMessage: msg.message ?? '',
              replyBody: replyText.trim(),
              subject: `Re: ${msg.subject?.trim() || 'Votre message à Guardiens'}`,
            },
          }
        }
      );

      if (emailError) throw emailError;

      const replyLog = `[Réponse envoyée le ${new Date().toLocaleString('fr-FR')}]\n${replyText.trim()}`;

      const { error: dbError } = await supabase
        .from('contact_messages')
        .update({
          status: 'replied',
          admin_notes: adminNotes?.trim()
            ? `${adminNotes.trim()}\n\n${replyLog}`
            : replyLog,
          resolved_at: new Date().toISOString()
        })
        .eq('id', msg.id);

      if (dbError) throw dbError;

      toast.success("Réponse envoyée ✓", {
        description: `Email envoyé à ${msg.email}`,
        duration: 3000
      });

      setViewModal({ open: false, msg: null });
      fetchMessages();
      window.dispatchEvent(new Event("admin-badges-refresh"));
    } catch {
      toast.error("Erreur d'envoi", {
        description: "Impossible d'envoyer l'email. Vérifie la configuration email.",
        duration: 5000
      });
    } finally {
      setSendLoading(false);
    }
  };

  const handleMarkReplied = async () => {
    if (!viewModal.msg) return;
    try {
      const { error } = await supabase
        .from('contact_messages')
        .update({
          status: 'replied',
          admin_notes: adminNotes?.trim() || null,
          resolved_at: new Date().toISOString()
        })
        .eq('id', viewModal.msg.id);

      if (error) throw error;

      toast.success("Marqué comme répondu", {
        description: "Aucun email envoyé.",
        duration: 2000
      });

      setViewModal({ open: false, msg: null });
      fetchMessages();
      window.dispatchEvent(new Event("admin-badges-refresh"));
    } catch {
      toast.error("Erreur", {
        description: "Impossible de mettre à jour le statut. Réessaie.",
        duration: 5000
      });
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "new": return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 border-0"><Clock className="h-3 w-3 mr-1" />Nouveau</Badge>;
      case "read": return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-0"><Eye className="h-3 w-3 mr-1" />Lu</Badge>;
      case "replied": return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-0"><CheckCircle2 className="h-3 w-3 mr-1" />Répondu</Badge>;
      case "closed": return <Badge className="bg-muted text-muted-foreground border-0"><XCircle className="h-3 w-3 mr-1" />Fermé</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const isOverdue = (msg: any) => {
    if (!msg.created_at) return false;
    if (msg.status !== "new" && msg.status !== "read") return false;
    const elapsed = Date.now() - new Date(msg.created_at).getTime();
    return elapsed > 48 * 60 * 60 * 1000;
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);



  if (loading) return <div className="text-muted-foreground py-8 text-center">Chargement…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-body text-2xl font-bold">Messages contact</h1>
        <div className="flex gap-2">
          {(["all", "new", "read", "replied", "closed"] as StatusFilter[]).map(f => (
            <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => { setFilter(f); setPage(0); }}>
              {{ all: "Tous", new: "Nouveaux", read: "Lus", replied: "Répondus", closed: "Fermés" }[f]}
            </Button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Nouveaux", icon: Clock, filter: "new" as const, color: "yellow" },
          { label: "Lus", icon: Eye, filter: "read" as const, color: "blue" },
          { label: "Répondus", icon: CheckCircle2, filter: "replied" as const, color: "green" },
          { label: "Fermés", icon: XCircle, filter: "closed" as const, color: "gray" },
        ].map(s => (
          <Card key={s.label} className="cursor-pointer hover:shadow-sm transition-shadow" onClick={() => { setFilter(s.filter); setPage(0); }}>
            <CardContent className="p-3 flex items-center gap-2">
              <s.icon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{s.label}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {messages.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <MessageSquare className="h-12 w-12 mx-auto mb-3 text-primary/40" />
          <p className="font-medium">Aucun message</p>
        </div>
      ) : (
        <>
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Sujet</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Statut</TableHead>
                   <TableHead>Assigné</TableHead>
                   <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {messages.map(msg => (
                  <TableRow key={msg.id} className={msg.status === "new" ? "font-medium" : ""}>
                    <TableCell>{msg.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{msg.email}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{msg.subject}</TableCell>
                    <TableCell className="text-sm">{format(new Date(msg.created_at), "d MMM yyyy HH:mm", { locale: fr })}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {statusBadge(msg.status)}
                        {isOverdue(msg) && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Clock className="h-4 w-4 text-orange-600 shrink-0" />
                              </TooltipTrigger>
                              <TooltipContent><p>Sans réponse depuis plus de 48h</p></TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">—</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs" onClick={() => handleView(msg)}>
                          <Eye className="h-3.5 w-3.5" /> Lire
                        </Button>
                        {msg.status !== "closed" && (
                          <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs" onClick={() => updateStatus(msg.id, "closed")}>
                            <XCircle className="h-3.5 w-3.5" /> Fermer
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{total} message{total > 1 ? "s" : ""}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Précédent</Button>
                <span className="text-sm py-2 px-2">{page + 1} / {totalPages}</span>
                <Button size="sm" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Suivant</Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* View / Reply modal */}
      <Dialog open={viewModal.open} onOpenChange={(o) => !o && setViewModal({ open: false, msg: null })}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Message de {viewModal.msg?.name}</DialogTitle></DialogHeader>
          {viewModal.msg && (() => {
            const recipientFirstName = viewModal.msg.name?.split(' ')[0]?.trim() || null;
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">Email :</span> <a href={`mailto:${viewModal.msg.email}`} className="text-primary hover:underline">{viewModal.msg.email}</a></div>
                  <div><span className="text-muted-foreground">Date :</span> {format(new Date(viewModal.msg.created_at), "d MMMM yyyy à HH:mm", { locale: fr })}</div>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Sujet</p>
                  <p className="font-medium">{viewModal.msg.subject}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Message</p>
                  <div className="bg-muted rounded-lg p-4 text-sm whitespace-pre-wrap">{viewModal.msg.message}</div>
                </div>

                <div className="border-t border-border my-4" />

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notes internes</label>
                  <Textarea placeholder="Notes internes ou actions effectuées..." value={adminNotes} onChange={e => setAdminNotes(e.target.value)} className="min-h-[72px] text-sm resize-none" />
                  <p className="text-xs text-muted-foreground">Visible uniquement par l'équipe Guardiens. Jamais envoyé.</p>
                </div>

                <div className="border-t border-border my-4" />

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Répondre à {viewModal.msg.name ?? viewModal.msg.email}</label>
                  <Textarea
                    placeholder={recipientFirstName ? `Bonjour ${recipientFirstName}, merci pour votre message...` : "Bonjour, merci pour votre message..."}
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    className="min-h-[100px] text-sm resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    Sera envoyé à{" "}<span className="text-foreground font-medium">{viewModal.msg.email}</span>{" "}depuis guardiens.fr
                  </p>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" onClick={() => setViewModal({ open: false, msg: null })} className="flex-1" disabled={sendLoading}>Fermer</Button>
                  <Button variant="outline" onClick={handleMarkReplied} disabled={sendLoading} className="shrink-0 text-muted-foreground" title="Marquer comme répondu sans envoyer d'email">Marquer répondu</Button>
                  <Button onClick={handleSendReply} disabled={!replyText.trim() || sendLoading} className="flex-1">
                    {sendLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Envoi…</> : <><Send className="w-4 h-4 mr-2" />Envoyer</>}
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminContactMessages;
