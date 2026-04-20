import { Link } from "react-router-dom";
import { Lock, User, Star, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import type { AccessLevel } from "@/hooks/useAccessLevel";

interface AccessGateBannerProps {
  level: AccessLevel;
  profileCompletion: number;
  /** "mission" | "guard" — changes the wording */
  context?: "mission" | "guard";
  /** Si true, affiche le bandeau de recommandation ID au level 2.
   *  Par défaut false : la vérification n'étant plus bloquante,
   *  on n'affiche plus de bandeau gênant — on utilise un encart léger ailleurs. */
  showIdentityRecommendation?: boolean;
}

const AccessGateBanner = ({ level, profileCompletion, context = "guard", showIdentityRecommendation = false }: AccessGateBannerProps) => {
  const { user, activeRole } = useAuth();
  const profilePath = (user?.role === "both" ? activeRole : user?.role) === "owner" ? "/owner-profile" : "/profile";
  if (level === 0) {
    return (
      <div
        className="rounded-lg p-5 space-y-3"
        style={{
          backgroundColor: "hsl(40 33% 96%)",
          borderLeft: "3px solid hsl(153 42% 30%)",
        }}
      >
        <div className="flex items-start gap-3">
          <Lock className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div className="space-y-2">
            <p className="font-semibold text-[15px] text-foreground">
              Connectez-vous pour continuer
            </p>
            <p className="text-sm text-muted-foreground">
              Inscrivez-vous gratuitement pour accéder aux annonces et aux missions d'entraide.
            </p>
            <div className="flex gap-2">
              <Button size="sm" asChild>
                <Link to="/register">S'inscrire gratuitement</Link>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link to="/login">Se connecter</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (level === 1) {
    return (
      <div
        className="rounded-lg p-5 space-y-3"
        style={{
          backgroundColor: "hsl(40 33% 96%)",
          borderLeft: "3px solid hsl(153 42% 30%)",
        }}
      >
        <div className="flex items-start gap-3">
          <User className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div className="space-y-3 w-full">
            <p className="font-semibold text-[15px] text-foreground">
              Votre profil est complété à {profileCompletion}%
            </p>
            <Progress value={profileCompletion} className="h-2" />
            <p className="text-sm text-muted-foreground">
              Complétez votre profil pour accéder aux annonces et missions.
            </p>
            <Button size="sm" asChild>
              <Link to={profilePath}>Compléter mon profil →</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Level 2 = ID non vérifié. La vérification est désormais NON-BLOQUANTE.
  // On n'affiche un bandeau qu'à la demande explicite (`showIdentityRecommendation`),
  // et il prend la forme d'une recommandation douce, jamais d'un blocage.
  if (level === 2 && showIdentityRecommendation) {
    return (
      <div
        className="rounded-lg p-4 space-y-2"
        style={{
          backgroundColor: "hsl(40 33% 96%)",
          borderLeft: "3px solid hsl(153 42% 30%)",
        }}
      >
        <div className="flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div className="space-y-2 w-full">
            <p className="font-semibold text-[14px] text-foreground">
              Recommandé : vérifiez votre identité
            </p>
            <p className="text-xs text-muted-foreground">
              Les profils vérifiés inspirent davantage confiance et sont contactés bien plus souvent. Cela ne prend qu'une minute.
            </p>
            <Button size="sm" variant="outline" asChild>
              <Link to="/profile?focus=identite">Vérifier mon identité</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (level === "3A" && context === "guard") {
    return (
      <div
        className="rounded-lg p-5 space-y-3"
        style={{
          backgroundColor: "hsl(40 33% 96%)",
          borderLeft: "3px solid hsl(153 42% 30%)",
        }}
      >
        <div className="flex items-start gap-3">
          <Star className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div className="space-y-2">
            <p className="font-semibold text-[15px] text-foreground">
              Abonnement requis pour postuler aux gardes — 49€/an
            </p>
            <p className="text-sm text-muted-foreground">
              Les petites missions sont accessibles, mais les gardes nécessitent un abonnement actif.
            </p>
            <Button size="sm" asChild>
              <Link to="/tarifs">Voir les avantages →</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default AccessGateBanner;
