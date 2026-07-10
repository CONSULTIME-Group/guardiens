import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Briefcase, CheckCircle2, XCircle, ExternalLink, AlertTriangle, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
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

type ProVerification = {
  id: string;
  user_id: string;
  doc_type: string;
  file_path: string;
  file_name: string | null;
  declared_business_name: string | null;
  declared_siret: string | null;
  declared_specialty: string | null;
  ai_status: string | null;
  ai_confidence: number | null;
  ai_analysis: any;
  ai_red_flags: any;
  status: "pending" | "needs_review" | "approved" | "rejected" | "auto_approved" | "auto_rejected";
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  profiles?: { first_name: string | null; last_name: string | null; email: string | null; avatar_url: string | null } | null;
};

type Tab = "needs_review" | "approved" | "rejected" | "all";

const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  approved: "default",
  auto_approved: "default",
  rejected: "destructive",
  auto_rejected: "destructive",
  needs_review: "secondary",
  pending: "outline",
};

const statusLabels: Record<string, string> = {
  approved: "Validé",
  auto_approved: "Auto-validé",
  rejected: "Refusé",
  auto_rejected: "Auto-refusé",
  needs_review: "À traiter",
  pending: "En analyse",
};

const AdminPros = () => {
  const [tab, setTab] = useState<Tab>("needs_review");
  const [rows, setRows] = useState<ProVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [previewModal, setPreviewModal] = useState<{ open: boolean; row: ProVerification | null }>({ open: false, row: null });
  const [rejectModal, setRejectModal] = useState<{ open: boolean; row: ProVerification | null; reason: string }>({ open: false, row: null, reason: "" });
  const [validateModal, setValidateModal] = useState<{ open: boolean; row: ProVerification | null }>({ open: false, row: null });

  const fetchRows = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("pro_verifications")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(200);

    if (tab === "needs_review") {
      query = query.in("status", ["needs_review", "pending"]);
    } else if (tab === "approved") {
      query = query.in("status", ["approved", "auto_approved"]);
    } else if (tab === "rejected") {
      query = query.in("status", ["rejected", "auto_rejected"]);
    }

    const { data, error } = await query;
    if (error) {
      toast.error("Erreur de chargement");
      console.error(error);
      setLoading(false);
      return;
    }

    // Hydrate profils en seconde requête, la FK pointe sur auth.users
    // donc PostgREST ne peut pas embed directement profiles.
    const items = (data as any[]) || [];
    const userIds = Array.from(new Set(items.map((r) => r.user_id).filter(Boolean)));
    let profilesById: Record<string, any> = {};
    if (userIds.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email, avatar_url")
        .in("id", userIds);
      profilesById = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p]));
    }
    const hydrated = items.map((r) => ({ ...r, profiles: profilesById[r.user_id] ?? null }));
    setRows(hydrated as any);
    setLoading(false);

    // Pré-signer les URLs en parallèle
    const urls: Record<string, string> = {};
    await Promise.all(
      hydrated.map(async (r) => {
        const { data: s } = await supabase.storage.from("pro-documents").createSignedUrl(r.file_path, 600);
        if (s?.signedUrl) urls[r.id] = s.signedUrl;
      })
    );
    setSignedUrls((prev) => ({ ...prev, ...urls }));
  }, [tab]);


  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const decide = async (row: ProVerification, decision: "approved" | "rejected", notes?: string) => {
    setBusyId(row.id);
    try {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("pro_verifications")
        .update({
          status: decision,
          admin_decision: decision,
          admin_notes: notes ?? null,
          decided_at: new Date().toISOString(),
          decided_by: user.user?.id ?? null,
        })
        .eq("id", row.id);
      if (error) throw error;
      // Journal d'audit admin
      const adminId = user.user?.id ?? null;
      if (adminId && decision === "approved") {
        await supabase.from("admin_action_logs").insert({
          admin_id: adminId,
          action: "pro_validate",
          target_type: "pro",
          target_id: row.id,
          metadata: { user_id: row.user_id, doc_type: row.doc_type },
        });
      }
      toast.success(decision === "approved" ? "Pro validé" : "Demande refusée");
      setRejectModal({ open: false, row: null, reason: "" });
      setValidateModal({ open: false, row: null });
      fetchRows();
    } catch (e: any) {
      toast.error(e?.message ?? "Action impossible");
    } finally {
      setBusyId(null);
    }
  };

  const counts = {
    needs_review: rows.length,
  };

  const renderRow = (row: ProVerification) => {
    const fullName = `${row.profiles?.first_name ?? ""} ${row.profiles?.last_name ?? ""}`.trim() || "Sans nom";
    const initials = (row.profiles?.first_name?.[0] ?? "") + (row.profiles?.last_name?.[0] ?? "");
    const confidence = row.ai_confidence != null ? Math.round(Number(row.ai_confidence) * 100) : null;
    const redFlags = Array.isArray(row.ai_red_flags) ? row.ai_red_flags : [];
    const url = signedUrls[row.id];

    return (
      <Card key={row.id} className="overflow-hidden">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={row.profiles?.avatar_url ?? undefined} />
                <AvatarFallback>{initials || "?"}</AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium">
                  <Link to={`/gardiens/${row.user_id}`} target="_blank" className="hover:underline inline-flex items-center gap-1">
                    {fullName}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
                <div className="text-xs text-muted-foreground">{row.profiles?.email}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={statusVariants[row.status] ?? "outline"}>{statusLabels[row.status] ?? row.status}</Badge>
              <Badge variant="outline" className="capitalize">{row.doc_type}</Badge>
              {confidence != null && (
                <Badge variant={confidence >= 85 ? "default" : "secondary"} className="gap-1">
                  <Sparkles className="h-3 w-3" /> IA {confidence}%
                </Badge>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Activité déclarée</div>
              <div>{row.declared_specialty || "–"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Raison sociale</div>
              <div>{row.declared_business_name || "–"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">SIRET déclaré</div>
              <div className="font-mono text-xs">{row.declared_siret || "–"}</div>
            </div>
          </div>

          {redFlags.length > 0 && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs">
              <div className="flex items-center gap-1 font-medium text-destructive mb-1">
                <AlertTriangle className="h-3 w-3" /> Signaux IA
              </div>
              <ul className="list-disc list-inside text-destructive/90">
                {redFlags.map((f: any, i: number) => <li key={i}>{typeof f === "string" ? f : JSON.stringify(f)}</li>)}
              </ul>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 flex-wrap pt-2 border-t">
            <div className="text-xs text-muted-foreground">
              Déposé le {format(new Date(row.created_at), "d MMM yyyy 'à' HH:mm", { locale: fr })}
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setPreviewModal({ open: true, row })} disabled={!url}>
                Voir le document
              </Button>
              {(row.status === "needs_review" || row.status === "pending") && (
                <>
                  <Button
                    size="sm"
                    onClick={() => setValidateModal({ open: true, row })}
                    disabled={busyId === row.id}
                    className="gap-1"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Valider
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setRejectModal({ open: true, row, reason: "" })}
                    disabled={busyId === row.id}
                    className="gap-1"
                  >
                    <XCircle className="h-4 w-4" /> Refuser
                  </Button>
                </>
              )}
            </div>
          </div>

          {row.admin_notes && (
            <div className="text-xs text-muted-foreground italic">Note admin : {row.admin_notes}</div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Vérifications Pro"
        description="File des dossiers Gardiens Pro à modérer (diplôme, SIRET, autres pièces). Alma pré-analyse, vous tranchez."
      />

      <div className="flex flex-wrap gap-2 text-sm">
        <Button asChild variant="outline" size="sm">
          <Link to="/admin/pros-annuaire">
            <Briefcase className="h-4 w-4 mr-1" aria-hidden="true" /> Annuaire pros (fiches publiques)
          </Link>
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList>
          <TabsTrigger value="needs_review">
            À traiter {tab === "needs_review" && counts.needs_review > 0 && <Badge variant="secondary" className="ml-2">{counts.needs_review}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="approved">Validés</TabsTrigger>
          <TabsTrigger value="rejected">Refusés</TabsTrigger>
          <TabsTrigger value="all">Tous</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4 space-y-3">
          {loading ? (
            <div className="text-sm text-muted-foreground">Chargement…</div>
          ) : rows.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Aucun dossier dans cet onglet.</CardContent></Card>
          ) : (
            rows.map(renderRow)
          )}
        </TabsContent>
      </Tabs>

      {/* Preview modal */}
      <Dialog open={previewModal.open} onOpenChange={(o) => !o && setPreviewModal({ open: false, row: null })}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Document, {previewModal.row?.file_name ?? previewModal.row?.doc_type}</DialogTitle>
          </DialogHeader>
          {previewModal.row && signedUrls[previewModal.row.id] && (
            <div className="space-y-3">
              {previewModal.row.file_name?.toLowerCase().endsWith(".pdf") ? (
                <iframe src={signedUrls[previewModal.row.id]} className="w-full h-[70vh] rounded border" title="document" />
              ) : (
                <img src={signedUrls[previewModal.row.id]} alt="document" className="w-full max-h-[70vh] object-contain rounded border" />
              )}
              {previewModal.row.ai_analysis && (
                <details className="text-xs bg-muted rounded p-2">
                  <summary className="cursor-pointer font-medium">Analyse IA brute</summary>
                  <pre className="mt-2 overflow-auto max-h-60">{JSON.stringify(previewModal.row.ai_analysis, null, 2)}</pre>
                </details>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject modal */}
      <Dialog open={rejectModal.open} onOpenChange={(o) => !o && setRejectModal({ open: false, row: null, reason: "" })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refuser cette demande Pro</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Motif transmis au membre (visible dans son espace)"
            value={rejectModal.reason}
            onChange={(e) => setRejectModal((p) => ({ ...p, reason: e.target.value }))}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectModal({ open: false, row: null, reason: "" })}>Annuler</Button>
            <Button
              variant="destructive"
              disabled={!rejectModal.reason.trim() || busyId === rejectModal.row?.id}
              onClick={() => rejectModal.row && decide(rejectModal.row, "rejected", rejectModal.reason.trim())}
            >
              Confirmer le refus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPros;
