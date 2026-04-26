import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Mail, Clock, FileText, Send, ShieldOff, History, Settings2, RefreshCw, AlertCircle, Ban, Eye, SendHorizonal, Pencil, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";

// ── Templates tab ──
const authTemplates = [
  { name: "Confirmation d'inscription", trigger: "Après inscription", key: "signup" },
  { name: "Réinitialisation de mot de passe", trigger: "Demande de reset", key: "recovery" },
  { name: "Lien magique", trigger: "Connexion sans mot de passe", key: "magic-link" },
  { name: "Changement d'email", trigger: "Modification d'email", key: "email-change" },
  { name: "Ré-authentification", trigger: "Action sensible", key: "reauthentication" },
  { name: "Invitation", trigger: "Invitation envoyée", key: "invite" },
];

interface TransactionalTemplate {
  name: string;
  displayName: string;
  subject: string;
  hasPreviewData: boolean;
}

const TemplatesTab = () => {
  const { user } = useAuth();
  const [transactionalTemplates, setTransactionalTemplates] = useState<TransactionalTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewSubject, setPreviewSubject] = useState("");
  const [previewName, setPreviewName] = useState("");
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [testEmail, setTestEmail] = useState(user?.email || "");
  const [sendingTest, setSendingTest] = useState<string | null>(null);
  const [authInfoOpen, setAuthInfoOpen] = useState(false);

  const fetchTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    const { data, error } = await supabase.functions.invoke("admin-preview-email", { body: {} });
    if (!error && data?.templates) {
      setTransactionalTemplates(data.templates);
    }
    setLoadingTemplates(false);
  }, []);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const handlePreview = async (templateName: string) => {
    setLoadingPreview(true);
    setPreviewOpen(true);
    setPreviewName(templateName);
    const { data, error } = await supabase.functions.invoke("admin-preview-email", {
      body: { templateName },
    });
    if (!error && data?.html) {
      setPreviewHtml(data.html);
      setPreviewSubject(data.subject);
    } else {
      setPreviewHtml("<p style='padding:20px;color:#999;'>Erreur lors du rendu du template.</p>");
      setPreviewSubject("");
    }
    setLoadingPreview(false);
  };

  const handleTestSend = async (templateName: string) => {
    if (!testEmail) { toast.error("Entrez un email de test"); return; }
    setSendingTest(templateName);
    const { error } = await supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName,
        recipientEmail: testEmail,
        idempotencyKey: `admin-test-${templateName}-${Date.now()}`,
      },
    });
    if (error) {
      toast.error("Erreur lors de l'envoi du test");
    } else {
      toast.success(`Email de test envoyé à ${testEmail}`);
    }
    setSendingTest(null);
  };

  const handleAuthPreview = async (type: string) => {
    setLoadingPreview(true);
    setPreviewOpen(true);
    setPreviewName(authTemplates.find(t => t.key === type)?.name || type);
    try {
      const { data, error } = await supabase.functions.invoke("admin-preview-email", {
        body: { authType: type },
      });
      if (!error && data?.html) {
        setPreviewHtml(data.html);
        setPreviewSubject("");
      } else {
        setPreviewHtml("<p style='padding:20px;color:#999;'>Erreur lors du rendu du template auth.</p>");
      }
    } catch {
      setPreviewHtml("<p style='padding:20px;color:#999;'>Erreur lors du rendu du template auth.</p>");
    }
    setLoadingPreview(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 bg-accent/50 rounded-lg p-3">
        <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="flex-1">
          <label className="text-xs font-medium text-muted-foreground">Email de test</label>
          <Input value={testEmail} onChange={e => setTestEmail(e.target.value)} placeholder="admin@example.com" className="h-8 text-sm mt-0.5" />
        </div>
      </div>

      <div>
        <h3 className="font-medium text-sm mb-3 flex items-center gap-2">
          <SendHorizonal className="h-4 w-4 text-primary" /> Templates transactionnels
          <Badge variant="secondary" className="text-[10px]">{transactionalTemplates.length}</Badge>
        </h3>
        {loadingTemplates ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Chargement des templates...</p>
        ) : transactionalTemplates.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Aucun template transactionnel trouvé</p>
        ) : (
          <div className="space-y-2">
            {transactionalTemplates.map((tpl) => (
              <Card key={tpl.name}>
                <CardContent className="flex items-center justify-between py-3 px-5">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Mail className="h-4 w-4 text-primary shrink-0" />
                    <div className="min-w-0">
                      <div className="font-medium text-sm">{tpl.displayName}</div>
                      <div className="text-xs text-muted-foreground truncate">Objet : {tpl.subject}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handlePreview(tpl.name)}>
                      <Eye className="h-3.5 w-3.5" /> Prévisualiser
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handleTestSend(tpl.name)} disabled={sendingTest === tpl.name}>
                      <Send className="h-3.5 w-3.5" /> {sendingTest === tpl.name ? "Envoi..." : "Envoyer un test"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="font-medium text-sm mb-3 flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" /> Templates d'authentification
          <Badge variant="outline" className="text-[10px]">Auth</Badge>
        </h3>
        <div className="space-y-2">
          {authTemplates.map((tpl) => (
            <Card key={tpl.key}>
              <CardContent className="flex items-center justify-between py-3 px-5">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <div className="font-medium text-sm">{tpl.name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> {tpl.trigger}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handleAuthPreview(tpl.key)}>
                    <Eye className="h-3.5 w-3.5" /> Prévisualiser
                  </Button>
                  <Badge variant="default" className="text-xs">Auth</Badge>
                  <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => setAuthInfoOpen(true)}>
                    <Info className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Preview dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base">Prévisualisation — {previewName}</DialogTitle>
            {previewSubject && <p className="text-sm text-muted-foreground">Objet : {previewSubject}</p>}
          </DialogHeader>
          <div className="flex-1 overflow-auto border rounded-lg bg-white">
            {loadingPreview ? (
              <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">Rendu en cours...</div>
            ) : (
              <iframe srcDoc={previewHtml} className="w-full h-[500px] border-0" sandbox="allow-same-origin" title="Email preview" />
            )}
          </div>
          <DialogFooter className="flex-row gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleTestSend(previewName)} disabled={sendingTest === previewName}>
              <Send className="h-3.5 w-3.5" /> {sendingTest === previewName ? "Envoi..." : `Envoyer un test à ${testEmail || "..."}`}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setPreviewOpen(false)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Auth info dialog */}
      <Dialog open={authInfoOpen} onOpenChange={setAuthInfoOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Info className="h-4 w-4 text-muted-foreground" /> Template d'authentification
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Ce template est géré dans le code source de l'application et ne peut pas être modifié depuis cette interface.
            </p>
            <p className="text-sm text-muted-foreground">
              Pour le modifier, contactez le support ou modifiez directement les fichiers dans <code className="text-xs bg-muted px-1.5 py-0.5 rounded">supabase/functions/_shared/email-templates/</code>.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setAuthInfoOpen(false)}>Compris</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ── Status badge helper ──
const statusConfig: Record<string, { label: string; variant: "default" | "destructive" | "secondary" | "outline" }> = {
  pending: { label: "En attente", variant: "secondary" },
  sent: { label: "Envoyé", variant: "default" },
  failed: { label: "Échoué", variant: "destructive" },
  dlq: { label: "Échoué (DLQ)", variant: "destructive" },
  suppressed: { label: "Supprimé", variant: "outline" },
  bounced: { label: "Rebond", variant: "destructive" },
  complained: { label: "Plainte", variant: "destructive" },
};

const StatusBadge = ({ status }: { status: string }) => {
  const config = statusConfig[status] || { label: status, variant: "outline" as const };
  return <Badge variant={config.variant} className="text-xs">{config.label}</Badge>;
};

// ── Logs tab ──
const LogsTab = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("7d");
  const [statusFilter, setStatusFilter] = useState("all");
  const [templateFilter, setTemplateFilter] = useState("all");
  const [templates, setTemplates] = useState<string[]>([]);
  const [stats, setStats] = useState({ total: 0, sent: 0, failed: 0, dlq: 0, suppressed: 0 });

  const fetchLogs = async () => {
    setLoading(true);
    const now = new Date();
    const start = new Date();
    if (timeRange === "24h") start.setHours(now.getHours() - 24);
    else if (timeRange === "7d") start.setDate(now.getDate() - 7);
    else if (timeRange === "30d") start.setDate(now.getDate() - 30);

    let query = supabase
      .from("email_send_log")
      .select("*")
      .gte("created_at", start.toISOString())
      .order("created_at", { ascending: false })
      .limit(500);

    if (statusFilter !== "all") query = query.eq("status", statusFilter);
    if (templateFilter !== "all") query = query.eq("template_name", templateFilter);

    const { data, error } = await query;
    if (error) {
      toast.error("Erreur lors du chargement des logs");
      setLoading(false);
      return;
    }

    const byMessageId = new Map<string, any>();
    (data || []).forEach((row) => {
      const key = row.message_id || row.id;
      if (!byMessageId.has(key) || new Date(row.created_at) > new Date(byMessageId.get(key).created_at)) {
        byMessageId.set(key, row);
      }
    });
    const deduped = Array.from(byMessageId.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    setLogs(deduped);
    setStats({
      total: deduped.length,
      sent: deduped.filter((l) => l.status === "sent").length,
      failed: deduped.filter((l) => l.status === "failed").length,
      dlq: deduped.filter((l) => l.status === "dlq").length,
      suppressed: deduped.filter((l) => l.status === "suppressed").length,
    });
    setLoading(false);
  };

  const fetchTemplates = async () => {
    const { data } = await supabase
      .from("email_send_log")
      .select("template_name")
      .limit(1000);
    const unique = [...new Set((data || []).map((d) => d.template_name))].sort();
    setTemplates(unique);
  };

  useEffect(() => { fetchTemplates(); }, []);
  useEffect(() => { fetchLogs(); }, [timeRange, statusFilter, templateFilter]);

  return (
    <div className="space-y-4">
      {stats.dlq > 0 && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm flex items-center justify-between gap-3">
          <span>
            ⚠️ <strong>{stats.dlq}</strong> email{stats.dlq > 1 ? "s" : ""} en DLQ (échec définitif après 5 tentatives) sur la période sélectionnée.
          </span>
          <Button size="sm" variant="outline" onClick={() => setStatusFilter("dlq")}>
            Voir
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="pt-4 pb-3 text-center">
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-xs text-muted-foreground">Total</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 text-center">
          <div className="text-2xl font-bold text-green-600">{stats.sent}</div>
          <div className="text-xs text-muted-foreground">Envoyés</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 text-center">
          <div className="text-2xl font-bold text-destructive">{stats.failed}</div>
          <div className="text-xs text-muted-foreground">Échoués</div>
        </CardContent></Card>
        <Card
          className={stats.dlq > 0 ? "border-destructive cursor-pointer hover:bg-destructive/5 transition-colors" : "cursor-pointer hover:bg-muted/50 transition-colors"}
          onClick={() => setStatusFilter("dlq")}
        >
          <CardContent className="pt-4 pb-3 text-center">
            <div className={`text-2xl font-bold ${stats.dlq > 0 ? "text-destructive" : "text-muted-foreground"}`}>{stats.dlq}</div>
            <div className="text-xs text-muted-foreground">DLQ</div>
          </CardContent>
        </Card>
        <Card><CardContent className="pt-4 pb-3 text-center">
          <div className="text-2xl font-bold text-yellow-600">{stats.suppressed}</div>
          <div className="text-xs text-muted-foreground">Supprimés</div>
        </CardContent></Card>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex gap-1">
          {["24h", "7d", "30d"].map((range) => (
            <Button key={range} size="sm" variant={timeRange === range ? "default" : "outline"} onClick={() => setTimeRange(range)}>
              {range === "24h" ? "24h" : range === "7d" ? "7 jours" : "30 jours"}
            </Button>
          ))}
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="sent">Envoyé</SelectItem>
            <SelectItem value="failed">Échoué</SelectItem>
            <SelectItem value="dlq">DLQ</SelectItem>
            <SelectItem value="suppressed">Supprimé</SelectItem>
          </SelectContent>
        </Select>
        <Select value={templateFilter} onValueChange={setTemplateFilter}>
          <SelectTrigger className="w-[180px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les templates</SelectItem>
            {templates.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" variant="ghost" onClick={fetchLogs}><RefreshCw className="h-3.5 w-3.5" /></Button>
      </div>

      <div className="rounded-md border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Template</TableHead>
              <TableHead className="text-xs">Destinataire</TableHead>
              <TableHead className="text-xs">Statut</TableHead>
              <TableHead className="text-xs">Date</TableHead>
              <TableHead className="text-xs">Erreur</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Chargement...</TableCell></TableRow>
            ) : logs.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Aucun email trouvé</TableCell></TableRow>
            ) : (
              logs.slice(0, 50).map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-xs font-mono">{log.template_name}</TableCell>
                  <TableCell className="text-xs">{log.recipient_email}</TableCell>
                  <TableCell><StatusBadge status={log.status} /></TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {format(new Date(log.created_at), "dd MMM HH:mm", { locale: fr })}
                  </TableCell>
                  <TableCell className="text-xs text-destructive max-w-[200px] truncate">{log.error_message || "—"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

// ── Suppressions tab ──
const SuppressionsTab = () => {
  const [suppressions, setSuppressions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSuppressions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("suppressed_emails")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) setSuppressions(data || []);
    setLoading(false);
  };

  const handleUnblock = async (id: string, email: string) => {
    const { error } = await supabase.from("suppressed_emails").delete().eq("id", id);
    if (error) {
      toast.error("Erreur lors du déblocage");
    } else {
      toast.success(`${email} débloqué`);
      setSuppressions((prev) => prev.filter((s) => s.id !== id));
    }
  };

  useEffect(() => { fetchSuppressions(); }, []);

  const reasonLabels: Record<string, string> = {
    unsubscribe: "Désabonnement",
    bounce: "Rebond",
    complaint: "Plainte spam",
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Emails bloqués automatiquement suite à un rebond, une plainte ou un désabonnement.
      </p>
      <div className="rounded-md border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Email</TableHead>
              <TableHead className="text-xs">Raison</TableHead>
              <TableHead className="text-xs">Date</TableHead>
              <TableHead className="text-xs">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Chargement...</TableCell></TableRow>
            ) : suppressions.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Aucun email bloqué 🎉</TableCell></TableRow>
            ) : (
              suppressions.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="text-sm">{s.email}</TableCell>
                  <TableCell>
                    <Badge variant={s.reason === "bounce" || s.reason === "complaint" ? "destructive" : "secondary"} className="text-xs">
                      {reasonLabels[s.reason] || s.reason}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {format(new Date(s.created_at), "dd MMM yyyy HH:mm", { locale: fr })}
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => handleUnblock(s.id, s.email)}>
                      <ShieldOff className="h-3.5 w-3.5 mr-1" /> Débloquer
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

// ── Config tab ──
const ConfigTab = () => {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchConfig = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("email_send_state")
      .select("*")
      .eq("id", 1)
      .single();
    if (!error && data) setConfig(data);
    setLoading(false);
  };

  const saveConfig = async () => {
    if (!config) return;
    setSaving(true);
    const { error } = await supabase
      .from("email_send_state")
      .update({
        batch_size: config.batch_size,
        send_delay_ms: config.send_delay_ms,
        auth_email_ttl_minutes: config.auth_email_ttl_minutes,
        transactional_email_ttl_minutes: config.transactional_email_ttl_minutes,
      })
      .eq("id", 1);
    if (error) toast.error("Erreur lors de la sauvegarde");
    else toast.success("Configuration sauvegardée");
    setSaving(false);
  };

  useEffect(() => { fetchConfig(); }, []);

  if (loading || !config) return <div className="text-center text-muted-foreground py-8">Chargement...</div>;

  return (
    <div className="space-y-6 max-w-lg">
      <p className="text-sm text-muted-foreground">
        Paramètres de la file d'envoi. Les changements prennent effet immédiatement.
      </p>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium">Taille du batch</label>
          <p className="text-xs text-muted-foreground mb-2">Nombre d'emails traités par cycle (actuel : {config.batch_size})</p>
          <Input type="number" min={1} max={100} value={config.batch_size} onChange={(e) => setConfig({ ...config, batch_size: parseInt(e.target.value) || 10 })} />
        </div>

        <div>
          <label className="text-sm font-medium">Délai entre envois (ms)</label>
          <p className="text-xs text-muted-foreground mb-2">Pause entre chaque email (actuel : {config.send_delay_ms}ms)</p>
          <Input type="number" min={0} max={5000} value={config.send_delay_ms} onChange={(e) => setConfig({ ...config, send_delay_ms: parseInt(e.target.value) || 200 })} />
        </div>

        <div>
          <label className="text-sm font-medium">TTL emails d'authentification (minutes)</label>
          <p className="text-xs text-muted-foreground mb-2">Durée de vie max d'un email d'auth (actuel : {config.auth_email_ttl_minutes} min)</p>
          <Input type="number" min={1} max={120} value={config.auth_email_ttl_minutes} onChange={(e) => setConfig({ ...config, auth_email_ttl_minutes: parseInt(e.target.value) || 15 })} />
        </div>

        <div>
          <label className="text-sm font-medium">TTL emails transactionnels (minutes)</label>
          <p className="text-xs text-muted-foreground mb-2">Durée de vie max d'un email transactionnel (actuel : {config.transactional_email_ttl_minutes} min)</p>
          <Input type="number" min={1} max={1440} value={config.transactional_email_ttl_minutes} onChange={(e) => setConfig({ ...config, transactional_email_ttl_minutes: parseInt(e.target.value) || 60 })} />
        </div>

        {config.retry_after_until && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="py-3 px-4">
              <div className="flex items-center gap-2 text-yellow-800 text-sm">
                <AlertCircle className="h-4 w-4" />
                Rate-limit actif jusqu'à {format(new Date(config.retry_after_until), "dd MMM HH:mm", { locale: fr })}
              </div>
            </CardContent>
          </Card>
        )}

        <Button onClick={saveConfig} disabled={saving}>
          {saving ? "Sauvegarde..." : "Sauvegarder"}
        </Button>
      </div>
    </div>
  );
};

// ── Main page ──
const AdminEmails = () => {
  return (
    <div className="space-y-6">
      <h1 className="font-body text-2xl font-bold">Emails & Communications</h1>

      <Tabs defaultValue="templates" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="templates" className="text-xs gap-1">
            <FileText className="h-3.5 w-3.5" /> Templates
          </TabsTrigger>
          <TabsTrigger value="logs" className="text-xs gap-1">
            <History className="h-3.5 w-3.5" /> Logs
          </TabsTrigger>
          <TabsTrigger value="suppressions" className="text-xs gap-1">
            <Ban className="h-3.5 w-3.5" /> Suppressions
          </TabsTrigger>
          <TabsTrigger value="config" className="text-xs gap-1">
            <Settings2 className="h-3.5 w-3.5" /> Config
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates"><TemplatesTab /></TabsContent>
        <TabsContent value="logs"><LogsTab /></TabsContent>
        <TabsContent value="suppressions"><SuppressionsTab /></TabsContent>
        <TabsContent value="config"><ConfigTab /></TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminEmails;
