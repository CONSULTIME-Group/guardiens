import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Eye, EyeOff, Trash2, Star } from "lucide-react";

const AdminReviews = () => {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [detailReview, setDetailReview] = useState<any | null>(null);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("reviews")
      .select(`
        *,
        reviewer:profiles!reviews_reviewer_id_fkey(first_name, last_name),
        reviewee:profiles!reviews_reviewee_id_fkey(first_name, last_name)
      `)
      .order("created_at", { ascending: false });

    if (filterStatus === "published") query = query.eq("published", true);
    if (filterStatus === "unpublished") query = query.eq("published", false);

    const { data, error } = await query;
    if (error) toast.error("Erreur de chargement");
    else setReviews(data || []);
    setLoading(false);
  }, [filterStatus]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  const togglePublished = async (id: string, current: boolean) => {
    const { error } = await supabase.from("reviews").update({ published: !current }).eq("id", id);
    if (error) toast.error("Erreur");
    else { toast.success(current ? "Avis masqué" : "Avis publié"); fetchReviews(); }
  };

  const deleteReview = async (id: string) => {
    if (!confirm("Supprimer cet avis définitivement ?")) return;
    // Reviews don't have DELETE RLS for regular users but admin can use service
    // For now we'll update it to unpublished as a "soft delete"
    const { error } = await supabase.from("reviews").update({ published: false, comment: "[Supprimé par l'admin]" }).eq("id", id);
    if (error) toast.error("Erreur");
    else { toast.success("Avis supprimé"); fetchReviews(); }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star key={i} className={`h-3 w-3 inline ${i < rating ? "text-yellow-500 fill-yellow-500" : "text-muted"}`} />
    ));
  };

  return (
    <div className="space-y-6">
      <h1 className="font-body text-2xl font-bold">Avis</h1>

      <div className="flex gap-3">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="published">Publiés</SelectItem>
            <SelectItem value="unpublished">Non publiés</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Auteur → Destinataire</TableHead>
              <TableHead>Note</TableHead>
              <TableHead>Commentaire</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Chargement…</TableCell></TableRow>
            ) : reviews.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Aucun avis</TableCell></TableRow>
            ) : reviews.map((review) => (
              <TableRow key={review.id}>
                <TableCell className="text-sm">
                  <span className="font-medium">{review.reviewer?.first_name} {review.reviewer?.last_name}</span>
                  <span className="text-muted-foreground"> → </span>
                  <span>{review.reviewee?.first_name} {review.reviewee?.last_name}</span>
                </TableCell>
                <TableCell>{renderStars(review.overall_rating)}</TableCell>
                <TableCell className="max-w-[250px] truncate text-sm text-muted-foreground">
                  {review.comment || "—"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {format(new Date(review.created_at), "d MMM yyyy", { locale: fr })}
                </TableCell>
                <TableCell>
                  <Badge variant={review.published ? "default" : "outline"}>
                    {review.published ? "Publié" : "Masqué"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" title="Voir" onClick={() => setDetailReview(review)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" title={review.published ? "Masquer" : "Publier"} onClick={() => togglePublished(review.id, review.published)}>
                      <EyeOff className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" title="Supprimer" onClick={() => deleteReview(review.id)}>
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
          <DialogHeader>
            <DialogTitle>Détail de l'avis</DialogTitle>
          </DialogHeader>
          {detailReview && (
            <div className="space-y-3 text-sm">
              <div><strong>De :</strong> {detailReview.reviewer?.first_name} {detailReview.reviewer?.last_name}</div>
              <div><strong>Pour :</strong> {detailReview.reviewee?.first_name} {detailReview.reviewee?.last_name}</div>
              <div><strong>Type :</strong> {detailReview.review_type === "owner_to_sitter" ? "Proprio → Gardien" : "Gardien → Proprio"}</div>
              <div><strong>Note globale :</strong> {renderStars(detailReview.overall_rating)} ({detailReview.overall_rating}/5)</div>
              {detailReview.communication_rating && <div><strong>Communication :</strong> {detailReview.communication_rating}/5</div>}
              {detailReview.reliability_rating && <div><strong>Fiabilité :</strong> {detailReview.reliability_rating}/5</div>}
              {detailReview.animal_care_rating && <div><strong>Soin des animaux :</strong> {detailReview.animal_care_rating}/5</div>}
              {detailReview.housing_respect_rating && <div><strong>Respect du logement :</strong> {detailReview.housing_respect_rating}/5</div>}
              <div><strong>Recommande :</strong> {detailReview.would_recommend ? "Oui" : "Non"}</div>
              <div><strong>Commentaire :</strong></div>
              <p className="bg-muted p-3 rounded-lg">{detailReview.comment || "Aucun commentaire"}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminReviews;
