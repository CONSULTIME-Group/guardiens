/**
 * Bandeau de confirmation post-publication d'une petite mission.
 *
 * Affiché UNIQUEMENT si :
 *   - l'URL contient ?published=1 (prop `published`)
 *   - ET l'utilisateur courant est bien l'auteur de la mission (prop `isAuthor`)
 *
 * Les deux conditions sont contrôlées en amont par le parent (verrou strict),
 * mais on les revérifie ici par défense en profondeur.
 *
 * Les actions :
 *   - "Partager le lien" : navigator.share si dispo, sinon clipboard.
 *     URL partagée TOUJOURS nettoyée (sans ?published=1).
 *   - "Retour à mon tableau de bord" : lien vers /dashboard.
 *   - X : déclenche `onClose` (le parent supprime ?published=1 de l'URL).
 */
import { Link } from "react-router-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface MissionPublishedBannerProps {
  /** Titre de la mission (utilisé pour navigator.share). */
  missionTitle: string;
  /** Vrai si l'utilisateur courant est l'auteur de la mission. */
  isAuthor: boolean;
  /** Vrai si l'URL contient ?published=1. */
  published: boolean;
  /** Appelé au clic sur X, le parent doit nettoyer l'URL. */
  onClose: () => void;
  /** Toast à appeler en cas de succès / échec de copie. */
  onToast: (toast: { title: string; description: string; variant?: "destructive" }) => void;
  /** Route du dashboard. Par défaut /dashboard. */
  dashboardHref?: string;
}

export function MissionPublishedBanner({
  missionTitle,
  isAuthor,
  published,
  onClose,
  onToast,
  dashboardHref = "/dashboard",
}: MissionPublishedBannerProps) {
  // Verrou de défense en profondeur : si l'une des deux conditions tombe,
  // on ne rend rien, même si le parent appelle ce composant à tort.
  if (!published || !isAuthor) return null;

  const handleShare = async () => {
    const base = typeof window !== "undefined" ? window.location.href : "";
    const cleanUrl = base.split("?")[0];
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({ title: missionTitle, url: cleanUrl });
        return;
      } catch {
        /* annulé → fallback presse-papier */
      }
    }
    try {
      await navigator.clipboard.writeText(cleanUrl);
      onToast({ title: "Lien copié.", description: "Vous pouvez le partager où vous voulez." });
    } catch {
      onToast({
        title: "Copie impossible.",
        description: "Sélectionnez l'URL manuellement.",
        variant: "destructive",
      });
    }
  };

  return (
    <div
      data-testid="mission-published-banner"
      className="relative rounded-xl border border-primary/20 bg-primary/5 p-5 mb-6 animate-fade-in motion-reduce:animate-none"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Fermer la confirmation"
        className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
      <h2 className="font-heading font-semibold text-foreground pr-8">
        Votre mission est en ligne.
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Elle est visible dès maintenant pour les membres qui consultent les petites missions près de chez eux. Les membres ayant activé une alerte dans votre zone seront prévenus au prochain envoi quotidien.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button type="button" size="sm" onClick={handleShare}>
          Partager le lien
        </Button>
        <Link to={dashboardHref} className="text-sm text-primary hover:underline">
          Retour à mon tableau de bord
        </Link>
      </div>
    </div>
  );
}

export default MissionPublishedBanner;
