import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, Calendar, Clock, Dog, Flower2, Home, Handshake, Heart, MessageSquare, CheckCircle2, Users, XCircle } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import ReportButton from "@/components/reports/ReportButton";
import PageMeta from "@/components/PageMeta";
import entraideHeader from "@/assets/entraide-header.jpg";
import MissionFeedbackModal from "@/components/missions/MissionFeedbackModal";

const CATEGORY_META: Record<string, { label: string; icon: typeof Dog; colorClass: string }> = {
  animals: { label: "Animaux", icon: Dog, colorClass: "text-orange-500" },
  garden: { label: "Jardin", icon: Flower2, colorClass: "text-green-600" },
  house: { label: "Maison", icon: Home, colorClass: "text-blue-500" },
  skills: { label: "Compétences", icon: Handshake, colorClass: "text-amber-600" },
};

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  open: { label: "Ouverte", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  in_progress: { label: "En cours", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  completed: { label: "Terminée", className: "bg-muted text-muted-foreground" },
  cancelled: { label: "Annulée", className: "bg-destructive/10 text-destructive" },
};

const SmallMissionDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [mission, setMission] = useState<any>(null);
  const [author, setAuthor] = useState<any>(null);
  const [responses, setResponses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [hasResponded, setHasResponded] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackTarget, setFeedbackTarget] = useState<{ id: string; name: string } | null>(null);
  const [hasFeedback, setHasFeedback] = useState(false);
  const [acceptedResponderId, setAcceptedResponderId] = useState<string | null>(null);
  const [acceptedResponderName, setAcceptedResponderName] = useState<string>("");

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const { data: m } = await supabase
        .from("small_missions")
        .select("*")
        .eq("id", id)
        .single();

      if (!m) { setLoading(false); return; }
      setMission(m);

      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name, avatar_url, city, postal_code, identity_verified")
        .eq("id", m.user_id)
        .single();
      setAuthor(profile);

      // Load responses
      const { data: resps } = await supabase
        .from("small_mission_responses")
        .select("*, responder:profiles!small_mission_responses_responder_id_fkey(first_name, avatar_url)")
        .eq("mission_id", id)
        .order("created_at", { ascending: false });
      setResponses(resps || []);

      // Find accepted responder
      const acceptedResp = resps?.find((r: any) => r.status === "accepted");
      if (acceptedResp) {
        setAcceptedResponderId(acceptedResp.responder_id);
        setAcceptedResponderName(acceptedResp.responder?.first_name || "l'aidant");
      }

      if (user) {
        const already = resps?.some((r: any) => r.responder_id === user.id);
        setHasResponded(!!already);

        // Check if user already gave feedback
        const { data: existingFb } = await supabase
          .from("mission_feedbacks" as any)
          .select("id")
          .eq("mission_id", id)
          .eq("giver_id", user.id)
          .maybeSingle();
        setHasFeedback(!!existingFb);
      }

      setLoading(false);
    };
    load();
  }, [id, user]);

  const handleRespond = async () => {
    if (!user || !id || !message.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from("small_mission_responses").insert({
      mission_id: id,
      responder_id: user.id,
      message: message.trim(),
    });
    setSubmitting(false);
    if (error) {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible d'envoyer votre proposition." });
      return;
    }
    setHasResponded(true);
    setMessage("");
    toast({ title: "Proposition envoyée !", description: "Le créateur de la mission va être notifié." });

    // Refresh responses
    const { data: resps } = await supabase
      .from("small_mission_responses")
      .select("*, responder:profiles!small_mission_responses_responder_id_fkey(first_name, avatar_url)")
      .eq("mission_id", id)
      .order("created_at", { ascending: false });
    setResponses(resps || []);
  };

  const handleAcceptResponse = async (responseId: string) => {
    const resp = responses.find(r => r.id === responseId);
    await supabase.from("small_mission_responses").update({ status: "accepted" as any }).eq("id", responseId);
    await supabase.from("small_missions").update({ status: "in_progress" as any }).eq("id", id!);
    setMission({ ...mission, status: "in_progress" });
    setResponses(prev => prev.map(r => r.id === responseId ? { ...r, status: "accepted" } : r));
    if (resp) {
      setAcceptedResponderId(resp.responder_id);
      setAcceptedResponderName(resp.responder?.first_name || "l'aidant");
    }
    toast({ title: "Proposition acceptée !" });
  };

  const handleDeclineResponse = async (responseId: string) => {
    await supabase.from("small_mission_responses").update({ status: "declined" as any }).eq("id", responseId);
    setResponses(prev => prev.map(r => r.id === responseId ? { ...r, status: "declined" } : r));
  };

  const openFeedbackFor = (receiverId: string, receiverName: string) => {
    setFeedbackTarget({ id: receiverId, name: receiverName });
    setFeedbackOpen(true);
  };

  const handleComplete = async () => {
    await supabase.from("small_missions").update({ status: "completed" as any }).eq("id", id!);
    setMission({ ...mission, status: "completed" });
    toast({ title: "Mission terminée !", description: "Merci pour l'entraide 🙌" });
    // Open feedback modal for author → responder
    if (acceptedResponderId) {
      openFeedbackFor(acceptedResponderId, acceptedResponderName);
    }
  };

  const handleClose = async () => {
    await supabase.from("small_missions").update({ status: "completed" as any }).eq("id", id!);
    setMission({ ...mission, status: "completed" });
    toast({ title: "Mission fermée", description: "Vous avez trouvé quelqu'un — super ! 🎉" });
    if (acceptedResponderId) {
      openFeedbackFor(acceptedResponderId, acceptedResponderName);
    }
  };

  if (loading) return <div className="p-6 md:p-10 text-muted-foreground">Chargement...</div>;
  if (!mission) return <div className="p-6 md:p-10"><p>Mission introuvable.</p><Link to="/petites-missions" className="text-primary underline mt-2 inline-block">Retour aux missions</Link></div>;

  const isAuthor = mission.user_id === user?.id;
  const catMeta = CATEGORY_META[mission.category] || CATEGORY_META.animals;
  const CatIcon = catMeta.icon;
  const status = STATUS_LABELS[mission.status] || STATUS_LABELS.open;

  return (
    <div className="animate-fade-in pb-32">
      {/* Hero banner */}
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
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${status.className}`}>{status.label}</span>
      </div>


      {/* Meta */}
      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-6">
        {(mission.city || mission.postal_code) && (
          <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{[mission.postal_code, mission.city].filter(Boolean).join(" ")}</span>
        )}
        {mission.date_needed && (
          <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" />{format(new Date(mission.date_needed), "d MMMM yyyy", { locale: fr })}</span>
        )}
        <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" />{mission.duration_estimate}</span>
        <span className="flex items-center gap-1.5"><Users className="h-4 w-4" />{responses.length} proposition{responses.length > 1 ? "s" : ""}</span>
      </div>

      {/* Description */}
      <div className="bg-card rounded-xl border border-border p-5 mb-6">
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{mission.description}</p>
      </div>

      {/* Exchange */}
      <div className="bg-primary/5 border border-primary/10 rounded-xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Heart className="h-4 w-4 text-primary" />
          <h3 className="font-heading font-semibold text-sm">En échange</h3>
        </div>
        <p className="text-sm text-muted-foreground">{mission.exchange_offer}</p>
      </div>

      {/* Author */}
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
          {user && mission.user_id !== user.id && <ReportButton targetId={mission.id} targetType="profile" />}
        </div>
      )}

      {/* Owner: see responses */}
      {isAuthor && (
        <div className="mb-8">
          <h2 className="font-heading text-lg font-semibold mb-4 flex items-center gap-2">
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
                    {r.status === "pending" && mission.status === "open" && (
                      <div className="flex gap-2 shrink-0">
                        <Button size="sm" onClick={() => handleAcceptResponse(r.id)}>Accepter</Button>
                        <Button size="sm" variant="outline" onClick={() => handleDeclineResponse(r.id)}>Décliner</Button>
                      </div>
                    )}
                    {r.status === "accepted" && (
                      <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full shrink-0">Acceptée</span>
                    )}
                    {r.status === "declined" && (
                      <span className="text-xs font-medium text-destructive bg-destructive/10 px-2 py-1 rounded-full shrink-0">Déclinée</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {mission.status === "in_progress" && (
            <Button onClick={handleComplete} className="w-full mt-4 gap-2">
              <CheckCircle2 className="h-4 w-4" /> Marquer comme terminée
            </Button>
          )}

          {mission.status === "open" && (
            <Button onClick={handleClose} variant="outline" className="w-full mt-4 gap-2">
              <XCircle className="h-4 w-4" /> Fermer — J'ai trouvé quelqu'un
            </Button>
          )}

          {/* Feedback button for completed missions (author) */}
          {mission.status === "completed" && !hasFeedback && acceptedResponderId && (
            <Button
              onClick={() => openFeedbackFor(acceptedResponderId!, acceptedResponderName)}
              variant="outline"
              className="w-full mt-4 gap-2"
            >
              <Handshake className="h-4 w-4" /> Donner mon retour sur l'entraide
            </Button>
          )}
          {mission.status === "completed" && hasFeedback && (
            <p className="text-sm text-muted-foreground text-center mt-4">✅ Vous avez donné votre retour — merci !</p>
          )}
        </div>
      )}

      {/* Non-author: respond */}
      {user && !isAuthor && mission.status === "open" && (
        <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-card border-t border-border p-4 z-40 md:pb-4 pb-20">
          <div className="max-w-3xl mx-auto">
            {hasResponded ? (
              <Button className="w-full h-12 text-base font-semibold" disabled>
                <CheckCircle2 className="h-5 w-5 mr-2" /> Proposition envoyée ✓
              </Button>
            ) : (
              <div className="space-y-2">
                <Textarea
                  placeholder="Présentez-vous et dites pourquoi vous souhaitez aider…"
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
            )}
          </div>
        </div>
      )}

      {/* Feedback for non-author (responder) on completed mission */}
      {user && !isAuthor && mission.status === "completed" && !hasFeedback && (
        <div className="text-center py-6">
          <Button
            onClick={() => openFeedbackFor(mission.user_id, author?.first_name || "le posteur")}
            className="gap-2"
          >
            <Handshake className="h-4 w-4" /> Donner mon retour sur l'entraide
          </Button>
        </div>
      )}
      {user && !isAuthor && mission.status === "completed" && hasFeedback && (
        <p className="text-sm text-muted-foreground text-center py-6">✅ Vous avez donné votre retour — merci !</p>
      )}

      {!user && (
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-3">Connectez-vous pour proposer votre aide.</p>
          <Link to="/login"><Button>Se connecter</Button></Link>
        </div>
      )}

      {/* Feedback modal */}
      {feedbackTarget && (
        <MissionFeedbackModal
          open={feedbackOpen}
          onOpenChange={setFeedbackOpen}
          missionId={id!}
          receiverId={feedbackTarget.id}
          receiverName={feedbackTarget.name}
          onSubmitted={() => setHasFeedback(true)}
        />
      )}
      </div>
    </div>
  );
};

export default SmallMissionDetail;
