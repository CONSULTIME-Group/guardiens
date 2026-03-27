import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import {
  Star, MapPin, CheckCircle2, XCircle, MessageSquare, Users,
  Archive, Eye, EyeOff, Calendar, PawPrint, Shield, AlertTriangle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import VerifiedBadge from "@/components/profile/VerifiedBadge";
import EmergencyBadge from "@/components/profile/EmergencyBadge";
import BadgeShield from "@/components/badges/BadgeShield";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { format, differenceInDays, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ApplicationsListProps {
  sitId: string;
  sitTitle: string;
  petNames: string[];
  startDate: string;
  endDate: string;
  propertyId: string;
}

const statusStyles: Record<string, { label: string; className: string }> = {
  pending: { label: "En attente", className: "bg-muted text-muted-foreground" },
  viewed: { label: "Vue", className: "bg-blue-100 text-blue-700" },
  discussing: { label: "En discussion", className: "bg-blue-100 text-blue-700" },
  accepted: { label: "Acceptée", className: "bg-green-100 text-green-700" },
  rejected: { label: "Déclinée", className: "bg-destructive/10 text-destructive" },
  cancelled: { label: "Annulée", className: "bg-muted text-muted-foreground" },
};

const ApplicationsList = ({ sitId, sitTitle, petNames, startDate, endDate, propertyId }: ApplicationsListProps) => {
  const { user } = useAuth();
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [archivedIds, setArchivedIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(`archived-apps-${sitId}`);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  });
  const [confirmApp, setConfirmApp] = useState<any>(null); // app to confirm
  const [declineApp, setDeclineApp] = useState<any>(null); // app to decline
  const navigate = useNavigate();

  const load = async () => {
    const { data } = await supabase
      .from("applications")
      .select("*, sitter:profiles!applications_sitter_id_fkey(id, first_name, last_name, city, avatar_url, bio, identity_verified)")
      .eq("sit_id", sitId)
      .order("created_at", { ascending: false });

    if (data) {
      const enriched = await Promise.all(
        data.map(async (app: any) => {
          const [spRes, revRes, badgeRes, extExpRes, galleryRes, emRes] = await Promise.all([
            supabase.from("sitter_profiles").select("experience_years, animal_types").eq("user_id", app.sitter_id).maybeSingle(),
            supabase.from("reviews").select("overall_rating").eq("reviewee_id", app.sitter_id).eq("published", true),
            supabase.from("badge_attributions").select("badge_key").eq("receiver_id", app.sitter_id),
            supabase.from("external_experiences").select("id").eq("user_id", app.sitter_id).eq("verification_status", "verified"),
            supabase.from("sitter_gallery").select("photo_url").eq("user_id", app.sitter_id).limit(4),
            supabase.from("emergency_sitter_profiles").select("id").eq("user_id", app.sitter_id).eq("is_active", true).maybeSingle(),
          ]);
          const reviews = revRes.data || [];
          const avgRating = reviews.length > 0 ? (reviews.reduce((s: number, r: any) => s + r.overall_rating, 0) / reviews.length).toFixed(1) : null;
          const badgeMap = new Map<string, number>();
          (badgeRes.data || []).forEach((b: any) => badgeMap.set(b.badge_key, (badgeMap.get(b.badge_key) || 0) + 1));
          const badgeCounts = Array.from(badgeMap.entries()).map(([badge_key, count]) => ({ badge_key, count })).sort((a, b) => b.count - a.count);
          return {
            ...app,
            sitterProfile: spRes.data,
            avgRating,
            reviewCount: reviews.length,
            badgeCounts,
            verifiedExperienceCount: extExpRes.data?.length || 0,
            gallery: galleryRes.data || [],
            isEmergencySitter: !!emRes.data,
          };
        })
      );
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

  const handleDecline = async (app: any) => {
    await supabase.from("applications").update({ status: "rejected" as any }).eq("id", app.id);

    if (user) {
      const { data: rejConv } = await supabase
        .from("conversations")
        .select("id")
        .eq("sit_id", sitId)
        .eq("sitter_id", app.sitter_id)
        .maybeSingle();
      if (rejConv) {
        await supabase.from("messages").insert({
          conversation_id: rejConv.id,
          sender_id: user.id,
          content: "Votre candidature a été déclinée pour cette garde. N'hésitez pas à postuler à d'autres annonces !",
          is_system: true,
        });
        await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", rejConv.id);
      }
    }

    toast({ title: "Candidature déclinée" });
    setDeclineApp(null);
    load();
  };

  const archiveApp = (appId: string) => {
    const next = new Set(archivedIds);
    next.add(appId);
    setArchivedIds(next);
    localStorage.setItem(`archived-apps-${sitId}`, JSON.stringify([...next]));
    toast({ title: "Candidature archivée" });
  };

  const unarchiveApp = (appId: string) => {
    const next = new Set(archivedIds);
    next.delete(appId);
    setArchivedIds(next);
    localStorage.setItem(`archived-apps-${sitId}`, JSON.stringify([...next]));
  };

  const visibleApps = applications.filter(app => showArchived ? archivedIds.has(app.id) : !archivedIds.has(app.id));
  const archivedCount = applications.filter(app => archivedIds.has(app.id)).length;

  const duration = startDate && endDate
    ? differenceInDays(parseISO(endDate), parseISO(startDate))
    : null;

  if (loading) return <p className="text-sm text-muted-foreground">Chargement des candidatures...</p>;

  return (
    <div className="mt-8">
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Users className="h-4 w-4 text-primary" />
        <h2 className="font-heading text-lg font-semibold">
          Candidatures ({applications.length - archivedCount})
        </h2>
        {archivedCount > 0 && (
          <button
            onClick={() => setShowArchived(!showArchived)}
            className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {showArchived ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            {showArchived ? "Voir actives" : `Archivées (${archivedCount})`}
          </button>
        )}
      </div>

      {visibleApps.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">
          {showArchived ? "Aucune candidature archivée." : "Aucune candidature pour le moment."}
        </p>
      ) : (
        <div className="space-y-4">
          {visibleApps.map((app) => {
            const sitter = app.sitter;
            const status = statusStyles[app.status] || statusStyles.pending;
            const animalTypes: string[] = app.sitterProfile?.animal_types || [];
            const expYears = app.sitterProfile?.experience_years;
            const isArchived = archivedIds.has(app.id);
            const canArchive = ["rejected", "cancelled"].includes(app.status);

            return (
              <div key={app.id} className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-start gap-3">
                  <Link to={`/profil/${app.sitter_id}`} className="shrink-0">
                    <Avatar className="h-12 w-12 hover:ring-2 hover:ring-primary/50 transition-all">
                      <AvatarImage src={sitter?.avatar_url} />
                      <AvatarFallback className="font-heading text-lg font-bold bg-primary/10 text-primary">
                        {sitter?.first_name?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link to={`/profil/${app.sitter_id}`} className="font-medium hover:text-primary transition-colors">
                        {sitter?.first_name || "Gardien"}
                      </Link>
                      {sitter?.identity_verified && <VerifiedBadge />}
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.className}`}>
                        {status.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                      {sitter?.city && (
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{sitter.city}</span>
                      )}
                      {app.avgRating && (
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-amber-500 fill-amber-500" />{app.avgRating} ({app.reviewCount} garde{app.reviewCount > 1 ? "s" : ""})
                        </span>
                      )}
                      {expYears && <span>{expYears} d'expérience</span>}
                    </div>

                    {/* Badges */}
                    {app.badgeCounts && app.badgeCounts.length > 0 && (
                      <TooltipProvider>
                        <div className="mt-1.5 flex gap-1.5">
                          {app.badgeCounts.slice(0, 3).map((b: any) => (
                            <BadgeShield key={b.badge_key} badgeKey={b.badge_key} count={b.count} size="sm" showLabel={false} />
                          ))}
                        </div>
                      </TooltipProvider>
                    )}

                    {/* Verified experiences */}
                    {app.verifiedExperienceCount > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs text-primary font-medium mt-1">
                        <CheckCircle2 className="h-3 w-3" />
                        {app.verifiedExperienceCount} expérience{app.verifiedExperienceCount > 1 ? "s" : ""} vérifiée{app.verifiedExperienceCount > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </div>

                {/* Gallery preview */}
                {app.gallery && app.gallery.length > 0 && (
                  <div className="flex gap-1 mt-3 overflow-hidden rounded-lg">
                    {app.gallery.slice(0, 4).map((g: any, i: number) => (
                      <img key={i} src={g.photo_url} alt="" className="h-16 w-16 object-cover rounded" />
                    ))}
                  </div>
                )}

                {/* Message */}
                {app.message && (
                  <div className="mt-3 p-3 bg-accent/50 rounded-lg text-sm whitespace-pre-line">
                    {app.message}
                  </div>
                )}

                {/* Actions */}
                {(app.status === "pending" || app.status === "discussing") && (
                  <div className="flex gap-2 mt-4 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
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
                    >
                      <MessageSquare className="h-3.5 w-3.5" /> Répondre
                    </Button>
                    <Button
                      size="sm"
                      className="gap-1.5"
                      onClick={() => setConfirmApp(app)}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Accepter {sitter?.first_name}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-destructive hover:text-destructive"
                      onClick={() => setDeclineApp(app)}
                    >
                      <XCircle className="h-3.5 w-3.5" /> Décliner
                    </Button>
                  </div>
                )}

                {app.status === "accepted" && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-green-700 font-medium">
                    <CheckCircle2 className="h-4 w-4" /> Gardien choisi pour cette garde
                  </div>
                )}

                {canArchive && !isArchived && (
                  <div className="flex mt-3">
                    <Button size="sm" variant="ghost" className="gap-1.5 text-muted-foreground" onClick={() => archiveApp(app.id)}>
                      <Archive className="h-3.5 w-3.5" /> Archiver
                    </Button>
                  </div>
                )}

                {isArchived && (
                  <div className="flex mt-3">
                    <Button size="sm" variant="ghost" className="gap-1.5 text-muted-foreground" onClick={() => unarchiveApp(app.id)}>
                      <Eye className="h-3.5 w-3.5" /> Désarchiver
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Confirmation Dialog ── */}
      {confirmApp && (
        <Dialog open={!!confirmApp} onOpenChange={() => setConfirmApp(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-heading">
                Confirmer {confirmApp.sitter?.first_name} comme gardien ?
              </DialogTitle>
              <DialogDescription>
                En confirmant, le guide de la maison sera partagé et les autres candidats seront déclinés.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-2">
              {/* Recap */}
              <div className="bg-accent/50 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{sitTitle}</span>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>📅 {startDate} → {endDate}{duration ? ` (${duration} jour${duration > 1 ? "s" : ""})` : ""}</p>
                  {petNames.length > 0 && <p>🐾 {petNames.join(", ")}</p>}
                </div>

                {/* Sitter info */}
                <div className="flex items-center gap-3 pt-2 border-t border-border/50">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={confirmApp.sitter?.avatar_url} />
                    <AvatarFallback className="font-semibold bg-primary/10 text-primary">
                      {confirmApp.sitter?.first_name?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-sm">{confirmApp.sitter?.first_name}</span>
                      {confirmApp.sitter?.identity_verified && <Shield className="h-3.5 w-3.5 text-primary" />}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {confirmApp.avgRating && (
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-amber-500 fill-amber-500" /> {confirmApp.avgRating}/5
                        </span>
                      )}
                      {confirmApp.badgeCounts?.[0] && (
                        <TooltipProvider><BadgeShield badgeKey={confirmApp.badgeCounts[0].badge_key} count={confirmApp.badgeCounts[0].count} size="sm" showLabel={false} /></TooltipProvider>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Other candidates warning */}
              {applications.filter(a => a.id !== confirmApp.id && !["rejected", "cancelled"].includes(a.status)).length > 0 && (
                <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 rounded-lg p-3">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    {applications.filter(a => a.id !== confirmApp.id && !["rejected", "cancelled"].includes(a.status)).length} autre(s) candidature(s) sera(ont) automatiquement déclinée(s).
                  </span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setConfirmApp(null)}>Annuler</Button>
              <Button onClick={() => handleAccept(confirmApp)} className="gap-2">
                <CheckCircle2 className="h-4 w-4" /> Confirmer la garde
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Decline Confirmation ── */}
      <AlertDialog open={!!declineApp} onOpenChange={() => setDeclineApp(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Décliner cette candidature ?</AlertDialogTitle>
            <AlertDialogDescription>
              {declineApp?.sitter?.first_name} sera notifié(e) que sa candidature a été déclinée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => declineApp && handleDecline(declineApp)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Décliner
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ApplicationsList;
