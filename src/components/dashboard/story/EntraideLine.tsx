/**
 * Lot L4 : une ligne entraide sous le récit (emprunt A-18 de l'arène v2).
 * Besoin en cours de l'auteur d'abord, sinon les voisins prêts à aider.
 */
import { Link } from "react-router-dom";
import entraide from "@/assets/aquarelles/coup-de-main-448.webp";

interface Props {
  helpersCount: number;
  radiusKm: number;
  activeMission?: { id: string; title?: string | null; path?: string | null; pendingCount?: number | null } | null;
}

export function entraideLineCopy({ helpersCount, radiusKm, activeMission }: Props): { text: string; link: string; href: string } {
  if (activeMission) {
    const n = activeMission.pendingCount ?? 0;
    return {
      text: n > 0
        ? `${n} ${n > 1 ? "personnes proposent" : "personne propose"} de vous aider.`
        : "Votre demande de coup de main est en ligne.",
      link: n > 0 ? "Voir les propositions" : "Voir ma demande",
      href: activeMission.path || `/petites-missions/${activeMission.id}`,
    };
  }
  return {
    text: helpersCount > 0
      ? `Entre deux gardes, ${helpersCount} ${helpersCount > 1 ? "voisins prêts" : "voisin prêt"} à aider à moins de ${radiusKm} km.`
      : "Entre deux gardes, les voisins se rendent des coups de main.",
    link: "Demander un coup de main",
    href: "/petites-missions/creer",
  };
}

export default function EntraideLine(props: Props) {
  const c = entraideLineCopy(props);
  return (
    <div className="flex items-center gap-[12px] rounded-[16px] border border-border bg-card p-[14px]" data-testid="story-entraide-line">
      <img src={entraide} alt="" aria-hidden="true" width={48} height={48} loading="lazy" decoding="async" className="h-[48px] w-[48px] shrink-0 object-contain" />
      <div className="min-w-0">
        <p className="text-[15px] leading-snug text-foreground">{c.text}</p>
        <Link to={c.href} className="mt-[2px] inline-flex min-h-[44px] items-center text-[15px] font-semibold text-primary underline underline-offset-4">
          {c.link}
        </Link>
      </div>
    </div>
  );
}
