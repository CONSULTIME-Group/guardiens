import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAccessLevel } from "@/hooks/useAccessLevel";
import { toast } from "@/hooks/use-toast";
import { Send, Star, MapPin, Shield, ShieldCheck, CheckCircle2, Calendar } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { trackFirstAction, trackEvent } from "@/lib/analytics";
import { readDigestAttribution, clearDigestAttribution } from "@/lib/digestAttribution";

import { TooltipProvider } from "@/components/ui/tooltip";
import AlmaBubble from "@/components/ai/alma/AlmaBubble";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { detectRestrictionInText } from "@/lib/detectRestriction";
import AffinityBadge from "@/components/matching/AffinityBadge";
import { computeAffinityResultFull, type AffinityOwnerInput, type AffinitySitterInput, type AffinityResult } from "@/lib/affinityScore";


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
  const [almaLoading, setAlmaLoading] = useState(false);
  const [almaDismissed, setAlmaDismissed] = useState(false);
  const [almaUsed, setAlmaUsed] = useState(false);
  const [almaDraftText, setAlmaDraftText] = useState<string | null>(null);
  const [unpersonalizedConfirmOpen, setUnpersonalizedConfirmOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const almaSeenRef = useRef(false);
  const [companionWarning, setCompanionWarning] = useState<{
    text: string;
    petsMismatch: boolean;
    childrenMismatch: boolean;
    ownAnimalsLabel: string;
  } | null>(null);
  const prefillAppliedRef = useRef(false);
  const [affinity, setAffinity] = useState<AffinityResult | null>(null);


  // Load current user's sitter profile info for preview
  useEffect(() => {
    if (!user || !open) return;
    const load = async () => {
      const [profileRes, sitterRes, reviewRes, badgeRes, galleryRes, sitRes, ownerAffRes] = await Promise.all([
        supabase.from("profiles").select("first_name, avatar_url, city, identity_verified").eq("id", user.id).single(),
        supabase.from("sitter_profiles").select("experience_years, animal_types, own_animals, travels_with_children, travels_with_own_animals, life_pace, languages, interests, work_during_sit, sensitivities, special_animal_skills, sitter_type").eq("user_id", user.id).maybeSingle(),
        supabase.from("reviews").select("overall_rating").eq("reviewee_id", user.id).eq("published", true),
        supabase.from("badge_attributions").select("badge_id").eq("user_id", user.id),
        supabase.from("sitter_gallery").select("photo_url").eq("user_id", user.id).limit(4),
        supabase.from("sits").select("accepts_sitter_pets, accepts_sitter_children, owner_message, specific_expectations, property_id").eq("id", sitId).maybeSingle(),
        supabase.from("owner_profiles").select("preferred_sitter_types, home_ambiance, languages, interests, life_pace, presence_expected").eq("user_id", ownerId).maybeSingle(),
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

      // Détection mismatch accompagnants
      const sp: any = sitterRes.data || {};
      const sit: any = sitRes.data || {};
      const own: string[] = Array.isArray(sp.own_animals) ? sp.own_animals : [];
      const ownAnimalsDetail = own
        .filter((s: string) => s && s.toLowerCase() !== "non")
        .map((s: string) => s.replace(/^Oui[\s,\-—]*/i, "").trim())
        .filter(Boolean)
        .join(", ");
      const acceptsPets = (sit.accepts_sitter_pets as string) || "discuss";
      const acceptsKids = (sit.accepts_sitter_children as string) || "discuss";
      const restrictiveText = `${sit.owner_message || ""}\n${sit.specific_expectations || ""}`;
      const petsRestricted =
        acceptsPets === "no" ||
        (acceptsPets === "discuss" && detectRestrictionInText(restrictiveText, "pets"));
      const kidsRestricted =
        acceptsKids === "no" ||
        (acceptsPets === "discuss" && detectRestrictionInText(restrictiveText, "children")) ||
        (acceptsKids === "discuss" && detectRestrictionInText(restrictiveText, "children"));
      const petsMismatch = !!sp.travels_with_own_animals && petsRestricted;
      const childrenMismatch = !!sp.travels_with_children && kidsRestricted;

      if (petsMismatch || childrenMismatch) {
        const parts: string[] = [];
        if (petsMismatch) {
          parts.push(
            `Cette annonce n'accepte pas les gardiens qui viennent avec leurs animaux. Votre profil indique que vous voyagez avec ${ownAnimalsDetail || "vos animaux"}.`,
          );
        }
        if (childrenMismatch) {
          parts.push(
            "Cette annonce n'accepte pas les gardiens qui viennent avec leurs enfants. Votre profil indique que vous voyagez parfois avec vos enfants.",
          );
        }
        parts.push("Vous pouvez tout de même postuler pour en discuter avec le propriétaire.");
        setCompanionWarning({
          text: parts.join(" "),
          petsMismatch,
          childrenMismatch,
          ownAnimalsLabel: ownAnimalsDetail,
        });

        if (!prefillAppliedRef.current) {
          prefillAppliedRef.current = true;
          const companionsList: string[] = [];
          if (petsMismatch) companionsList.push(`mes animaux${ownAnimalsDetail ? ` (${ownAnimalsDetail})` : ""}`);
          if (childrenMismatch) companionsList.push("mes enfants");
          const companions = companionsList.join(" et ");
          const paragraph = `\n\nJe précise que je voyage habituellement avec ${companions}. Je suis prête à en discuter avec vous et à trouver une solution qui convienne à chacun.`;
          setMessage((prev) => (prev.includes("Je précise que je voyage") ? prev : `${prev.trimEnd()}${paragraph}`));
        }
      } else {
        setCompanionWarning(null);
      }

      // Score d'affinité (badge tête de modale)
      try {
        const ownerAff = (ownerAffRes.data as any) || null;
        const propertyId = (sitRes.data as any)?.property_id || null;
        let pets: any[] = [];
        if (propertyId) {
          const { data: petsData } = await supabase
            .from("pets")
            .select("species, special_needs")
            .eq("property_id", propertyId);
          pets = petsData || [];
        }
        if (ownerAff && sitterRes.data) {
          const ownerInput: AffinityOwnerInput = {
            ...ownerAff,
            pets,
            accepts_sitter_pets: (sitRes.data as any)?.accepts_sitter_pets ?? null,
            accepts_sitter_children: (sitRes.data as any)?.accepts_sitter_children ?? null,
          };
          const sitterInput: AffinitySitterInput = sitterRes.data as any;
          setAffinity(computeAffinityResultFull(ownerInput, sitterInput));
        } else {
          setAffinity(null);
        }
      } catch {
        setAffinity(null);
      }
    };
    load();
  }, [user, open, sitId]);

  // Alma Pass 1 : impression de la bulle lettre candidature (1×/ouverture)
  useEffect(() => {
    if (open && !almaSeenRef.current) {
      almaSeenRef.current = true;
      void trackEvent("alma_application_bubble_seen", { metadata: { sit_id: sitId } });
    }
    if (!open) {
      almaSeenRef.current = false;
      prefillAppliedRef.current = false;
      setCompanionWarning(null);
    }
  }, [open, sitId]);


  const handleSend = async () => {
    if (!user || !message.trim()) return;

    // Garde-fou anti-refus IA : ne jamais envoyer un message qui ressemble à
    // une réponse d'échec du générateur (ex : "Je suis désolée, mais je ne
    // peux pas rédiger..."). Voir bug P0 du 15/07/2026.
    const { isLlmRefusal } = await import("@/lib/detectLlmRefusal");
    if (isLlmRefusal(message)) {
      toast({
        title: "Message à retravailler",
        description: "Le brouillon ressemble à une réponse d'assistant IA en échec. Récrivez quelques phrases personnelles avant d'envoyer.",
        variant: "destructive",
      });
      return;
    }

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

    const { data: created, error } = await supabase
      .from("applications")
      .insert({
        sit_id: sitId,
        sitter_id: user.id,
        message: message.trim(),
        status: "pending",
      })
      .select("id")
      .single();
    if (error) {
      setSending(false);
      toast({ title: "Erreur", description: "Impossible d'envoyer la candidature.", variant: "destructive" });
      return;
    }
    // Alma Pass 1 : mesurer l'usage du brouillon Alma vs rédaction manuelle
    try {
      await trackEvent(almaUsed ? "alma_application_sent_with_draft" : "alma_application_sent_without_draft", {
        metadata: { sit_id: sitId },
      });
    } catch {}
    try {
      await trackEvent("application_submitted", {
        source: "modal",
        metadata: {
          source: "modal",
          used_alma_draft: almaUsed,
          message_length: message.trim().length,
          sit_id: sitId,
        },
      });
    } catch {}
    const digestAttr = readDigestAttribution(sitId);

    try {
      await trackFirstAction("application_sent", {
        sit_id: sitId,
        from_digest: !!digestAttr,
        digest_email_id: digestAttr?.email_id ?? null,
      });
    } catch {}
    if (digestAttr) {
      try {
        await trackEvent("sitter_digest_apply_from_email", {
          source: "ApplicationModal",
          metadata: {
            sit_id: sitId,
            application_id: created?.id ?? null,
            email_id: digestAttr.email_id ?? null,
          },
        });
      } catch {}
      clearDigestAttribution();
    }

    // La notification in-app ET l'email au propriétaire sont désormais envoyés
    // côté serveur par le trigger `on_new_application` (SECURITY DEFINER), qui
    // seul peut lire l'email du propriétaire (RLS bloque la lecture côté client).
    // Le trigger choisit automatiquement entre "first-application-received" et
    // "new-application" selon l'historique du propriétaire, avec la clé
    // d'idempotence `first-application-{app_id}` ou `new-application-{app_id}`.


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

    // Candidature à une garde, RPC atomique (context: sit_application)
    const { data: convId, error: convErr } = await supabase.rpc("get_or_create_conversation", {
      p_other_user_id: ownerId,
      p_context_type: "sit_application",
      p_sit_id: sitId,
      p_small_mission_id: null,
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

        {affinity?.displayed && (
          <div className="flex items-center gap-2 flex-wrap mt-1">
            <AffinityBadge
              result={affinity}
              size="md"
              trackingContext="application_modal"
              trackingId={sitId}
            />
            <span className="text-xs text-muted-foreground">
              Votre affinité avec ce propriétaire
            </span>
          </div>
        )}


        {companionWarning && (
          <Alert className="mt-1 border-warning/40 bg-warning/10 text-foreground">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <AlertDescription className="text-sm">
              {companionWarning.text}
            </AlertDescription>
          </Alert>
        )}


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
                Conseil, vérifiez votre identité pour être plus souvent retenu
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
            <label htmlFor="application-message" className="text-sm font-medium">Votre message</label>
            {!almaDismissed && (
              <AlmaBubble
                audience="sitter"
                variant="inline"
                loading={almaLoading}
                onDismiss={() => setAlmaDismissed(true)}
                actions={
                  <>
                    <Button
                      type="button"
                      size="sm"
                      onClick={async () => {
                        setAlmaLoading(true);
                        try {
                          const { data, error } = await supabase.functions.invoke("draft-application-letter", { body: { sit_id: sitId } });
                          if (error) throw error;
                          if ((data as any)?.error) throw new Error((data as any).error);
                          const draft = (data as any)?.draft as string;
                          if (!draft) throw new Error("Aucun brouillon reçu");
                          setMessage(draft);
                          setAlmaUsed(true);
                          setAlmaDismissed(true);
                          await trackEvent("alma_application_letter_generated", { metadata: { sit_id: sitId } });
                          toast({ title: "Brouillon Alma prêt", description: "Tu peux relire et personnaliser avant d'envoyer." });
                        } catch (e: any) {
                          toast({ title: "Alma indisponible", description: e?.message || "Réessaie dans un instant.", variant: "destructive" });
                        } finally {
                          setAlmaLoading(false);
                        }
                      }}
                      disabled={almaLoading}
                    >
                      Oui, écrire un brouillon
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setAlmaDismissed(true)}>
                      Non, je préfère écrire moi-même
                    </Button>
                  </>
                }
              >
                Je peux te suggérer un début de lettre à partir de ta bio et de cette annonce. Tu gardes le contrôle.
              </AlmaBubble>
            )}
            {almaUsed && !almaDismissed && (
              <p className="text-[10px] font-medium text-primary/80 uppercase tracking-wider">Brouillon Alma, à personnaliser</p>
            )}
            <Textarea
              id="application-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={10}
              className="resize-none"
              placeholder="Votre message de candidature..."
            />
            {almaUsed && (
              <p className="text-xs text-muted-foreground">Brouillon Alma inséré, à personnaliser avant envoi.</p>
            )}
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
              {/* Badges, migration en cours */}

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
