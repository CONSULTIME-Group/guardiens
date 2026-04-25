import { memo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { format, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";
import { Eye, RefreshCw, Plus, PawPrint, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import ShareButtons from "@/components/sits/ShareButtons";
import { capitalize, SPECIES_LABEL } from "./helpers";
import type { SitRow, Pet } from "./types";

interface MonAnnonceCardProps {
  sits: SitRow[];
  pets: Pet[];
  propertyType: string | null;
  propertyEnvironment: string | null;
  pendingAppCount: number;
  coverPhoto?: string | null;
}

const TYPE_LABELS: Record<string, string> = {
  apartment: "Appartement", house: "Maison", farm: "Ferme", chalet: "Chalet", other: "Autre",
};
const ENV_LABELS: Record<string, string> = {
  city_center: "Centre-ville", suburban: "Périurbain", countryside: "Campagne",
  mountain: "Montagne", seaside: "Bord de mer", forest: "Forêt",
};

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  published: { label: "En ligne", className: "bg-primary/10 text-primary" },
  confirmed: { label: "Confirmée", className: "bg-primary/15 text-primary" },
  in_progress: { label: "En cours", className: "bg-accent text-accent-foreground" },
  completed: { label: "Terminée", className: "bg-muted text-muted-foreground" },
  cancelled: { label: "Annulée", className: "bg-destructive/10 text-destructive" },
};

const MonAnnonceCard = memo(({ sits, pets, propertyType, propertyEnvironment, pendingAppCount, coverPhoto }: MonAnnonceCardProps) => {
  const navigate = useNavigate();
  const now = new Date();

  // Find relevant sit: active > last completed > null
  const activeSit = sits.find(s => ["published", "confirmed", "in_progress"].includes(s.status));
  const lastCompleted = sits.find(s => s.status === "completed");
  const currentSit = activeSit || lastCompleted;

  // No sit ever + no profile data → empty state
  if (!currentSit && pets.length === 0 && !propertyType) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6 text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <Home className="h-6 w-6 text-primary/60" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Mon annonce</p>
          <p className="text-xs text-muted-foreground mt-1">
            Complétez votre profil (logement + animaux) puis publiez votre première annonce.
          </p>
        </div>
        <Button size="sm" onClick={() => navigate("/owner-profile")}>
          Compléter mon profil
        </Button>
      </div>
    );
  }

  // No sit ever but profile data exists → ready to publish
  if (!currentSit) {
    return (
      <div className="bg-card border-2 border-dashed border-primary/30 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Mon annonce</p>
          <span className="text-xs bg-muted text-muted-foreground rounded-full px-2 py-0.5">Brouillon</span>
        </div>

        {/* Preview from profile */}
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {propertyType && (
            <span className="flex items-center gap-1">
              <Home className="h-3 w-3" />
              {TYPE_LABELS[propertyType] || propertyType}
              {propertyEnvironment ? ` · ${ENV_LABELS[propertyEnvironment] || propertyEnvironment}` : ""}
            </span>
          )}
          {pets.length > 0 && (
            <span className="flex items-center gap-1">
              <PawPrint className="h-3 w-3" />
              {pets.map(p => capitalize(p.name)).join(", ")}
            </span>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Votre profil est prêt — il ne manque que les dates pour mettre en ligne.
        </p>

        <Button size="sm" className="w-full" onClick={() => navigate("/sits/create")}>
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Mettre en ligne
        </Button>
      </div>
    );
  }

  // Active or completed sit
  const isActive = ["published", "confirmed", "in_progress"].includes(currentSit.status);
  const statusConf = STATUS_CONFIG[currentSit.status] || STATUS_CONFIG.published;
  const dateRange = [
    currentSit.start_date ? format(new Date(currentSit.start_date), "d MMM", { locale: fr }) : "",
    currentSit.end_date ? format(new Date(currentSit.end_date), "d MMM yyyy", { locale: fr }) : "",
  ].filter(Boolean).join(" → ");

  const appCount = currentSit.applications?.length || 0;
  const daysUntilStart = currentSit.start_date
    ? differenceInDays(new Date(currentSit.start_date), now)
    : null;

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {coverPhoto && (
        <div className="h-32 w-full overflow-hidden">
          <img src={coverPhoto} alt="Photo du logement" className="w-full h-full object-cover" />
        </div>
      )}
      <div className="p-5 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">Mon annonce</p>
        <span className={`text-xs rounded-full px-2.5 py-0.5 font-medium ${statusConf.className}`}>
          {statusConf.label}
        </span>
      </div>

      <p className="text-sm font-medium text-foreground leading-snug">{currentSit.title}</p>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>{dateRange}</span>
        {isActive && daysUntilStart !== null && daysUntilStart > 0 && (
          <span>dans {daysUntilStart}j</span>
        )}
        {isActive && appCount > 0 && (
          <span className="font-medium text-primary">
            {appCount} candidature{appCount > 1 ? "s" : ""}
            {pendingAppCount > 0 && ` (${pendingAppCount} nouvelle${pendingAppCount > 1 ? "s" : ""})`}
          </span>
        )}
      </div>

      {/* Pet mini-icons */}
      {pets.length > 0 && (
        <div className="flex items-center gap-2">
          {pets.slice(0, 4).map(pet => (
            <div key={pet.id} className="flex items-center gap-1 text-xs text-muted-foreground">
              {pet.photo_url ? (
                <img src={pet.photo_url} alt={pet.name} className="w-5 h-5 rounded-full object-cover" />
              ) : (
                <PawPrint className="h-3.5 w-3.5" />
              )}
              <span>{capitalize(pet.name)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        {isActive ? (
          <>
            <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => navigate(`/sits/${currentSit.id}`)}>
              <Eye className="h-3.5 w-3.5 mr-1" /> Voir l'annonce
            </Button>
            <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => navigate(`/sits/${currentSit.id}/edit`)}>
              Modifier
            </Button>
          </>
        ) : (
          <>
            <Button size="sm" className="flex-1 text-xs" onClick={() => navigate(`/sits/create?from=${currentSit.id}`)}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> Republier
            </Button>
            <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => navigate(`/sits/create`)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Nouvelle annonce
            </Button>
          </>
        )}
        </div>
      </div>
    </div>
  );
});

MonAnnonceCard.displayName = "MonAnnonceCard";
export default MonAnnonceCard;
