/**
 * Header partagé entre OwnerSitView et SitterSitView.
 *
 * Inclut :
 * - Lien retour (différent selon rôle)
 * - Hero photos (lightbox)
 * - Titre + actions à droite (Modifier/Voir, ou Report)
 * - Ligne meta : ville · dates · status · note
 * - Owner card (masquée si on est soi-même le propriétaire)
 *
 * Reste 100% présentationnel : aucune logique métier ici, on reçoit tout via props.
 */
import { Link } from "react-router-dom";
import { ArrowLeft, Calendar, MapPin, Star, Pencil, ExternalLink, MoreHorizontal } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import VerifiedBadge from "@/components/profile/VerifiedBadge";
import ReportButton from "@/components/reports/ReportButton";
import SitHero from "@/components/sits/shared/SitHero";
import { getSitStatusConfig } from "@/components/sits/shared/sitConstants";
import { sanitizeUserTitle } from "@/lib/sanitizeTitle";

interface SitDetailHeaderProps {
  sitId: string;
  sitTitle: string | null;
  sitStatus: string;
  startDate: string | null;
  endDate: string | null;
  flexibleDates: boolean | null;
  photos: string[];
  owner: any;
  isOwner: boolean;
  isAuthenticatedNonOwner: boolean;
  reviewCount: number;
  avgRating: string | null;
  /**
   * Mode compact : masque le hero photos, le titre et la ligne meta
   * (déjà rendus par SitImmersiveContent). Conserve le lien retour, les
   * actions (Modifier / Voir comme gardien / Signaler), le badge statut
   * et l'owner card.
   */
  compact?: boolean;
}

const formatDate = (d: string | null) =>
  d ? format(new Date(d), "d MMMM yyyy", { locale: fr }) : "";

const SitDetailHeader = ({
  sitId,
  sitTitle,
  sitStatus,
  startDate,
  endDate,
  flexibleDates,
  photos,
  owner,
  isOwner,
  isAuthenticatedNonOwner,
  reviewCount,
  avgRating,
  compact = false,
}: SitDetailHeaderProps) => {
  const status = getSitStatusConfig(sitStatus);

  return (
    <>
      <Link
        to={isOwner ? "/sits" : "/search"}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        {isOwner ? "Retour à mes annonces" : "Retour à la recherche"}
      </Link>

      {/* Hero: Photos gallery avec lightbox — masqué en mode compact car déjà rendu par SitImmersiveContent */}
      {!compact && <SitHero photos={photos} city={owner?.city} priority />}
      {/* Title, location, dates, status */}
      <div className="flex items-start justify-between gap-4 mb-1">
        {!compact ? (
          <h1 className="font-heading text-2xl md:text-3xl font-bold">
            {sitTitle ? sanitizeUserTitle(sitTitle) : `Garde à ${owner?.city || "..."}`}
          </h1>
        ) : (
          /* Spacer pour pousser les actions à droite (titre déjà dans le hero immersif) */
          <div className="flex-1" />
        )}
        <div className="flex items-center gap-2 shrink-0">
          {isOwner && (
            <>
              {/* Modifier : seulement sur les statuts non terminaux.
                  Les statuts terminaux (completed/cancelled/expired/in_progress)
                  ne doivent plus pouvoir être édités côté propriétaire. */}
              {(sitStatus === "draft" ||
                sitStatus === "published" ||
                sitStatus === "confirmed") && (
                <Link to={`/sits/${sitId}/edit`}>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Pencil className="h-3.5 w-3.5" /> Modifier
                  </Button>
                </Link>
              )}
              <Link
                to={`/annonces/${sitId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline cursor-pointer flex items-center gap-1"
              >
                Voir comme un gardien <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </>
          )}
          {/* Signaler : déplacé dans un menu kebab pour ne pas concurrencer
              visuellement le titre/CTA. Garde la même action que l'ancien
              <ReportButton> inline. */}
          {isAuthenticatedNonOwner && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  aria-label="Plus d'actions sur cette annonce"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {/* On utilise onSelect=preventDefault pour que le DropdownMenu
                    ne se ferme pas avant l'ouverture du dialog interne du
                    ReportButton (qui gère son propre <Dialog>). */}
                <DropdownMenuItem
                  onSelect={(e) => e.preventDefault()}
                  className="p-0"
                >
                  <ReportButton
                    targetId={sitId}
                    targetType="sit"
                    className="w-full justify-start px-2 py-1.5 text-sm text-foreground hover:text-destructive"
                  />
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-6">
        {!compact && owner?.city && (
          <span className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4" aria-hidden="true" />
            {owner.city}
          </span>
        )}
        {!compact && (
          <span className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" aria-hidden="true" />
            <time dateTime={startDate || undefined}>{formatDate(startDate)}</time>
            <span aria-hidden="true">→</span>
            <span className="sr-only">jusqu'au</span>
            <time dateTime={endDate || undefined}>{formatDate(endDate)}</time>
            {flexibleDates && (
              <span className="text-xs bg-accent px-2 py-0.5 rounded-full ml-1">Flexible</span>
            )}
          </span>
        )}
        <span
          className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${status.className}`}
          aria-label={`Statut de l'annonce : ${status.label}`}
        >
          {status.label}
        </span>
        {avgRating && (
          <span className="flex items-center gap-1" aria-label={`Note moyenne ${avgRating} sur 5, ${reviewCount} avis`}>
            <Star className="h-3.5 w-3.5 text-secondary fill-secondary" aria-hidden="true" />
            {avgRating} ({reviewCount})
          </span>
        )}
      </div>

      {/* Owner card — masquée si on est soi-même le propriétaire (info redondante) */}
      {owner && !isOwner && (
        <div className="flex items-center gap-3 mb-6 p-4 bg-card rounded-xl border border-border">
          <Link to={`/gardiens/${owner.id}`}>
            {owner.avatar_url ? (
              <img
                src={owner.avatar_url}
                alt={`Photo de ${owner.first_name}`}
                loading="lazy"
                className="w-14 h-14 rounded-full object-cover hover:ring-2 hover:ring-primary/30 transition-all"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center font-heading text-lg font-bold">
                {owner.first_name?.charAt(0) || "?"}
              </div>
            )}
          </Link>
          <div className="flex-1 min-w-0">
            <Link
              to={`/gardiens/${owner.id}`}
              className="font-medium flex items-center gap-1.5 hover:underline"
            >
              {owner.first_name}
              {owner.identity_verified && <VerifiedBadge />}
              {owner.is_founder && (
                <span
                  className="text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary"
                  title="Membre fondateur"
                >
                  Fondateur
                </span>
              )}
            </Link>
            {/* Méta : ville + nombre de gardes accomplies (signal de fiabilité) */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              {owner.city && <span>{owner.city}</span>}
              {owner.city && typeof owner.completed_sits_count === "number" && owner.completed_sits_count > 0 && (
                <span aria-hidden="true">·</span>
              )}
              {typeof owner.completed_sits_count === "number" && owner.completed_sits_count > 0 && (
                <span>
                  {owner.completed_sits_count} garde{owner.completed_sits_count > 1 ? "s" : ""} accomplie{owner.completed_sits_count > 1 ? "s" : ""}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {owner.bio
                ? owner.bio
                : "Ce membre n'a pas encore renseigné de présentation."}
            </p>
          </div>
          <Link to={`/gardiens/${owner.id}`} className="shrink-0">
            <Button variant="outline" size="sm">
              Voir le profil
            </Button>
          </Link>
        </div>
      )}
    </>
  );
};

export default SitDetailHeader;
