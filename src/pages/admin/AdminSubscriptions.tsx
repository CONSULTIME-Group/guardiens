import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";
import { CreditCard, Users, Crown, AlertTriangle, Clock, Gift, Plus, Minus, ShieldCheck, ShieldX, Search, Eye, Mail, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const planLabels: Record<string, { label: string; color: string }> = {
  founder_free: { label: "Fondateur", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" },
  annual_sitter: { label: "Premium", color: "bg-primary/10 text-primary" },
  free_launch: { label: "Lancement gratuit", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  owner_free: { label: "Proprio gratuit", color: "bg-muted text-muted-foreground" },
};

const AdminSubscriptions = () => {
  const navigate = useNavigate();
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterPlan, setFilterPlan] = useState("all");
  const [filterExpiring, setFilterExpiring] = useState(false);
  const [metrics, setMetrics] = useState({ active: 0, founders: 0, expiredMonth: 0, revenue: 0 });
  const [actionModal, setActionModal] = useState<{ open: boolean; sub: any; action: string; duration: string; motif: string }>({
    open: false, sub: null, action: "", duration: "1", motif: ""
  });
  const [founderReminder, setFounderReminder] = useState<{ type: "30" | "7" | null; count: number; loading: boolean; sending: boolean }>({
    type: null, count: 0, loading: false, sending: false,
  });

  const fetchSubscriptions = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("subscriptions")
      .select("*, profile:profiles!subscriptions_user_id_fkey(first_name, last_name, email, avatar_url, role, is_founder)")
      .order("expires_at", { ascending: true });

    if (filterPlan !== "all") query = query.eq("plan", filterPlan as any);

    const { data, error } = await query;
    if (error) toast.error("Erreur de chargement");
    else {
      let subs = data || [];
      if (filterExpiring) {
        const in30days = new Date(Date.now() + 30 * 86400000);
        subs = subs.filter(s => s.status === "active" && s.expires_at && new Date(s.expires_at) <= in30days);
      }
      setSubscriptions(subs);

      // Compute metrics
      const allData = data || [];
      const now = new Date();
      const monthAgo = new Date(Date.now() - 30 * 86400000);
      setMetrics({
        active: allData.filter(s => s.status === "active").length,
        founders: allData.filter(s => s.plan === "founder_free" && s.status === "active").length,
        expiredMonth: allData.filter(s => s.status === "expired" && s.expires_at && new Date(s.expires_at) >= monthAgo).length,
        revenue: allData.filter(s => s.plan === "annual_sitter" && s.status === "active").length * 49,
      });
    }
    setLoading(false);
  }, [filterPlan, filterExpiring]);

  useEffect(() => { fetchSubscriptions(); }, [fetchSubscriptions]);

  // Also fetch profiles without subscriptions (founders, owners)
  const [unsubscribedProfiles, setUnsubscribedProfiles] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("profiles").select("id, first_name, last_name, email, avatar_url, role, is_founder").eq("is_founder", true).then(({ data }) => {
      setUnsubscribedProfiles(data || []);
    });
  }, []);

  const handleAction = async () => {
    const { sub, action, duration, motif } = actionModal;
    if (!sub) return;

    if (action === "offer_premium") {
      const months = parseInt(duration);
      const expiresAt = new Date(Date.now() + months * 30 * 86400000).toISOString();
      // Upsert subscription
      const { error } = await supabase.from("subscriptions").upsert({
        user_id: sub.user_id || sub.id,
        plan: "annual_sitter" as any,
        status: "active" as any,
        started_at: new Date().toISOString(),
        expires_at: expiresAt,
      }, { onConflict: "user_id" });
      if (error) { toast.error("Erreur"); return; }
      await supabase.from("notifications").insert({
        user_id: sub.user_id || sub.id, type: "subscription_offered",
        title: "Accès Premium offert !",
        body: `L'équipe Guardiens vous offre ${months} mois d'accès Premium. Motif : ${motif || "—"}.`,
        link: "/dashboard",
      });
      toast.success("Premium offert");
    } else if (action === "extend") {
      const months = parseInt(duration);
      const currentExpiry = sub.expires_at ? new Date(sub.expires_at) : new Date();
      const newExpiry = new Date(currentExpiry.getTime() + months * 30 * 86400000).toISOString();
      await supabase.from("subscriptions").update({ expires_at: newExpiry, status: "active" as any }).eq("id", sub.id);
      toast.success(`Prolongé de ${months} mois`);
    } else if (action === "grant_founder") {
      await supabase.from("profiles").update({ is_founder: true }).eq("id", sub.user_id || sub.id);
      toast.success("Badge Fondateur attribué");
    } else if (action === "revoke_founder") {
      await supabase.from("profiles").update({ is_founder: false }).eq("id", sub.user_id || sub.id);
      toast.success("Badge Fondateur retiré");
    } else if (action === "downgrade") {
      await supabase.from("subscriptions").update({ status: "cancelled" as any }).eq("id", sub.id);
      toast.success("Rétrogradé en gratuit");
    }

    setActionModal({ open: false, sub: null, action: "", duration: "1", motif: "" });
    fetchSubscriptions();
  };

  const filtered = subscriptions.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return s.profile?.first_name?.toLowerCase().includes(q) || s.profile?.last_name?.toLowerCase().includes(q) || s.profile?.email?.toLowerCase().includes(q);
  });

  // Count expiring in 30 days
  const expiringCount = subscriptions.filter(s => s.status === "active" && s.expires_at && differenceInDays(new Date(s.expires_at), new Date()) <= 30 && differenceInDays(new Date(s.expires_at), new Date()) >= 0).length;

  const handleFounderReminderClick = async (type: "30" | "7") => {
    setFounderReminder({ type, count: 0, loading: true, sending: false });
    // Count eligible founders
    const { data: founders } = await supabase
      .from("profiles")
      .select("id")
      .eq("is_founder", true);

    let count = 0;
    for (const f of (founders || [])) {
      const { data: sub } = await supabase
        .from("abonnements")
        .select("statut")
        .eq("user_id", f.id)
        .in("statut", ["trial", "active"])
        .limit(1);
      if (!sub || sub.length === 0) count++;
    }
    setFounderReminder({ type, count, loading: false, sending: false });
  };

  const confirmFounderReminder = async () => {
    const type = founderReminder.type;
    if (!type) return;
    setFounderReminder(s => ({ ...s, sending: true }));
    try {
      const { data, error } = await supabase.functions.invoke(`send-founder-reminder-${type}`);
      if (error) throw error;
      toast.success(`Email envoyé à ${data?.sent || 0} fondateur(s)`);
    } catch {
      toast.error("Erreur lors de l'envoi des emails");
    }
    setFounderReminder({ type: null, count: 0, loading: false, sending: false });
  };

  return (
    <div className="space-y-6">
      <h1 className="font-body text-2xl font-bold">Abonnements</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><Users className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-2xl font-bold">{metrics.active}</p>
              <p className="text-xs text-muted-foreground">Abonnés actifs</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30"><Crown className="h-5 w-5 text-amber-600 dark:text-amber-400" /></div>
            <div>
              <p className="text-2xl font-bold">{metrics.founders}</p>
              <p className="text-xs text-muted-foreground">Fondateurs actifs</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30"><AlertTriangle className="h-5 w-5 text-red-500" /></div>
            <div>
              <p className="text-2xl font-bold">{metrics.expiredMonth}</p>
              <p className="text-xs text-muted-foreground">Expirés ce mois</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30"><CreditCard className="h-5 w-5 text-green-600 dark:text-green-400" /></div>
            <div>
              <p className="text-2xl font-bold">{metrics.revenue}€</p>
              <p className="text-xs text-muted-foreground">Revenus estimés</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Expiring alert */}
      {expiringCount > 0 && (
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-900/10 dark:border-orange-800">
          <CardContent className="p-3 flex items-center gap-3">
            <Clock className="h-5 w-5 text-orange-500 shrink-0" />
            <p className="text-sm flex-1">{expiringCount} abonnement{expiringCount > 1 ? "s" : ""} expire{expiringCount > 1 ? "nt" : ""} dans les 30 prochains jours</p>
            <Button size="sm" variant="outline" onClick={() => setFilterExpiring(true)}>Voir</Button>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher nom ou email…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterPlan} onValueChange={(v) => { setFilterPlan(v); setFilterExpiring(false); }}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les plans</SelectItem>
            <SelectItem value="founder_free">Fondateur</SelectItem>
            <SelectItem value="annual_sitter">Premium (49€)</SelectItem>
            <SelectItem value="free_launch">Lancement gratuit</SelectItem>
            <SelectItem value="owner_free">Proprio gratuit</SelectItem>
          </SelectContent>
        </Select>
        {filterExpiring && (
          <Button variant="outline" size="sm" onClick={() => setFilterExpiring(false)}>× Retirer filtre expiration</Button>
        )}
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Membre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rôle</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Date début</TableHead>
              <TableHead>Expiration</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Fondateur</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Chargement…</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Aucun abonnement trouvé</TableCell></TableRow>
            ) : filtered.map((sub) => {
              const plan = planLabels[sub.plan] || { label: sub.plan, color: "bg-muted text-muted-foreground" };
              const isExpiringSoon = sub.status === "active" && sub.expires_at && differenceInDays(new Date(sub.expires_at), new Date()) <= 30 && differenceInDays(new Date(sub.expires_at), new Date()) >= 0;
              return (
                <TableRow key={sub.id} className={isExpiringSoon ? "bg-orange-50/50 dark:bg-orange-900/5" : ""}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {sub.profile?.avatar_url && <img src={sub.profile.avatar_url} className="w-6 h-6 rounded-full object-cover" />}
                      <span className="font-medium text-sm">{sub.profile?.first_name} {sub.profile?.last_name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{sub.profile?.email}</TableCell>
                  <TableCell className="text-xs capitalize">{sub.profile?.role}</TableCell>
                  <TableCell>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${plan.color}`}>{plan.label}</span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{sub.started_at ? format(new Date(sub.started_at), "d MMM yyyy", { locale: fr }) : "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {sub.expires_at ? format(new Date(sub.expires_at), "d MMM yyyy", { locale: fr }) : "Illimité"}
                    {isExpiringSoon && <span className="ml-1 text-orange-500 font-medium">⚠</span>}
                  </TableCell>
                  <TableCell>
                    <Badge variant={sub.status === "active" ? "default" : sub.status === "expired" ? "destructive" : "outline"}>
                      {sub.status === "active" ? "Actif" : sub.status === "expired" ? "Expiré" : "Annulé"}
                    </Badge>
                  </TableCell>
                  <TableCell>{sub.profile?.is_founder ? <Crown className="h-4 w-4 text-amber-500" /> : "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" title="Voir profil" onClick={() => navigate(`/profil/${sub.user_id}`)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Offrir Premium" onClick={() => setActionModal({ open: true, sub, action: "offer_premium", duration: "1", motif: "" })}>
                        <Gift className="h-4 w-4 text-primary" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Prolonger" onClick={() => setActionModal({ open: true, sub, action: "extend", duration: "1", motif: "" })}>
                        <Plus className="h-4 w-4" />
                      </Button>
                      {sub.profile?.is_founder ? (
                        <Button variant="ghost" size="icon" title="Révoquer Fondateur" onClick={() => setActionModal({ open: true, sub, action: "revoke_founder", duration: "", motif: "" })}>
                          <ShieldX className="h-4 w-4 text-destructive" />
                        </Button>
                      ) : (
                        <Button variant="ghost" size="icon" title="Attribuer Fondateur" onClick={() => setActionModal({ open: true, sub, action: "grant_founder", duration: "", motif: "" })}>
                          <ShieldCheck className="h-4 w-4 text-amber-500" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Action modal */}
      <Dialog open={actionModal.open} onOpenChange={(o) => !o && setActionModal({ open: false, sub: null, action: "", duration: "1", motif: "" })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionModal.action === "offer_premium" && "Offrir Premium gratuit"}
              {actionModal.action === "extend" && "Prolonger l'abonnement"}
              {actionModal.action === "grant_founder" && "Attribuer le badge Fondateur"}
              {actionModal.action === "revoke_founder" && "Révoquer le badge Fondateur"}
              {actionModal.action === "downgrade" && "Rétrograder en gratuit"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {(actionModal.action === "offer_premium" || actionModal.action === "extend") && (
              <Select value={actionModal.duration} onValueChange={(v) => setActionModal(s => ({ ...s, duration: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 mois</SelectItem>
                  <SelectItem value="3">3 mois</SelectItem>
                  <SelectItem value="6">6 mois</SelectItem>
                  <SelectItem value="12">1 an</SelectItem>
                </SelectContent>
              </Select>
            )}
            {actionModal.action === "offer_premium" && (
              <Input placeholder="Motif (optionnel)" value={actionModal.motif} onChange={(e) => setActionModal(s => ({ ...s, motif: e.target.value }))} />
            )}
            {actionModal.action === "revoke_founder" && (
              <DialogDescription>Le badge Fondateur sera retiré de ce profil. Cette action est réversible.</DialogDescription>
            )}
            {actionModal.action === "grant_founder" && (
              <DialogDescription>Le badge Fondateur sera ajouté au profil de cet utilisateur.</DialogDescription>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionModal({ open: false, sub: null, action: "", duration: "1", motif: "" })}>Annuler</Button>
            <Button onClick={handleAction} variant={actionModal.action === "revoke_founder" ? "destructive" : "default"}>Confirmer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSubscriptions;
