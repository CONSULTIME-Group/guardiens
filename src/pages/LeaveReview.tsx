import { useState, useEffect } from "react";
import { useParams, useSearchParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, ThumbsUp, ThumbsDown } from "lucide-react";
import StarRating from "@/components/reviews/StarRating";

const ownerCriteria = [
  { key: "animal_care_rating", label: "Soin des animaux" },
  { key: "communication_rating", label: "Communication pendant la garde" },
  { key: "housing_respect_rating", label: "Respect du logement" },
  { key: "reliability_rating", label: "Ponctualité / fiabilité" },
];

const sitterCriteria = [
  { key: "listing_accuracy_rating", label: "Exactitude de l'annonce" },
  { key: "welcome_rating", label: "Accueil et passage de relais" },
  { key: "instructions_clarity_rating", label: "Clarté des consignes" },
  { key: "housing_condition_rating", label: "État du logement" },
];

const LeaveReview = () => {
  const { sitId } = useParams<{ sitId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, activeRole } = useAuth();
  const [sit, setSit] = useState<any>(null);
  const [reviewee, setReviewee] = useState<any>(null);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [overallRating, setOverallRating] = useState(0);
  const [subRatings, setSubRatings] = useState<Record<string, number>>({});
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);
  const [comment, setComment] = useState("");

  // Determine if current user is owner or sitter for this sit
  const [reviewType, setReviewType] = useState<"owner_to_sitter" | "sitter_to_owner">("owner_to_sitter");

  useEffect(() => {
    if (!sitId || !user) return;
    const load = async () => {
      const { data: sitData } = await supabase.from("sits").select("*").eq("id", sitId).single();
      if (!sitData) { setLoading(false); return; }
      setSit(sitData);

      const isOwner = sitData.user_id === user.id;
      const type = isOwner ? "owner_to_sitter" : "sitter_to_owner";
      setReviewType(type);

      // Find the other party
      let revieweeId: string;
      if (isOwner) {
        // Find the accepted sitter
        const { data: app } = await supabase.from("applications").select("sitter_id").eq("sit_id", sitId).eq("status", "accepted").maybeSingle();
        revieweeId = app?.sitter_id || "";
      } else {
        revieweeId = sitData.user_id;
      }

      if (revieweeId) {
        const { data: profile } = await supabase.from("profiles").select("id, first_name, avatar_url").eq("id", revieweeId).single();
        setReviewee(profile);
      }

      // Check if already reviewed
      const { data: existing } = await supabase.from("reviews").select("id").eq("sit_id", sitId).eq("reviewer_id", user.id).maybeSingle();
      if (existing) setAlreadyReviewed(true);

      setLoading(false);
    };
    load();
  }, [sitId, user]);

  const criteria = reviewType === "owner_to_sitter" ? ownerCriteria : sitterCriteria;
  const placeholder = reviewType === "owner_to_sitter"
    ? "Racontez comment s'est passée la garde. Les détails aident les futurs propriétaires à choisir."
    : "Décrivez votre expérience. Votre avis aide les futurs gardiens.";

  const canSubmit = overallRating > 0 && comment.trim().length >= 50 && wouldRecommend !== null;

  const handleSubmit = async () => {
    if (!canSubmit || !user || !reviewee || !sitId) return;
    setSubmitting(true);

    const payload: any = {
      sit_id: sitId,
      reviewer_id: user.id,
      reviewee_id: reviewee.id,
      overall_rating: overallRating,
      comment: comment.trim(),
      would_recommend: wouldRecommend,
      review_type: reviewType,
      published: false, // will be auto-published by trigger when both exist
    };

    // Add sub-criteria
    criteria.forEach(c => {
      if (subRatings[c.key]) payload[c.key] = subRatings[c.key];
    });

    const { error } = await supabase.from("reviews").insert(payload as any);
    if (error) {
      toast({ title: "Erreur", description: "Impossible de soumettre l'avis.", variant: "destructive" });
      setSubmitting(false);
      return;
    }

    // Send system message in conversation
    const { data: conv } = await supabase
      .from("conversations")
      .select("id")
      .eq("sit_id", sitId)
      .or(`owner_id.eq.${user.id},sitter_id.eq.${user.id}`)
      .maybeSingle();

    if (conv) {
      await supabase.from("messages").insert({
        conversation_id: conv.id,
        sender_id: user.id,
        content: `⭐ ${user.firstName} a laissé un avis. ${wouldRecommend ? "Recommandation positive !" : ""}`,
        is_system: true,
      });
    }

    toast({ title: "Avis envoyé !", description: "Il sera publié quand les deux parties auront donné le leur." });
    navigate(`/sits/${sitId}`);
  };

  if (loading) return <div className="p-6 text-muted-foreground">Chargement...</div>;
  if (!sit || !reviewee) return <div className="p-6">Garde introuvable.</div>;

  if (alreadyReviewed) {
    return (
      <div className="p-6 md:p-10 max-w-2xl mx-auto text-center">
        <p className="text-lg font-heading font-semibold mb-2">Avis déjà envoyé ✓</p>
        <p className="text-sm text-muted-foreground mb-4">Vous avez déjà laissé un avis pour cette garde.</p>
        <Link to={`/sits/${sitId}`}><Button variant="outline">Retour à l'annonce</Button></Link>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-2xl mx-auto animate-fade-in pb-32">
      <Link to={`/sits/${sitId}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" /> Retour
      </Link>

      <h1 className="font-heading text-2xl font-bold mb-1">Laisser un avis</h1>
      <div className="flex items-center gap-3 mb-8">
        {reviewee.avatar_url ? (
          <img src={reviewee.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-heading font-bold">
            {reviewee.first_name?.charAt(0) || "?"}
          </div>
        )}
        <div>
          <p className="font-medium">{reviewee.first_name}</p>
          <p className="text-xs text-muted-foreground">{sit.title}</p>
        </div>
      </div>

      {/* Overall rating */}
      <div className="mb-6">
        <label className="text-sm font-medium mb-2 block">Note globale</label>
        <StarRating value={overallRating} onChange={setOverallRating} size="lg" />
      </div>

      {/* Sub-criteria */}
      <div className="space-y-4 mb-6">
        <label className="text-sm font-medium block">Détail par critère</label>
        {criteria.map(c => (
          <div key={c.key} className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{c.label}</span>
            <StarRating value={subRatings[c.key] || 0} onChange={v => setSubRatings(prev => ({ ...prev, [c.key]: v }))} size="sm" />
          </div>
        ))}
      </div>

      {/* Recommendation */}
      <div className="mb-6">
        <label className="text-sm font-medium mb-2 block">
          {reviewType === "owner_to_sitter" ? "Recommanderiez-vous ce gardien ?" : "Recommanderiez-vous ce propriétaire ?"}
        </label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setWouldRecommend(true)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
              wouldRecommend === true ? "bg-green-50 border-green-300 text-green-700" : "border-border text-muted-foreground hover:bg-accent"
            }`}
          >
            <ThumbsUp className="h-4 w-4" /> Oui
          </button>
          <button
            type="button"
            onClick={() => setWouldRecommend(false)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
              wouldRecommend === false ? "bg-destructive/10 border-destructive/30 text-destructive" : "border-border text-muted-foreground hover:bg-accent"
            }`}
          >
            <ThumbsDown className="h-4 w-4" /> Non
          </button>
        </div>
      </div>

      {/* Comment */}
      <div className="mb-6">
        <label className="text-sm font-medium mb-2 block">Commentaire <span className="text-muted-foreground font-normal">(min. 50 caractères)</span></label>
        <Textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder={placeholder}
          rows={5}
          className="text-sm"
        />
        <p className={`text-xs mt-1 ${comment.trim().length >= 50 ? "text-green-600" : "text-muted-foreground"}`}>
          {comment.trim().length}/50 caractères minimum
        </p>
      </div>

      {/* Submit */}
      <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-card border-t border-border p-4 z-40 md:pb-4 pb-20">
        <div className="max-w-2xl mx-auto">
          <Button className="w-full h-12 text-base font-semibold" onClick={handleSubmit} disabled={!canSubmit || submitting}>
            {submitting ? "Envoi..." : "Envoyer mon avis"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LeaveReview;
