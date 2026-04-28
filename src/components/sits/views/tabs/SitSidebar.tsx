/**
 * Sidebar fiche annonce : profil hôte, lien guide local,
 * lien "voir les gardiens du coin", encart réassurance.
 * Aucune icône Lucide décorative — texte pur (mem://constraints/no-icons-in-content).
 */
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
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
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-3">
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
                {ownerName?.[0] ?? "?"}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <Link
                  to={`/gardiens/${owner.id}`}
                  className="font-semibold text-sm hover:text-primary transition-colors truncate"
                >
                  {ownerName}
                </Link>
                {owner.identity_verified && <VerifiedBadge size="sm" />}
              </div>
              {cityName && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {cityName}
                </p>
              )}
            </div>
          </div>
          {ownerBio && (
            <p className="text-[13px] text-muted-foreground leading-relaxed line-clamp-5">
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
            <div className="flex-1 min-w-0">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
                Guide local
              </p>
              <p className="font-semibold text-sm group-hover:text-primary transition-colors">
                Découvrir {cityName}
              </p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">
                Vétos, parcs à chiens, bonnes adresses du coin.
              </p>
            </div>
            <ChevronRight
              aria-hidden="true"
              className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 mt-1"
            />
          </div>
        </Link>
      )}

      {showSittersLink && sittersLink && sittersScope && (
        <Link
          to={sittersLink}
          className="block rounded-2xl border border-border bg-card p-5 hover:border-primary/50 transition-colors group"
        >
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
                Communauté locale
              </p>
              <p className="font-semibold text-sm group-hover:text-primary transition-colors">
                {sittersScope.mode === "city"
                  ? `Voir les gardiens à ${cityName}`
                  : `Voir les gardiens du ${deptCode}`}
              </p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">
                {sittersScope.mode === "city"
                  ? `${sittersScope.count}+ profils vérifiés à ${cityName}.`
                  : `${sittersScope.count}+ profils vérifiés dans le département.`}
              </p>
            </div>
            <ChevronRight
              aria-hidden="true"
              className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 mt-1"
            />
          </div>
        </Link>
      )}

      <div className="rounded-2xl bg-muted/50 p-5 text-xs text-muted-foreground space-y-2">
        <p className="font-semibold text-[13px] text-foreground">
          Sur Guardiens, c'est gratuit, entre gens du coin
        </p>
        <p className="leading-relaxed">
          Aucun paiement entre membres. Profils vérifiés, avis croisés, accord de garde
          signé. La confiance entre gens du coin.
        </p>
      </div>
    </aside>
  );
};

export default SitSidebar;
