/**
 * Phrase du pouls en fin de colonne principale (lots D1 et D2).
 * Mêmes données que CommunityPulseBanner (useCommunityPulse).
 */
import { Link } from "react-router-dom";
import { useCommunityPulse } from "@/hooks/useCommunityPulse";

export default function CommunityPulseLine({ testId = "owner-pulse-line" }: { testId?: string }) {
  const { data: pulse } = useCommunityPulse();
  if (!pulse || pulse.maisonsGardees <= 0) return null;
  return (
    <p className="font-heading italic text-foreground/85 text-[17px] md:text-[19px] leading-relaxed" data-testid={testId}>
      Guardiens, c'est déjà {pulse.maisonsGardees.toLocaleString("fr-FR")} maisons gardées et {pulse.animauxAccompagnes.toLocaleString("fr-FR")} animaux accompagnés.{" "}
      <Link to="/actualites/inventaire-guardiens-france" className="not-italic font-sans text-[13px] font-semibold text-primary hover:underline underline-offset-4">
        Voir l'inventaire
      </Link>
    </p>
  );
}
