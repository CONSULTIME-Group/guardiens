/**
 * Lot L4 (repris de PHOTO1) : carte « Montrez où votre gardien va vivre »
 * sur l'accueil téléphone, tant qu'une annonce existe et que ses photos ne
 * montrent pas le logement. Sous trois photos, aucune lecture ; à partir de
 * trois, une lecture des relevés (owner_gallery_insights), montée sous le récit.
 */
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { fetchHomePhotoInsights, homePhotoGap, type HomePhotoGap } from "@/lib/homePhotos";
import { PUBLISH_PHOTO_PROMPT_ADD_LABEL, PUBLISH_PHOTO_PROMPT_HREF, PUBLISH_PHOTO_PROMPT_TIPS } from "@/lib/publishPhotoPrompt";

interface Props {
  userId?: string;
  photos: readonly string[];
}

export const HOME_PHOTO_CARD_TITLE = "Montrez où votre gardien va vivre";

export function homePhotoCardLead(gap: HomePhotoGap, count: number): string | null {
  switch (gap) {
    case "no_photo":
      return "Les gardiens choisissent une garde en regardant la maison. Une photo de l'extérieur et de la pièce de vie leur permet de se projeter.";
    case "few":
      return `Votre annonce montre ${count === 1 ? "une photo" : "deux photos"}. Les gardiens se projettent mieux avec la maison, la pièce de vie et la chambre.`;
    case "no_home":
      return "Vos photos montrent surtout les alentours ou vos animaux. Ajoutez la maison, de l'extérieur ou la pièce de vie : c'est là que votre gardien vivra.";
    default:
      return null;
  }
}

export default function HomePhotoCard({ userId, photos }: Props) {
  const list = photos.filter((u) => typeof u === "string" && u.trim() !== "");
  const quick = homePhotoGap(list, []);
  const needsRead = quick === "none" && !!userId;
  const { data: insights } = useQuery({
    queryKey: ["home-photo-insights", userId, list.join("|")],
    enabled: needsRead,
    staleTime: 10 * 60_000,
    queryFn: () => fetchHomePhotoInsights(userId!, list),
  });
  const gap: HomePhotoGap = needsRead ? (insights ? homePhotoGap(list, insights) : "none") : quick;
  const lead = homePhotoCardLead(gap, list.length);
  if (!lead) return null;

  return (
    <section className="rounded-[16px] border border-border bg-card p-[16px]" data-testid="story-photo-card" data-gap={gap}>
      <h2 className="font-heading text-[19px] font-semibold leading-snug text-foreground">{HOME_PHOTO_CARD_TITLE}</h2>
      <p className="mt-[6px] text-[15px] leading-snug text-foreground/85">{lead}</p>
      <p className="mt-[6px] text-[14px] leading-snug text-foreground/70">{PUBLISH_PHOTO_PROMPT_TIPS}</p>
      <Link
        to={PUBLISH_PHOTO_PROMPT_HREF}
        className="mt-[12px] inline-flex min-h-[44px] items-center justify-center rounded-full border-[1.5px] border-foreground/80 px-[18px] text-[15px] font-semibold text-foreground"
      >
        {PUBLISH_PHOTO_PROMPT_ADD_LABEL}
      </Link>
    </section>
  );
}
