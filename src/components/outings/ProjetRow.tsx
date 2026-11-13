import { Link } from "react-router-dom";
import { projetMetaLine, projetNatureLabel } from "@/lib/projets";
import { storageImageUrl } from "@/lib/storageImage";
import spotJardin from "@/assets/missions/spot-jardin-160.webp";

export interface ProjetRowItem {
  id: string;
  slug?: string | null;
  title: string;
  city?: string | null;
  photos?: string[] | null;
  cover_photo_url?: string | null;
  nature_projet?: string | null;
  date_needed?: string | null;
  end_date?: string | null;
  duration_estimate?: string | null;
  mois_accueil?: string[] | null;
  distance?: number | null;
}

/**
 * Lot SORT12 : un chantier dans la liste de son onglet, même carte que les
 * besoins d'entraide et les sorties (vignette, étiquette, titre, jour et lieu).
 */
const ProjetRow = ({ projet }: { projet: ProjetRowItem }) => {
  const photo = projet.cover_photo_url || projet.photos?.find(Boolean) || null;
  const nature = projetNatureLabel(projet.nature_projet) || "Chantier";
  const meta = projetMetaLine(projet.date_needed, projet.end_date, projet.duration_estimate, projet.mois_accueil);
  const km = typeof projet.distance === "number" ? (projet.distance < 1 ? "à moins de 1 km" : `à ${Math.round(projet.distance)} km`) : null;
  const place = [projet.city, km].filter(Boolean).join(", ");
  return (
    <article className="relative flex gap-3.5 rounded-2xl border border-border bg-card p-3.5" data-testid="projet-row">
      {photo ? (
        <img src={storageImageUrl(photo, { width: 168, height: 168 })} alt="" width={84} height={84} loading="lazy" decoding="async" className="h-[84px] w-[84px] shrink-0 rounded-xl object-cover" />
      ) : (
        <img src={spotJardin} alt="" width={84} height={84} loading="lazy" decoding="async" className="h-[84px] w-[84px] shrink-0 object-contain" />
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="self-start rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-primary" data-testid="projet-nature-badge">
          {nature}
        </span>
        <h3 className="font-body text-[17px] font-semibold leading-snug">
          <Link to={`/projets/${projet.slug || projet.id}`} className="text-foreground no-underline hover:underline after:absolute after:inset-0">
            {projet.title}
          </Link>
        </h3>
        {(meta || place) && <p className="text-sm leading-snug text-muted-foreground">{[meta, place].filter(Boolean).join(" · ")}</p>}
      </div>
    </article>
  );
};

export default ProjetRow;
