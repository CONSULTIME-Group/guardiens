/**
 * Sidebar fiche annonce : profil hôte, lien guide local,
 * lien "voir les gardiens du coin", encart réassurance.
 */
import { Link } from "react-router-dom";
import { MapPin, BookOpen, Building2, ChevronRight, ShieldCheck } from "lucide-react";
import VerifiedBadge from "@/components/profile/VerifiedBadge";

interface SitSidebarProps {
  hasOwnerCard: boolean;
  owner: any;
  ownerName: string;
  cityName: string;
  ownerBio: string;
  hasLocalGuide: boolean;
  citySlug: string | null;
  showSittersLink: boolean;
  sittersLink: string | null;
  sittersScope: { mode: "city" | "dept"; count: number } | null | undefined;
  deptCode?: string;
}

const SitSidebar = ({
  hasOwnerCard,
  owner,
  ownerName,
  cityName,
  ownerBio,
  hasLocalGuide,
  citySlug,
  showSittersLink,
  sittersLink,
  sittersScope,
  deptCode,
}: SitSidebarProps) => {
  return (
    <aside className="space-y-4">
      {hasOwnerCard && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-3">
            Votre hôte
          </p>
          <div className="flex items-center gap-3 mb-3">
            {owner.avatar_url ? (
              <img
                src={owner.avatar_url}
                alt={ownerName}
                className="w-14 h-14 rounded-full object-cover"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center text-xl font-semibold text-muted-foreground">
                {ownerName[0]}
              </div>
            )}
            <div>
              <div className="flex items-center gap-1.5">
                <Link
                  to={`/gardiens/${owner.id}`}
                  className="font-semibold hover:text-primary transition-colors"
                >
                  {ownerName}
                </Link>
                {owner.identity_verified && <VerifiedBadge size="sm" />}
              </div>
              {cityName && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {cityName}
                </p>
              )}
            </div>
          </div>
          {ownerBio && (
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-6">
              {ownerBio}
            </p>
          )}
        </div>
      )}

      {hasLocalGuide && citySlug && (
        <Link
          to={`/guides/${citySlug}`}
          className="block rounded-2xl border border-border bg-card p-5 hover:border-primary/50 transition-colors group"
        >
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <BookOpen className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-0.5">
                Guide local
              </p>
              <p className="font-semibold text-sm group-hover:text-primary transition-colors">
                Découvrir {cityName}
              </p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Vétos, parcs à chiens, bonnes adresses du coin.
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 mt-2" />
          </div>
        </Link>
      )}

      {showSittersLink && sittersLink && sittersScope && (
        <Link
          to={sittersLink}
          className="block rounded-2xl border border-border bg-card p-5 hover:border-primary/50 transition-colors group"
        >
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-0.5">
                Communauté locale
              </p>
              <p className="font-semibold text-sm group-hover:text-primary transition-colors">
                {sittersScope.mode === "city"
                  ? `Voir les gardiens à ${cityName}`
                  : `Voir les gardiens du ${deptCode}`}
              </p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {sittersScope.mode === "city"
                  ? `${sittersScope.count}+ profils vérifiés à ${cityName}.`
                  : `${sittersScope.count}+ profils vérifiés dans le département.`}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 mt-2" />
          </div>
        </Link>
      )}

      <div className="rounded-2xl bg-muted/50 p-5 text-xs text-muted-foreground space-y-2">
        <p className="flex items-center gap-2 font-medium text-foreground">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Sur Guardiens, c'est gratuit, entre gens du coin
        </p>
        <p>
          Aucun paiement entre membres. Profils vérifiés, avis croisés, accord de garde
          signé. La confiance entre gens du coin.
        </p>
      </div>
    </aside>
  );
};

export default SitSidebar;
