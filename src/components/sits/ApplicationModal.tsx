import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAccessLevel } from "@/hooks/useAccessLevel";
import { toast } from "@/hooks/use-toast";
import { Send, Star, MapPin, Shield, ShieldCheck, CheckCircle2, Calendar } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { trackFirstAction } from "@/lib/analytics";

import { TooltipProvider } from "@/components/ui/tooltip";

interface ApplicationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sitId: string;
  ownerId: string;
  ownerFirstName: string;
  petNames: string[];
  city: string;
  startDate: string;
  endDate: string;
  onSuccess: () => void;
}

const ApplicationModal = ({
  open, onOpenChange, sitId, ownerId, ownerFirstName,
  petNames, city, startDate, endDate, onSuccess,
}: ApplicationModalProps) => {
  const { user } = useAuth();
  const { identityRecommended } = useAccessLevel();
  const animalText = petNames.length > 0 ? petNames.join(", ") : "vos animaux";
  const defaultMessage = `Bonjour ${ownerFirstName || ""},\n\nVotre annonce pour ${animalText} à ${city || "votre ville"} m'intéresse beaucoup.\n\n\n\nJe serais disponible du ${startDate} au ${endDate}.`;

  const [message, setMessage] = useState(defaultMessage);
  const [sending, setSending] = useState(false);
  const [sitterInfo, setSitterInfo] = useState<any>(null);

  // Load current user's sitter profile info for preview
  useEffect(() => {
    if (!user || !open) return;
    const load = async () => {
      const [profileRes, sitterRes, reviewRes, badgeRes, galleryRes] = await Promise.all([
        supabase.from("profiles").select("first_name, avatar_url, city, identity_verified").eq("id", user.id).single(),
        supabase.from("sitter_profiles").select("experience_years, animal_types").eq("user_id", user.id).maybeSingle(),
        supabase.from("reviews").select("overall_rating").eq("reviewee_id", user.id).eq("published", true),
        supabase.from("badge_attributions").select("badge_id").eq("user_id", user.id),
        supabase.from("sitter_gallery").select("photo_url").eq("user_id", user.id).limit(4),
      ]);

      const reviews = reviewRes.data || [];
      const avgRating = reviews.length > 0
        ? (reviews.reduce((s: number, r: any) => s + r.overall_rating, 0) / reviews.length).toFixed(1)
        : null;

      const badgeMap = new Map<string, number>();
      (badgeRes.data || []).forEach((b: any) => badgeMap.set(b.badge_id, (badgeMap.get(b.badge_id) || 0) + 1));
      const badgeCounts = Array.from(badgeMap.entries())
        .map(([badge_key, count]) => ({ badge_key, count }))
        .sort((a, b) => b.count - a.count);

      setSitterInfo({
        profile: profileRes.data,
        sitterProfile: sitterRes.data,
        avgRating,
        reviewCount: reviews.length,
        badgeCounts,
        gallery: galleryRes.data || [],
      });
    };
    load();
  }, [user, open]);

  const handleSend = async () => {
    if (!user || !message.trim()) return;
    setSending(true);

    // Garde-fou : vérifier que l'annonce accepte encore les candidatures
    const { data: sitCheck } = await supabase
      .from("sits")
      .select("status, accepting_applications, max_applications")
      .eq("id", sitId)
      .single();
    if (!sitCheck || sitCheck.status !== "published" || !sitCheck.accepting_applications) {
      setSending(false);
      toast({
        title: "Candidatures fermées",
        description: "Cette annonce n'accepte plus de candidatures.",
        variant: "destructive",
      });
      onOpenChange(false);
      return;
    }

    const { error } = await supabase.from("applications").insert({
      sit_id: sitId,
      sitter_id: user.id,
      message: message.trim(),
      status: "pending",
    });
    if (error) {
      setSending(false);
      toast({ title: "Erreur", description: "Impossible d'envoyer la candidature.", variant: "destructive" });
      return;
    }
    try { await trackFirstAction("application_sent", { sit_id: sitId }); } catch {}

    // Vérifier si on doit fermer les candidatures (max atteint)
    if (sitCheck.max_applications) {
      const { count } = await supabase
        .from("applications")
        .select("id", { count: "exact", head: true })
        .eq("sit_id", sitId)
        .not("status", "in", "(rejected,cancelled)");
      if (count !== null && count >= sitCheck.max_applications) {
        await supabase.from("sits").update({ accepting_applications: false } as any).eq("id", sitId);
      }
    }

    // Candidature à une garde — RPC atomique (context: sit_application)
    const { data: convId, error: convErr } = await supabase.rpc("get_or_create_conversation", {
      p_other_user_id: ownerId,
      p_context_type: "sit_application",
      p_sit_id: sitId,
      p_small_mission_id: null,
      p_long_stay_id: null,
    });

    if (!convErr && convId) {
      await supabase.from("messages").insert({
        conversation_id: convId as string, sender_id: user.id, content: message.trim(),
      });
    }

    setSending(false);
    toast({
      title: "Candidature envoyée !",
      description: "Vous serez notifié quand le propriétaire répondra.",
    });
    onOpenChange(false);
    onSuccess();
  };

  const p = sitterInfo?.profile;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">Postuler à cette garde</DialogTitle>
          <DialogDescription>Le propriétaire verra votre profil ci-dessous en plus de votre message.</DialogDescription>
        </DialogHeader>

        {identityRecommended && (
          <div
            className="rounded-lg p-3 flex items-start gap-2.5 mt-1"
            style={{
              backgroundColor: "hsl(40 33% 96%)",
              borderLeft: "3px solid hsl(153 42% 30%)",
            }}
          >
            <ShieldCheck className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <div className="space-y-1 flex-1">
              <p className="text-xs font-semibold text-foreground">
                Conseil — vérifiez votre identité pour être plus souvent retenu
              </p>
              <p className="text-xs text-muted-foreground">
                Les propriétaires acceptent en priorité les profils vérifiés. Vous pouvez postuler dès maintenant et vérifier votre identité plus tard.
              </p>
              <Link to="/settings#verification" className="text-xs text-primary font-medium hover:underline inline-block mt-0.5">
                Vérifier mon identité (1 min) →
              </Link>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-[1fr_220px] gap-4">
          {/* Left: message */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Votre message</label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={10}
              className="resize-none"
              placeholder="Votre message de candidature..."
            />
          </div>

          {/* Right: profile preview */}
          {sitterInfo && (
            <div className="bg-accent/50 rounded-xl p-4 space-y-3 h-fit">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                Ce que le proprio verra
              </p>

              <div className="flex items-center gap-2.5">
                <Avatar className="h-11 w-11">
                  <AvatarImage src={p?.avatar_url} />
                  <AvatarFallback className="font-semibold bg-primary/10 text-primary">
                    {p?.first_name?.charAt(0) || "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-sm">{p?.first_name}</span>
                    {p?.identity_verified && (
                      <Shield className="h-3.5 w-3.5 text-primary" />
                    )}
                  </div>
                  {p?.city && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {p.city}
                    </span>
                  )}
                </div>
              </div>

              {/* Rating */}
              {sitterInfo.avgRating && (
                <div className="flex items-center gap-1.5 text-sm">
                  <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                  <span className="font-semibold">{sitterInfo.avgRating}</span>
                  <span className="text-xs text-muted-foreground">({sitterInfo.reviewCount} avis)</span>
                </div>
              )}

              {/* Experience */}
              {sitterInfo.sitterProfile?.experience_years && (
                <p className="text-xs text-muted-foreground">
                  {sitterInfo.sitterProfile.experience_years} d'expérience
                </p>
              )}

              {/* Badges */}
              {/* Badges — migration en cours */}

              {/* Mini gallery */}
              {sitterInfo.gallery.length > 0 && (
                <div className="grid grid-cols-2 gap-1 rounded-lg overflow-hidden">
                  {sitterInfo.gallery.slice(0, 4).map((g: any, i: number) => (
                    <img
                      key={i}
                      src={g.photo_url}
                      alt=""
                      className="w-full h-16 object-cover"
                    />
                  ))}
                </div>
              )}

              {!sitterInfo.avgRating && sitterInfo.badgeCounts.length === 0 && (
                <p className="text-xs text-muted-foreground italic">
                  Complétez votre profil pour rassurer les propriétaires !
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSend} disabled={sending || !message.trim()} className="gap-2">
            <Send className="h-4 w-4" />
            {sending ? "Envoi..." : "Envoyer ma candidature"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ApplicationModal;
