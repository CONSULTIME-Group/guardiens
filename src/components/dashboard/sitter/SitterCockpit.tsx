/**
 * Accueil gardien (lot D2, maquette validée), sur le modèle d'OwnerCockpit.
 *
 * Carte papier (--hero-paper), rayon 20. Gouache à droite sur 210 px et
 * toute la hauteur (mobile : en haut, pleine largeur, 150 px), object-cover,
 * PLEINE : ni masque, ni opacité réduite, ni voile, ni lavis.
 * sitter-cockpit-morning si disponible, sitter-match-empty sinon.
 */
import { Link } from "react-router-dom";
import cockpitMorning from "@/assets/illustrations/sitter-cockpit-morning.webp";
import cockpitWaiting from "@/assets/illustrations/sitter-match-empty.webp";
import DashEyebrow from "../owner/DashEyebrow";
import { greetingForHour, type CockpitTodo } from "../owner/OwnerCockpit";

const capitalize = (name: string) =>
  name ? name.charAt(0).toUpperCase() + name.slice(1).toLowerCase() : "";

/** Réglage de disponibilité existant : section « profil » de /profile. */
export const AVAILABILITY_SETTINGS_PATH = "/profile?section=profil";

export interface SitterCockpitLine {
  text: string;
  link?: { label: string; to: string };
}

interface SitterCockpitProps {
  firstName?: string;
  isAvailable: boolean;
  /** Salutation forcée (branche nouveau gardien : « Bienvenue »). */
  greeting?: string;
  line?: SitterCockpitLine | null;
  todos?: CockpitTodo[];
  /** Heure forcée (tests). */
  hour?: number;
}

const SitterCockpit = ({ firstName, isAvailable, greeting, line, todos = [], hour }: SitterCockpitProps) => {
  const displayName = firstName ? capitalize(firstName) : "";
  const hello = greeting ?? greetingForHour(hour ?? new Date().getHours());
  const title = displayName ? `${hello}, ${displayName}.` : `${hello}.`;
  const shown = todos.slice(0, 3);

  return (
    <section aria-label="Espace gardien, accueil" className="pt-4 sm:pt-6" data-testid="sitter-cockpit">
      <div
        className="relative overflow-hidden flex flex-col-reverse md:flex-row"
        style={{ backgroundColor: "hsl(var(--hero-paper))", borderRadius: "20px" }}
      >
        <div className="min-w-0 flex-1 p-[22px] md:p-[34px]">
          <DashEyebrow>Espace gardien</DashEyebrow>
          <h1 className="font-heading text-foreground mt-[14px] text-[34px] md:text-[44px] font-semibold leading-[1.08]">
            {title}
          </h1>

          <div className="mt-[14px] flex flex-wrap items-center gap-[14px]" data-testid="sitter-cockpit-availability">
            <span
              className={`inline-flex items-center gap-[8px] rounded-full px-[12px] py-[4px] text-[13px] font-semibold ${
                isAvailable ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              }`}
            >
              {isAvailable && <span aria-hidden="true" className="inline-block h-[8px] w-[8px] rounded-full bg-primary" />}
              {isAvailable ? "Disponible" : "Indisponible"}
            </span>
            <Link
              to={AVAILABILITY_SETTINGS_PATH}
              className="text-muted-foreground text-[13px] underline underline-offset-4 hover:text-foreground"
            >
              Modifier
            </Link>
          </div>

          {line && (
            <p className="mt-[14px] text-foreground/85 text-[15px] leading-relaxed" data-testid="sitter-cockpit-line">
              {line.text}
              {line.link && (
                <>
                  {" "}
                  <Link to={line.link.to} className="font-semibold text-primary hover:underline underline-offset-4">
                    {line.link.label}
                  </Link>
                </>
              )}
            </p>
          )}

          {shown.length > 0 && (
            <div className="mt-[22px]" data-testid="sitter-cockpit-todos">
              <p className="text-muted-foreground uppercase text-[11px] font-bold tracking-[0.16em]">À faire</p>
              <ul className="mt-[8px] flex flex-wrap gap-[8px]">
                {shown.map((t) => (
                  <li key={t.key}>
                    <Link
                      to={t.to}
                      className="inline-flex items-center gap-[8px] rounded-full border border-border bg-card px-[14px] min-h-[40px] text-[13px] font-semibold text-foreground hover:bg-muted/40 transition-colors"
                    >
                      {t.label}
                      {typeof t.count === "number" && t.count > 0 && (
                        <span className="rounded-full bg-primary text-primary-foreground px-[7px] py-[1px] text-[11px] font-bold tabular-nums">
                          {t.count}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="shrink-0 w-full h-[150px] md:w-[210px] md:h-auto md:self-stretch">
          <img
            src={isAvailable ? cockpitMorning : cockpitWaiting}
            alt=""
            width={210}
            height={260}
            loading="eager"
            decoding="async"
            data-testid="sitter-cockpit-gouache"
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </section>
  );
};

export default SitterCockpit;
