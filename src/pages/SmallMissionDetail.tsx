import { useState, useEffect, useCallback } from "react";
import { logger } from "@/lib/logger";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { sendTransactionalEmail } from "@/lib/sendTransactionalEmail";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, MapPin, Calendar, Clock, Dog, Flower2, Handshake,
  Heart, MessageSquare, CheckCircle2, Users, XCircle, ThumbsUp,
  ThumbsDown, Star, RotateCcw, Send, Home,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import ReportButton from "@/components/reports/ReportButton";
import PageMeta from "@/components/PageMeta";
const entraideHeader = "https://erhccyqevdyevpyctsjj.supabase.co/storage/v1/object/public/property-photos/misc/entraide-header.webp";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { useAccessLevel } from "@/hooks/useAccessLevel";
import AccessGateBanner from "@/components/access/AccessGateBanner";
import MissionPhotoGallery from "@/components/missions/MissionPhotoGallery";

const CATEGORY_META: Record<string, { label: string; icon: typeof Dog; colorClass: string }> = {
  animals: { label: "Animaux", icon: Dog, colorClass: "text-orange-500" },
  garden: { label: "Jardin", icon: Flower2, colorClass: "text-green-600" },
  house: { label: "Maison", icon: Home, colorClass: "text-blue-500" },
  skills: { label: "Compétences", icon: Handshake, colorClass: "text-amber-600" },
};

const DURATION_LABELS: Record<string, string> = {
  "1-2h": "1-2 heures",
  half_day: "Demi-journée",
  full_day: "Journée",
  several: "Plusieurs jours",
  weekend: "Week-end",
  week: "Semaine",
};

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  open: { label: "Ouverte", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  in_progress: { label: "En cours", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  completed: { label: "Terminée", className: "bg-muted text-muted-foreground" },
  cancelled: { label: "Annulée", className: "bg-destructive/10 text-destructive" },
};

const PUBLISHER_BADGES = [
  { key: "coup_de_main_en_or", label: "Coup de main en or", icon: Star, iconColor: "text-amber-500", bgColor: "bg-amber-50 dark:bg-amber-900/20", borderColor: "border-amber-300 dark:border-amber-700", selectedBg: "bg-amber-100 dark:bg-amber-900/40" },
  { key: "super_voisin", label: "Personne en or", icon: Heart, iconColor: "text-green-500", bgColor: "bg-green-50 dark:bg-green-900/20", borderColor: "border-green-300 dark:border-green-700", selectedBg: "bg-green-100 dark:bg-green-900/40" },
  { key: "on_remet_ca", label: "On remet ça", icon: RotateCcw, iconColor: "text-blue-500", bgColor: "bg-blue-50 dark:bg-blue-900/20", borderColor: "border-blue-300 dark:border-blue-700", selectedBg: "bg-blue-100 dark:bg-blue-900/40" },
];

const CANDIDATE_BADGES = [
  { key: "guide_aux_petits_oignons", label: "Guide aux petits oignons", icon: Star, iconColor: "text-amber-500", bgColor: "bg-amber-50 dark:bg-amber-900/20", borderColor: "border-amber-300 dark:border-amber-700", selectedBg: "bg-amber-100 dark:bg-amber-900/40" },
  { key: "toujours_joignable", label: "Toujours joignable", icon: MessageSquare, iconColor: "text-green-500", bgColor: "bg-green-50 dark:bg-green-900/20", borderColor: "border-green-300 dark:border-green-700", selectedBg: "bg-green-100 dark:bg-green-900/40" },
  { key: "on_reviendra", label: "On reviendra", icon: RotateCcw, iconColor: "text-blue-500", bgColor: "bg-blue-50 dark:bg-blue-900/20", borderColor: "border-blue-300 dark:border-blue-700", selectedBg: "bg-blue-100 dark:bg-blue-900/40" },
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
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
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

  // Current user's response
  const myResponse = responses.find(r => r.responder_id === user?.id);

  const load = useCallback(async () => {
    if (!id) return;
    if (id.startsWith("demo-")) { navigate("/petites-missions", { replace: true }); return; }

    const { data: m } = await supabase.from("small_missions").select("*").eq("id", id).single();
    if (!m) { setLoading(false); return; }
    setMission(m);

    const { data: profile } = await supabase.from("profiles")
      .select("first_name, last_name, avatar_url, city, postal_code, identity_verified")
      .eq("id", m.user_id).single();
    setAuthor(profile);

    const { data: resps } = await supabase.from("small_mission_responses")
      .select("*, responder:profiles!small_mission_responses_responder_id_fkey(first_name, avatar_url)")
      .eq("mission_id", id).order("created_at", { ascending: false });
    setResponses(resps || []);

    if (user) {
      setHasResponded(!!(resps?.some((r: any) => r.responder_id === user.id)));

      // Load feedbacks given by current user for this mission
      const { data: givenFb } = await supabase.from("mission_feedbacks" as any)
        .select("receiver_id").eq("mission_id", id).eq("giver_id", user.id);
      const sentMap: Record<string, boolean> = {};
      givenFb?.forEach((f: any) => { sentMap[f.receiver_id] = true; });
      setFeedbackSent(sentMap);

      // Load feedbacks received by current user
      const { data: recFb } = await supabase.from("mission_feedbacks" as any)
        .select("*, giver:profiles!mission_feedbacks_giver_id_fkey(first_name, avatar_url)")
        .eq("mission_id", id).eq("receiver_id", user.id);
      setReceivedFeedbacks(recFb || []);
    }

    setLoading(false);
  }, [id, user, navigate]);

  useEffect(() => { load(); }, [load]);

  const handleRespond = async () => {
    if (!user || !id || !message.trim() || submitting) return;
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
        toast({ variant: "destructive", title: "Mission clôturée", description: "Cette mission n'accepte plus de propositions." });
        return;
      }
      if (fresh.user_id === user.id) {
        toast({ variant: "destructive", title: "Action impossible", description: "Vous ne pouvez pas postuler à votre propre mission." });
        return;
      }

      const { error } = await supabase.from("small_mission_responses").insert({
        mission_id: id, responder_id: user.id, message: message.trim(),
      });
      if (error) {
        if (error.code === "23505") {
          toast({ variant: "destructive", title: "Déjà envoyé", description: "Vous avez déjà proposé votre aide pour cette mission." });
          setHasResponded(true);
        } else {
          throw error;
        }
      } else {
        // Notify mission author
        await supabase.from("notifications").insert({
          user_id: fresh.user_id, type: "mission_proposal",
          title: "Nouvelle proposition d'aide",
          body: `${(user as any).first_name || "Un membre"} propose son aide pour "${fresh.title}"`,
          link: `/petites-missions/${id}`,
        });
        setHasResponded(true);
        setMessage("");
        toast({ title: "Proposition envoyée !", description: "Le publieur va être notifié." });
        load();
      }
    } catch (err: any) {
      logger.error("[handleRespond]", { err: String(err) });
      toast({ variant: "destructive", title: "Erreur", description: err?.message || "Impossible d'envoyer votre proposition." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptResponse = async (responseId: string) => {
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
        toast({ variant: "destructive", title: "Mission clôturée", description: "Cette mission n'accepte plus de candidatures." });
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
          content: `✅ Proposition acceptée pour « ${mission.title} ». Vous pouvez maintenant échanger pour organiser l'entraide.`,
          is_system: true,
        });
      }

      await supabase.from("notifications").insert({
        user_id: resp.responder_id, type: "mission_accepted",
        title: "Proposition acceptée",
        body: `Votre proposition pour "${mission.title}" a été acceptée. Vous pouvez maintenant échanger par messagerie.`,
        link: convId ? `/messages?c=${convId}` : `/messages`,
      });

      toast({ title: "Proposition acceptée !" });
    } catch (err: any) {
      logger.error("[handleAcceptResponse]", { err: String(err) });
      toast({ variant: "destructive", title: "Erreur", description: err?.message || "Impossible d'accepter cette proposition." });
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
        title: "Proposition non retenue",
        body: `Une autre organisation a été choisie pour "${mission.title}". Merci pour votre proposition.`,
      });
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

  if (loading) return <div className="p-6 md:p-10 text-muted-foreground">Chargement...</div>;
  if (!mission) return <div className="p-6 md:p-10"><p>Mission introuvable.</p><Link to="/petites-missions" className="text-primary underline mt-2 inline-block">Retour aux missions</Link></div>;

  const isAuthor = mission.user_id === user?.id;
  const catMeta = CATEGORY_META[mission.category] || CATEGORY_META.animals;
  const CatIcon = catMeta.icon;
  const statusMeta = STATUS_LABELS[mission.status] || STATUS_LABELS.open;
  const acceptedResponses = responses.filter(r => r.status === "accepted");
  const pendingResponses = responses.filter(r => r.status === "pending");
  const isDatePassed = mission.date_needed && new Date(mission.date_needed) < new Date();

  return (
    <div className="animate-fade-in pb-32">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={entraideHeader} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/75 to-background/60" />
        </div>
        <div className="relative max-w-3xl mx-auto px-6 py-10">
          <PageMeta title={`${mission.title} — Entraide Guardiens`} description={mission.description?.slice(0, 155)} />
          <Link to="/petites-missions" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="h-4 w-4" /> Retour aux missions
          </Link>
          <h1 className="font-heading text-2xl md:text-3xl font-bold">{mission.title}</h1>
        </div>
      </div>

      <div className="p-6 md:p-10 max-w-3xl mx-auto">
        {/* Category + status */}
        <div className="flex items-center gap-3 mb-3">
          <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-accent ${catMeta.colorClass}`}>
            <CatIcon className="h-3.5 w-3.5" /> {catMeta.label}
          </span>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusMeta.className}`}>{statusMeta.label}</span>
        </div>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-6">
          {(mission.city || mission.postal_code) && (
            <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{[mission.postal_code, mission.city].filter(Boolean).join(" ")}</span>
          )}
          {mission.date_needed && (
            <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" />{format(new Date(mission.date_needed), "d MMMM yyyy", { locale: fr })}</span>
          )}
          <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" />{DURATION_LABELS[mission.duration_estimate] || mission.duration_estimate}</span>
          <span className="flex items-center gap-1.5"><Users className="h-4 w-4" />{responses.length} proposition{responses.length > 1 ? "s" : ""}</span>
        </div>

        {/* ── BANNERS ── */}

        {/* In progress banner */}
        {mission.status === "in_progress" && acceptedResponses.length > 0 && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <p className="font-medium text-green-800 dark:text-green-300">
                Mission organisée avec {acceptedResponses.map(r => r.responder?.first_name).filter(Boolean).join(", ")}
              </p>
            </div>
            {isAuthor && (
              <div className="flex flex-wrap gap-2 mt-3">
                {acceptedResponses.map(r => (
                  <Button key={r.id} variant="outline" size="sm" onClick={() => navigate(r.conversation_id ? `/messages?c=${r.conversation_id}` : "/messages")} className="gap-2 border-green-300 text-green-700 dark:border-green-700 dark:text-green-400">
                    {r.responder?.avatar_url ? <img src={r.responder.avatar_url} className="w-5 h-5 rounded-full object-cover" /> : null}
                    {r.responder?.first_name} — Messagerie
                  </Button>
                ))}
                <Button
                  size="sm"
                  className="gap-2"
                  onClick={handleMarkCompleted}
                  disabled={completing}
                >
                  <CheckCircle2 className="h-4 w-4" /> {completing ? "Validation…" : "Mission terminée"}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Completed banner */}
        {mission.status === "completed" && (
          <div className="bg-muted border border-border rounded-xl p-4 mb-6 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
            <p className="font-medium text-muted-foreground">Mission terminée</p>
          </div>
        )}

        {/* Cancelled banner */}
        {mission.status === "cancelled" && (
          <div className="bg-muted border border-border rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-muted-foreground" />
              <p className="font-medium text-muted-foreground">Mission annulée</p>
            </div>
            {isAuthor && (
              <Link to="/petites-missions/creer" className="text-sm text-primary underline mt-2 inline-block">
                Publier une nouvelle mission
              </Link>
            )}
          </div>
        )}

        {/* Description */}
        <div className="bg-card rounded-xl border border-border p-5 mb-6">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{mission.description}</p>
        </div>

        {/* Photos */}
        <MissionPhotoGallery photos={mission.photos || []} />

        {/* Exchange */}
        <div className="bg-primary/5 border border-primary/10 rounded-xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Heart className="h-4 w-4 text-primary" />
            <h3 className="font-heading font-semibold text-sm">En échange</h3>
          </div>
          <p className="text-sm text-muted-foreground">{mission.exchange_offer}</p>
        </div>

        {/* Author card */}
        {author && (
          <div className="flex items-center gap-3 mb-8 p-4 bg-card rounded-xl border border-border">
            {author.avatar_url ? (
              <img src={author.avatar_url} alt={author.first_name} className="w-12 h-12 rounded-full object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center font-heading text-lg font-bold">
                {author.first_name?.charAt(0) || "?"}
              </div>
            )}
            <div className="flex-1">
              <p className="font-medium">{author.first_name}</p>
              <p className="text-xs text-muted-foreground">{[author.postal_code, author.city].filter(Boolean).join(" ")}</p>
            </div>
            {user && !isAuthor && <ReportButton targetId={mission.id} targetType="profile" />}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════ */}
        {/* ── PUBLISHER VIEW ── */}
        {/* ══════════════════════════════════════════════════════ */}
        {isAuthor && (
          <div className="mb-8 space-y-6">

            {/* Responses section — open or in_progress */}
            {(mission.status === "open" || mission.status === "in_progress") && (
              <>
                <h2 className="font-heading text-lg font-semibold flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Propositions reçues ({responses.length})
                </h2>
                {responses.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic py-6 text-center">Aucune proposition pour le moment.</p>
                ) : (
                  <div className="space-y-3">
                    {responses.map((r: any) => (
                      <div key={r.id} className="bg-card rounded-xl border border-border p-4">
                        <div className="flex items-start gap-3">
                          {r.responder?.avatar_url ? (
                            <img src={r.responder.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold">
                              {r.responder?.first_name?.charAt(0) || "?"}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{r.responder?.first_name || "Quelqu'un"}</p>
                            <p className="text-sm text-muted-foreground mt-1">{r.message}</p>
                            <p className="text-xs text-muted-foreground mt-1">{format(new Date(r.created_at), "d MMM à HH:mm", { locale: fr })}</p>
                          </div>
                          <div className="flex gap-2 shrink-0 items-center">
                            {r.status === "pending" && (
                              <>
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                  onClick={() => handleAcceptResponse(r.id)}
                                  disabled={!!processingResponseId}
                                >
                                  {processingResponseId === r.id ? "…" : "Accepter"}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDeclineResponse(r.id)}
                                  disabled={!!processingResponseId}
                                >
                                  Décliner
                                </Button>
                              </>
                            )}
                            {r.status === "accepted" && (
                              <span className="text-xs font-medium text-green-600 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full">Acceptée</span>
                            )}
                            {r.status === "declined" && (
                              <span className="text-xs font-medium text-destructive bg-destructive/10 px-2 py-1 rounded-full">Non retenu(e)</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Close without selection — only if open */}
            {mission.status === "open" && (
              <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => setCloseModalOpen(true)}>
                <XCircle className="h-4 w-4 mr-2" /> Clôturer sans sélectionner
              </Button>
            )}

            {/* Completed: Feedback forms per accepted person */}
            {mission.status === "completed" && acceptedResponses.length > 0 && (
              <div className="space-y-4">
                <h2 className="font-heading text-lg font-semibold">Laisser un avis</h2>
                {acceptedResponses.map(r => (
                  <div key={r.id}>
                    {feedbackSent[r.responder_id] ? (
                      <div className="bg-muted/50 rounded-xl p-4 flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
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
            )}

            {/* Received feedbacks */}
            {mission.status === "completed" && receivedFeedbacks.length > 0 && (
              <div className="space-y-3">
                <h2 className="font-heading text-lg font-semibold">Avis reçus</h2>
                {receivedFeedbacks.map((fb: any) => (
                  <div key={fb.id} className="bg-card rounded-xl border border-border p-4 flex items-start gap-3">
                    {fb.giver?.avatar_url ? (
                      <img src={fb.giver.avatar_url} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">{fb.giver?.first_name?.charAt(0)}</div>
                    )}
                    <div>
                      <p className="text-sm font-medium">{fb.giver?.first_name}</p>
                      {fb.positive !== null && (
                        <span className={`inline-flex items-center gap-1 text-xs mt-1 ${fb.positive ? "text-green-600" : "text-destructive"}`}>
                          {fb.positive ? <ThumbsUp className="h-3 w-3" /> : <ThumbsDown className="h-3 w-3" />}
                          {fb.positive ? "Positif" : "Négatif"}
                        </span>
                      )}
                      {fb.comment && <p className="text-sm text-muted-foreground mt-1">{fb.comment}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════ */}
        {/* ── CANDIDATE VIEW ── */}
        {/* ══════════════════════════════════════════════════════ */}
        {user && !isAuthor && myResponse && (
          <div className="mb-8 space-y-4">

            {/* Accepted */}
            {myResponse.status === "accepted" && mission.status === "in_progress" && (
              <>
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <p className="font-medium text-green-800 dark:text-green-300">Proposition acceptée</p>
                </div>
                <Button onClick={() => navigate("/messages")} className="w-full gap-2">
                  <MessageSquare className="h-4 w-4" /> Aller dans la messagerie
                </Button>
              </>
            )}

            {/* Accepted + completed → feedback */}
            {myResponse.status === "accepted" && mission.status === "completed" && (
              <>
                {feedbackSent[mission.user_id] ? (
                  <div className="bg-muted/50 rounded-xl p-4 flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Vous avez donné votre avis — merci !
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

                {/* Received feedbacks */}
                {receivedFeedbacks.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-heading text-base font-semibold">Avis reçus</h3>
                    {receivedFeedbacks.map((fb: any) => (
                      <div key={fb.id} className="bg-card rounded-xl border border-border p-4 flex items-start gap-3">
                        {fb.giver?.avatar_url ? (
                          <img src={fb.giver.avatar_url} className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">{fb.giver?.first_name?.charAt(0)}</div>
                        )}
                        <div>
                          <p className="text-sm font-medium">{fb.giver?.first_name}</p>
                          {fb.comment && <p className="text-sm text-muted-foreground mt-1">{fb.comment}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Declined */}
            {myResponse.status === "declined" && (
              <div className="bg-muted border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <XCircle className="h-5 w-5 text-muted-foreground" />
                  <p className="font-medium text-muted-foreground">Non retenu(e)</p>
                </div>
                <p className="text-sm text-muted-foreground">Une autre organisation a été choisie. Merci pour votre proposition.</p>
              </div>
            )}

            {/* Pending */}
            {myResponse.status === "pending" && mission.status !== "cancelled" && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-600" />
                <p className="text-sm text-blue-800 dark:text-blue-300">Votre proposition est en attente de réponse.</p>
              </div>
            )}
          </div>
        )}

        {/* Non-author: access gate (uniquement si profil incomplet) */}
        {user && !isAuthor && !myResponse && mission.status === "open" && accessLevel === 1 && (
          <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-card border-t border-border p-4 z-40 md:pb-4 pb-20">
            <div className="max-w-3xl mx-auto">
              <AccessGateBanner level={accessLevel} profileCompletion={profileCompletion} context="mission" />
            </div>
          </div>
        )}

        {/* Non-author: respond form */}
        {user && !isAuthor && !myResponse && mission.status === "open" && canApplyMissions && (
          <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-card border-t border-border p-4 z-40 md:pb-4 pb-20">
            <div className="max-w-3xl mx-auto space-y-2">
              <Textarea
                placeholder="Présentez-vous et expliquez pourquoi vous souhaitez participer..."
                value={message}
                onChange={e => setMessage(e.target.value)}
                className="min-h-[60px]"
              />
              <Button
                className="w-full h-12 text-base font-semibold"
                onClick={handleRespond}
                disabled={submitting || !message.trim()}
              >
                {submitting ? "Envoi..." : "Proposer mon aide"}
              </Button>
            </div>
          </div>
        )}

        {/* Not logged in */}
        {!user && (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-3">Connectez-vous pour proposer votre aide.</p>
            <Link to="/login"><Button>Se connecter</Button></Link>
          </div>
        )}
      </div>

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
  );
};

export default SmallMissionDetail;
