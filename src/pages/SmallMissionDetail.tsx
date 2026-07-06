import { useState, useEffect, useCallback, useRef } from "react";
import { trackEvent } from "@/lib/analytics";
import { logger } from "@/lib/logger";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { sendTransactionalEmail } from "@/lib/sendTransactionalEmail";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, MapPin, Calendar, Clock, Dog, Flower2, Handshake,
  Heart, MessageSquare, CheckCircle2, Users, XCircle, ThumbsUp,
  ThumbsDown, Star, RotateCcw, Send, Home, X, Share2, ShieldCheck, Sparkles,
} from "lucide-react";
import { format, differenceInCalendarDays } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import ReportButton from "@/components/reports/ReportButton";
import PageMeta from "@/components/PageMeta";
import PageBreadcrumb from "@/components/seo/PageBreadcrumb";
import { Helmet } from "react-helmet-async";
const entraideHeader = "https://erhccyqevdyevpyctsjj.supabase.co/storage/v1/object/public/property-photos/misc/entraide-header.webp";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { useAccessLevel } from "@/hooks/useAccessLevel";
import AccessGateBanner from "@/components/access/AccessGateBanner";
import MissionPhotoGallery from "@/components/missions/MissionPhotoGallery";
import MissionPublishedBanner from "@/components/missions/MissionPublishedBanner";
import MatchedHelpersInviteBlock from "@/components/missions/MatchedHelpersInviteBlock";
import PublicHeader from "@/components/layout/PublicHeader";
import PublicFooter from "@/components/layout/PublicFooter";
import { AppLayout } from "@/components/layout/AppLayout";
import PublicMissionView from "@/components/missions/PublicMissionView";
import RelatedMissionCard from "@/components/missions/RelatedMissionCard";
import MissionResponseCard from "@/components/missions/MissionResponseCard";
import ApproximateLocationMap from "@/components/shared/ApproximateLocationMap";
import { isAuthorOf } from "@/lib/ownership";
import { sanitizeUserTitle } from "@/lib/sanitizeTitle";
import { haversineDistance } from "@/utils/geo";

/** Rayon max (km) pour considérer une mission « près de chez vous ». */
const NEAR_RADIUS_KM = 100;

const CATEGORY_META: Record<string, { label: string; icon: typeof Dog; colorClass: string }> = {
  animals: { label: "Animaux", icon: Dog, colorClass: "text-primary" },
  garden: { label: "Jardin", icon: Flower2, colorClass: "text-primary" },
  house: { label: "Maison", icon: Handshake, colorClass: "text-primary" },
  skills: { label: "Compétences", icon: Handshake, colorClass: "text-primary" },
};

const DURATION_LABELS: Record<string, string> = {
  "1-2h": "1-2 heures",
  half_day: "Demi-journée",
  full_day: "Journée",
  several: "Plusieurs jours",
  weekend: "Week-end",
  week: "Semaine",
};

/** Titlecase pour ville saisie en MAJUSCULES (ex: VERGONS → Vergons, AIX-EN-PROVENCE → Aix-en-Provence). */
function titlecaseCity(s?: string | null): string {
  if (!s) return "";
  const small = new Set(["de", "du", "des", "le", "la", "les", "et", "en", "sur", "sous", "lès", "aux"]);
  return s.toLowerCase().split(/(\s|-)/).map((part, i) => {
    if (part === " " || part === "-") return part;
    if (i > 0 && small.has(part)) return part;
    return part.charAt(0).toUpperCase() + part.slice(1);
  }).join("");
}

function timeAgoFr(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `il y a ${d} j`;
  const w = Math.floor(d / 7);
  if (w < 5) return `il y a ${w} sem`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function memberSince(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return `Membre depuis ${d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}`;
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  open: { label: "Ouverte", className: "bg-success-soft text-success" },
  in_progress: { label: "En cours", className: "bg-info-soft text-info" },
  completed: { label: "Terminée", className: "bg-muted text-muted-foreground" },
  cancelled: { label: "Annulée", className: "bg-destructive/10 text-destructive" },
};

const PUBLISHER_BADGES = [
  { key: "coup_de_main_en_or", label: "Coup de main en or", icon: Star, iconColor: "text-warning", bgColor: "bg-warning-soft", borderColor: "border-warning-border", selectedBg: "bg-warning/15" },
  { key: "super_voisin", label: "Personne en or", icon: Heart, iconColor: "text-success", bgColor: "bg-success-soft", borderColor: "border-success-border", selectedBg: "bg-success-soft/80" },
  { key: "on_remet_ca", label: "On remet ça", icon: RotateCcw, iconColor: "text-info", bgColor: "bg-info-soft", borderColor: "border-info-border", selectedBg: "bg-info-soft/80" },
];

const CANDIDATE_BADGES = [
  { key: "guide_aux_petits_oignons", label: "Guide aux petits oignons", icon: Star, iconColor: "text-warning", bgColor: "bg-warning-soft", borderColor: "border-warning-border", selectedBg: "bg-warning/15" },
  { key: "toujours_joignable", label: "Toujours joignable", icon: MessageSquare, iconColor: "text-success", bgColor: "bg-success-soft", borderColor: "border-success-border", selectedBg: "bg-success-soft/80" },
  { key: "on_reviendra", label: "On reviendra", icon: RotateCcw, iconColor: "text-info", bgColor: "bg-info-soft", borderColor: "border-info-border", selectedBg: "bg-info-soft/80" },
];

/* ── Inline Feedback Form ── */
const InlineFeedbackForm = ({
  missionId, receiverId, receiverName, badges, onSubmitted,
}: {
  missionId: string; receiverId: string; receiverName: string;
  badges: typeof PUBLISHER_BADGES; onSubmitted: () => void;
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [positive, setPositive] = useState<boolean | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user || positive === null) return;
    setSubmitting(true);
    const { error } = await supabase.from("mission_feedbacks" as any).insert({
      mission_id: missionId, giver_id: user.id, receiver_id: receiverId,
      positive, badge_key: selectedBadge, comment: comment.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      if (error.code === "23505") toast({ title: "Retour deja envoyé" });
      else { toast({ variant: "destructive", title: "Erreur" }); return; }
    } else {
      toast({ title: "Merci pour votre retour !" });
    }
    onSubmitted();
  };

  return (
    <div className="bg-card rounded-xl border border-border p-5 space-y-4">
      <p className="text-sm font-medium">Votre avis sur {receiverName}</p>

      {/* Thumbs */}
      <div className="flex gap-3">
        <button onClick={() => setPositive(true)} className={`flex-1 flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${positive === true ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}>
          <ThumbsUp className={`h-6 w-6 ${positive === true ? "text-primary" : "text-muted-foreground"}`} />
          <span className="text-xs font-medium">Oui</span>
        </button>
        <button onClick={() => setPositive(false)} className={`flex-1 flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${positive === false ? "border-destructive bg-destructive/5" : "border-border hover:border-destructive/30"}`}>
          <ThumbsDown className={`h-6 w-6 ${positive === false ? "text-destructive" : "text-muted-foreground"}`} />
          <span className="text-xs font-medium">Non</span>
        </button>
      </div>

      {/* Badge */}
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">Attribuer un écusson (optionnel)</p>
        {badges.map((b) => {
          const Icon = b.icon;
          const sel = selectedBadge === b.key;
          return (
            <button key={b.key} onClick={() => setSelectedBadge(sel ? null : b.key)}
              className={`w-full flex items-center gap-3 p-2.5 rounded-lg border-2 text-left transition-all ${sel ? `${b.selectedBg} ${b.borderColor}` : `${b.bgColor} border-transparent`}`}>
              <Icon className={`h-4 w-4 ${b.iconColor}`} />
              <span className="text-sm font-medium">{b.label}</span>
              {sel && <CheckCircle2 className="h-4 w-4 text-primary ml-auto" />}
            </button>
          );
        })}
      </div>

      {/* Comment */}
      <div>
        <Textarea placeholder="Un mot (optionnel)" value={comment} onChange={e => setComment(e.target.value.slice(0, 100))} maxLength={100} className="min-h-[50px]" />
        <p className="text-xs text-muted-foreground text-right mt-0.5">{comment.length}/100</p>
      </div>

      <Button onClick={handleSubmit} disabled={positive === null || submitting} className="w-full">
        <Send className="h-4 w-4 mr-2" /> {submitting ? "Envoi..." : "Envoyer mon avis"}
      </Button>
    </div>
  );
};

/* ── Main Page ── */
const SmallMissionDetail = () => {
  const { id: rawId } = useParams<{ id: string }>();
  // Sanitize: trim whitespace + invisible chars (nbsp \u00A0, zero-width) souvent ajoutés par les partages Facebook/messageries
  const id = rawId?.replace(/[\s\u00A0\u200B-\u200D\uFEFF]+/g, "") || undefined;
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { hasAccess } = useSubscriptionAccess();
  const { level: accessLevel, profileCompletion, canApplyMissions } = useAccessLevel();
  const { toast } = useToast();

  const [mission, setMission] = useState<any>(null);
  const [author, setAuthor] = useState<any>(null);
  const [responses, setResponses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [hasResponded, setHasResponded] = useState(false);
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [closingNoSelect, setClosingNoSelect] = useState(false);
  const [processingResponseId, setProcessingResponseId] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);

  // Per-person feedback tracking: receiverId → submitted
  const [feedbackSent, setFeedbackSent] = useState<Record<string, boolean>>({});
  // Received feedbacks
  const [receivedFeedbacks, setReceivedFeedbacks] = useState<any[]>([]);
  const [relatedMissions, setRelatedMissions] = useState<any[]>([]);

  // Current user's response
  const myResponse = responses.find(r => r.responder_id === user?.id);

  const load = useCallback(async () => {
    if (!id) return;
    if (id.startsWith("demo-")) { navigate("/petites-missions", { replace: true }); return; }

    const { data: m } = await supabase.from("small_missions").select("*").eq("id", id).single();
    if (!m) { setLoading(false); return; }
    setMission(m);

    // Parallélisation : tous ces appels sont indépendants une fois la mission chargée.
    // Pour "près de chez vous" on charge un pool large (30) puis on filtre par distance
    // côté client (haversine) pour éviter de proposer Vergons (04) à quelqu'un du 93.
    const [authorRes, relatedRes, respsRes, givenFbRes, recFbRes] = await Promise.all([
      supabase.rpc("get_mission_author_public", { _mission_id: m.id }),
      supabase.from("small_missions")
        .select("id, title, description, category, city, postal_code, created_at, duration_estimate, photos, mission_type, latitude, longitude")
        .eq("status", "open")
        .neq("id", m.id)
        .or(`category.eq.${m.category},city.eq.${m.city}`)
        .order("created_at", { ascending: false })
        .limit(30),
      supabase.from("small_mission_responses")
        .select("*, responder:profiles!small_mission_responses_responder_id_fkey(first_name, avatar_url)")
        .eq("mission_id", id).order("created_at", { ascending: false }),
      user
        ? supabase.from("mission_feedbacks" as any).select("receiver_id").eq("mission_id", id).eq("giver_id", user.id)
        : Promise.resolve({ data: [] as any[] }),
      user
        ? supabase.from("mission_feedbacks" as any)
            .select("*, giver:profiles!mission_feedbacks_giver_id_fkey(first_name, avatar_url)")
            .eq("mission_id", id).eq("receiver_id", user.id)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const authorRow: any = Array.isArray(authorRes.data) ? authorRes.data[0] : authorRes.data;
    setAuthor(authorRow ? { ...authorRow, created_at: authorRow.member_since } : null);

    // Filtrage par proximité réelle si on connaît les coords de la mission courante.
    const pool = (relatedRes.data || []) as any[];
    let ranked: any[] = pool;
    if (m.latitude && m.longitude) {
      const meLat = m.latitude as number;
      const meLng = m.longitude as number;
      const withDist = pool
        .map((r) => {
          const d = (r.latitude && r.longitude)
            ? haversineDistance({ lat: meLat, lng: meLng }, { lat: r.latitude, lng: r.longitude })
            : Number.POSITIVE_INFINITY;
          return { ...r, __distance_km: d };
        })
        .sort((a, b) => a.__distance_km - b.__distance_km);
      const near = withDist.filter((r) => r.__distance_km <= NEAR_RADIUS_KM);
      // On garde au moins 3 cartes si le rayon strict est vide (fallback catégorie).
      ranked = near.length >= 3 ? near : withDist;
    }
    setRelatedMissions(ranked.slice(0, 3));

    setResponses(respsRes.data || []);

    if (user) {
      setHasResponded(!!(respsRes.data?.some((r: any) => r.responder_id === user.id)));
      const sentMap: Record<string, boolean> = {};
      (givenFbRes.data as any[])?.forEach((f: any) => { sentMap[f.receiver_id] = true; });
      setFeedbackSent(sentMap);
      setReceivedFeedbacks((recFbRes.data as any[]) || []);
    }

    setLoading(false);
  }, [id, user, navigate]);

  useEffect(() => { load(); }, [load]);

  // Compteur de vues : 1 fois par mission par session (sessionStorage)
  useEffect(() => {
    if (!id || id.startsWith("demo-")) return;
    try {
      const key = `mission_viewed_${id}`;
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
      supabase.rpc("increment_small_mission_view" as any, { _mission_id: id });
    } catch { /* silencieux */ }
  }, [id]);

  // Realtime : l'auteur voit immédiatement les nouvelles propositions et changements de statut
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`mission-detail-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "small_mission_responses", filter: `mission_id=eq.${id}` }, () => { load(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, load]);

  const MIN_MESSAGE_LEN = 10;
  const MAX_MESSAGE_LEN = 500;
  const trimmedMessage = message.trim();
  const messageTooShort = trimmedMessage.length > 0 && trimmedMessage.length < MIN_MESSAGE_LEN;
  const messageValid = trimmedMessage.length >= MIN_MESSAGE_LEN && trimmedMessage.length <= MAX_MESSAGE_LEN;

  const handleRespond = async () => {
    if (!user || !id || submitting) return;
    if (!trimmedMessage) {
      toast({ variant: "destructive", title: "Message vide", description: "Écrivez un mot avant de publier votre réponse." });
      return;
    }
    if (trimmedMessage.length < MIN_MESSAGE_LEN) {
      toast({ variant: "destructive", title: "Message trop court", description: `Ajoutez au moins ${MIN_MESSAGE_LEN} caractères pour que l'auteur comprenne votre proposition.` });
      return;
    }
    setSubmitting(true);
    try {
      // Pre-check: re-read mission status to avoid responding to a closed mission
      const { data: fresh } = await supabase
        .from("small_missions")
        .select("status, user_id, title")
        .eq("id", id)
        .single();
      if (!fresh) throw new Error("Mission introuvable.");
      if (fresh.status !== "open") {
        toast({ variant: "destructive", title: "Mission clôturée", description: "Cette mission n'accepte plus de réponses." });
        return;
      }
      if (fresh.user_id === user.id) {
        toast({ variant: "destructive", title: "Action impossible", description: "Vous ne pouvez pas répondre à votre propre annonce." });
        return;
      }

      const { data: inserted, error } = await supabase
        .from("small_mission_responses")
        .insert({ mission_id: id, responder_id: user.id, message: trimmedMessage })
        .select("*, responder:profiles!small_mission_responses_responder_id_fkey(first_name, avatar_url)")
        .single();

      if (error) {
        if (error.code === "23505") {
          toast({ variant: "destructive", title: "Déjà envoyé", description: "Vous avez déjà proposé votre aide pour cette mission." });
          setHasResponded(true);
        } else {
          throw error;
        }
      } else {
        // Optimistic UI : afficher la nouvelle réponse tout de suite en tête de liste
        if (inserted) {
          setResponses((prev) => {
            if (prev.some((r) => r.id === (inserted as any).id)) return prev;
            return [inserted as any, ...prev];
          });
        }
        setHasResponded(true);
        setMessage("");
        toast({ title: "Réponse publiée !", description: "La personne qui demande va être prévenue." });

        // Notify mission author (non-bloquant côté UI)
        supabase.from("notifications").insert({
          user_id: fresh.user_id, type: "mission_proposal",
          title: "Nouvelle proposition d'aide",
          body: `${(user as any).first_name || "Un membre"} propose son aide pour "${fresh.title}"`,
          link: `/petites-missions/${id}`,
        }).then(() => {});

        // Email transactionnel, propriétaire de la mission notifié (non-bloquant)
        sendTransactionalEmail({
          templateName: "mission-response",
          recipientUserId: fresh.user_id,
          idempotencyKey: `mission-response-${id}-${user.id}`,
          templateData: {
            responderFirstName: (user as any).first_name || "",
            missionTitle: fresh.title,
          },
        }).catch(() => {});
      }

    } catch (err: any) {
      logger.error("[handleRespond]", { err: String(err) });
      toast({ variant: "destructive", title: "Erreur", description: err?.message || "Impossible de publier votre réponse." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptResponse = async (responseId: string, mode: "keep" | "decline_others" = "keep") => {
    if (processingResponseId) return;
    const resp = responses.find(r => r.id === responseId);
    if (!resp) return;
    setProcessingResponseId(responseId);
    try {
      // Server-side guard: re-check mission status
      const { data: freshMission } = await supabase
        .from("small_missions").select("status").eq("id", id!).single();
      if (!freshMission) throw new Error("Mission introuvable");
      if (freshMission.status === "cancelled" || freshMission.status === "completed") {
        toast({ variant: "destructive", title: "Mission clôturée", description: "Cette mission n'accepte plus de réponses." });
        return;
      }

      const { error: updErr } = await supabase
        .from("small_mission_responses").update({ status: "accepted" as any }).eq("id", responseId);
      if (updErr) throw updErr;

      if (freshMission.status === "open") {
        await supabase.from("small_missions").update({ status: "in_progress" as any }).eq("id", id!);
        setMission((prev: any) => ({ ...prev, status: "in_progress" }));
      }

      setResponses(prev => prev.map(r => r.id === responseId ? { ...r, status: "accepted" } : r));

      // Cascade decline si demandé
      const pendingOthers = responses.filter(r => r.id !== responseId && r.status === "pending");
      trackEvent("mission_accept_response_cascade_choice", {
        metadata: { mode, pending_count: pendingOthers.length },
      });
      if (mode === "decline_others" && pendingOthers.length > 0) {
        const otherIds = pendingOthers.map(r => r.id);
        await supabase.from("small_mission_responses")
          .update({ status: "declined" as any })
          .in("id", otherIds);
        await supabase.from("notifications").insert(
          pendingOthers.map(r => ({
            user_id: r.responder_id, type: "mission_declined",
            title: "Non retenu(e) cette fois",
            body: `Quelqu'un d'autre a été choisi pour "${mission.title}". Merci pour votre proposition.`,
          }))
        );
        pendingOthers.forEach(r => {
          sendTransactionalEmail({
            templateName: "mission-proposal-declined",
            recipientUserId: r.responder_id,
            idempotencyKey: `mission-proposal-declined-${r.id}`,
            templateData: { missionTitle: mission.title },
          }).catch(() => {});
        });
        setResponses(prev => prev.map(r =>
          otherIds.includes(r.id) ? { ...r, status: "declined" } : r,
        ));
      }

      // Reuse existing conversation if any (responder may have already proposed via dialog)
      const { data: existingConv } = await supabase
        .from("conversations")
        .select("id")
        .eq("small_mission_id", id!)
        .or(`and(owner_id.eq.${mission.user_id},sitter_id.eq.${resp.responder_id}),and(owner_id.eq.${resp.responder_id},sitter_id.eq.${mission.user_id})`)
        .maybeSingle();

      let convId = existingConv?.id;
      if (!convId) {
        const { data: newConv, error: convErr } = await supabase
          .from("conversations")
          .insert({
            owner_id: mission.user_id,
            sitter_id: resp.responder_id,
            small_mission_id: id,
          })
          .select("id")
          .single();
        if (convErr) throw convErr;
        convId = newConv.id;
      }

      // Add a system message to materialize the acceptance in the chat
      if (convId) {
        await supabase.from("messages").insert({
          conversation_id: convId,
          sender_id: user!.id,
          content: `Personne retenue pour « ${mission.title} ». Vous pouvez maintenant échanger pour organiser l'entraide.`,
          is_system: true,
        });
      }

      await supabase.from("notifications").insert({
        user_id: resp.responder_id, type: "mission_accepted",
        title: "Personne retenue",
        body: `Votre proposition pour "${mission.title}" a été acceptée. Vous pouvez maintenant échanger par messagerie.`,
        link: convId ? `/messages?c=${convId}` : `/messages`,
      });

      sendTransactionalEmail({
        templateName: "mission-proposal-accepted",
        recipientUserId: resp.responder_id,
        idempotencyKey: `mission-proposal-accepted-${responseId}`,
        templateData: {
          authorFirstName: (author as any)?.first_name || "",
          missionTitle: mission.title,
          conversationId: convId || "",
        },
      }).catch(() => {});

      toast({ title: "Vous avez retenu cette personne !" });
    } catch (err: any) {
      logger.error("[handleAcceptResponse]", { err: String(err) });
      toast({ variant: "destructive", title: "Erreur", description: err?.message || "Impossible de retenir cette personne." });
      // Rollback optimistic UI
      setResponses(prev => prev.map(r => r.id === responseId ? { ...r, status: "pending" } : r));
    } finally {
      setProcessingResponseId(null);
    }
  };

  const handleDeclineResponse = async (responseId: string) => {
    if (processingResponseId) return;
    const resp = responses.find(r => r.id === responseId);
    if (!resp) return;
    setProcessingResponseId(responseId);
    try {
      const { error } = await supabase
        .from("small_mission_responses").update({ status: "declined" as any }).eq("id", responseId);
      if (error) throw error;
      setResponses(prev => prev.map(r => r.id === responseId ? { ...r, status: "declined" } : r));

      await supabase.from("notifications").insert({
        user_id: resp.responder_id, type: "mission_declined",
        title: "Non retenu(e) cette fois",
        body: `Quelqu'un d'autre a été choisi pour "${mission.title}". Merci pour votre proposition.`,
      });

      sendTransactionalEmail({
        templateName: "mission-proposal-declined",
        recipientUserId: resp.responder_id,
        idempotencyKey: `mission-proposal-declined-${responseId}`,
        templateData: { missionTitle: mission.title },
      }).catch(() => {});
    } catch (err: any) {
      logger.error("[handleDeclineResponse]", { err: String(err) });
      toast({ variant: "destructive", title: "Erreur", description: err?.message || "Impossible de décliner." });
    } finally {
      setProcessingResponseId(null);
    }
  };

  const handleCloseNoSelect = async () => {
    if (closingNoSelect) return;
    setClosingNoSelect(true);
    try {
      const pending = responses.filter(r => r.status === "pending");
      if (pending.length > 0) {
        const ids = pending.map(r => r.id);
        // Batch update
        await supabase.from("small_mission_responses")
          .update({ status: "declined" as any })
          .in("id", ids);
        // Batch notifications
        await supabase.from("notifications").insert(
          pending.map(r => ({
            user_id: r.responder_id, type: "mission_cancelled",
            title: "Mission annulée",
            body: `La mission "${mission.title}" a été clôturée sans sélection.`,
          }))
        );
      }
      await supabase.from("small_missions").update({ status: "cancelled" as any }).eq("id", id!);
      setMission((prev: any) => ({ ...prev, status: "cancelled" }));
      setResponses(prev => prev.map(r => r.status === "pending" ? { ...r, status: "declined" } : r));
      setCloseModalOpen(false);
      toast({ title: "Mission clôturée" });
    } catch (err: any) {
      logger.error("[handleCloseNoSelect]", { err: String(err) });
      toast({ variant: "destructive", title: "Erreur", description: err?.message || "Impossible de clôturer." });
    } finally {
      setClosingNoSelect(false);
    }
  };

  const handleMarkCompleted = async () => {
    if (completing) return;
    setCompleting(true);
    try {
      const { error } = await supabase.from("small_missions").update({ status: "completed" as any }).eq("id", id!);
      if (error) throw error;
      setMission((prev: any) => ({ ...prev, status: "completed" }));
      // Batch notifications to accepted responders (compute inline to avoid forward-ref)
      const accepted = responses.filter(r => r.status === "accepted");
      if (accepted.length > 0) {
        await supabase.from("notifications").insert(
          accepted.map(r => ({
            user_id: r.responder_id, type: "mission_completed",
            title: "Mission terminée",
            body: `La mission "${mission.title}" est terminée. Laissez un avis !`,
            link: `/petites-missions/${id}`,
          }))
        );
      }
      toast({ title: "Mission marquée comme terminée !" });
    } catch (err: any) {
      logger.error("[handleMarkCompleted]", { err: String(err) });
      toast({ variant: "destructive", title: "Erreur", description: err?.message || "Impossible de terminer la mission." });
    } finally {
      setCompleting(false);
    }
  };

  // Valeurs dérivées (calculées à chaque render, pas de mémoïsation prématurée).
  const hasPublishedFlag = searchParams.get("published") === "1";
  const hasInvitedFlag = searchParams.get("invited") === "1";
  const isAuthor = isAuthorOf(user?.id, mission);
  const showPublishedBanner = Boolean(user?.id) && isAuthor && hasPublishedFlag;
  const showInvitedBanner =
    Boolean(user?.id) &&
    !isAuthor &&
    hasInvitedFlag &&
    mission?.status === "open" &&
    !responses.some((r) => r.responder_id === user?.id);

  // useEffect placé AVANT les early returns pour respecter les règles des Hooks
  // (sinon l'ordre des hooks change entre loading=true et loading=false).
  useEffect(() => {
    if (!loading && mission && hasPublishedFlag && !isAuthor) {
      logger.warn("mission_published_banner.unauthorized_attempt", {
        missionId: mission.id,
        viewerId: user?.id ?? null,
        authorId: mission.user_id,
        anonymous: !user?.id,
        path: typeof window !== "undefined" ? window.location.pathname : null,
      });
    }
  }, [loading, mission, hasPublishedFlag, isAuthor, user?.id]);

  const handleClosePublishedBanner = () => {
    setSearchParams({}, { replace: true });
  };

  if (loading) {
    return (
      <>
        {!user && <PublicHeader />}
        <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 animate-pulse">
          <div className="h-4 w-48 bg-muted rounded mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
            <div className="lg:col-span-8 space-y-6">
              <div className="h-64 md:h-80 bg-muted rounded-2xl" />
              <div className="h-8 w-3/4 bg-muted rounded" />
              <div className="h-4 w-1/2 bg-muted rounded" />
              <div className="space-y-2">
                <div className="h-4 w-full bg-muted rounded" />
                <div className="h-4 w-full bg-muted rounded" />
                <div className="h-4 w-2/3 bg-muted rounded" />
              </div>
            </div>
            <div className="lg:col-span-4 space-y-6">
              <div className="h-72 bg-muted rounded-2xl" />
              <div className="h-48 bg-muted rounded-2xl" />
            </div>
          </div>
        </div>
        {!user && <PublicFooter />}
      </>
    );
  }
  if (!mission) return (
    <>
      {!user && <PublicHeader />}
      <div className="p-6 md:p-10 max-w-3xl mx-auto min-h-[40vh]">
        <h1 className="font-heading text-2xl font-bold mb-2">Mission introuvable</h1>
        <p className="text-muted-foreground mb-4">Cette mission a peut-être été clôturée ou retirée.</p>
        <Link to="/petites-missions"><Button>Voir les missions ouvertes</Button></Link>
      </div>
      {!user && <PublicFooter />}
    </>
  );

  const catMeta = CATEGORY_META[mission.category] || CATEGORY_META.animals;
  const CatIcon = catMeta.icon;
  const statusMeta = STATUS_LABELS[mission.status] || STATUS_LABELS.open;
  const acceptedResponses = responses.filter(r => r.status === "accepted");
  const pendingResponses = responses.filter(r => r.status === "pending");
  const isDatePassed = mission.date_needed && new Date(mission.date_needed) < new Date();

  const handleSharePublishedLink = async () => {
    const cleanUrl = window.location.href.split("?")[0];
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({ title: mission.title, url: cleanUrl });
        return;
      } catch { /* annulé → fallback presse-papier */ }
    }
    try {
      await navigator.clipboard.writeText(cleanUrl);
      toast({ title: "Lien copié.", description: "Vous pouvez le partager où vous voulez." });
    } catch {
      toast({ title: "Copie impossible.", description: "Sélectionnez l'URL manuellement.", variant: "destructive" });
    }
  };

  // ─── Vue publique (non connecté) : layout éditorial dédié ───
  if (!user) {
    return (
      <>
        <PublicHeader />
        <PublicMissionView
          mission={mission}
          author={author}
          catMeta={{ label: catMeta.label }}
          durationLabel={mission.duration_estimate ? (DURATION_LABELS[mission.duration_estimate] || mission.duration_estimate) : null}
          relatedMissions={relatedMissions}
          titlecaseCity={titlecaseCity}
          timeAgoFr={timeAgoFr}
          memberSinceLong={memberSince}
          onShare={handleSharePublishedLink}
          viewCount={(mission as any).view_count ?? 0}
          responsesCount={responses.length}
        />
        <PublicFooter />
      </>
    );
  }

  const heroImage = mission.photos?.[0] || null;
  const extraPhotos = (mission.photos || []).slice(1);
  const cityLabel = titlecaseCity(mission.city) || "France";
  const displayTitle = sanitizeUserTitle(mission.title) || mission.title;
  const durationLabel = mission.duration_estimate ? (DURATION_LABELS[mission.duration_estimate] || mission.duration_estimate) : null;

  /* ── Sidebar contextuelle ─────────────────────────────────────────── */
  const renderSidebarCard = () => {
    // Author : récap propositions
    if (isAuthor) {
      return (
        <div className="bg-card p-5 rounded-2xl shadow-sm border border-border space-y-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Votre annonce</p>
            <span className={`inline-flex items-center gap-2 text-sm font-medium ${mission.status === "open" ? "text-success" : "text-muted-foreground"}`}>
              <span className={`w-2 h-2 rounded-full ${mission.status === "open" ? "bg-success" : "bg-muted-foreground/50"}`} />
              {statusMeta.label}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="bg-muted/50 rounded-2xl p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Réponses</p>
              <p className="font-heading text-3xl font-bold text-foreground leading-none">{responses.length}</p>
            </div>
            <div className="bg-muted/50 rounded-2xl p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">En attente</p>
              <p className="font-heading text-3xl font-bold text-foreground leading-none">{pendingResponses.length}</p>
            </div>
          </div>
          {(mission.status === "open" || mission.status === "in_progress") && responses.length > 0 && (
            <a href="#reponses" className="block">
              <Button className="w-full rounded-full" size="lg">Voir les réponses</Button>
            </a>
          )}
          {mission.status === "in_progress" && (
            <Button onClick={handleMarkCompleted} disabled={completing} variant="outline" className="w-full rounded-full gap-2">
              <CheckCircle2 className="h-4 w-4" /> {completing ? "Validation…" : "Marquer terminée"}
            </Button>
          )}
          {mission.status === "open" && (
            <button onClick={() => setCloseModalOpen(true)} className="text-xs text-muted-foreground hover:text-destructive w-full text-center transition-colors">
              Clôturer sans sélectionner
            </button>
          )}
        </div>
      );
    }

    // Candidat avec réponse existante
    if (myResponse) {
      if (myResponse.status === "accepted" && mission.status === "in_progress") {
        return (
          <div className="bg-card p-5 rounded-2xl shadow-sm border border-success-border space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <p className="font-heading text-lg font-semibold text-success">Personne retenue</p>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {author?.first_name || "L'auteur"} vous a choisi(e). Organisez la suite en direct.
            </p>
            <Button onClick={() => navigate("/messages")} className="w-full rounded-full gap-2" size="lg">
              <MessageSquare className="h-4 w-4" /> Aller à la messagerie
            </Button>
          </div>
        );
      }
      if (myResponse.status === "pending") {
        return (
          <div className="bg-card p-5 rounded-2xl shadow-sm border border-border space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-info" />
              <p className="font-heading text-lg font-semibold">Réponse publiée</p>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {author?.first_name || "L'auteur"} a reçu votre mot. Vous serez prévenu(e) dès qu'il y a une réponse.
            </p>
            <p className="text-xs text-muted-foreground">Envoyée {timeAgoFr(myResponse.created_at)}.</p>
            <Button
              variant="outline"
              size="sm"
              className="w-full rounded-full"
              onClick={async () => {
                if (!confirm("Retirer votre réponse ?")) return;
                const { error } = await supabase
                  .from("small_mission_responses")
                  .delete()
                  .eq("id", myResponse.id);
                if (error) {
                  toast({ variant: "destructive", title: "Erreur", description: error.message });
                  return;
                }
                setHasResponded(false);
                setResponses(prev => prev.filter(r => r.id !== myResponse.id));
                toast({ title: "Réponse retirée" });
              }}
            >
              Retirer ma réponse
            </Button>
          </div>
        );
      }
      if (myResponse.status === "declined") {
        return (
          <div className="bg-card p-5 rounded-2xl shadow-sm border border-border space-y-3">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-muted-foreground" />
              <p className="font-heading text-lg font-semibold text-muted-foreground">Non retenu(e)</p>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Quelqu'un d'autre a été choisi cette fois. Merci d'avoir osé proposer.
            </p>
            <Link to="/petites-missions" className="block">
              <Button variant="outline" className="w-full rounded-full">Voir d'autres coups de main</Button>
            </Link>
          </div>
        );
      }
      return null;
    }

    // Visiteur connecté, gate (profil incomplet)
    if (mission.status === "open" && accessLevel === 1) {
      return (
        <div className="bg-card p-5 rounded-2xl shadow-sm border border-border">
          <AccessGateBanner level={accessLevel} profileCompletion={profileCompletion} context="mission" />
        </div>
      );
    }

    // Visiteur connecté, peut répondre — carte compacte, la vraie saisie se fait sous le fil
    if (mission.status === "open" && canApplyMissions) {
      const isOffer = (mission as any).mission_type === "offre";
      const ctaLabel = isOffer ? "Solliciter cette aide" : "Répondre publiquement";
      return (
        <div className="bg-card p-5 rounded-2xl shadow-sm border border-border space-y-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Comment ça marche</p>
            <p className="font-heading text-lg font-bold text-foreground leading-snug">
              Répondez comme en commentaire.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed mt-1">
              Votre réponse est visible par tout le monde. {author?.first_name || "L'auteur"} pourra
              <span className="font-semibold text-foreground"> retenir une personne pour aider</span>.
            </p>
          </div>
          <Button
            className="w-full rounded-full font-bold text-base"
            size="lg"
            onClick={() => {
              const el = document.getElementById("composer");
              el?.scrollIntoView({ behavior: "smooth", block: "center" });
              setTimeout(() => document.getElementById("composer-textarea")?.focus(), 400);
            }}
          >
            {ctaLabel}
          </Button>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Gratuit, entre membres</span>
            <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Sans engagement</span>
          </div>
        </div>
      );
    }

    // Mission fermée / autres cas, état neutre
    return (
      <div className="bg-card p-5 rounded-2xl shadow-sm border border-border space-y-3">
        <p className="font-heading text-lg font-semibold">{statusMeta.label}</p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {mission.status === "in_progress" && "Cette mission est en cours d'organisation."}
          {mission.status === "completed" && "Cette mission est terminée. Merci à celles et ceux qui ont aidé."}
          {mission.status === "cancelled" && "Cette mission a été clôturée sans sélection."}
        </p>
        <Link to="/petites-missions" className="block">
          <Button variant="outline" className="w-full rounded-full">Voir d'autres coups de main</Button>
        </Link>
      </div>
    );
  };

  return (
    <AppLayout>
    <div className="text-foreground animate-fade-in">
      <PageMeta
        title={`${displayTitle} · Coup de main à ${cityLabel}`}
        description={(() => {
          const raw = mission.description?.trim();
          if (raw && raw.length >= 60) return raw.slice(0, 155);
          const parts = [
            `${catMeta.label} à ${cityLabel}`,
            mission.exchange_offer ? `En échange : ${mission.exchange_offer}` : null,
            "Coup de main entre particuliers, gratuit et sans engagement.",
          ].filter(Boolean);
          return parts.join(". ").slice(0, 155);
        })()}
        image={mission.photos?.[0]}
        type="article"
        publishedAt={mission.created_at}
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Service",
          name: displayTitle,
          description: mission.description?.slice(0, 300),
          areaServed: cityLabel,
          serviceType: catMeta.label,
          provider: { "@type": "Organization", name: "Guardiens", url: "https://guardiens.fr" },
          offers: { "@type": "Offer", price: "0", priceCurrency: "EUR", availability: mission.status === "open" ? "https://schema.org/InStock" : "https://schema.org/OutOfStock" },
          datePosted: mission.created_at,
        })}</script>
      </Helmet>

      <div className="max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <PageBreadcrumb items={[{ label: "Coups de main", href: "/petites-missions" }, { label: displayTitle }]} />
        </div>

        {/* Banner publication */}
        {showPublishedBanner && (
          <div className="mb-6">
            <MissionPublishedBanner
              missionTitle={mission.title}
              isAuthor={isAuthor}
              published
              onClose={handleClosePublishedBanner}
              onToast={(t) => toast(t)}
            />
          </div>
        )}

        {/* Bannière d'invitation côté gardien */}
        {showInvitedBanner && (
          <div className="mb-6 bg-info-soft border border-info-border rounded-2xl p-4 flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-info shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-info">Vous avez été invité à donner un coup de main</p>
              <p className="text-sm text-info/80 mt-1">
                Vos compétences correspondent à cette demande. Lisez les détails puis proposez votre aide en un clic ci-dessous.
              </p>
            </div>
          </div>
        )}

        {/* Bloc d'invitation directe, uniquement à la publication, pour l'auteur */}
        {showPublishedBanner && isAuthor && mission.status === "open" && (
          <MatchedHelpersInviteBlock
            missionId={mission.id}
            missionCategory={mission.category}
            ownerId={mission.user_id}
            ownerLat={mission.latitude}
            ownerLng={mission.longitude}
          />
        )}

        {/* Banners statut */}
        {mission.status === "in_progress" && acceptedResponses.length > 0 && (
          <div className="bg-success-soft border border-success-border rounded-2xl p-4 mb-6 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
            <p className="text-sm font-medium text-success">
              Mission organisée avec {acceptedResponses.map(r => r.responder?.first_name).filter(Boolean).join(", ")}
            </p>
          </div>
        )}
        {mission.status === "completed" && (
          <div className="bg-muted border border-border rounded-2xl p-4 mb-6 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
            <p className="text-sm font-medium text-muted-foreground">Mission terminée</p>
          </div>
        )}
        {mission.status === "cancelled" && (
          <div className="bg-muted border border-border rounded-2xl p-4 mb-6 flex items-center gap-2">
            <XCircle className="h-5 w-5 text-muted-foreground" />
            <p className="text-sm font-medium text-muted-foreground">Mission annulée</p>
          </div>
        )}

        {/* Bannière "date dépassée" (Chantier 8 EntraideHub Pass 1) */}
        {isDatePassed && (mission.status === "open" || mission.status === "in_progress") && mission.date_needed && (
          <ExpiredMissionBanner
            missionId={mission.id}
            dateNeeded={mission.date_needed}
            isAuthor={isAuthor}
          />
        )}



        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 lg:gap-10 items-start">
          {/* ── COLONNE PRINCIPALE ── */}
          <article className="lg:col-span-8 min-w-0">
            <header className="mb-6 md:mb-8">
              {/* Chip "Connecté" : ancre visuelle d'identité (utile surtout sur
                  mobile où la Sidebar est masquée). */}
              {user && (
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-2 mb-4 pl-1 pr-3 py-1 rounded-full bg-success-soft border border-success-border hover:opacity-90 transition-opacity max-w-full"
                  aria-label="Retour à votre espace"
                >
                  {(user as any).avatarUrl ? (
                    <img
                      src={(user as any).avatarUrl}
                      alt=""
                      className="w-6 h-6 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <span className="w-6 h-6 rounded-full bg-success text-success-foreground flex items-center justify-center text-[10px] font-bold shrink-0">
                      {((user as any).firstName || "?").charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0" />
                    <span className="truncate">
                      Connecté{(user as any).firstName ? ` · ${(user as any).firstName}` : ""}
                    </span>
                  </span>
                </Link>
              )}
              <div className="flex items-center gap-2 mb-3 md:mb-4 flex-wrap">
                <span className="inline-block px-2.5 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-bold tracking-widest uppercase">
                  {catMeta.label}
                </span>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase ${statusMeta.className}`}>
                  {statusMeta.label}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSharePublishedLink}
                  className="gap-1.5 rounded-full ml-auto h-8 px-3"
                  aria-label="Partager cette annonce"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Partager</span>
                </Button>
              </div>
              <h1 className="font-heading text-[1.6rem] leading-[1.15] sm:text-3xl md:text-4xl lg:text-[2.75rem] font-bold mb-3 text-foreground break-words">
                {displayTitle}
              </h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs sm:text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5 min-w-0">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{cityLabel}{mission.postal_code ? ` (${mission.postal_code.slice(0, 2)})` : ""}</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  Publié {timeAgoFr(mission.created_at)}
                </span>
                {durationLabel && (
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                    {durationLabel}
                  </span>
                )}
                {responses.length > 0 && (
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 shrink-0" />
                    {responses.length} réponse{responses.length > 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </header>

            {/* Image principale : uniquement si photo réelle. */}
            {heroImage && (
              <div className="mb-5 md:mb-8 rounded-xl md:rounded-2xl overflow-hidden border border-border bg-muted">
                <img
                  src={heroImage}
                  alt={displayTitle}
                  className="w-full aspect-video object-cover"
                  loading="eager"
                />
              </div>
            )}

            {/* Photos additionnelles */}
            {extraPhotos.length > 0 && (
              <div className="mb-8">
                <MissionPhotoGallery photos={mission.photos!} />
              </div>
            )}

            <div className="max-w-2xl space-y-6 md:space-y-8">
              {/* Auteur */}
              {author && (() => {
                const AuthorInner = (
                  <>
                    <div className="shrink-0">
                      {author.avatar_url ? (
                        <img
                          src={author.avatar_url}
                          alt={author.first_name || "Auteur"}
                          className="w-12 h-12 rounded-full object-cover border border-border"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center font-heading text-base font-bold text-foreground">
                          {author.first_name?.charAt(0) || "?"}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-semibold text-foreground flex items-center gap-2 flex-wrap">
                        {(mission as any).mission_type === "offre" ? "Proposé par" : "Demandé par"} {author.first_name || "un membre"}
                        {author.identity_verified && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-success bg-success-soft px-2 py-0.5 rounded-full">
                            <ShieldCheck className="h-3 w-3" /> Vérifié
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {[memberSince(author.created_at), titlecaseCity(author.city) || null].filter(Boolean).join(" · ")}
                      </p>
                      {author.user_id && (
                        <p className="text-xs text-primary font-medium mt-1 group-hover:underline">
                          Voir son profil →
                        </p>
                      )}
                    </div>
                    {!isAuthor && <ReportButton targetId={mission.user_id} targetType="profile" />}
                  </>
                );
                return author.user_id ? (
                  <Link
                    to={`/gardiens/${author.user_id}`}
                    className="group flex items-center gap-4 pb-6 border-b border-border hover:opacity-90 transition-opacity"
                  >
                    {AuthorInner}
                  </Link>
                ) : (
                  <div className="flex items-center gap-4 pb-6 border-b border-border">
                    {AuthorInner}
                  </div>
                );
              })()}

              {/* Description */}
              <section>
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground">
                    {(mission as any).mission_type === "offre" ? "La proposition" : "La mission"}
                  </h2>
                  {(mission as any).mission_type === "offre" && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-success/15 text-success text-[11px] font-body font-semibold tracking-wide">
                      Propose son aide
                    </span>
                  )}
                </div>
                <div className="space-y-4 text-base md:text-[17px] leading-relaxed text-foreground/85 whitespace-pre-wrap">
                  {mission.description}
                </div>
              </section>

              {/* En échange */}
              {mission.exchange_offer && (
                <aside className="border-l-2 border-primary/40 bg-muted/40 pl-4 py-3 rounded-r-lg">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    {(mission as any).mission_type === "offre" ? "Souhaité en échange" : "En échange"}
                  </p>
                  <p className="text-sm md:text-base text-foreground/85 italic leading-snug">
                    « {mission.exchange_offer} »
                  </p>
                </aside>
              )}
            </div>
          </article>

          {/* ── SIDEBAR ── */}
          <aside id="proposer-aide" className="lg:col-span-4 lg:sticky lg:top-6 space-y-4 scroll-mt-20">
            {renderSidebarCard()}

            {/* ── Fiche récap : auteur, période, animal, preuve sociale ── */}
            <div className="bg-card rounded-2xl border border-border shadow-sm divide-y divide-border">
              {/* Auteur */}
              {author && (
                <div className="p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2.5">
                    {(mission as any).mission_type === "offre" ? "Proposé par" : "Demandé par"}
                  </p>
                  {(() => {
                    const AuthorRow = (
                      <>
                        {author.avatar_url ? (
                          <img
                            src={author.avatar_url}
                            alt={author.first_name || "Auteur"}
                            className="w-10 h-10 rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-heading text-sm font-bold text-foreground shrink-0">
                            {author.first_name?.charAt(0) || "?"}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-foreground truncate flex items-center gap-1.5">
                            <span className="truncate">{author.first_name || "Un membre"}</span>
                            {author.identity_verified && (
                              <ShieldCheck className="h-3.5 w-3.5 text-success shrink-0" aria-label="Identité vérifiée" />
                            )}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {[memberSince(author.created_at), titlecaseCity(author.city) || null].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                      </>
                    );
                    return author.user_id ? (
                      <Link
                        to={`/gardiens/${author.user_id}`}
                        className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                      >
                        {AuthorRow}
                      </Link>
                    ) : (
                      <div className="flex items-center gap-3">{AuthorRow}</div>
                    );
                  })()}
                </div>
              )}

              {/* Faits : période, durée, animal */}
              {(mission.date_needed || mission.end_date || durationLabel || (mission.category === "animals" && (mission.pet_species || mission.pet_size))) && (
                <dl className="p-4 grid grid-cols-2 gap-x-3 gap-y-3">
                  {(mission.date_needed || mission.end_date) && (
                    <div className="col-span-2">
                      <dt className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5 inline-flex items-center gap-1.5">
                        <Calendar className="h-3 w-3" /> Période
                      </dt>
                      <dd className="text-sm font-semibold text-foreground">
                        {mission.date_needed
                          ? format(new Date(mission.date_needed), "d MMM", { locale: fr })
                          : "Dès que possible"}
                        {mission.end_date ? ` – ${format(new Date(mission.end_date), "d MMM", { locale: fr })}` : ""}
                      </dd>
                    </div>
                  )}
                  {durationLabel && (
                    <div className={mission.category === "animals" && (mission.pet_species || mission.pet_size) ? "" : "col-span-2"}>
                      <dt className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5 inline-flex items-center gap-1.5">
                        <Clock className="h-3 w-3" /> Durée
                      </dt>
                      <dd className="text-sm font-semibold text-foreground">{durationLabel}</dd>
                    </div>
                  )}
                  {mission.category === "animals" && (mission.pet_species || mission.pet_size) && (
                    <div className={durationLabel ? "" : "col-span-2"}>
                      <dt className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5 inline-flex items-center gap-1.5">
                        <Dog className="h-3 w-3" /> Animal
                      </dt>
                      <dd className="text-sm font-semibold text-foreground capitalize truncate">
                        {[mission.pet_species, mission.pet_size].filter(Boolean).join(" · ")}
                      </dd>
                    </div>
                  )}
                </dl>
              )}

              {/* Preuve sociale */}
              {(((mission as any).view_count ?? 0) > 0 || responses.length > 0) && (
                <div className="p-4 grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">Vues</p>
                    <p className="font-heading text-lg font-bold text-foreground leading-none">
                      {(mission as any).view_count ?? 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">Réponses</p>
                    <p className="font-heading text-lg font-bold text-foreground leading-none">
                      {responses.length}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Localisation approximative */}
            <div className="bg-card rounded-2xl overflow-hidden shadow-sm border border-border">
              <ApproximateLocationMap
                city={mission.city}
                postalCode={mission.postal_code}
                lat={mission.latitude}
                lng={mission.longitude}
                className="h-44"
              />
              <div className="p-4">
                <p className="font-semibold text-sm text-foreground mb-1">Localisation approximative</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  L'adresse exacte est partagée après mise en relation.
                </p>
              </div>
            </div>
          </aside>
        </div>

        {/* ══════════════════════════════════════════════════════ */}
        {/* ── Réponses (lecture publique, esprit commentaires) ── */}
        {/* ══════════════════════════════════════════════════════ */}
        {(mission.status === "open" || mission.status === "in_progress" || mission.status === "completed") && (
          <section id="reponses" className="mt-8 md:mt-12 pt-6 md:pt-8 border-t border-border scroll-mt-8">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3 mb-3">
                <MessageSquare className="h-5 w-5 text-primary" />
                <h2 className="font-heading text-2xl md:text-3xl font-bold">
                  Réponses <span className="text-muted-foreground font-normal">({responses.length})</span>
                </h2>
              </div>

              {/* Explainer : quoi faire + rôle de la personne retenue */}
              <div className="bg-muted/40 border border-border rounded-2xl p-4 mb-5 text-sm text-foreground/80 leading-relaxed">
                {isAuthor ? (
                  <>
                    <span className="font-semibold text-foreground">Vous êtes l'auteur.</span>{" "}
                    Chaque membre peut réagir publiquement. Quand une réponse vous convient, cliquez sur
                    <span className="font-semibold text-foreground"> « Retenir cette personne »</span> :
                    elle deviendra la <span className="font-semibold text-success">personne retenue pour vous aider</span>,
                    visible ici et sur son profil public.
                  </>
                ) : (
                  <>
                    <span className="font-semibold text-foreground">Répondez comme en commentaire.</span>{" "}
                    Votre réponse est publique. Si {author?.first_name || "l'auteur"} vous
                    <span className="font-semibold text-foreground"> retient pour l'aider</span>, vous serez
                    identifié(e) comme <span className="font-semibold text-success">« personne retenue »</span> et
                    cela apparaîtra sur votre profil public. Vous pouvez aussi dire
                    <span className="font-semibold text-foreground"> « Merci »</span> à une réponse utile.
                  </>
                )}
              </div>

              {responses.length === 0 ? (
                <div className="bg-muted/40 rounded-2xl p-6 text-center mb-5">
                  <p className="text-muted-foreground italic">
                    Pas encore de réponse. Soyez la première personne à réagir.
                  </p>
                </div>
              ) : (
                <ul
                  className="space-y-3 mb-6 list-none p-0"
                  aria-label={`Réponses à la mission (${responses.length})`}
                >
                  {responses.map((r: any) => (
                    <li key={r.id}>
                      <MissionResponseCard
                        response={r}
                        isAuthor={isAuthor}
                        currentUserId={user?.id}
                        missionOwnerId={mission.user_id}
                        processing={processingResponseId === r.id}
                        onSelect={() => handleAcceptResponse(r.id)}
                        onDecline={() => handleDeclineResponse(r.id)}
                        onOpenMessages={() => navigate(r.conversation_id ? `/messages?c=${r.conversation_id}` : "/messages")}
                      />
                    </li>
                  ))}
                </ul>
              )}

              {/* Zone live pour annoncer l'ajout d'une réponse aux lecteurs d'écran */}
              <div className="sr-only" aria-live="polite" aria-atomic="true">
                {responses.length > 0 ? `${responses.length} réponse${responses.length > 1 ? "s" : ""} publiée${responses.length > 1 ? "s" : ""}.` : ""}
              </div>

              {/* Composer inline type commentaire */}
              {!isAuthor && mission.status === "open" && canApplyMissions && !hasResponded && (
                <section
                  id="composer"
                  className="scroll-mt-24"
                  aria-labelledby="composer-heading"
                >
                  <h3 id="composer-heading" className="sr-only">Publier une réponse à la mission</h3>
                  <form
                    className="bg-card border border-border rounded-2xl p-3 md:p-4 flex items-start gap-3"
                    onSubmit={(e) => { e.preventDefault(); handleRespond(); }}
                    aria-busy={submitting}
                  >
                    {(user as any)?.avatar_url ? (
                      <img
                        src={(user as any).avatar_url}
                        alt=""
                        aria-hidden="true"
                        className="w-9 h-9 md:w-10 md:h-10 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div
                        aria-hidden="true"
                        className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-muted flex items-center justify-center font-bold text-sm shrink-0"
                      >
                        {(user as any)?.first_name?.charAt(0) || "?"}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <label htmlFor="composer-textarea" className="sr-only">
                        Votre réponse à {author?.first_name || "l'auteur"} (minimum {MIN_MESSAGE_LEN} caractères, maximum {MAX_MESSAGE_LEN})
                      </label>
                      <Textarea
                        id="composer-textarea"
                        name="mission-response"
                        placeholder={`Répondez à ${author?.first_name || "l'auteur"}, présentez-vous en deux mots…`}
                        value={message}
                        onChange={(e) => setMessage(e.target.value.slice(0, MAX_MESSAGE_LEN))}
                        onKeyDown={(e) => {
                          if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && messageValid && !submitting) {
                            e.preventDefault();
                            handleRespond();
                          }
                        }}
                        rows={3}
                        required
                        minLength={MIN_MESSAGE_LEN}
                        maxLength={MAX_MESSAGE_LEN}
                        aria-required="true"
                        aria-invalid={messageTooShort}
                        aria-describedby={messageTooShort ? "composer-error composer-help" : "composer-help"}
                        className={`min-h-[72px] resize-none rounded-xl border-0 bg-muted/50 focus-visible:ring-1 text-sm md:text-base ${messageTooShort ? "focus-visible:ring-destructive/60 ring-1 ring-destructive/40" : "focus-visible:ring-primary/40"}`}
                      />
                      {messageTooShort && (
                        <p id="composer-error" className="text-[11px] text-destructive mt-1.5" role="alert">
                          Encore {MIN_MESSAGE_LEN - trimmedMessage.length} caractère{MIN_MESSAGE_LEN - trimmedMessage.length > 1 ? "s" : ""} minimum pour publier.
                        </p>
                      )}
                      <div className="flex items-center justify-between gap-2 mt-2">
                        <span id="composer-help" className={`text-[11px] ${message.length > 450 ? "text-warning" : "text-muted-foreground"}`}>
                          <span aria-hidden="true">{message.length}/{MAX_MESSAGE_LEN} · Visible par tout le monde</span>
                          <span className="sr-only">
                            {message.length} caractères sur {MAX_MESSAGE_LEN}. Visible par tout le monde. Astuce : Ctrl + Entrée pour publier.
                          </span>
                        </span>
                        <Button
                          type="submit"
                          size="sm"
                          disabled={submitting || !messageValid}
                          aria-disabled={submitting || !messageValid}
                          aria-label={submitting ? "Envoi de la réponse en cours" : "Publier la réponse"}
                          className="rounded-full gap-1.5 min-h-11"
                        >
                          <Send className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>{submitting ? "Envoi…" : "Publier"}</span>
                        </Button>
                      </div>
                    </div>
                  </form>
                </section>
              )}


              {/* États composer : déjà répondu / non éligible */}
              {!isAuthor && hasResponded && (
                <div className="bg-success-soft/40 border border-success/30 rounded-2xl p-4 text-sm text-foreground/80 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                  Vous avez déjà répondu. {author?.first_name || "L'auteur"} vous répondra ici même.
                </div>
              )}
              {!isAuthor && mission.status === "open" && !canApplyMissions && accessLevel === 1 && (
                <div className="rounded-2xl border border-border p-4">
                  <AccessGateBanner level={accessLevel} profileCompletion={profileCompletion} context="mission" />
                </div>
              )}
            </div>
          </section>
        )}

        {/* ══════════════════════════════════════════════════════ */}
        {/* ── PUBLISHER : Avis post-mission ── */}
        {/* ══════════════════════════════════════════════════════ */}
        {isAuthor && mission.status === "completed" && acceptedResponses.length > 0 && (
          <section className="mt-8 md:mt-12 pt-6 md:pt-8 border-t border-border">
            <h2 className="font-heading text-2xl md:text-3xl font-bold mb-6">Laisser un avis</h2>
            <div className="space-y-4 max-w-3xl">
              {acceptedResponses.map(r => (
                <div key={r.id}>
                  {feedbackSent[r.responder_id] ? (
                    <div className="bg-muted/50 rounded-2xl p-4 flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      Avis envoyé pour {r.responder?.first_name}
                    </div>
                  ) : (
                    <InlineFeedbackForm
                      missionId={id!}
                      receiverId={r.responder_id}
                      receiverName={r.responder?.first_name || "l'aidant"}
                      badges={PUBLISHER_BADGES}
                      onSubmitted={() => setFeedbackSent(prev => ({ ...prev, [r.responder_id]: true }))}
                    />
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ══════════════════════════════════════════════════════ */}
        {/* ── CANDIDAT accepté + terminé : avis ── */}
        {/* ══════════════════════════════════════════════════════ */}
        {!isAuthor && myResponse?.status === "accepted" && mission.status === "completed" && (
          <section className="mt-8 md:mt-12 pt-6 md:pt-8 border-t border-border max-w-3xl">
            <h2 className="font-heading text-2xl md:text-3xl font-bold mb-6">Votre retour sur cette mission</h2>
            {feedbackSent[mission.user_id] ? (
              <div className="bg-muted/50 rounded-2xl p-4 flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-success" />
                Vous avez donné votre avis, merci !
              </div>
            ) : (
              <InlineFeedbackForm
                missionId={id!}
                receiverId={mission.user_id}
                receiverName={author?.first_name || "le publieur"}
                badges={CANDIDATE_BADGES}
                onSubmitted={() => setFeedbackSent(prev => ({ ...prev, [mission.user_id]: true }))}
              />
            )}
          </section>
        )}

        {/* Avis reçus */}
        {receivedFeedbacks.length > 0 && (
          <section className="mt-12 max-w-3xl">
            <h3 className="font-heading text-xl font-bold mb-4">Avis reçus</h3>
            <div className="space-y-3">
              {receivedFeedbacks.map((fb: any) => (
                <div key={fb.id} className="bg-card rounded-2xl border border-border p-4 flex items-start gap-3">
                  {fb.giver?.avatar_url ? (
                    <img src={fb.giver.avatar_url} className="w-9 h-9 rounded-full object-cover" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xs font-bold">{fb.giver?.first_name?.charAt(0)}</div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{fb.giver?.first_name}</p>
                    {fb.positive !== null && (
                      <span className={`inline-flex items-center gap-1 text-xs mt-1 ${fb.positive ? "text-success" : "text-destructive"}`}>
                        {fb.positive ? <ThumbsUp className="h-3 w-3" /> : <ThumbsDown className="h-3 w-3" />}
                        {fb.positive ? "Positif" : "Négatif"}
                      </span>
                    )}
                    {fb.comment && <p className="text-sm text-muted-foreground mt-1">{fb.comment}</p>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ══════════════════════════════════════════════════════ */}
        {/* ── Recommandations ── */}
        {/* ══════════════════════════════════════════════════════ */}
        {relatedMissions.length > 0 && (() => {
          // Vérifie qu'au moins UNE suggestion est dans le rayon "près de chez vous".
          // Sinon on titre honnêtement pour ne pas mentir au lecteur.
          const anyNear = relatedMissions.some(
            (rm: any) => typeof rm.__distance_km === "number" && rm.__distance_km <= NEAR_RADIUS_KM,
          );
          const sectionTitle = anyNear ? "Près de chez vous" : "D'autres coups de main";
          const sectionSubtitle = anyNear
            ? `D'autres coups de main à ${cityLabel} et alentours`
            : "Encore peu d'annonces dans votre secteur, voici des exemples récents à découvrir.";
          return (
            <section className="mt-8 md:mt-12 pt-6 md:pt-8 border-t border-border">
              <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-3">
                <div>
                  <h2 className="font-heading text-2xl md:text-3xl font-bold mb-1">{sectionTitle}</h2>
                  <p className="text-muted-foreground text-sm">{sectionSubtitle}</p>
                </div>
                <Link
                  to="/petites-missions"
                  className="font-bold text-sm border-b-2 border-foreground pb-0.5 hover:opacity-70 transition-opacity self-start md:self-auto"
                >
                  Tout parcourir
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {relatedMissions.slice(0, 3).map((rm) => (
                  <RelatedMissionCard
                    key={rm.id}
                    to={`/petites-missions/${rm.id}`}
                    photo={Array.isArray(rm.photos) ? rm.photos[0] : null}
                    category={rm.category}
                    title={sanitizeUserTitle(rm.title) || rm.title}
                    city={titlecaseCity(rm.city)}
                    timeAgo={timeAgoFr(rm.created_at)}
                    exchangeOffer={(rm as any).exchange_offer}
                  />
                ))}
              </div>
            </section>
          );
        })()}
      </div>

      {/* Mobile sticky CTA */}
      {!isAuthor && mission.status === "open" && canApplyMissions && !hasResponded && (
        <div className="lg:hidden fixed bottom-16 md:bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur border-t border-border px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] shadow-[0_-8px_24px_-12px_hsl(var(--foreground)/0.15)]">
          <Button
            size="lg"
            className="w-full rounded-full font-bold text-base shadow-lg shadow-primary/20"
            onClick={() => {
              const el = document.getElementById("composer");
              el?.scrollIntoView({ behavior: "smooth", block: "center" });
              setTimeout(() => document.getElementById("composer-textarea")?.focus(), 400);
            }}
          >
            {(mission as any).mission_type === "offre" ? "Solliciter cette aide" : "Répondre publiquement"}
          </Button>
        </div>
      )}


      {/* Close without selection modal */}
      <Dialog open={closeModalOpen} onOpenChange={setCloseModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clôturer cette mission ?</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            Voulez-vous clôturer cette mission sans avoir sélectionné quelqu'un ? Les candidats seront notifiés.
          </DialogDescription>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseModalOpen(false)}>Annuler</Button>
            <Button variant="destructive" onClick={handleCloseNoSelect} disabled={closingNoSelect}>
              {closingNoSelect ? "Clôture..." : "Clôturer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </AppLayout>
  );
};

/**
 * Bannière "date dépassée" (Chantier 8 EntraideHub Pass 1).
 * Affichée en tête de mission dont date_needed est passée et statut open|in_progress.
 * Auteur : CTA "Clôturer" + "Reporter à une nouvelle date" (redirige vers édition).
 * Autre visiteur : simple info textuelle.
 */
const ExpiredMissionBanner = ({
  missionId,
  dateNeeded,
  isAuthor,
}: {
  missionId: string;
  dateNeeded: string;
  isAuthor: boolean;
}) => {
  const navigate = useNavigate();
  const daysOverdue = Math.max(0, differenceInCalendarDays(new Date(), new Date(dateNeeded)));
  const seenRef = useRef(false);
  useEffect(() => {
    if (seenRef.current) return;
    seenRef.current = true;
    void trackEvent("mission_expired_badge_seen", {
      metadata: { mission_id: missionId, days_overdue: daysOverdue },
    });
  }, [missionId, daysOverdue]);
  const formatted = (() => {
    try { return format(new Date(dateNeeded), "d MMMM yyyy"); } catch { return dateNeeded; }
  })();
  return (
    <div className="bg-warning/10 border border-warning/40 rounded-2xl p-4 mb-6 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-warning-foreground">
          {isAuthor
            ? `Cette mission avait besoin d'aide le ${formatted}, il y a ${daysOverdue} jour${daysOverdue > 1 ? "s" : ""}.`
            : `Attention : la date souhaitée (${formatted}) est passée depuis ${daysOverdue} jour${daysOverdue > 1 ? "s" : ""}.`}
        </p>
        {isAuthor && (
          <p className="text-sm text-warning-foreground/80 mt-1">
            Clôturez la mission si elle n'est plus d'actualité, ou reportez-la à une nouvelle date.
          </p>
        )}
      </div>
      {isAuthor && (
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void trackEvent("mission_expired_reschedule_clicked", { metadata: { mission_id: missionId } });
              navigate(`/petites-missions/${missionId}/editer`);
            }}
          >
            Reporter
          </Button>
        </div>
      )}
    </div>
  );
};

export default SmallMissionDetail;
