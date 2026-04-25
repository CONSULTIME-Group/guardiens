/**
 * Bandeau d'état affiché au gardien quand l'annonce n'est plus actionnable
 * (cancelled / expired / completed). Le but est de communiquer clairement
 * pourquoi il n'y a plus de bouton "Postuler" sans le laisser deviner.
 */
import { Link } from "react-router-dom";
import { XCircle, Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SitterStatusBannerProps {
  status: string;
}

const CONFIG: Record<
  string,
  { Icon: typeof XCircle; title: string; description: string; tone: string } | null
> = {
  cancelled: {
    Icon: XCircle,
    title: "Cette garde a été annulée",
    description:
      "Le propriétaire a annulé son annonce. Vous pouvez explorer d'autres gardes en cours.",
    tone: "border-destructive/20 bg-destructive/5 text-destructive-text",
  },
  expired: {
    Icon: Clock,
    title: "Cette annonce est expirée",
    description:
      "Les dates de cette garde sont passées. Découvrez les annonces actuellement ouvertes.",
    tone: "border-muted-foreground/20 bg-muted/40 text-muted-foreground",
  },
  completed: {
    Icon: CheckCircle2,
    title: "Cette garde est terminée",
    description:
      "L'annonce reste consultable à titre informatif. Pour candidater, choisissez une garde à venir.",
    tone: "border-primary/20 bg-primary/5 text-primary",
  },
};

const SitterStatusBanner = ({ status }: SitterStatusBannerProps) => {
  const cfg = CONFIG[status];
  if (!cfg) return null;
  const { Icon, title, description, tone } = cfg;

  return (
    <section
      className={`mb-6 rounded-xl border p-4 md:p-5 ${tone}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <Icon className="h-5 w-5 shrink-0 mt-0.5" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <p className="font-heading text-base font-semibold text-foreground">
            {title}
          </p>
          <p className="text-sm text-muted-foreground mt-1 mb-3">
            {description}
          </p>
          <Link to="/search">
            <Button variant="outline" size="sm">
              Voir les autres gardes
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default SitterStatusBanner;
