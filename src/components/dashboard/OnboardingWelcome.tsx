import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  UserCircle, Camera, PawPrint, Home, ShieldCheck, Search, Megaphone,
  ChevronRight, CheckCircle2, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { capitalizeName } from "@/lib/capitalize";

interface OnboardingStep {
  key: string;
  icon: React.ElementType;
  title: string;
  description: string;
  link: string;
  cta: string;
  done: boolean;
}

interface OnboardingWelcomeProps {
  role: "sitter" | "owner";
  checks: {
    hasName: boolean;
    hasAvatar: boolean;
    hasBio: boolean;
    hasIdentity: boolean;
    hasProperty?: boolean;
    hasPets?: boolean;
    hasSit?: boolean;
    hasSitterProfile?: boolean;
  };
  onDismiss: () => void;
}

const OnboardingWelcome = ({ role, checks, onDismiss }: OnboardingWelcomeProps) => {
  const { user } = useAuth();
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  const sitterSteps: OnboardingStep[] = [
    {
      key: "name",
      icon: UserCircle,
      title: "Complétez votre identité",
      description: "Ajoutez votre prénom, nom et une courte bio pour vous présenter aux propriétaires.",
      link: "/profile",
      cta: "Compléter mon profil",
      done: checks.hasName && checks.hasBio,
    },
    {
      key: "avatar",
      icon: Camera,
      title: "Ajoutez une photo de profil",
      description: "Un profil avec photo reçoit 3× plus de réponses. Montrez votre plus beau sourire !",
      link: "/profile",
      cta: "Ajouter ma photo",
      done: checks.hasAvatar,
    },
    {
      key: "sitter_profile",
      icon: PawPrint,
      title: "Décrivez votre expérience",
      description: "Quels animaux gardez-vous ? Quelle est votre disponibilité ? Remplissez votre profil gardien.",
      link: "/profile",
      cta: "Mon profil gardien",
      done: !!checks.hasSitterProfile,
    },
    {
      key: "identity",
      icon: ShieldCheck,
      title: "Vérifiez votre identité",
      description: "La vérification rassure les propriétaires et augmente vos chances d'être choisi.",
      link: "/settings#verification",
      cta: "Vérifier mon identité",
      done: checks.hasIdentity,
    },
    {
      key: "search",
      icon: Search,
      title: "Explorez les annonces",
      description: "Parcourez les gardes disponibles et envoyez votre première candidature !",
      link: "/search",
      cta: "Voir les annonces",
      done: false,
    },
  ];

  const ownerSteps: OnboardingStep[] = [
    {
      key: "name",
      icon: UserCircle,
      title: "Complétez votre identité",
      description: "Ajoutez votre prénom, nom et une courte bio pour vous présenter aux gardiens.",
      link: "/owner-profile",
      cta: "Compléter mon profil",
      done: checks.hasName && checks.hasBio,
    },
    {
      key: "avatar",
      icon: Camera,
      title: "Ajoutez une photo de profil",
      description: "Les gardiens font plus confiance aux profils avec photo. C'est rapide !",
      link: "/owner-profile",
      cta: "Ajouter ma photo",
      done: checks.hasAvatar,
    },
    {
      key: "property",
      icon: Home,
      title: "Décrivez votre logement",
      description: "Type de logement, équipements, environnement… Donnez envie aux gardiens de venir chez vous.",
      link: "/owner-profile",
      cta: "Décrire mon logement",
      done: !!checks.hasProperty,
    },
    {
      key: "pets",
      icon: PawPrint,
      title: "Ajoutez vos animaux",
      description: "Présentez vos compagnons : espèce, race, caractère, besoins… Les gardiens adorent les découvrir.",
      link: "/owner-profile",
      cta: "Ajouter mes animaux",
      done: !!checks.hasPets,
    },
    {
      key: "identity",
      icon: ShieldCheck,
      title: "Vérifiez votre identité",
      description: "La vérification est un gage de confiance pour les gardiens qui viendront chez vous.",
      link: "/settings#verification",
      cta: "Vérifier mon identité",
      done: checks.hasIdentity,
    },
    {
      key: "sit",
      icon: Megaphone,
      title: "Publiez votre première annonce",
      description: "Décrivez votre besoin de garde et recevez des candidatures en quelques heures.",
      link: "/sits/create",
      cta: "Créer une annonce",
      done: !!checks.hasSit,
    },
  ];

  const steps = role === "sitter" ? sitterSteps : ownerSteps;
  const doneCount = steps.filter(s => s.done).length;
  const progress = Math.round((doneCount / steps.length) * 100);
  const allDone = doneCount === steps.length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome header */}
      <div className="text-center space-y-3 py-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <Sparkles className="h-8 w-8 text-primary" />
        </div>
        <h1 className="font-heading text-2xl md:text-3xl font-bold">
          Bienvenue{user?.firstName ? `, ${capitalizeName(user.firstName)}` : ""}
        </h1>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          {role === "sitter"
            ? "Quelques étapes pour créer un profil attractif et décrocher votre première garde."
            : "Préparez votre profil pour trouver le gardien idéal pour vos animaux."}
        </p>
      </div>

      {/* Progress bar */}
      <div className="bg-card rounded-xl border border-border p-4 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">{allDone ? "Profil complet !" : "Votre progression"}</span>
          <span className="text-muted-foreground font-medium">{doneCount}/{steps.length}</span>
        </div>
        <div className="h-2.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-2">
        {steps.map((step, i) => {
          const Icon = step.icon;
          const isExpanded = expandedStep === step.key;
          return (
            <div
              key={step.key}
              className={`rounded-xl border transition-all duration-200 ${
                step.done
                  ? "border-primary/20 bg-primary/5"
                  : "border-border bg-card hover:shadow-sm"
              }`}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <button
                onClick={() => setExpandedStep(isExpanded ? null : step.key)}
                className="w-full flex items-center gap-3 p-4 text-left"
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                  step.done ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}>
                  {step.done ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <Icon className="h-4.5 w-4.5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${step.done ? "line-through text-muted-foreground" : ""}`}>
                    {step.title}
                  </p>
                </div>
                {!step.done && (
                  <ChevronRight className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`} />
                )}
              </button>
              {isExpanded && !step.done && (
                <div className="px-4 pb-4 pl-16 space-y-3 animate-fade-in">
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                  <Link to={step.link}>
                    <Button size="sm">{step.cta}</Button>
                  </Link>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Skip */}
      {!allDone && (
        <div className="text-center">
          <button
            onClick={onDismiss}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
          >
            Passer pour l'instant
          </button>
        </div>
      )}

      {allDone && (
        <div className="text-center py-2">
          <Button onClick={onDismiss}>Accéder au tableau de bord</Button>
        </div>
      )}
    </div>
  );
};

export default OnboardingWelcome;
