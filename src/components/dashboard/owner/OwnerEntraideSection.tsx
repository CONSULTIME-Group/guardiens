/**
 * OwnerEntraideSection (vague 11) — L'entraide côté propriétaire.
 *
 * Invitation calme, symétrique au sitter mais orientée demandeur :
 *  - si l'utilisateur a déjà des missions actives, on met la première en carte
 *    (lien vers son suivi) ;
 *  - sinon on affiche une invitation avec le vrai signal local des personnes
 *    prêtes à aider s'il existe, et un CTA secondaire "Demander un coup de main".
 */
import { Link } from "react-router-dom";
import { SectionHeader } from "../sitter/SitterMatchSection";
import type { SmallMission } from "./types";

interface OwnerEntraideSectionProps {
  myMissions: SmallMission[];
  nearbyHelpersCount?: number | null;
}

const OwnerEntraideSection = ({
  myMissions,
  nearbyHelpersCount,
}: OwnerEntraideSectionProps) => {
  const activeMission = myMissions.find((m) => m.status !== "completed") ?? null;

  const helpersSignal =
    nearbyHelpersCount && nearbyHelpersCount > 0
      ? `${nearbyHelpersCount} personne${nearbyHelpersCount > 1 ? "s" : ""} prête${nearbyHelpersCount > 1 ? "s" : ""} à donner un coup de main autour de vous.`
      : undefined;

  return (
    <section aria-label="L'entraide" className="px-4 sm:px-5 md:px-8">
      <SectionHeader
        eyebrow="L'entraide, tout près"
        title="Un coup de main à demander."
        subtitle={helpersSignal}
      />

      {activeMission ? (
        <>
          <article
            className="bg-card border border-border flex items-center flex-wrap"
            style={{
              borderRadius: "16px",
              padding: "22px",
              gap: "14px",
              boxShadow:
                "0 1px 2px rgba(29,27,22,0.04), 0 8px 24px rgba(29,27,22,0.05)",
            }}
          >
            <div className="min-w-0 flex-1">
              <h3
                className="font-heading text-foreground"
                style={{ fontSize: "16px", fontWeight: 600, lineHeight: 1.3 }}
              >
                {activeMission.title || "Votre demande d'entraide"}
              </h3>
              {activeMission.city && (
                <p
                  className="text-muted-foreground mt-[8px]"
                  style={{ fontSize: "13px" }}
                >
                  {activeMission.city}
                </p>
              )}
            </div>
            <Link
              to={`/petites-missions/${activeMission.id}`}
              className="inline-flex items-center justify-center rounded-full border border-border bg-card text-foreground hover:bg-muted/40 transition-colors"
              style={{
                minHeight: "44px",
                padding: "10px 18px",
                fontSize: "14px",
                fontWeight: 700,
              }}
            >
              Suivre ma demande
            </Link>
          </article>
          <div className="mt-[14px]">
            <Link
              to="/petites-missions"
              className="text-primary hover:underline underline-offset-4"
              style={{ fontSize: "13px", fontWeight: 700 }}
            >
              Toutes les missions d'entraide
            </Link>
          </div>
        </>
      ) : (
        <div
          className="text-center bg-card"
          style={{
            border: "1px dashed hsl(var(--border))",
            borderRadius: "16px",
            padding: "34px 22px",
          }}
        >
          <h3
            className="font-heading text-foreground"
            style={{ fontSize: "18px", fontWeight: 600, lineHeight: 1.3 }}
          >
            Besoin d'un petit coup de main ?
          </h3>
          <p
            className="font-sans text-muted-foreground mx-auto mt-[14px]"
            style={{ fontSize: "13px", maxWidth: "44ch", lineHeight: 1.5 }}
          >
            {helpersSignal ??
              "Nourrir un chat le temps d'un week-end, sortir un chien, arroser les plantes : demandez, quelqu'un du coin répondra."}
          </p>
          <div className="mt-[22px] flex flex-wrap items-center justify-center gap-[14px]">
            <Link
              to="/petites-missions/creer"
              className="inline-flex items-center justify-center rounded-full border border-border bg-card text-foreground hover:bg-muted/40 transition-colors"
              style={{
                minHeight: "44px",
                padding: "10px 18px",
                fontSize: "14px",
                fontWeight: 700,
              }}
            >
              Demander un coup de main
            </Link>
            <Link
              to="/petites-missions"
              className="text-primary hover:underline underline-offset-4"
              style={{ fontSize: "13px", fontWeight: 700 }}
            >
              Toutes les missions d'entraide
            </Link>
          </div>
        </div>
      )}
    </section>
  );
};

export default OwnerEntraideSection;
