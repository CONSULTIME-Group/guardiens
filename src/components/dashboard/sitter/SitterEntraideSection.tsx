/**
 * SitterEntraideSection (vague 20) — L'entraide, bidimensionnelle.
 *
 * Composant partagé entre dashboards gardien ET propriétaire. Chacun peut
 * DONNER un coup de main (première mission proche) et EN DEMANDER (sa
 * mission active ou une invitation à en publier).
 *
 * Aucun CTA primaire : la star de l'écran garde le seul primaire.
 */
import { Link } from "react-router-dom";
import { SectionHeader } from "./SitterMatchSection";

interface NearbyMission {
  id: string;
  title?: string | null;
  city?: string | null;
  date_needed?: string | null;
}

interface MyMission {
  id: string;
  title?: string | null;
  city?: string | null;
  status?: string;
}

interface SitterEntraideSectionProps {
  /** Première mission proche que l'utilisateur peut aider (volet DONNER). */
  firstNearbyMission?: NearbyMission | null;
  /** Mission active de l'utilisateur, s'il en a une (volet DEMANDER). */
  myActiveMission?: MyMission | null;
  /** Nombre de personnes prêtes à aider autour (signal pour le sous-titre). */
  nearbyHelpersCount?: number | null;
  /** Rayon typique en km, pour affiner le signal. Défaut 30. */
  nearbyHelpersRadiusKm?: number;
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

const statusLabel = (status?: string | null): string | null => {
  if (!status) return null;
  const map: Record<string, string> = {
    open: "Ouverte aux réponses",
    in_progress: "En cours",
    completed: "Terminée",
    closed: "Fermée",
    cancelled: "Annulée",
  };
  return map[status] ?? null;
};

/** Petit chapeau de volet, uniformisé sur les deux cartes. */
const VoletLabel = ({ children }: { children: React.ReactNode }) => (
  <p
    className="uppercase text-secondary"
    style={{
      fontSize: "11px",
      fontWeight: 700,
      letterSpacing: "0.16em",
      marginBottom: "8px",
    }}
  >
    {children}
  </p>
);

const SecondaryLink = ({ to, children }: { to: string; children: React.ReactNode }) => (
  <Link
    to={to}
    className="inline-flex items-center justify-center rounded-full border border-border bg-card text-foreground hover:bg-muted/40 transition-colors shrink-0"
    style={{
      minHeight: "44px",
      padding: "10px 18px",
      fontSize: "14px",
      fontWeight: 700,
    }}
  >
    {children}
  </Link>
);

const CardShell = ({ children }: { children: React.ReactNode }) => (
  <article
    className="bg-card border border-border"
    style={{
      borderRadius: "16px",
      padding: "22px",
      boxShadow:
        "0 1px 2px rgba(29,27,22,0.04), 0 8px 24px rgba(29,27,22,0.05)",
    }}
  >
    {children}
  </article>
);

const SitterEntraideSection = ({
  firstNearbyMission,
  myActiveMission,
  nearbyHelpersCount,
  nearbyHelpersRadiusKm = 30,
}: SitterEntraideSectionProps) => {
  const helpersSignal =
    nearbyHelpersCount && nearbyHelpersCount > 0
      ? `${nearbyHelpersCount} personne${nearbyHelpersCount > 1 ? "s" : ""} prête${nearbyHelpersCount > 1 ? "s" : ""} à aider à moins de ${nearbyHelpersRadiusKm} km.`
      : undefined;

  return (
    <section aria-label="L'entraide, tout près">
      <SectionHeader
        eyebrow="L'entraide, tout près"
        title="Donner un coup de main, en demander un."
        subtitle={helpersSignal}
      />

      {/* Deux volets empilés, gap 14px, gabarit jumeau */}
      <div className="flex flex-col" style={{ gap: "14px" }}>
        {/* ── DONNER ── */}
        {firstNearbyMission ? (
          <CardShell>
            <VoletLabel>Donner</VoletLabel>
            <div className="flex items-center flex-wrap" style={{ gap: "14px" }}>
              <div className="min-w-0 flex-1">
                <h3
                  className="font-heading text-foreground"
                  style={{ fontSize: "16px", fontWeight: 600, lineHeight: 1.3 }}
                >
                  {firstNearbyMission.title || "Une aide à proposer"}
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
                      className="text-muted-foreground"
                      style={{ fontSize: "13px", lineHeight: 1.4, marginTop: "8px" }}
                    >
                      {meta}
                    </p>
                  ) : null;
                })()}
              </div>
              <SecondaryLink to={`/petites-missions/${firstNearbyMission.id}`}>
                Proposer mon aide
              </SecondaryLink>
            </div>
          </CardShell>
        ) : (
          <CardShell>
            <VoletLabel>Donner</VoletLabel>
            <p
              className="font-heading italic text-muted-foreground"
              style={{ fontSize: "13.5px", lineHeight: 1.5 }}
            >
              Personne n'a besoin d'aide pour l'instant.
            </p>
          </CardShell>
        )}

        {/* ── DEMANDER ── */}
        {myActiveMission ? (
          <CardShell>
            <VoletLabel>Demander</VoletLabel>
            <div className="flex items-center flex-wrap" style={{ gap: "14px" }}>
              <div className="min-w-0 flex-1">
                <h3
                  className="font-heading text-foreground"
                  style={{ fontSize: "16px", fontWeight: 600, lineHeight: 1.3 }}
                >
                  {myActiveMission.title || "Votre demande d'entraide"}
                </h3>
                {(() => {
                  const meta = [myActiveMission.city, statusLabel(myActiveMission.status)]
                    .filter(Boolean)
                    .join(" · ");
                  return meta ? (
                    <p
                      className="text-muted-foreground"
                      style={{ fontSize: "13px", lineHeight: 1.4, marginTop: "8px" }}
                    >
                      {meta}
                    </p>
                  ) : null;
                })()}
              </div>
              <SecondaryLink to={`/petites-missions/${myActiveMission.id}`}>
                Voir les réponses
              </SecondaryLink>
            </div>
          </CardShell>
        ) : (
          <CardShell>
            <VoletLabel>Demander</VoletLabel>
            <div className="flex items-center flex-wrap" style={{ gap: "14px" }}>
              <p
                className="text-foreground min-w-0 flex-1"
                style={{ fontSize: "13.5px", lineHeight: 1.5 }}
              >
                Arrosage, courrier, présence : publiez une petite mission, les gens du coin sont prévenus aussitôt.
              </p>
              <SecondaryLink to="/petites-missions/creer">
                Demander un coup de main
              </SecondaryLink>
            </div>
          </CardShell>
        )}
      </div>

      {/* Lien unique en bas */}
      <div style={{ marginTop: "14px" }}>
        <Link
          to="/petites-missions"
          className="text-primary hover:underline underline-offset-4"
          style={{ fontSize: "13px", fontWeight: 700 }}
        >
          Toutes les missions d'entraide
        </Link>
      </div>
    </section>
  );
};

export default SitterEntraideSection;
