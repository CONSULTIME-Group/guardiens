import { Link } from "react-router-dom";
import { useState } from "react";
import { storageImageUrl } from "@/lib/storageImage";
import NeedPaperPanel from "@/components/entraide/NeedPaperPanel";

/**
 * Carte « Près de chez vous » utilisée dans PublicMissionView et SmallMissionDetail.
 *
 * Lot E18 (25/10/2026, n° 35) : la phrase d'échange quitte les cartes liées,
 * elle s'affiche une seule fois, sur la fiche du besoin.
 * Lot E21 (25/10/2026, maquette validée par Jérémie) : une seule forme de
 * carte, en ligne (vignette 56 px, titre, lieu et date). La vignette est la
 * photo du besoin, sinon la gouache de sa catégorie sur papier. Le cœur, qui
 * se lisait comme un favori absent (n° 36), et la pastille catégorie sont retirés.
 */

interface Props {
  to: string;
  photo?: string | null;
  category?: string | null;
  title: string;
  description?: string | null;
  city?: string | null;
  timeAgo?: string | null;
}

const RelatedMissionCard = ({ to, photo, category, title, description, city, timeAgo }: Props) => {
  const [imgError, setImgError] = useState(false);
  const showImage = !!photo && !imgError;

  return (
    <Link to={to} className="group block h-full" data-testid="related-need-card">
      <div className="flex h-full items-center gap-3 rounded-card border border-border bg-card p-3 transition-colors group-hover:border-primary/50">
        {showImage ? (
          <img
            src={storageImageUrl(photo, { width: 112, height: 112 }) || photo!}
            alt=""
            width={56}
            height={56}
            loading="lazy"
            decoding="async"
            onError={() => setImgError(true)}
            className="h-14 w-14 shrink-0 rounded-field object-cover"
          />
        ) : (
          <NeedPaperPanel variant="thumb" category={category} title={title} description={description} />
        )}
        <div className="flex min-w-0 flex-col gap-0.5">
          <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug text-foreground group-hover:text-primary">
            {title}
          </h3>
          <p className="text-sm text-muted-foreground">
            {city || "France"}{timeAgo ? ` · ${timeAgo}` : ""}
          </p>
        </div>
      </div>
    </Link>
  );
};

export default RelatedMissionCard;
