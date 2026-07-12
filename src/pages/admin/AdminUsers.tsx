import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Eye, Ban, ShieldCheck, StickyNote, RotateCcw, Trash2, Crown, ChevronLeft, ChevronRight, MessageSquare, FileText, MailCheck, UserCog } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SuspendUserDialog } from "./_components/users/SuspendUserDialog";
import { NoteUserDialog } from "./_components/users/NoteUserDialog";
import { DeleteUserDialog } from "./_components/users/DeleteUserDialog";
import { SendMessageDialog, type MessageModalState } from "./_components/users/SendMessageDialog";
import { MessageHistoryDialog, type HistoryItem } from "./_components/users/MessageHistoryDialog";
import { LastMessageDialog, type LastMessageState } from "./_components/users/LastMessageDialog";
import { ErrorDetailDialog, type ErrorDetailState } from "./_components/users/ErrorDetailDialog";
import ChangeRoleDialog from "./_components/users/ChangeRoleDialog";
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

const roleLabels: Record<string, string> = {
  owner: "Propriétaire",
  sitter: "Gardien",
  both: "Les deux",
};

const verificationLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  not_submitted: { label: "Non vérifié", variant: "outline" },
  pending: { label: "En attente", variant: "secondary" },
  verified: { label: "Vérifié", variant: "default" },
  rejected: { label: "Refusé", variant: "destructive" },
};

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  active: { label: "Actif", variant: "default" },
  suspended: { label: "Suspendu", variant: "destructive" },
  deletion_pending: { label: "Suppression en cours", variant: "secondary" },
};

import { DEPT_NAMES, getDeptLabel } from "@/lib/departments";
import { getCountryName } from "@/lib/countries";

const PAGE_SIZE = 50;

const AdminUsers = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterVerification, setFilterVerification] = useState("all");
  const [filterDept, setFilterDept] = useState("all");
  const [filterCountry, setFilterCountry] = useState("all");
  const [page, setPage] = useState(0);
  const [countryStats, setCountryStats] = useState<{ intl: number; codes: string[] }>({ intl: 0, codes: [] });

  // Modal states
  const [noteModal, setNoteModal] = useState<{ open: boolean; userId: string; currentNote: string }>({
    open: false, userId: "", currentNote: ""
  });
  const [suspendModal, setSuspendModal] = useState<{ open: boolean; userId: string; reason: string }>({
    open: false, userId: "", reason: ""
  });
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; userId: string; userName: string }>({
    open: false, userId: "", userName: ""
  });
  const [deleting, setDeleting] = useState(false);
  const [messageModal, setMessageModal] = useState<MessageModalState>({
    open: false, userId: "", userName: "", content: "", step: "edit"
  });
  const [sendingMessage, setSendingMessage] = useState(false);
  const [historyModal, setHistoryModal] = useState<{ open: boolean; loading: boolean; items: HistoryItem[] }>({
    open: false, loading: false, items: [],
  });
  const [errorDetailModal, setErrorDetailModal] = useState<ErrorDetailState>({
    open: false, recipient: "", sentAt: "", error: "", content: "",
  });
  const [lastMessageModal, setLastMessageModal] = useState<LastMessageState>({
    open: false, loading: false, userName: "", userId: "", conversationId: null, content: null, sentAt: null
  });
  const [roleModal, setRoleModal] = useState<{ open: boolean; userId: string | null; userName: string; currentRole: "owner" | "sitter" | "both" | null }>({
    open: false, userId: null, userName: "", currentRole: null,
  });
  const [verifyModal, setVerifyModal] = useState<{ open: boolean; userId: string; userName: string; email: string }>({
    open: false, userId: "", userName: "", email: "",
  });
  const [verifying, setVerifying] = useState(false);
  const [superModal, setSuperModal] = useState<{ open: boolean; userId: string; userName: string; email: string; newValue: boolean }>({
    open: false, userId: "", userName: "", email: "", newValue: false,
  });
  const [togglingSuper, setTogglingSuper] = useState(false);
  const [reactivateModal, setReactivateModal] = useState<{ open: boolean; userId: string; userName: string; email: string }>({
    open: false, userId: "", userName: "", email: "",
  });
  const [reactivating, setReactivating] = useState(false);
  const navigate = useNavigate();

  const openHistory = async () => {
    setHistoryModal({ open: true, loading: true, items: [] });
    // Source de vérité : journal d'audit côté back-office
    const { data: logs, error: logErr } = await supabase
      .from("admin_message_logs")
      .select("id, conversation_id, message_id, content, sent_at, recipient_id, recipient_email, recipient_name, status, error_message")
      .order("sent_at", { ascending: false })
      .limit(200);
    if (logErr) {
      toast.error("Erreur de chargement du journal");
      setHistoryModal({ open: false, loading: false, items: [] });
      return;
    }
    const recipientIds = Array.from(new Set((logs || []).map((l: any) => l.recipient_id)));
    let avatarMap = new Map<string, string | null>();
    if (recipientIds.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, avatar_url")
        .in("id", recipientIds);
      avatarMap = new Map((profs || []).map((p: any) => [p.id, p.avatar_url]));
    }
    const items = (logs || []).map((l: any) => ({
      id: l.id,
      conversation_id: l.conversation_id,
      content: l.content,
      created_at: l.sent_at,
      recipient_id: l.recipient_id,
      recipient_name: l.recipient_name || l.recipient_email || "Utilisateur",
      recipient_avatar: avatarMap.get(l.recipient_id) || null,
      status: (l.status === "failed" ? "failed" : "success") as "success" | "failed",
      error_message: l.error_message ?? null,
    }));
    setHistoryModal({ open: true, loading: false, items });
  };

  const openLastMessage = async (userId: string, userName: string) => {
    setLastMessageModal({ open: true, loading: true, userName, userId, conversationId: null, content: null, sentAt: null });
    const { data, error } = await supabase
      .from("admin_message_logs")
      .select("conversation_id, content, sent_at")
      .eq("recipient_id", userId)
      .order("sent_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      toast.error("Erreur de chargement");
      setLastMessageModal({ open: false, loading: false, userName: "", userId: "", conversationId: null, content: null, sentAt: null });
      return;
    }
    setLastMessageModal({
      open: true,
      loading: false,
      userName,
      userId,
      conversationId: data?.conversation_id ?? null,
      content: data?.content ?? null,
      sentAt: data?.sent_at ?? null,
    });
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    let query = supabase
      .from("profiles")
      .select(
        "id, first_name, last_name, role, city, postal_code, country, avatar_url, bio, profile_completion, created_at, updated_at, last_seen_at, cancellation_count, identity_verified, identity_verification_status, account_status, is_founder, skill_categories, available_for_help, custom_skills, completed_sits_count, cancellations_as_proprio, email",
        { count: "exact" },
      )
      .order("created_at", { ascending: false });

    if (filterRole !== "all") query = query.eq("role", filterRole as any);
    if (filterVerification !== "all") query = query.eq("identity_verification_status", filterVerification);

    if (filterCountry === "FR") {
      query = query.or("country.eq.FR,country.is.null");
    } else if (filterCountry === "INTL") {
      query = query.not("country", "is", null).neq("country", "FR");
    } else if (filterCountry !== "all") {
      query = query.eq("country", filterCountry);
    }

    if (filterDept !== "all") {
      if (filterDept === "2A") query = query.gte("postal_code", "20000").lte("postal_code", "20199");
      else if (filterDept === "2B") query = query.gte("postal_code", "20200").lte("postal_code", "20999");
      else query = query.like("postal_code", `${filterDept}%`);
    }

    if (searchDebounced) {
      const s = searchDebounced.replace(/[%,()]/g, "");
      if (s) {
        query = query.or(`first_name.ilike.%${s}%,last_name.ilike.%${s}%,email.ilike.%${s}%`);
      }
    }

    const { data, error, count } = await query.range(from, to);
    if (error) {
      toast.error("Erreur de chargement");
      setLoading(false);
      return;
    }
    // Fetch auth emails (source of vérité) + notes/super via chunked queries
    const userIds = (data || []).map((u: any) => u.id);
    let emailMap = new Map<string, string>();
    let modMap = new Map<string, { admin_notes: string | null; is_manual_super: boolean; suspension_reason: string | null }>();
    if (userIds.length > 0) {
      const CHUNK = 150;
      const chunks: string[][] = [];
      for (let i = 0; i < userIds.length; i += CHUNK) chunks.push(userIds.slice(i, i + CHUNK));
      const [emailRes, ...modResAll] = await Promise.all([
        supabase.rpc("get_user_emails_admin", { p_user_ids: userIds }),
        ...chunks.map((ids) =>
          supabase.from("profile_moderation").select("profile_id, admin_notes, is_manual_super, suspension_reason").in("profile_id", ids),
        ),
      ]);
      emailMap = new Map((emailRes.data || []).map((e: any) => [e.id, e.email]));
      const modRows = modResAll.flatMap((r: any) => r.data || []);
      modMap = new Map(modRows.map((m: any) => [m.profile_id, { admin_notes: m.admin_notes, is_manual_super: m.is_manual_super, suspension_reason: m.suspension_reason ?? null }]));
    }
    const enriched = (data || []).map((u: any) => {
      const mod = modMap.get(u.id);
      return {
        ...u,
        email: emailMap.get(u.id) || u.email || "",
        admin_notes: mod?.admin_notes || null,
        is_manual_super: mod?.is_manual_super || false,
        suspension_reason: mod?.suspension_reason || null,
      };
    });
    setUsers(enriched);
    setTotal(count ?? 0);
    setLoading(false);
  }, [filterRole, filterVerification, filterDept, filterCountry, searchDebounced, page]);

  // Debounce search 300ms
  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search.trim().toLowerCase()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset page when filters/search change
  useEffect(() => { setPage(0); }, [searchDebounced, filterRole, filterVerification, filterDept, filterCountry]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // Charge une fois : liste des pays présents (hors FR) + total international pour le badge KPI
  useEffect(() => {
    (async () => {
      const { data, count } = await supabase
        .from("profiles")
        .select("country", { count: "exact" })
        .not("country", "is", null)
        .neq("country", "FR")
        .limit(5000);
      const codes = Array.from(
        new Set((data || []).map((r: any) => String(r.country || "").toUpperCase()).filter(Boolean)),
      ).sort((a, b) => getCountryName(a).localeCompare(getCountryName(b), "fr"));
      setCountryStats({ intl: count ?? 0, codes });
    })();
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const availableDepts = Object.keys(DEPT_NAMES).sort((a, b) => a.localeCompare(b, "fr"));
  const availableCountries = countryStats.codes;
  const intlCount = countryStats.intl;


  const handleSuspend = async () => {
    const userId = suspendModal.userId;
    const reason = suspendModal.reason.trim();
    const { data: userData } = await supabase.auth.getUser();
    const adminId = userData.user?.id ?? null;

    const { error } = await supabase
      .from("profiles")
      .update({ account_status: "suspended" })
      .eq("id", userId);
    if (error) {
      toast.error("Erreur");
      setSuspendModal({ open: false, userId: "", reason: "" });
      return;
    }
    if (reason) {
      // Motif de suspension : colonne dédiée, n'écrase PAS admin_notes (note interne).
      await supabase.from("profile_moderation").upsert({
        profile_id: userId,
        suspension_reason: reason,
      }, { onConflict: "profile_id" });
    }
    if (adminId) {
      await supabase.from("admin_action_logs").insert({
        admin_id: adminId,
        action: "suspend_account",
        target_type: "profile",
        target_id: userId,
        metadata: reason ? { reason } : null,
      });
    }
    toast.success("Compte suspendu");
    fetchUsers();
    setSuspendModal({ open: false, userId: "", reason: "" });
  };

  const confirmReactivate = async () => {
    const userId = reactivateModal.userId;
    if (!userId) return;
    setReactivating(true);
    const { data: userData } = await supabase.auth.getUser();
    const adminId = userData.user?.id ?? null;

    const { error } = await supabase
      .from("profiles")
      .update({ account_status: "active" })
      .eq("id", userId);
    if (error) {
      toast.error("Erreur");
      setReactivating(false);
      return;
    }
    // Retire le motif de suspension (mais préserve admin_notes / is_manual_super).
    await supabase.from("profile_moderation").upsert({
      profile_id: userId,
      suspension_reason: null,
    }, { onConflict: "profile_id" });
    if (adminId) {
      await supabase.from("admin_action_logs").insert({
        admin_id: adminId,
        action: "reactivate_account",
        target_type: "profile",
        target_id: userId,
      });
    }
    toast.success("Compte réactivé");
    setReactivating(false);
    setReactivateModal({ open: false, userId: "", userName: "", email: "" });
    fetchUsers();
  };

  const confirmForceVerify = async () => {
    const userId = verifyModal.userId;
    if (!userId) return;
    setVerifying(true);
    const { data: userData } = await supabase.auth.getUser();
    const adminId = userData.user?.id;
    const { error } = await supabase
      .from("profiles")
      .update({ identity_verified: true, identity_verification_status: "verified" })
      .eq("id", userId);
    if (error) {
      toast.error("Erreur");
      setVerifying(false);
      return;
    }
    // Journal métier : trace la vérification manuelle admin
    await supabase.from("identity_verification_logs").insert({
      user_id: userId,
      result: "verified",
      rejection_reason: "Vérification forcée par admin",
    });
    // Journal d'audit admin
    if (adminId) {
      await supabase.from("admin_action_logs").insert({
        admin_id: adminId,
        action: "force_verify_identity",
        target_type: "profile",
        target_id: userId,
      });
    }
    toast.success("Identité validée");
    setVerifying(false);
    setVerifyModal({ open: false, userId: "", userName: "", email: "" });
    fetchUsers();
  };

  const confirmToggleSuper = async () => {
    const userId = superModal.userId;
    if (!userId) return;
    setTogglingSuper(true);
    const newValue = superModal.newValue;
    const { data: userData } = await supabase.auth.getUser();
    const adminId = userData.user?.id;
    const { error } = await supabase
      .from("profile_moderation")
      .upsert({ profile_id: userId, is_manual_super: newValue }, { onConflict: "profile_id" });
    if (error) {
      toast.error("Erreur lors de la mise à jour");
      setTogglingSuper(false);
      return;
    }
    if (adminId) {
      await supabase.from("admin_action_logs").insert({
        admin_id: adminId,
        action: "toggle_super_gardien",
        target_type: "profile",
        target_id: userId,
        metadata: { new_value: newValue },
      });
    }
    toast(newValue ? "Super Gardien activé" : "Override retiré");
    setTogglingSuper(false);
    setSuperModal({ open: false, userId: "", userName: "", email: "", newValue: false });
    fetchUsers();
  };


  const handleResendConfirmation = async (email: string | undefined | null) => {
    if (!email) {
      toast.error("Aucune adresse e-mail connue pour ce compte");
      return;
    }
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      },
    });
    if (error) {
      const msg = /already|confirmed/i.test(error.message)
        ? "Ce compte est déjà confirmé."
        : `Échec de l'envoi : ${error.message}`;
      toast.error(msg);
    } else {
      toast.success(`E-mail de confirmation renvoyé à ${email}`);
    }
  };

  const handleSaveNote = async () => {
    const { error } = await supabase
      .from("profile_moderation")
      .upsert({
        profile_id: noteModal.userId,
        admin_notes: noteModal.currentNote,
      }, { onConflict: "profile_id" })
    if (error) toast.error("Erreur");
    else { toast.success("Note enregistrée"); fetchUsers(); }
    setNoteModal({ open: false, userId: "", currentNote: "" });
  };

  const handleDeleteUser = async () => {
    setDeleting(true);
    const { data, error } = await supabase.functions.invoke("admin-delete-user", {
      body: { userId: deleteConfirm.userId },
    });
    if (error || data?.error) {
      toast.error(data?.error || "Erreur lors de la suppression");
    } else {
      toast.success("Compte supprimé définitivement");
      fetchUsers();
    }
    setDeleting(false);
    setDeleteConfirm({ open: false, userId: "", userName: "" });
  };

  const handleSendMessage = async () => {
    const content = messageModal.content.trim();
    if (!content) {
      toast.error("Le message ne peut pas être vide");
      return;
    }
    setSendingMessage(true);
    const { data, error } = await supabase.rpc("admin_send_message_to_user", {
      p_target_user_id: messageModal.userId,
      p_content: content,
    });
    setSendingMessage(false);
    if (error) {
      // Journalise l'échec côté back-office (best-effort, ne bloque pas le toast)
      try {
        await supabase.rpc("admin_log_message_failure", {
          p_target_user_id: messageModal.userId,
          p_content: content,
          p_error_message: error.message || "Erreur inconnue",
        });
      } catch { /* noop */ }
      toast.error(error.message || "Erreur lors de l'envoi");
      return;
    }
    toast.success("Message envoyé");
    const convId = data as string;
    setMessageModal({ open: false, userId: "", userName: "", content: "", step: "edit" });
    if (convId) {
      navigate(`/messages?conversation=${convId}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight">Utilisateurs</h1>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-xs">
            {intlCount} membre{intlCount > 1 ? "s" : ""} hors France
          </Badge>
          <Button variant="outline" size="sm" onClick={openHistory}>
            <MessageSquare className="h-4 w-4 mr-2" />
            Historique de mes envois
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Rechercher par nom ou email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous rôles</SelectItem>
            <SelectItem value="owner">Propriétaire</SelectItem>
            <SelectItem value="sitter">Gardien</SelectItem>
            <SelectItem value="both">Les deux</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterVerification} onValueChange={setFilterVerification}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes vérifications</SelectItem>
            <SelectItem value="not_submitted">Non vérifié</SelectItem>
            <SelectItem value="pending">En attente</SelectItem>
            <SelectItem value="verified">Vérifié</SelectItem>
            <SelectItem value="rejected">Refusé</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterDept} onValueChange={setFilterDept}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent className="max-h-60">
            <SelectItem value="all">Tous départements</SelectItem>
            {availableDepts.map((code) => (
              <SelectItem key={code} value={code}>
                {code} {DEPT_NAMES[code] || ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterCountry} onValueChange={setFilterCountry}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent className="max-h-60">
            <SelectItem value="all">Tous pays</SelectItem>
            <SelectItem value="FR">France uniquement</SelectItem>
            <SelectItem value="INTL">Hors France</SelectItem>
            {availableCountries.length > 0 && (
              <>
                <div className="px-2 py-1 text-xs text-muted-foreground border-t mt-1 pt-2">Pays présents</div>
                {availableCountries.map((code) => (
                  <SelectItem key={code} value={code}>
                    {getCountryName(code)}
                  </SelectItem>
                ))}
              </>
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Utilisateur</TableHead>
              <TableHead>Rôle</TableHead>
              <TableHead>Code postal</TableHead>
              <TableHead>Département</TableHead>
              <TableHead>Pays</TableHead>
              <TableHead>Inscription</TableHead>
              <TableHead>Dernière activité</TableHead>
              <TableHead>Profil</TableHead>
              <TableHead>Vérification</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                  Chargement…
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                  Aucun utilisateur trouvé
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => {

                const verif = verificationLabels[user.identity_verification_status || "not_submitted"] || verificationLabels.not_submitted;
                const status = statusLabels[user.account_status || "active"] || statusLabels.active;

                return (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {(user.first_name?.[0] || "").toUpperCase()}
                            {(user.last_name?.[0] || "").toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-sm">
                            {user.first_name} {user.last_name}
                          </div>
                          <div className="text-xs text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Badge variant="outline">{roleLabels[user.role] || user.role}</Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          title="Changer le rôle"
                          aria-label="Changer le rôle de l'utilisateur"
                          onClick={() => setRoleModal({
                            open: true,
                            userId: user.id,
                            userName: `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email || "cet utilisateur",
                            currentRole: user.role,
                          })}
                        >
                          <UserCog className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {user.postal_code || ","}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {getDeptLabel(user.postal_code)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {(() => {
                        const c = (user.country || "FR").toUpperCase();
                        if (c === "FR") return <span className="text-muted-foreground">France</span>;
                        return <Badge variant="secondary" className="text-xs">{getCountryName(c)}</Badge>;
                      })()}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(user.created_at), "d MMM yyyy", { locale: fr })}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {user.last_seen_at
                        ? formatDistanceToNow(new Date(user.last_seen_at), { addSuffix: true, locale: fr })
                        : "Jamais connecté"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${user.profile_completion || 0}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{user.profile_completion || 0}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={verif.variant}>{verif.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={status.variant}
                        title={
                          user.account_status === "suspended" && user.suspension_reason
                            ? `Motif : ${user.suspension_reason}`
                            : undefined
                        }
                      >
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                         <Button
                          variant="ghost"
                          size="icon"
                          title="Envoyer un message"
                          onClick={() => setMessageModal({
                            open: true,
                            userId: user.id,
                            userName: `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email || "cet utilisateur",
                            content: "",
                            step: "edit",
                          })}
                        >
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Voir le contenu du dernier message envoyé"
                          onClick={() => openLastMessage(
                            user.id,
                            `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email || "cet utilisateur",
                          )}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                         <Button
                          variant="ghost"
                          size="icon"
                          title="Voir le profil"
                          onClick={() => window.open(`/gardiens/${user.id}`, "_blank")}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Forcer vérification ID"
                          onClick={() => setVerifyModal({
                            open: true,
                            userId: user.id,
                            userName: `${user.first_name || ""} ${user.last_name || ""}`.trim() || "Utilisateur",
                            email: user.email || "",
                          })}
                          disabled={user.identity_verified || (verifying && verifyModal.userId === user.id)}
                        >
                          <ShieldCheck className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title={user.is_manual_super ? "Retirer Super Gardien" : "Promouvoir Super Gardien"}
                          disabled={togglingSuper && superModal.userId === user.id}
                          onClick={() => setSuperModal({
                            open: true,
                            userId: user.id,
                            userName: `${user.first_name || ""} ${user.last_name || ""}`.trim() || "Utilisateur",
                            email: user.email || "",
                            newValue: !user.is_manual_super,
                          })}
                        >
                          <Crown className={`h-4 w-4 ${user.is_manual_super ? 'text-warning' : ''}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Note interne"
                          onClick={() => setNoteModal({
                            open: true,
                            userId: user.id,
                            currentNote: user.admin_notes || "",
                          })}
                        >
                          <StickyNote className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Renvoyer l'e-mail de confirmation"
                          onClick={() => handleResendConfirmation(user.email)}
                        >
                          <MailCheck className="h-4 w-4" />
                        </Button>
                        {user.account_status === "suspended" ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Réactiver"
                            onClick={() => handleReactivate(user.id)}
                          >
                            <RotateCcw className="h-4 w-4 text-primary" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Suspendre"
                            onClick={() => setSuspendModal({ open: true, userId: user.id, reason: "" })}
                          >
                            <Ban className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Supprimer définitivement"
                          onClick={() => setDeleteConfirm({
                            open: true,
                            userId: user.id,
                            userName: `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email || "cet utilisateur",
                          })}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {total} utilisateur{total > 1 ? "s" : ""} · page {page + 1}/{totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Précédent
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
              Suivant <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      <SuspendUserDialog
        open={suspendModal.open}
        reason={suspendModal.reason}
        onReasonChange={(reason) => setSuspendModal((s) => ({ ...s, reason }))}
        onClose={() => setSuspendModal({ open: false, userId: "", reason: "" })}
        onConfirm={handleSuspend}
      />

      <NoteUserDialog
        open={noteModal.open}
        note={noteModal.currentNote}
        onNoteChange={(currentNote) => setNoteModal((s) => ({ ...s, currentNote }))}
        onClose={() => setNoteModal({ open: false, userId: "", currentNote: "" })}
        onSave={handleSaveNote}
      />

      <DeleteUserDialog
        open={deleteConfirm.open}
        userName={deleteConfirm.userName}
        deleting={deleting}
        onClose={() => setDeleteConfirm({ open: false, userId: "", userName: "" })}
        onConfirm={handleDeleteUser}
      />

      <SendMessageDialog
        state={messageModal}
        sending={sendingMessage}
        onChange={setMessageModal}
        onClose={() => setMessageModal({ open: false, userId: "", userName: "", content: "", step: "edit" })}
        onSend={handleSendMessage}
      />

      <MessageHistoryDialog
        open={historyModal.open}
        loading={historyModal.loading}
        items={historyModal.items}
        onClose={() => setHistoryModal({ open: false, loading: false, items: [] })}
        onOpenConversation={(convId) => {
          setHistoryModal({ open: false, loading: false, items: [] });
          navigate(`/messages?conversation=${convId}`);
        }}
        onShowError={(it) => setErrorDetailModal({
          open: true,
          recipient: it.recipient_name,
          sentAt: it.created_at,
          error: it.error_message || "Erreur non détaillée",
          content: it.content || "",
        })}
      />

      <LastMessageDialog
        state={lastMessageModal}
        onClose={() => setLastMessageModal({ open: false, loading: false, userName: "", userId: "", conversationId: null, content: null, sentAt: null })}
        onOpenConversation={(convId) => {
          setLastMessageModal({ open: false, loading: false, userName: "", userId: "", conversationId: null, content: null, sentAt: null });
          navigate(`/messages?conversation=${convId}`);
        }}
      />

      <ErrorDetailDialog
        state={errorDetailModal}
        onClose={() => setErrorDetailModal({ open: false, recipient: "", sentAt: "", error: "", content: "" })}
      />

      <ChangeRoleDialog
        open={roleModal.open}
        onOpenChange={(open) => setRoleModal((s) => ({ ...s, open }))}
        userId={roleModal.userId}
        userName={roleModal.userName}
        currentRole={roleModal.currentRole}
        onSuccess={fetchUsers}
      />

      <AlertDialog
        open={verifyModal.open}
        onOpenChange={(v) => { if (!v && !verifying) setVerifyModal({ open: false, userId: "", userName: "", email: "" }); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Forcer la vérification d'identité ?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>
                  Utilisateur : <strong>{verifyModal.userName}</strong>
                  {verifyModal.email ? <> ({verifyModal.email})</> : null}
                </p>
                <p className="text-muted-foreground">
                  Cette action contourne le process de vérification manuelle et marque
                  l'identité comme vérifiée. Elle sera tracée dans le journal d'audit.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={verifying}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              disabled={verifying}
              onClick={(e) => { e.preventDefault(); confirmForceVerify(); }}
            >
              {verifying ? "Validation," : "Confirmer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={superModal.open}
        onOpenChange={(v) => { if (!v && !togglingSuper) setSuperModal({ open: false, userId: "", userName: "", email: "", newValue: false }); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {superModal.newValue ? "Promouvoir Super Gardien ?" : "Retirer le statut Super Gardien ?"}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>
                  Utilisateur : <strong>{superModal.userName}</strong>
                  {superModal.email ? <> ({superModal.email})</> : null}
                </p>
                <p className="text-muted-foreground">
                  Le statut Super Gardien force manuellement la réputation, indépendamment
                  des critères automatiques. Cette action sera tracée dans le journal d'audit.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={togglingSuper}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              disabled={togglingSuper}
              onClick={(e) => { e.preventDefault(); confirmToggleSuper(); }}
            >
              {togglingSuper ? "Mise à jour," : "Confirmer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminUsers;
