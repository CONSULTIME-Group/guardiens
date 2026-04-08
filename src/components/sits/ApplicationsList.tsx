import { useState, useEffect } from "react";
import AccordDeGarde from "@/components/gardes/AccordDeGarde";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import {
  Star, MapPin, CheckCircle2, XCircle, MessageSquare, Users,
  Archive, Eye, EyeOff, Calendar, PawPrint, Shield, AlertTriangle,
  ChevronDown,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import VerifiedBadge from "@/components/profile/VerifiedBadge";
import EmergencyBadge from "@/components/profile/EmergencyBadge";

import { TooltipProvider } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { format, differenceInDays, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface ApplicationsListProps {
  sitId: string;
  sitTitle: string;
  petNames: string[];
  startDate: string;
  endDate: string;
  propertyId: string;
}

const statusStyles: Record<string, { label: string; className: string }> = {
  pending: { label: "En attente", className: "bg-primary/10 text-primary" },
  viewed: { label: "En attente", className: "bg-primary/10 text-primary" },
  discussing: { label: "En discussion", className: "bg-accent text-foreground" },
  accepted: { label: "Acceptée", className: "bg-primary/10 text-primary" },
  rejected: { label: "Déclinée", className: "bg-muted text-muted-foreground" },
  cancelled: { label: "Annulée", className: "bg-muted text-muted-foreground" },
};

const statusOrder: Record<string, number> = {
  pending: 0, viewed: 0, discussing: 1, accepted: 2, rejected: 3, cancelled: 4,
};

const ApplicationsList = ({ sitId, sitTitle, petNames, startDate, endDate, propertyId }: ApplicationsListProps) => {
  const { user } = useAuth();
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmApp, setConfirmApp] = useState<any>(null);
  const [declineApp, setDeclineApp] = useState<any>(null);
  const [declineMessage, setDeclineMessage] = useState("");
  const [declineCustom, setDeclineCustom] = useState(false);
  const [declinedOpen, setDeclinedOpen] = useState(false);
  const navigate = useNavigate();
  const [showAccord, setShowAccord] = useState(false);
  const [accordData, setAccordData] = useState<any>(null);
  const declineTemplates = [
    "Merci pour votre candidature ! J'ai trouvé un gardien dont le profil correspondait davantage à mes besoins cette fois-ci. N'hésitez pas à postuler à mes prochaines annonces !",
    "Merci de votre intérêt ! Les dates ne correspondent malheureusement pas tout à fait. J'espère qu'on pourra collaborer une prochaine fois !",
    "Merci pour votre message ! J'ai choisi un gardien plus proche géographiquement pour cette garde. Bonne continuation sur Guardiens !",
  ];

  const load = async () => {
    const { data } = await supabase
      .from("applications")
      .select("*, sitter:profiles!applications_sitter_id_fkey(id, first_name, last_name, city, avatar_url, bio, identity_verified, completed_sits_count)")
      .eq("sit_id", sitId)
      .order("created_at", { ascending: false });

    if (data) {
      const enriched = await Promise.all(
        data.map(async (app: any) => {
          const [spRes, revRes, badgeRes, emRes] = await Promise.all([
            supabase.from("sitter_profiles").select("experience_years, animal_types").eq("user_id", app.sitter_id).maybeSingle(),
            supabase.from("reviews").select("overall_rating").eq("reviewee_id", app.sitter_id).eq("published", true),
            supabase.from("badge_attributions").select("badge_id").eq("user_id", app.sitter_id),
            supabase.from("emergency_sitter_profiles").select("id").eq("user_id", app.sitter_id).eq("is_active", true).maybeSingle(),
          ]);
          const reviews = revRes.data || [];
          const avgRating = reviews.length > 0 ? (reviews.reduce((s: number, r: any) => s + r.overall_rating, 0) / reviews.length).toFixed(1) : null;
          const badgeMap = new Map<string, number>();
          (badgeRes.data || []).forEach((b: any) => badgeMap.set(b.badge_id, (badgeMap.get(b.badge_id) || 0) + 1));
          const badgeCounts = Array.from(badgeMap.entries()).map(([badge_key, count]) => ({ badge_key, count })).sort((a, b) => b.count - a.count);
          return {
            ...app,
            sitterProfile: spRes.data,
            avgRating,
            reviewCount: reviews.length,
            badgeCounts,
            isEmergencySitter: !!emRes.data,
          };
        })
      );
      // Sort by status order
      enriched.sort((a, b) => (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99));
      setApplications(enriched);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [sitId]);

  const handleAccept = async (app: any) => {
    const sitterName = app.sitter?.first_name || "Ce gardien";
    const sitterId = app.sitter_id;

    await supabase.from("applications").update({ status: "accepted" as any }).eq("id", app.id);
    const { data: rejectedApps } = await supabase
      .from("applications")
      .select("sitter_id")
      .eq("sit_id", sitId)
      .neq("id", app.id);
    await supabase
      .from("applications")
      .update({ status: "rejected" as any })
      .eq("sit_id", sitId)
      .neq("id", app.id);
    await supabase.from("sits").update({ status: "confirmed" as any }).eq("id", sitId);

    const petNamesStr = petNames.join(", ");
    const confirmMsg = `🎉 La garde est confirmée ! Vous avez été choisi(e) pour garder ${petNamesStr} du ${startDate} au ${endDate}.`;
    const { data: acceptedConv } = await supabase
      .from("conversations")
      .select("id")
      .eq("sit_id", sitId)
      .eq("sitter_id", sitterId)
      .maybeSingle();

    if (acceptedConv && user) {
      await supabase.from("messages").insert({
        conversation_id: acceptedConv.id,
        sender_id: user.id,
        content: confirmMsg,
        is_system: true,
      });

      const { data: guideData } = await supabase
        .from("house_guides")
        .select("id")
        .eq("property_id", propertyId)
        .maybeSingle();

      if (guideData) {
        await supabase.from("messages").insert({
          conversation_id: acceptedConv.id,
          sender_id: user.id,
          content: "📋 Le guide de la maison est disponible ! Vous y trouverez l'adresse exacte, les codes d'accès, les contacts utiles et toutes les consignes.",
          is_system: true,
        });
      }

      await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", acceptedConv.id);
    }

    // Send notification to sitter — with dedup guard
    const { data: existingNotif } = await supabase
      .from("notifications")
      .select("id")
      .eq("user_id", sitterId)
      .eq("type", "sit_confirmed")
      .eq("link", `/mes-gardes`)
      .maybeSingle();

    if (!existingNotif) {
      const { data: proprio } = await supabase
        .from("profiles")
        .select("first_name")
        .eq("id", user!.id)
        .single();

      const { data: guideCheck } = await supabase
        .from("house_guides")
        .select("id")
        .eq("user_id", user!.id)
        .eq("published", true)
        .maybeSingle();

      const startFormatted = startDate
        ? format(parseISO(startDate), "dd MMMM", { locale: fr })
        : "";

      await supabase.from("notifications").insert({
        user_id: sitterId,
        type: "sit_confirmed",
        title: "Garde confirmée 🎉",
        body: guideCheck
          ? `Votre garde chez ${proprio?.first_name ?? "votre hôte"} est confirmée. Le guide de la maison sera disponible dans votre espace à partir du ${startFormatted}.`
          : `Votre garde chez ${proprio?.first_name ?? "votre hôte"} est confirmée. Rendez-vous dans "Mes gardes" pour les détails.`,
        link: `/mes-gardes`,
      });
    }


    if (rejectedApps && user) {
      for (const ra of rejectedApps) {
        const { data: rejConv } = await supabase
          .from("conversations")
          .select("id")
          .eq("sit_id", sitId)
          .eq("sitter_id", ra.sitter_id)
          .maybeSingle();
        if (rejConv) {
          await supabase.from("messages").insert({
            conversation_id: rejConv.id,
            sender_id: user.id,
            content: `Le propriétaire a choisi un autre gardien pour cette garde. Merci pour votre candidature !`,
            is_system: true,
          });
          await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", rejConv.id);
        }
      }
    }

    toast({ title: "Garde confirmée !", description: `${sitterName} a été choisi(e) pour cette garde.` });
    setConfirmApp(null);
    load();
  };

  const handleDecline = async (app: any, message?: string) => {
    await supabase.from("applications").update({ status: "rejected" as any }).eq("id", app.id);

    if (user) {
      const { data: rejConv } = await supabase
        .from("conversations")
        .select("id")
        .eq("sit_id", sitId)
        .eq("sitter_id", app.sitter_id)
        .maybeSingle();
      if (rejConv) {
        const systemMsg = "Votre candidature a été déclinée pour cette garde.";
        await supabase.from("messages").insert({
          conversation_id: rejConv.id,
          sender_id: user.id,
          content: systemMsg,
          is_system: true,
        });
        if (message?.trim()) {
          await supabase.from("messages").insert({
            conversation_id: rejConv.id,
            sender_id: user.id,
            content: message.trim(),
            is_system: false,
          });
        }
        await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", rejConv.id);
      }
    }

    toast({ title: "Candidature déclinée" });
    setDeclineApp(null);
    setDeclineMessage("");
    setDeclineCustom(false);
    load();
  };

  const duration = startDate && endDate
    ? differenceInDays(parseISO(endDate), parseISO(startDate))
    : null;

  const activeApps = applications.filter(a => !["rejected", "cancelled"].includes(a.status));
  const declinedApps = applications.filter(a => ["rejected", "cancelled"].includes(a.status));

  if (loading) return <p className="text-sm text-muted-foreground">Chargement des candidatures...</p>;

  const renderCard = (app: any) => {
    const sitter = app.sitter;
    const status = statusStyles[app.status] || statusStyles.pending;
    const completedSits = sitter?.completed_sits_count || 0;

    return (
      <div key={app.id} className="bg-card border border-border rounded-2xl p-5 mb-4">
        {/* LINE 1 — Identity */}
        <div className="flex items-center gap-3">
          <Link to={`/profil/${app.sitter_id}`} className="shrink-0">
            {sitter?.avatar_url ? (
              <img src={sitter.avatar_url} alt={sitter.first_name} className="w-12 h-12 rounded-full object-cover border border-border" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-lg">
                {sitter?.first_name?.charAt(0) || "?"}
              </div>
            )}
          </Link>
          <div className="flex-1 min-w-0">
            <Link to={`/profil/${app.sitter_id}`} className="text-base font-semibold text-foreground hover:underline">
              {sitter?.first_name || "Gardien"}
            </Link>
            <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
              {sitter?.city && <span>📍 {sitter.city}</span>}
              <span>{completedSits} garde{completedSits !== 1 ? "s" : ""} sur Guardiens</span>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 ${status.className}`}>
            {status.label}
          </span>
        </div>

        {/* LINE 2 — Badges */}
        {/* Badges — migration en cours */}

        {/* LINE 3 — Message */}
        {app.message && (
          <div className="bg-muted/50 rounded-xl p-3 text-sm text-foreground/80 my-3 italic">
            {app.message}
          </div>
        )}

        {/* LINE 4 — CTAs */}
        {(app.status === "pending" || app.status === "viewed") && (
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            <Link
              to={`/profil/${app.sitter_id}`}
              target="_blank"
              className="border border-border rounded-full px-4 py-2 text-sm text-foreground hover:border-primary transition-colors"
            >
              Voir le profil
            </Link>
            <button
              onClick={async () => {
                if (!user) return;
                const { data: existingConv } = await supabase
                  .from("conversations").select("id")
                  .eq("sit_id", sitId).eq("sitter_id", app.sitter_id).maybeSingle();
                if (existingConv) {
                  navigate(`/messages?conv=${existingConv.id}`);
                } else {
                  const { data: newConv } = await supabase
                    .from("conversations").insert({ sit_id: sitId, owner_id: user.id, sitter_id: app.sitter_id })
                    .select("id").single();
                  if (newConv) {
                    await supabase.from("applications").update({ status: "discussing" as any }).eq("id", app.id);
                    navigate(`/messages?conv=${newConv.id}`);
                  }
                }
              }}
              className="border border-primary text-primary rounded-full px-4 py-2 text-sm hover:bg-primary/10 transition-colors"
            >
              Contacter
            </button>
            <button
              onClick={() => setConfirmApp(app)}
              className="bg-primary text-primary-foreground rounded-full px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Accepter
            </button>
            <button
              onClick={() => setDeclineApp(app)}
              className="text-xs text-muted-foreground hover:text-destructive transition-colors underline-offset-2 hover:underline ml-auto"
            >
              Décliner
            </button>
          </div>
        )}

        {app.status === "discussing" && (
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            <Link
              to={`/profil/${app.sitter_id}`}
              target="_blank"
              className="border border-border rounded-full px-4 py-2 text-sm text-foreground hover:border-primary transition-colors"
            >
              Voir le profil
            </Link>
            <button
              onClick={() => setConfirmApp(app)}
              className="bg-primary text-primary-foreground rounded-full px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Accepter
            </button>
            <button
              onClick={() => setDeclineApp(app)}
              className="text-xs text-muted-foreground hover:text-destructive transition-colors underline-offset-2 hover:underline ml-auto"
            >
              Décliner
            </button>
          </div>
        )}

        {app.status === "accepted" && (
          <div className="mt-4 space-y-2">
            <p className="text-sm text-primary font-medium">✓ Garde confirmée</p>
            <button
              onClick={async () => {
                const { data: conv } = await supabase
                  .from("conversations").select("id")
                  .eq("sit_id", sitId).eq("sitter_id", app.sitter_id).maybeSingle();
                if (conv) navigate(`/messages?conv=${conv.id}`);
                else navigate("/messages");
              }}
              className="inline-block border border-border rounded-full px-4 py-2 text-sm text-foreground hover:border-primary transition-colors"
            >
              Voir la messagerie
            </button>
          </div>
        )}

        {(app.status === "rejected" || app.status === "cancelled") && (
          <div className="flex gap-4 items-center mt-3">
            <Link
              to={`/profil/${app.sitter_id}`}
              target="_blank"
              className="text-xs text-primary hover:underline"
            >
              Voir le profil →
            </Link>
            <button
              onClick={async () => {
                if (!user) return;
                const { data: existingConv } = await supabase
                  .from("conversations").select("id")
                  .eq("sit_id", sitId).eq("sitter_id", app.sitter_id).maybeSingle();
                if (existingConv) {
                  navigate(`/messages?conv=${existingConv.id}`);
                } else {
                  const { data: newConv } = await supabase
                    .from("conversations").insert({ sit_id: sitId, owner_id: user.id, sitter_id: app.sitter_id })
                    .select("id").single();
                  if (newConv) navigate(`/messages?conv=${newConv.id}`);
                }
              }}
              className="text-xs text-primary hover:underline"
            >
              Contacter →
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mt-8">
      <div className="flex items-center gap-2 mb-4">
        <Users className="h-4 w-4 text-primary" />
        <h2 className="font-heading text-lg font-semibold">
          Candidatures ({applications.length})
        </h2>
      </div>

      {applications.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">Aucune candidature pour le moment.</p>
      ) : (
        <>
          {activeApps.map(renderCard)}

          {declinedApps.length > 0 && (
            <Collapsible open={declinedOpen} onOpenChange={setDeclinedOpen}>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mt-4 mb-2">
                <ChevronDown className={`h-4 w-4 transition-transform ${declinedOpen ? "rotate-180" : ""}`} />
                Candidatures déclinées ({declinedApps.length})
              </CollapsibleTrigger>
              <CollapsibleContent>
                {declinedApps.map(renderCard)}
              </CollapsibleContent>
            </Collapsible>
          )}
        </>
      )}

      {/* ── Accept Dialog ── */}
      {confirmApp && (
        <Dialog open={!!confirmApp} onOpenChange={() => setConfirmApp(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-heading">
                Accepter la candidature de {confirmApp.sitter?.first_name} ?
              </DialogTitle>
              <DialogDescription>
                Les autres candidats seront automatiquement déclinés. Cette action confirme la garde.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setConfirmApp(null)}>Annuler</Button>
              <Button onClick={() => handleAccept(confirmApp)}>
                Confirmer l'acceptation
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Decline Dialog ── */}
      {declineApp && (
        <Dialog open={!!declineApp} onOpenChange={(o) => { if (!o) { setDeclineApp(null); setDeclineMessage(""); setDeclineCustom(false); } }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-heading">Décliner la candidature de {declineApp.sitter?.first_name} ?</DialogTitle>
              <DialogDescription>
                Le gardien sera notifié. Vous pouvez toujours accepter d'autres candidatures.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 mt-2">
              <p className="text-sm font-medium text-foreground">Message d'accompagnement <span className="text-muted-foreground font-normal">(optionnel)</span></p>
              
              {declineTemplates.map((tpl, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => { setDeclineMessage(tpl); setDeclineCustom(false); }}
                  className={`w-full text-left p-3 rounded-lg border text-sm transition-colors ${
                    declineMessage === tpl && !declineCustom
                      ? "border-primary bg-primary/5 text-foreground"
                      : "border-border bg-card text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {tpl}
                </button>
              ))}

              <button
                type="button"
                onClick={() => { setDeclineCustom(true); if (declineTemplates.includes(declineMessage)) setDeclineMessage(""); }}
                className={`w-full text-left p-3 rounded-lg border text-sm transition-colors ${
                  declineCustom
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-primary/50"
                }`}
              >
                ✏️ Écrire un message personnalisé
              </button>

              {declineCustom && (
                <textarea
                  value={declineMessage}
                  onChange={(e) => setDeclineMessage(e.target.value)}
                  placeholder="Votre message au gardien…"
                  maxLength={300}
                  rows={3}
                  className="w-full rounded-lg border border-border bg-background p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              )}
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => { setDeclineApp(null); setDeclineMessage(""); setDeclineCustom(false); }}>
                Annuler
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDecline(declineApp, declineMessage)}
              >
                Confirmer le déclin
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default ApplicationsList;
