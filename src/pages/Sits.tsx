import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { Plus, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const speciesEmoji: Record<string, string> = {
  dog: "🐕", cat: "🐈", horse: "🐴", bird: "🐦", rodent: "🐹",
  fish: "🐠", reptile: "🦎", farm_animal: "🐄", nac: "🐾",
};

const statusLabels: Record<string, { label: string; className: string }> = {
  draft: { label: "Brouillon", className: "bg-muted text-muted-foreground" },
  published: { label: "Publiée", className: "bg-primary/10 text-primary" },
  confirmed: { label: "Confirmée", className: "bg-green-100 text-green-700" },
  completed: { label: "Terminée", className: "bg-accent text-accent-foreground" },
  cancelled: { label: "Annulée", className: "bg-destructive/10 text-destructive" },
};

const Sits = () => {
  const { user, activeRole } = useAuth();
  const [sits, setSits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      if (activeRole === "owner") {
        const { data } = await supabase
          .from("sits")
          .select("*, properties(type, environment)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        // Enrich with application count
        const enriched = await Promise.all(
          (data || []).map(async (sit: any) => {
            const { count } = await supabase
              .from("applications")
              .select("id", { count: "exact", head: true })
              .eq("sit_id", sit.id);
            return { ...sit, applicationCount: count || 0 };
          })
        );
        setSits(enriched);
      } else {
        const { data } = await supabase
          .from("applications")
          .select("*, sit:sits(*, properties(type, environment))")
          .eq("sitter_id", user.id)
          .order("created_at", { ascending: false });
        setSits(data?.map((a: any) => ({ ...a.sit, application_status: a.status })) || []);
      }
      setLoading(false);
    };
    load();
  }, [user, activeRole]);

  const formatDate = (d: string | null) => d ? format(new Date(d), "d MMM", { locale: fr }) : "";

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-3xl font-bold mb-1">Mes gardes</h1>
          <p className="text-muted-foreground text-sm">
            {activeRole === "owner" ? "Gérez vos annonces de garde." : "Suivez vos candidatures."}
          </p>
        </div>
        {activeRole === "owner" && (
          <Link to="/sits/create">
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Publier une garde
            </Button>
          </Link>
        )}
      </div>

      {loading ? (
        <p className="text-muted-foreground">Chargement...</p>
      ) : sits.length === 0 ? (
        <div className="text-center py-20">
          <Calendar className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">
            {activeRole === "owner" ? "Vous n'avez pas encore publié de garde." : "Vous n'avez pas encore postulé."}
          </p>
          {activeRole === "owner" && (
            <Link to="/sits/create">
              <Button variant="outline" className="mt-4 gap-2"><Plus className="h-4 w-4" /> Créer ma première annonce</Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {sits.map((sit: any) => {
            const status = statusLabels[sit.status] || statusLabels.draft;
            return (
              <Link key={sit.id} to={`/sits/${sit.id}`} className="block bg-card rounded-lg border border-border p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="font-heading font-semibold truncate">{sit.title || "Sans titre"}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {formatDate(sit.start_date)} → {formatDate(sit.end_date)}
                      {sit.flexible_dates && " (flexible)"}
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium shrink-0 ${status.className}`}>
                    {status.label}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Sits;
