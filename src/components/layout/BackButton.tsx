import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BackButtonProps {
  /** Variant "inline" : sans wrapper sticky, pour intégration dans une top bar existante. */
  inline?: boolean;
}

export const BackButton = ({ inline = false }: BackButtonProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Pas de bouton retour sur les hubs (dashboard / messages portent leur propre nav).
  if (location.pathname === "/dashboard" || location.pathname === "/messages") return null;

  const btn = (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => navigate(-1)}
      className="gap-1.5 text-muted-foreground hover:text-foreground -ml-2 h-8 px-2"
      aria-label="Revenir à la page précédente"
    >
      <ArrowLeft className="h-4 w-4" />
      <span className="text-sm">Retour</span>
    </Button>
  );

  if (inline) return btn;

  return (
    <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border px-4 py-2 md:px-6">
      {btn}
    </div>
  );
};
