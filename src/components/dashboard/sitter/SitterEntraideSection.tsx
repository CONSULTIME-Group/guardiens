/**
 * SitterEntraideSection — invitation calme à l'entraide.
 * Utilisée en flux confirmé ET nouveau gardien, avec en-tête paramétrable
 * plutôt que dupliquée. Une seule mission mise en avant.
 */
import { Link } from "react-router-dom";
import entraideEmptyIllustration from "@/assets/illustrations/sitter-entraide-empty.webp";
import { SectionHeader } from "./SitterMatchSection";

interface NearbyMission {
  id: string;
  title?: string | null;
  city?: string | null;
  date_needed?: string | null;
}

interface SitterEntraideSectionProps {
  firstNearbyMission?: NearbyMission | null;
  eyebrow: string;
  title: string;
  subtitle?: string;
}

const missionDateFmt = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
});
const formatMissionDate = (d: string | null | undefined): string | null => {
  if (!d) return null;
  try {
    return missionDateFmt.format(new Date(d));
  } catch {
    return null;
  }
};

const SitterEntraideSection = ({
  firstNearbyMission,
  eyebrow,
  title,
  subtitle,
}: SitterEntraideSectionProps) => {
  return (
    <section aria-label={title}>
      <SectionHeader eyebrow={eyebrow} title={title} subtitle={subtitle} />
      {firstNearbyMission ? (
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
                {firstNearbyMission.title ?? "Une aide à proposer"}
              </h3>
              {(() => {
                const meta = [
                  firstNearbyMission.city,
                  formatMissionDate(firstNearbyMission.date_needed),
                ]
                  .filter(Boolean)
                  .join(" · ");
                return meta ? (
                  <p
                    className="text-muted-foreground mt-[8px]"
                    style={{ fontSize: "13px", lineHeight: 1.4 }}
                  >
                    {meta}
                  </p>
                ) : null;
              })()}
            </div>
            <Link
              to={`/petites-missions/${firstNearbyMission.id}`}
              className="inline-flex items-center justify-center rounded-full border border-border bg-card text-foreground hover:bg-muted/40 transition-colors"
              style={{
                minHeight: "44px",
                padding: "10px 18px",
                fontSize: "14px",
                fontWeight: 700,
              }}
            >
              Proposer mon aide
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
          <div
            aria-hidden="true"
            className="illustration-wrapper mx-auto"
            style={{ width: 140, height: 140 }}
          >
            <img
              src={entraideEmptyIllustration}
              alt=""
              width={140}
              height={140}
              loading="lazy"
              decoding="async"
              className="illustration-blend animate-painted-reveal w-full h-full object-cover"
            />
          </div>
          <h3
            className="font-heading text-foreground mt-[14px]"
            style={{ fontSize: "20px", fontWeight: 600 }}
          >
            Personne n'a besoin d'aide pour l'instant, tout va bien.
          </h3>
          <p
            className="font-sans text-muted-foreground mx-auto mt-[14px]"
            style={{ fontSize: "13px", maxWidth: "42ch", lineHeight: 1.5 }}
          >
            Revenez plus tard, ou proposez vous-même un coup de main autour de vous.
          </p>
          <div className="mt-[22px]">
            <Link
              to="/petites-missions"
              className="text-primary hover:underline underline-offset-4"
              style={{ fontSize: "13px", fontWeight: 700 }}
            >
              Voir toutes les missions
            </Link>
          </div>
        </div>
      )}
    </section>
  );
};

export default SitterEntraideSection;
