import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import { Navigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Loader2, AlertTriangle, CheckCircle2, XCircle, Clock, Star } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import StarRating from "@/components/reviews/StarRating";

type DisputeStatus = "pending" | "accepted" | "rejected";

interface DisputeRow {
  id: string;
  review_id: string;
  disputer_id: string;
  category: string;
  reason: string;
  status: DisputeStatus;
  admin_note: string | null;
  resolved_at: string | null;
  created_at: string;
  review?: any;
  disputer?: { first_name: string | null; avatar_url: string | null };
  reviewer?: { first_name: string | null; avatar_url: string | null };
}

const CATEGORY_LABELS: Record<string, string> = {
  faux: "Avis manifestement faux",
  diffamation: "Diffamation / injures",
  inapproprie: "Contenu inapproprié",
  erreur_identite: "Erreur d'identité",
  autre: "Autre",
};

const STATUS_META: Record<DisputeStatus, { label: string; icon: any; cls: string }> = {
  pending: { label: "En attente", icon: Clock, cls: "bg-warning/10 text-warning border-warning/20" },
  accepted: { label: "Acceptée", icon: CheckCircle2, cls: "bg-success/10 text-success border-success/20" },
  rejected: { label: "Refusée", icon: XCircle, cls: "bg-muted text-muted-foreground border-border" },
};

const AdminReviewDisputes = () => {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [disputes, setDisputes] = useState<DisputeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<DisputeStatus>("pending");
  const [resolveTarget, setResolveTarget] = useState<{ dispute: DisputeRow; action: "accepted" | "rejected" } | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data: dispData, error } = await supabase
      .from("review_disputes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Impossible de charger les contestations");
      setLoading(false);
      return;
    }

    const reviewIds = [...new Set((dispData || []).map((d) => d.review_id))];
    const userIds = [...new Set((dispData || []).map((d) => d.disputer_id))];

    const [revRes, profRes] = await Promise.all([
      reviewIds.length
        ? supabase.from("reviews").select("*").in("id", reviewIds)
        : Promise.resolve({ data: [] as any[] }),
      userIds.length
        ? supabase.from("public_profiles").select("id, first_name, avatar_url").in("id", userIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const reviewMap = new Map((revRes.data || []).map((r: any) => [r.id, r]));
    const profMap = new Map((profRes.data || []).map((p: any) => [p.id, p]));

    // Hydrater aussi le reviewer
    const reviewerIds = [...new Set((revRes.data || []).map((r: any) => r.reviewer_id).filter(Boolean))];
    const { data: reviewerProfs } = reviewerIds.length
      ? await supabase.from("public_profiles").select("id, first_name, avatar_url").in("id", reviewerIds)
      : { data: [] as any[] };
    const reviewerMap = new Map((reviewerProfs || []).map((p: any) => [p.id, p]));

    const enriched: DisputeRow[] = (dispData || []).map((d: any) => {
      const rev = reviewMap.get(d.review_id);
      return {
        ...d,
        review: rev,
        disputer: profMap.get(d.disputer_id),
        reviewer: rev ? reviewerMap.get(rev.reviewer_id) : undefined,
      };
    });

    setDisputes(enriched);
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const handleResolve = async () => {
    if (!resolveTarget) return;
    setSubmitting(true);
    const { error } = await supabase.rpc("resolve_review_dispute", {
      p_dispute_id: resolveTarget.dispute.id,
      p_decision: resolveTarget.action,
      p_admin_note: adminNote.trim() || undefined,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message || "Erreur lors de la résolution");
      return;
    }
    toast.success(
      resolveTarget.action === "accepted"
        ? "Contestation acceptée — l'avis a été dépublié"
        : "Contestation refusée"
    );
    setResolveTarget(null);
    setAdminNote("");
    load();
  };

  if (adminLoading) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const filtered = disputes.filter((d) => d.status === tab);
  const counts = {
    pending: disputes.filter((d) => d.status === "pending").length,
    accepted: disputes.filter((d) => d.status === "accepted").length,
    rejected: disputes.filter((d) => d.status === "rejected").length,
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <Helmet>
        <title>Contestations d'avis — Admin Guardiens</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <header className="mb-6">
        <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
          <AlertTriangle className="h-6 w-6 text-warning" />
          Contestations d'avis
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Examinez les demandes de retrait d'avis soumises par les membres.
        </p>
      </header>

      <Tabs value={tab} onValueChange={(v) => setTab(v as DisputeStatus)}>
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="pending">En attente ({counts.pending})</TabsTrigger>
          <TabsTrigger value="accepted">Acceptées ({counts.accepted})</TabsTrigger>
          <TabsTrigger value="rejected">Refusées ({counts.rejected})</TabsTrigger>
        </TabsList>

        <TabsContent value={tab}>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center">
              <p className="text-sm text-muted-foreground">Aucune contestation {STATUS_META[tab].label.toLowerCase()}.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((d) => (
                <DisputeCard
                  key={d.id}
                  dispute={d}
                  onResolve={(action) => {
                    setAdminNote(d.admin_note || "");
                    setResolveTarget({ dispute: d, action });
                  }}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog de résolution */}
      <Dialog open={!!resolveTarget} onOpenChange={(o) => !o && setResolveTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {resolveTarget?.action === "accepted" ? "Accepter la contestation" : "Refuser la contestation"}
            </DialogTitle>
            <DialogDescription>
              {resolveTarget?.action === "accepted"
                ? "L'avis sera dépublié immédiatement et ne s'affichera plus sur le profil public."
                : "L'avis restera publié. Le membre sera informé du refus."}
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <label className="text-sm font-medium mb-1.5 block">
              Note interne <span className="text-muted-foreground font-normal">(optionnelle)</span>
            </label>
            <Textarea
              placeholder="Justification, contexte ou décision motivée…"
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setResolveTarget(null)} disabled={submitting}>
              Annuler
            </Button>
            <Button
              onClick={handleResolve}
              disabled={submitting}
              variant={resolveTarget?.action === "accepted" ? "default" : "destructive"}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {resolveTarget?.action === "accepted" ? "Confirmer l'acceptation" : "Confirmer le refus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const DisputeCard = ({
  dispute,
  onResolve,
}: {
  dispute: DisputeRow;
  onResolve: (action: "accepted" | "rejected") => void;
}) => {
  const meta = STATUS_META[dispute.status];
  const StatusIcon = meta.icon;
  const r = dispute.review;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Soumise le {format(new Date(dispute.created_at), "d MMM yyyy 'à' HH:mm", { locale: fr })}</span>
        </div>
        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${meta.cls}`}>
          <StatusIcon className="h-3 w-3" />
          {meta.label}
        </span>
      </div>

      <div className="p-4 space-y-4">
        {/* Demandeur */}
        <div className="flex items-center gap-3">
          {dispute.disputer?.avatar_url ? (
            <img src={dispute.disputer.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground">
              {(dispute.disputer?.first_name || "?").charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">
              {dispute.disputer?.first_name || "Membre"} conteste un avis reçu
            </p>
            <p className="text-xs text-muted-foreground">
              Motif : <span className="font-medium text-foreground">{CATEGORY_LABELS[dispute.category] || dispute.category}</span>
            </p>
          </div>
        </div>

        {/* Explication du contestant */}
        <div className="rounded-md bg-muted/40 p-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-1">
            Explication du membre
          </p>
          <p className="text-sm text-foreground/90 whitespace-pre-line">{dispute.reason}</p>
        </div>

        {/* Avis contesté */}
        {r ? (
          <div className="rounded-md border border-border p-3">
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                {dispute.reviewer?.avatar_url ? (
                  <img src={dispute.reviewer.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                    {(dispute.reviewer?.first_name || "?").charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-xs font-medium text-foreground">
                    Avis de {dispute.reviewer?.first_name || "Membre"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {format(new Date(r.created_at), "d MMM yyyy", { locale: fr })}
                    {!r.published && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-destructive/10 text-destructive px-1.5 py-0.5 text-[10px]">
                        Dépublié
                      </span>
                    )}
                  </p>
                </div>
              </div>
              {r.overall_rating ? <StarRating value={r.overall_rating} readonly size="sm" /> : null}
            </div>
            {r.cancellation_reason && (
              <p className="text-sm text-foreground/80 italic">{r.cancellation_reason}</p>
            )}
            {r.comment && (
              <p className="text-sm text-foreground/80 whitespace-pre-line">{r.comment}</p>
            )}
            {!r.comment && !r.cancellation_reason && (
              <p className="text-xs text-muted-foreground italic">Pas de commentaire écrit.</p>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">Avis introuvable (peut-être supprimé).</p>
        )}

        {/* Note admin si déjà résolue */}
        {dispute.admin_note && dispute.status !== "pending" && (
          <div className="rounded-md bg-primary/5 border border-primary/10 p-3">
            <p className="text-[11px] uppercase tracking-wide text-primary font-semibold mb-1">Note interne admin</p>
            <p className="text-sm text-foreground/80 whitespace-pre-line">{dispute.admin_note}</p>
            {dispute.resolved_at && (
              <p className="text-[11px] text-muted-foreground mt-1">
                Résolue le {format(new Date(dispute.resolved_at), "d MMM yyyy 'à' HH:mm", { locale: fr })}
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        {dispute.status === "pending" && (
          <div className="flex items-center gap-2 pt-2 border-t border-border">
            <Button
              size="sm"
              onClick={() => onResolve("accepted")}
              className="gap-1.5"
            >
              <CheckCircle2 className="h-4 w-4" />
              Accepter & retirer l'avis
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onResolve("rejected")}
              className="gap-1.5"
            >
              <XCircle className="h-4 w-4" />
              Refuser
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminReviewDisputes;
