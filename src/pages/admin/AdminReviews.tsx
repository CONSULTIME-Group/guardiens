import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Eye, EyeOff, Trash2, Star, Mail, AlertTriangle } from "lucide-react";

const AdminReviews = () => {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState<"date" | "rating">("date");
  const [detailReview, setDetailReview] = useState<any | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Fetch badges for reviews
  const [badgeCounts, setBadgeCounts] = useState<Record<string, number>>({});

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("reviews")
      .select(`
        *,
        reviewer:profiles!reviews_reviewer_id_fkey(first_name, last_name, avatar_url),
        reviewee:profiles!reviews_reviewee_id_fkey(first_name, last_name, avatar_url)
      `);

    if (filterStatus === "published") query = query.eq("published", true);
    if (filterStatus === "unpublished") query = query.eq("published", false);
    if (filterStatus === "low") query = query.lte("overall_rating", 2);

    if (sortBy === "rating") query = query.order("overall_rating", { ascending: true });
    else query = query.order("created_at", { ascending: false });

    const { data, error } = await query;
    if (error) toast.error("Erreur de chargement");
    else {
      setReviews(data || []);
      // Fetch badges for these sit_ids
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

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

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

  const renderStars = (rating: number) => (
    <div className="flex">
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={`h-3.5 w-3.5 ${i < rating ? "text-yellow-500 fill-yellow-500" : "text-muted"}`} />
      ))}
    </div>
  );

  const lowRatingCount = reviews.filter(r => r.overall_rating <= 2).length;

  return (
    <div className="space-y-6">
      <h1 className="font-body text-2xl font-bold">Avis</h1>

      {/* Alert for low ratings */}
      {lowRatingCount > 0 && filterStatus === "all" && (
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-900/10 dark:border-orange-800">
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
              <TableRow key={review.id} className={review.overall_rating <= 2 ? "bg-red-50/50 dark:bg-red-900/5" : ""}>
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

      {/* Detail Modal */}
      <Dialog open={!!detailReview} onOpenChange={(o) => !o && setDetailReview(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Détail de l'avis</DialogTitle></DialogHeader>
          {detailReview && (
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                {detailReview.reviewer?.avatar_url && <img src={detailReview.reviewer.avatar_url} className="w-8 h-8 rounded-full object-cover" />}
                <div>
                  <strong>De :</strong> {detailReview.reviewer?.first_name} {detailReview.reviewer?.last_name}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {detailReview.reviewee?.avatar_url && <img src={detailReview.reviewee.avatar_url} className="w-8 h-8 rounded-full object-cover" />}
                <div>
                  <strong>Pour :</strong> {detailReview.reviewee?.first_name} {detailReview.reviewee?.last_name}
                </div>
              </div>
              <div><strong>Type :</strong> {detailReview.review_type === "owner_to_sitter" ? "Proprio → Gardien" : "Gardien → Proprio"}</div>
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
    </div>
  );
};

export default AdminReviews;
