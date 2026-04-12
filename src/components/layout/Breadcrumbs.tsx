import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

/**
 * Mapping des segments d'URL vers des labels lisibles.
 */
const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "Tableau de bord",
  "mon-abonnement": "Mon abonnement",
  "profil-gardien": "Profil gardien",
  "profil-proprietaire": "Profil propriétaire",
  annonces: "Annonces",
  messages: "Messages",
  parametres: "Paramètres",
  notifications: "Notifications",
  "petites-missions": "Petites missions",
  "gardien-urgence": "Gardien d'urgence",
  actualites: "Actualités",
  guides: "Guides",
  tarifs: "Tarifs",
  faq: "FAQ",
  contact: "Contact",
  recherche: "Recherche",
  "house-sitting": "House-sitting",
  departement: "Département",
  races: "Races",
  avis: "Avis",
};

const HIDDEN_ROUTES = ["/", "/connexion", "/inscription"];

const Breadcrumbs = () => {
  const location = useLocation();
  const { pathname } = location;

  if (HIDDEN_ROUTES.includes(pathname)) return null;

  const segments = pathname.split("/").filter(Boolean);
  if (segments.length < 2) return null;

  const crumbs = segments.map((seg, i) => {
    const path = "/" + segments.slice(0, i + 1).join("/");
    const label = SEGMENT_LABELS[seg] || decodeURIComponent(seg).replace(/-/g, " ");
    const isLast = i === segments.length - 1;
    return { path, label, isLast };
  });

  return (
    <nav aria-label="Fil d'Ariane" className="flex items-center gap-1 text-xs text-muted-foreground px-4 py-2 overflow-x-auto">
      <Link to="/" className="hover:text-foreground transition-colors shrink-0" aria-label="Accueil">
        <Home className="h-3.5 w-3.5" />
      </Link>
      {crumbs.map(({ path, label, isLast }) => (
        <span key={path} className="flex items-center gap-1 shrink-0">
          <ChevronRight className="h-3 w-3" />
          {isLast ? (
            <span className="text-foreground font-medium truncate max-w-[180px]" aria-current="page">
              {label}
            </span>
          ) : (
            <Link to={path} className="hover:text-foreground transition-colors truncate max-w-[140px]">
              {label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
};

export default Breadcrumbs;
