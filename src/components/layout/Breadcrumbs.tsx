import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

/**
 * Mapping des segments d'URL vers des labels lisibles.
 */
const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "Tableau de bord",
  "mon-abonnement": "Mon abonnement",
  annonces: "Annonces",
  sits: "Mes annonces",
  create: "Nouvelle annonce",
  edit: "Modifier",
  messages: "Messages",
  notifications: "Notifications",
  "petites-missions": "Petites missions",
  creer: "Créer",
  "gardien-urgence": "Gardien d'urgence",
  actualites: "Actualités",
  guides: "Guides",
  tarifs: "Tarifs",
  faq: "FAQ",
  contact: "Contact",
  recherche: "Recherche",
  "recherche-gardiens": "Recherche gardiens",
  search: "Recherche",
  "house-sitting": "House-sitting",
  departement: "Département",
  gardiens: "Gardien",
  "owner-profile": "Profil propriétaire",
  profile: "Mon profil",
  favoris: "Mes favoris",
  "mes-avis": "Mes avis",
  settings: "Paramètres",
  "house-guide": "Guide de la maison",
  review: "Laisser un avis",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const HIDDEN_ROUTES = ["/", "/login", "/inscription"];

const Breadcrumbs = () => {
  const location = useLocation();
  const { pathname } = location;

  if (HIDDEN_ROUTES.includes(pathname)) return null;

  const segments = pathname.split("/").filter(Boolean);
  if (segments.length < 2) return null;

  const crumbs = segments.map((seg, i) => {
    const path = "/" + segments.slice(0, i + 1).join("/");
    const isUuid = UUID_RE.test(seg);
    const label = SEGMENT_LABELS[seg] || (isUuid ? "Détail" : decodeURIComponent(seg).replace(/-/g, " "));
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
