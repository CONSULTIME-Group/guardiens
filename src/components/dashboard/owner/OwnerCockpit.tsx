/**
 * Accueil propriétaire (lot D1, maquette validée le 27/09/2026).
 *
 * Carte papier (--hero-paper), rayon 20. Gouache owner-cockpit-home à
 * droite sur 210 px et toute la hauteur (mobile : en haut, pleine largeur,
 * 150 px), object-cover, JAMAIS atténuée : ni opacité réduite, ni voile.
 * À gauche : eyebrow, H1 « Bonjour, {prénom}. » ou « Bonsoir, {prénom}. »,
 * lien « Mon profil public », ligne de contexte, rangée « À faire ».
 */
import { Link } from "react-router-dom";
import ownerHome from "@/assets/illustrations/owner-cockpit-home.webp";
import DashEyebrow from "./DashEyebrow";

const capitalize = (name: string) =>
  name ? name.charAt(0).toUpperCase() + name.slice(1).toLowerCase() : "";

export interface CockpitTodo {
  key: string;
  label: string;
  to: string;
  count?: number;
}

/** Salutation selon l'heure : « Bonsoir » à partir de 18 h, sinon « Bonjour ». */
export const greetingForHour = (h: number): string => (h >= 18 || h < 5 ? "Bonsoir" : "Bonjour");

interface OwnerCockpitProps {
  userId?: string;
  firstName?: string;
  /** Ligne sous le titre (digest réel, sinon compte exact de proximité). */
  line?: string | null;
  /** Actions réelles en attente, 3 au plus. Vide : pas de rangée. */
  todos?: CockpitTodo[];
  /** Heure forcée (tests). */
  hour?: number;
  /** Conservés pour compatibilité des appels existants. */
  avatarUrl?: string | null;
  subtitle?: string;
  greeting?: string;
}

const OwnerCockpit = ({ userId, firstName, line, todos = [], hour, subtitle, greeting }: OwnerCockpitProps) => {
  const displayName = firstName ? capitalize(firstName) : "";
  const hello = greeting ?? greetingForHour(hour ?? new Date().getHours());
  const title = displayName ? `${hello}, ${displayName}.` : `${hello}.`;
  const contextLine = line ?? subtitle ?? null;
  const shown = todos.slice(0, 3);

  return (
    <section aria-label="Espace propriétaire, accueil" className="pt-4 sm:pt-6" data-testid="owner-cockpit">
      <div
        className="relative overflow-hidden flex flex-col-reverse md:flex-row"
        style={{ backgroundColor: "hsl(var(--hero-paper))", borderRadius: "20px" }}
      >
        <div className="min-w-0 flex-1 p-[22px] md:p-[34px]">
          <DashEyebrow>Espace propriétaire</DashEyebrow>
          <h1 className="font-heading text-foreground mt-[14px] text-[34px] md:text-[44px] font-semibold leading-[1.08]">
            {title}
          </h1>
          {userId && (
            <Link
              to={`/gardiens/${userId}?tab=proprio`}
              className="inline-block mt-[8px] text-muted-foreground text-[13px] underline underline-offset-4 hover:text-foreground"
            >
              Mon profil public
            </Link>
          )}
          {contextLine && (
            <p className="mt-[14px] text-foreground/85 text-[15px] leading-relaxed" data-testid="owner-cockpit-line">
              {contextLine}
            </p>
          )}
          {shown.length > 0 && (
            <div className="mt-[22px]" data-testid="owner-cockpit-todos">
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
            src={ownerHome}
            alt=""
            width={210}
            height={260}
            loading="eager"
            decoding="async"
            data-testid="owner-cockpit-gouache"
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </section>
  );
};

export default OwnerCockpit;
