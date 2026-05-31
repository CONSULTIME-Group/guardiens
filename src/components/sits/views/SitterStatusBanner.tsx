/**
 * Bandeau d'état affiché au gardien quand l'annonce n'est plus actionnable
 * (cancelled / expired / completed / unpublished). Le but est de communiquer
 * clairement pourquoi il n'y a plus de bouton "Postuler" sans le laisser deviner.
 */
import { Link } from "react-router-dom";
import { XCircle, Clock, CheckCircle2, UserCheck, ArchiveX } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SitterStatusBannerProps {
  status: string;
  /** Pour status="draft" + unpublished_at : raison fournie par le propriétaire. */
  unpublishedAt?: string | null;
  unpublishedReason?: string | null;
  /** Contexte de l'annonce — sert à pré-remplir la recherche de gardes similaires. */
  city?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

type BannerConfig = {
  Icon: typeof XCircle;
  title: string;
  description: string;
  tone: string;
};

const CONFIG: Record<string, BannerConfig> = {
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

const UNPUBLISHED_FOUND: BannerConfig = {
  Icon: UserCheck,
  title: "Le propriétaire a trouvé un gardien",
  description:
    "Cette annonce a été retirée car le propriétaire a confirmé qu'il avait trouvé une solution. Découvrez d'autres gardes ouvertes.",
  tone: "border-muted-foreground/20 bg-muted/40 text-muted-foreground",
};

const UNPUBLISHED_OTHER: BannerConfig = {
  Icon: ArchiveX,
  title: "Cette annonce a été retirée",
  description:
    "Le propriétaire a dépublié son annonce. Vous pouvez explorer d'autres gardes en cours.",
  tone: "border-muted-foreground/20 bg-muted/40 text-muted-foreground",
};

const SitterStatusBanner = ({
  status,
  unpublishedAt,
  unpublishedReason,
  city,
  startDate,
  endDate,
}: SitterStatusBannerProps) => {
  let cfg: BannerConfig | null = CONFIG[status] ?? null;

  // Cas dépubliée par le propriétaire (status revient à "draft" + unpublished_at)
  if (!cfg && status === "draft" && unpublishedAt) {
    cfg =
      unpublishedReason === "found_offline" || unpublishedReason === "found_onplatform"
        ? UNPUBLISHED_FOUND
        : UNPUBLISHED_OTHER;
  }

  if (!cfg) return null;
  const { Icon, title, description, tone } = cfg;

  // Construit une URL de recherche pré-filtrée (même ville + mêmes dates si dispo)
  // pour transformer le bandeau « plus disponible » en rebond utile.
  const params = new URLSearchParams();
  if (city && city.trim()) params.set("ville", city.trim());
  if (startDate) params.set("debut", startDate);
  if (endDate) params.set("fin", endDate);
  const qs = params.toString();
  const searchHref = qs ? `/search?${qs}` : "/search";
  const hasContext = Boolean(city || startDate || endDate);
  const ctaLabel = hasContext ? "Voir les gardes similaires" : "Voir les autres gardes";

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
          <Link to={searchHref}>
            <Button variant="outline" size="sm">
              {ctaLabel}
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default SitterStatusBanner;
