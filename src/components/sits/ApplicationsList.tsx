import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Star, MapPin, CheckCircle2, XCircle, MessageSquare, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

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
  const navigate = useNavigate();

  const load = async () => {
    const { data } = await supabase
      .from("applications")
      .select("*, sitter:profiles!applications_sitter_id_fkey(id, first_name, last_name, city, avatar_url, bio)")
      .eq("sit_id", sitId)
      .order("created_at", { ascending: false });

    if (data) {
      // Enrich with sitter profile + reviews
      const enriched = await Promise.all(
        data.map(async (app: any) => {
          const [spRes, revRes] = await Promise.all([
            supabase.from("sitter_profiles").select("experience_years, animal_types").eq("user_id", app.sitter_id).maybeSingle(),
            supabase.from("reviews").select("overall_rating").eq("reviewee_id", app.sitter_id).eq("published", true),
          ]);
          const reviews = revRes.data || [];
          const avgRating = reviews.length > 0 ? (reviews.reduce((s: number, r: any) => s + r.overall_rating, 0) / reviews.length).toFixed(1) : null;
          return {
            ...app,
            sitterProfile: spRes.data,
            avgRating,
            reviewCount: reviews.length,
          };
        })
      );
      setApplications(enriched);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [sitId]);

  const handleAccept = async (appId: string, sitterName: string, sitterId: string) => {
    // Accept this one
    await supabase.from("applications").update({ status: "accepted" as any }).eq("id", appId);
    // Reject others
    const { data: rejectedApps } = await supabase
      .from("applications")
      .select("sitter_id")
      .eq("sit_id", sitId)
      .neq("id", appId);
    await supabase
      .from("applications")
      .update({ status: "rejected" as any })
      .eq("sit_id", sitId)
      .neq("id", appId);
    // Update sit status
    await supabase.from("sits").update({ status: "confirmed" as any }).eq("id", sitId);

    // Send confirmation system message to accepted sitter's conversation
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

      // Check if house guide exists and send auto-message with link
      const { data: guideData } = await supabase
        .from("house_guides")
        .select("id")
        .eq("property_id", propertyId)
        .maybeSingle();

      if (guideData) {
        await supabase.from("messages").insert({
          conversation_id: acceptedConv.id,
          sender_id: user.id,
          content: "📋 Le guide de la maison est disponible ! Vous y trouverez l'adresse exacte, les codes d'accès, les contacts utiles et toutes les consignes. Consultez-le dans le bandeau en haut de cette conversation.",
          is_system: true,
        });
      }

      await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", acceptedConv.id);
    }

    // Send rejection system messages to other sitters' conversations
    if (rejectedApps && user) {
      for (const app of rejectedApps) {
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
            content: `Le propriétaire a choisi un autre gardien pour cette garde. Merci pour votre candidature !`,
            is_system: true,
          });
          await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", rejConv.id);
        }
      }
    }

    toast({ title: "Garde confirmée !", description: `${sitterName} a été choisi(e) pour cette garde.` });
    load();
  };

  const handleDecline = async (appId: string, sitterId: string) => {
    await supabase.from("applications").update({ status: "rejected" as any }).eq("id", appId);

    // Send rejection system message
    if (user) {
      const { data: rejConv } = await supabase
        .from("conversations")
        .select("id")
        .eq("sit_id", sitId)
        .eq("sitter_id", sitterId)
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
    load();
  };

  if (loading) return <p className="text-sm text-muted-foreground">Chargement des candidatures...</p>;

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
        <div className="space-y-4">
          {applications.map((app) => {
            const sitter = app.sitter;
            const status = statusStyles[app.status] || statusStyles.pending;
            const animalTypes: string[] = app.sitterProfile?.animal_types || [];
            const expYears = app.sitterProfile?.experience_years;

            return (
              <div key={app.id} className="bg-card border border-border rounded-lg p-5">
                <div className="flex items-start gap-3">
                  {sitter?.avatar_url ? (
                    <img src={sitter.avatar_url} alt={sitter.first_name} className="w-12 h-12 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center font-heading text-lg font-bold shrink-0">
                      {sitter?.first_name?.charAt(0) || "?"}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{sitter?.first_name || "Gardien"}</span>
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
                          <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />{app.avgRating} ({app.reviewCount})
                        </span>
                      )}
                      {expYears && <span>{expYears} d'expérience</span>}
                      {animalTypes.length > 0 && <span>{animalTypes.join(", ")}</span>}
                    </div>
                  </div>
                </div>

                {app.message && (
                  <div className="mt-3 p-3 bg-accent/50 rounded-lg text-sm whitespace-pre-line">
                    {app.message}
                  </div>
                )}

                {app.status === "pending" && (
                  <div className="flex gap-2 mt-4 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => navigate("/messages")}
                    >
                      <MessageSquare className="h-3.5 w-3.5" /> Répondre
                    </Button>
                    <Button
                      size="sm"
                      className="gap-1.5"
                      onClick={() => handleAccept(app.id, sitter?.first_name || "Ce gardien", app.sitter_id)}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Accepter ce gardien
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-destructive hover:text-destructive"
                      onClick={() => handleDecline(app.id, app.sitter_id)}
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ApplicationsList;
