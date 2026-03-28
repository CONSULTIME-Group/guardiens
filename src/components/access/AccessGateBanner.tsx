import { Link } from "react-router-dom";
import { Lock, User, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { AccessLevel } from "@/hooks/useAccessLevel";

interface AccessGateBannerProps {
  level: AccessLevel;
  profileCompletion: number;
  /** "mission" | "guard" — changes the wording */
  context?: "mission" | "guard";
}

const AccessGateBanner = ({ level, profileCompletion, context = "guard" }: AccessGateBannerProps) => {
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
              <Link to="/profile">Compléter mon profil →</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (level === 2) {
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
              Une dernière étape
            </p>
            <p className="text-sm text-muted-foreground">
              Vérifiez votre identité pour postuler aux missions et publier des annonces.
            </p>
            <Button size="sm" asChild>
              <Link to="/settings">Vérifier mon identité →</Link>
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
