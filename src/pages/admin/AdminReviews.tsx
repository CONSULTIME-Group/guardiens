import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Eye, EyeOff, Trash2, Star, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

const AdminReviews = () => {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState<"date" | "rating">("date");
  const [detailReview, setDetailReview] = useState<any | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [badgeCounts, setBadgeCounts] = useState<Record<string, number>>({});

  // Cancellation moderation state
  const [cancellationReviews, setCancellationReviews] = useState<any[]>([]);
  const [cancellationLoading, setCancellationLoading] = useState(true);
  const [rejectReasonModal, setRejectReasonModal] = useState<{ id: string; type: "review" | "response" } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("reviews")
      .select(`
        *,
        reviewer:profiles!reviews_reviewer_id_fkey(first_name, last_name, avatar_url),
        reviewee:profiles!reviews_reviewee_id_fkey(first_name, last_name, avatar_url)
      `)
      .or("review_type.is.null,review_type.neq.annulation");

    if (filterStatus === "published") query = query.eq("published", true);
    if (filterStatus === "unpublished") query = query.eq("published", false);
    if (filterStatus === "low") query = query.lte("overall_rating", 2);

    if (sortBy === "rating") query = query.order("overall_rating", { ascending: true });
    else query = query.order("created_at", { ascending: false });

    const { data, error } = await query;
    if (error) toast.error("Erreur de chargement");
    else {
      setReviews(data || []);
      const sitIds = [...new Set((data || []).map(r => r.sit_id))];
      if (sitIds.length) {
        const { data: badges } = await supabase.from("badge_attributions").select("sit_id").in("sit_id", sitIds);
        const counts: Record<string, number> = {};
        badges?.forEach((b: any) => { counts[b.sit_id] = (counts[b.sit_id] || 0) + 1; });
        setBadgeCounts(counts);
      }
    }
    setLoading(false);
  }, [filterStatus, sortBy]);

  const fetchCancellationReviews = useCallback(async () => {
    setCancellationLoading(true);
    const { data } = await supabase
      .from("reviews")
      .select(`
        *,
        reviewer:profiles!reviews_reviewer_id_fkey(first_name, last_name, avatar_url),
        reviewee:profiles!reviews_reviewee_id_fkey(first_name, last_name, avatar_url),
        sit:sits!reviews_sit_id_fkey(title, start_date, end_date)
      `)
      .eq("review_type", "annulation")
      .order("created_at", { ascending: false });
    setCancellationReviews(data || []);
    setCancellationLoading(false);
  }, []);

  useEffect(() => { fetchReviews(); fetchCancellationReviews(); }, [fetchReviews, fetchCancellationReviews]);

  const togglePublished = async (id: string, current: boolean) => {
    const { error } = await supabase.from("reviews").update({ published: !current }).eq("id", id);
    if (error) toast.error("Erreur");
    else { toast.success(current ? "Avis masqué" : "Avis publié"); fetchReviews(); }
  };

  const deleteReview = async (id: string) => {
    const { error } = await supabase.from("reviews").update({ published: false, comment: "[Supprimé par l'admin]" }).eq("id", id);
    if (error) toast.error("Erreur");
    else { toast.success("Avis supprimé"); fetchReviews(); }
    setDeleteConfirm(null);
  };

  const handleModerationAction = async (reviewId: string, action: "valide" | "refuse", field: "moderation_status" | "response_status") => {
    if (action === "refuse" && !rejectReason.trim()) {
      toast.error("Veuillez indiquer une raison de refus.");
      return;
    }

    const update: any = { [field]: action === "valide" ? "valide" : "refuse" };
    if (field === "response_status" && action === "valide") {
      update.response_status = "validee";
    }
    if (field === "response_status" && action === "refuse") {
      update.response_status = "refusee";
    }

    const { error } = await supabase.from("reviews").update(update).eq("id", reviewId);
    if (error) {
      toast.error("Erreur lors de la mise à jour.");
      return;
    }

    // Send email on validation (non-blocking)
    const review = cancellationReviews.find(r => r.id === reviewId);
    if (review && action === "valide") {
      if (field === "moderation_status") {
        await sendTransactionalEmail({
          templateName: "cancellation-review-published",
          recipientUserId: review.reviewee_id,
          idempotencyKey: `cancellation-review-published-${reviewId}`,
          templateData: {
            targetFirstName: review.reviewee?.first_name || "membre",
            profileUrl: `https://guardiens.fr/gardiens/${review.reviewee_id}`,
          },
        });
      } else if (field === "response_status") {
        await sendTransactionalEmail({
          templateName: "cancellation-response-published",
          recipientUserId: review.reviewer_id,
          idempotencyKey: `cancellation-response-published-${reviewId}`,
          templateData: {
            responderFirstName: review.reviewee?.first_name || "membre",
            profileUrl: `https://guardiens.fr/gardiens/${review.reviewee_id}`,
          },
        });
      }
    }

    toast.success(action === "valide" ? "Validé avec succès" : "Refusé");
    setRejectReasonModal(null);
    setRejectReason("");
    fetchCancellationReviews();
  };

  const renderStars = (rating: number) => (
    <div className="flex">
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={`h-3.5 w-3.5 ${i < rating ? "text-yellow-500 fill-yellow-500" : "text-muted"}`} />
      ))}
    </div>
  );

  const lowRatingCount = reviews.filter(r => r.overall_rating <= 2).length;
  const pendingCancellations = cancellationReviews.filter(r => r.moderation_status === "en_attente");
  const pendingResponses = cancellationReviews.filter(r => r.response_status === "en_attente");

  return (
    <div className="space-y-6">
      <h1 className="font-body text-2xl font-bold">Avis</h1>

      <Tabs defaultValue="reviews">
        <TabsList>
          <TabsTrigger value="reviews">Avis classiques</TabsTrigger>
          <TabsTrigger value="cancellations" className="gap-1.5">
            Annulations en attente
            {(pendingCancellations.length + pendingResponses.length) > 0 && (
              <span className="bg-destructive text-destructive-foreground rounded-full px-1.5 py-0.5 text-xs ml-1">
                {pendingCancellations.length + pendingResponses.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Classical reviews tab ── */}
        <TabsContent value="reviews" className="space-y-6 mt-4">
          {lowRatingCount > 0 && filterStatus === "all" && (
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="p-3 flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-500 shrink-0" />
                <p className="text-sm">{lowRatingCount} avis avec note ≤ 2 étoiles à surveiller</p>
                <Button size="sm" variant="outline" className="ml-auto" onClick={() => setFilterStatus("low")}>Voir</Button>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-3 flex-wrap">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="published">Publiés</SelectItem>
                <SelectItem value="unpublished">Non publiés</SelectItem>
                <SelectItem value="low">Notes ≤ 2</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Plus récents</SelectItem>
                <SelectItem value="rating">Note croissante</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border bg-card overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Auteur → Destinataire</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead>Badges</TableHead>
                  <TableHead>Commentaire</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Chargement…</TableCell></TableRow>
                ) : reviews.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Aucun avis</TableCell></TableRow>
                ) : reviews.map((review) => (
                  <TableRow key={review.id} className={review.overall_rating <= 2 ? "bg-destructive/5" : ""}>
                    <TableCell className="text-sm">
                      <div className="flex items-center gap-2">
                        {review.reviewer?.avatar_url && <img src={review.reviewer.avatar_url} className="w-6 h-6 rounded-full object-cover" />}
                        <span className="font-medium">{review.reviewer?.first_name} {review.reviewer?.last_name}</span>
                        <span className="text-muted-foreground">→</span>
                        <span>{review.reviewee?.first_name} {review.reviewee?.last_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{renderStars(review.overall_rating)}</TableCell>
                    <TableCell>
                      {badgeCounts[review.sit_id] ? (
                        <Badge variant="outline" className="text-xs">{badgeCounts[review.sit_id]} badge{badgeCounts[review.sit_id] > 1 ? "s" : ""}</Badge>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">{review.comment || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{format(new Date(review.created_at), "d MMM yyyy", { locale: fr })}</TableCell>
                    <TableCell>
                      <Badge variant={review.published ? "default" : "outline"}>{review.published ? "Publié" : "Masqué"}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" title="Voir" onClick={() => setDetailReview(review)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title={review.published ? "Masquer" : "Publier"} onClick={() => togglePublished(review.id, review.published)}>
                          <EyeOff className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Supprimer" onClick={() => setDeleteConfirm(review.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ── Cancellation moderation tab ── */}
        <TabsContent value="cancellations" className="space-y-6 mt-4">
          {/* Pending review moderation */}
          <div>
            <h2 className="font-heading font-semibold text-lg mb-3">
              Avis d'annulation en attente ({pendingCancellations.length})
            </h2>
            {cancellationLoading ? (
              <p className="text-sm text-muted-foreground">Chargement…</p>
            ) : pendingCancellations.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Aucun avis d'annulation en attente.</p>
            ) : (
              <div className="space-y-4">
                {pendingCancellations.map((review) => (
                  <Card key={review.id} className="border border-border">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm">
                          {review.reviewer?.avatar_url && <img src={review.reviewer.avatar_url} className="w-6 h-6 rounded-full object-cover" />}
                          <span className="font-medium">{review.reviewer?.first_name} {review.reviewer?.last_name}</span>
                          <span className="text-muted-foreground">→</span>
                          {review.reviewee?.avatar_url && <img src={review.reviewee.avatar_url} className="w-6 h-6 rounded-full object-cover" />}
                          <span>{review.reviewee?.first_name} {review.reviewee?.last_name}</span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          Annulée par {review.cancelled_by_role === "proprio" ? "le propriétaire" : "le gardien"}
                        </Badge>
                      </div>

                      {review.sit && (
                        <p className="text-xs text-muted-foreground">
                          Garde : {review.sit.title}
                          {review.sit.start_date && ` — ${format(new Date(review.sit.start_date), "d MMM yyyy", { locale: fr })}`}
                          {review.sit.end_date && ` → ${format(new Date(review.sit.end_date), "d MMM yyyy", { locale: fr })}`}
                        </p>
                      )}

                      <div className="bg-muted/50 rounded-lg p-3">
                        <p className="text-sm italic">{review.cancellation_reason}</p>
                      </div>

                      <p className="text-xs text-muted-foreground">
                        Soumis le {format(new Date(review.created_at), "d MMMM yyyy à HH:mm", { locale: fr })}
                      </p>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleModerationAction(review.id, "valide", "moderation_status")}
                          className="gap-1.5"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Valider
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setRejectReasonModal({ id: review.id, type: "review" })}
                          className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
                        >
                          <XCircle className="h-3.5 w-3.5" /> Refuser
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Pending response moderation */}
          <div>
            <h2 className="font-heading font-semibold text-lg mb-3">
              Réponses en attente ({pendingResponses.length})
            </h2>
            {pendingResponses.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Aucune réponse en attente.</p>
            ) : (
              <div className="space-y-4">
                {pendingResponses.map((review) => (
                  <Card key={review.id} className="border border-border">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium">Réponse de {review.reviewee?.first_name} {review.reviewee?.last_name}</span>
                        <span className="text-muted-foreground">à l'avis de</span>
                        <span>{review.reviewer?.first_name} {review.reviewer?.last_name}</span>
                      </div>

                      <div className="bg-muted/30 rounded-lg p-3 border-l-2 border-muted-foreground/20">
                        <p className="text-xs text-muted-foreground mb-1">Avis original :</p>
                        <p className="text-sm italic">{review.cancellation_reason}</p>
                      </div>

                      <div className="bg-muted/50 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground mb-1">Réponse :</p>
                        <p className="text-sm">{review.cancellation_response}</p>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleModerationAction(review.id, "valide", "response_status")}
                          className="gap-1.5"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Valider la réponse
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setRejectReasonModal({ id: review.id, type: "response" })}
                          className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
                        >
                          <XCircle className="h-3.5 w-3.5" /> Refuser
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* All cancellation reviews list */}
          <div>
            <h2 className="font-heading font-semibold text-lg mb-3">
              Historique des annulations ({cancellationReviews.length})
            </h2>
            <div className="rounded-lg border bg-card overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Auteur → Cible</TableHead>
                    <TableHead>Annulé par</TableHead>
                    <TableHead>Raison</TableHead>
                    <TableHead>Modération</TableHead>
                    <TableHead>Réponse</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cancellationReviews.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-sm">
                        {r.reviewer?.first_name} → {r.reviewee?.first_name}
                      </TableCell>
                      <TableCell className="text-sm capitalize">{r.cancelled_by_role || "—"}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">{r.cancellation_reason || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={r.moderation_status === "valide" ? "default" : r.moderation_status === "refuse" ? "destructive" : "outline"}>
                          {r.moderation_status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{r.response_status || "aucune"}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{format(new Date(r.created_at), "d MMM yyyy", { locale: fr })}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Detail Modal */}
      <Dialog open={!!detailReview} onOpenChange={(o) => !o && setDetailReview(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Détail de l'avis</DialogTitle></DialogHeader>
          {detailReview && (
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                {detailReview.reviewer?.avatar_url && <img src={detailReview.reviewer.avatar_url} className="w-8 h-8 rounded-full object-cover" />}
                <div><strong>De :</strong> {detailReview.reviewer?.first_name} {detailReview.reviewer?.last_name}</div>
              </div>
              <div className="flex items-center gap-3">
                {detailReview.reviewee?.avatar_url && <img src={detailReview.reviewee.avatar_url} className="w-8 h-8 rounded-full object-cover" />}
                <div><strong>Pour :</strong> {detailReview.reviewee?.first_name} {detailReview.reviewee?.last_name}</div>
              </div>
              <div><strong>Type :</strong> {detailReview.review_type === "annulation" ? "Avis d'annulation" : detailReview.reviewer_id === detailReview.sit?.user_id ? "Proprio → Gardien" : "Gardien → Proprio"}</div>
              <div className="flex items-center gap-2"><strong>Note globale :</strong> {renderStars(detailReview.overall_rating)} <span className="text-muted-foreground">({detailReview.overall_rating}/5)</span></div>
              {detailReview.communication_rating && <div><strong>Communication :</strong> {detailReview.communication_rating}/5</div>}
              {detailReview.reliability_rating && <div><strong>Fiabilité :</strong> {detailReview.reliability_rating}/5</div>}
              {detailReview.animal_care_rating && <div><strong>Soin des animaux :</strong> {detailReview.animal_care_rating}/5</div>}
              {detailReview.housing_respect_rating && <div><strong>Respect du logement :</strong> {detailReview.housing_respect_rating}/5</div>}
              {detailReview.welcome_rating && <div><strong>Accueil :</strong> {detailReview.welcome_rating}/5</div>}
              {detailReview.housing_condition_rating && <div><strong>État du logement :</strong> {detailReview.housing_condition_rating}/5</div>}
              {detailReview.listing_accuracy_rating && <div><strong>Fidélité annonce :</strong> {detailReview.listing_accuracy_rating}/5</div>}
              {detailReview.instructions_clarity_rating && <div><strong>Clarté instructions :</strong> {detailReview.instructions_clarity_rating}/5</div>}
              <div><strong>Recommande :</strong> {detailReview.would_recommend ? "Oui ✓" : "Non ✗"}</div>
              <div><strong>Commentaire :</strong></div>
              <p className="bg-muted p-3 rounded-lg">{detailReview.comment || "Aucun commentaire"}</p>
              <div className="flex gap-2 pt-2 border-t border-border">
                <Button size="sm" variant={detailReview.published ? "outline" : "default"} onClick={() => { togglePublished(detailReview.id, detailReview.published); setDetailReview(null); }}>
                  {detailReview.published ? "Masquer" : "Publier"}
                </Button>
                <Button size="sm" variant="destructive" onClick={() => { setDeleteConfirm(detailReview.id); setDetailReview(null); }}>
                  Supprimer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={(o) => !o && setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Supprimer cet avis ?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Cette action est irréversible. Le commentaire sera remplacé par "[Supprimé par l'admin]".</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Annuler</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && deleteReview(deleteConfirm)}>Confirmer la suppression</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject reason modal */}
      <Dialog open={!!rejectReasonModal} onOpenChange={(o) => { if (!o) { setRejectReasonModal(null); setRejectReason(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {rejectReasonModal?.type === "review" ? "Refuser cet avis d'annulation" : "Refuser cette réponse"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              La raison du refus sera envoyée par email à l'auteur.
            </p>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Raison du refus..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectReasonModal(null); setRejectReason(""); }}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim()}
              onClick={() => {
                if (rejectReasonModal) {
                  handleModerationAction(
                    rejectReasonModal.id,
                    "refuse",
                    rejectReasonModal.type === "review" ? "moderation_status" : "response_status"
                  );
                }
              }}
            >
              Confirmer le refus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminReviews;
