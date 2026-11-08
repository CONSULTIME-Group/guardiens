/**
 * Lot ONB1 (point 5) : après « Ce qui va se passer », trois compléments
 * rapides du profil, seulement ceux qui manquent. Facultatifs, aucune
 * lecture de plus (données déjà chargées par la fiche). Lot PHOTO1 : les
 * photos du logement viennent en tête quand elles manquent.
 */
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { publishedProfileBoosts } from "@/lib/publishedProfileBoosts";
import type { HomePhotoGap } from "@/lib/homePhotos";

interface Props {
  avatarUrl: string | null | undefined;
  bio: string | null | undefined;
  petsCount: number;
  sitId: string;
  homePhotoGap?: HomePhotoGap;
}

const PublishedProfileBoosts = ({ avatarUrl, bio, petsCount, sitId, homePhotoGap }: Props) => {
  const items = publishedProfileBoosts({ avatarUrl, bio, petsCount, homePhotoGap });
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="published-profile-boosts" className="mb-8" data-testid="published-profile-boosts">
      <p id="published-profile-boosts" className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#8A5D3B]">
        <span aria-hidden="true" className="inline-block h-px w-[18px] bg-current" />
        Pour que les gardiens vous connaissent
      </p>
      <p className="mt-2 text-[15px] leading-relaxed text-foreground">
        {items.length > 1 ? "Ces ajouts prennent une minute chacun, quand vous voulez." : "Cet ajout prend une minute, quand vous voulez."}
      </p>
      <ul className="mt-3 space-y-2">
        {items.map((b) => (
          <li key={b.key}>
            <Link
              to={b.href}
              onClick={() => void trackEvent("published_profile_boost_clicked", { source: "/sits/:id", metadata: { item: b.key, sit_id: sitId } })}
              className="flex items-center gap-3 rounded-card border border-border bg-card p-3 hover:bg-muted/40"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold text-foreground">{b.title}</span>
                <span className="block text-sm text-muted-foreground">{b.text}</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default PublishedProfileBoosts;
