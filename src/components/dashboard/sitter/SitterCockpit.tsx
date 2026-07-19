import { Link } from "react-router-dom";
import { Eye, Pencil } from "lucide-react";
import cockpitMorning from "@/assets/illustrations/sitter-cockpit-morning.jpg";


/**
 * Cockpit gardien, vague 1 sur 4, refonte accueil.
 *
 * Accueil calme : aucun bouton d'action fort, aucun CTA prioritaire.
 * La star de l'écran sera la carte rencontre (vague 2). Ici on pose
 * une couverture de carnet, une salutation adressée, un ancrage temporel
 * discret et les contrôles utilitaires (édition profil, disponibilité).
 */

const capitalize = (name: string) =>
  name ? name.charAt(0).toUpperCase() + name.slice(1).toLowerCase() : "";

const DAY_NAMES = [
  "dimanche",
  "lundi",
  "mardi",
  "mercredi",
  "jeudi",
  "vendredi",
  "samedi",
];

const momentAncrage = (now: Date = new Date()): string => {
  const day = DAY_NAMES[now.getDay()];
  const h = now.getHours();
  const period = h < 12 ? "matin" : h < 18 ? "après-midi" : "soir";
  return `ce ${day} ${period}`;
};

interface SitterCockpitProps {
  userId?: string;
  firstName?: string;
  avatarUrl?: string | null;
  isFounder?: boolean;
  isAvailable: boolean;
  onToggleAvailability: () => void;
  // Props conservées pour compatibilité de l'appelant, non utilisées dans
  // cette vague : l'accueil ne porte plus d'action prioritaire.
  nextGuard?: any | null;
  profileCompletion?: number;
  postalCode?: string | null;
  nearbyListings?: any[];
  competencesCount?: number;
  interestsCount?: number;
}

const SitterCockpit = ({
  userId,
  firstName,
  avatarUrl,
  isAvailable,
  onToggleAvailability,
}: SitterCockpitProps) => {
  const displayName = firstName ? capitalize(firstName) : "";
  const initial = displayName ? displayName.charAt(0) : "?";
  const ancrage = momentAncrage();

  return (
    <section
      aria-label="Espace gardien, accueil"
      className="px-4 sm:px-5 md:px-8 pt-4 sm:pt-6 pb-2"
    >
      {/* Couverture de carnet : papier hero-paper, lavis aquarelle discret,
          bord droit déchiré, ombre douce. Wrapper conservé de la vague 0. */}
      <div className="notebook-card relative p-[22px] sm:p-[34px] pr-[34px] sm:pr-[52px]">
        <div className="notebook-card-paper absolute inset-0" aria-hidden="true" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-50"
          style={{
            backgroundImage: [
              "radial-gradient(circle at 6% 96%, hsl(var(--secondary) / 0.14), transparent 46%)",
            ].join(", "),
          }}
        />
        {/* Aquarelle signature Guardiens : scène "matin du gardien",
            posée en douceur dans le coin bas droit de la couverture.
            Décorative (aria-hidden, alt vide), taille contenue, masque
            radial via .illustration-blend qui fond les bords dans le papier.
            Réduite à 150 px entre 768 px et 1100 px pour ne jamais croiser
            les pilules de contrôle ni le texte. */}
        <div
          aria-hidden="true"
          className="illustration-wrapper pointer-events-none absolute bottom-[-12px] right-[-16px] hidden sm:block w-[150px] h-[150px] min-[1100px]:w-[180px] min-[1100px]:h-[180px]"
        >
          <img
            src={cockpitMorning}
            alt=""
            width={180}
            height={180}
            loading="eager"
            decoding="async"
            className="illustration-blend animate-painted-reveal w-full h-full object-cover"
          />
        </div>


        <div className="relative flex items-start justify-between gap-[22px] flex-wrap">
          {/* Bloc gauche : avatar + salutation adressée */}
          <div className="flex items-center gap-[14px] min-w-0 flex-1">
            <Link
              to="/profile"
              aria-label="Modifier mon profil"
              className="shrink-0 flex items-center justify-center w-[46px] h-[46px] rounded-full overflow-hidden border border-border ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              style={{ backgroundColor: "hsl(var(--primary) / 0.12)" }}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <span className="font-heading font-semibold text-lg text-foreground/80">
                  {initial}
                </span>
              )}
            </Link>

            <div className="min-w-0">
              <p
                className="font-heading italic text-secondary"
                style={{ fontSize: "13px", lineHeight: 1.2 }}
              >
                Espace gardien
              </p>
              <h1
                className="font-heading font-semibold tracking-tight leading-tight text-foreground mt-[8px]"
                style={{ fontSize: "28px" }}
              >
                <span className="sm:hidden">
                  Bonjour{displayName ? `, ${displayName}` : ""}
                </span>
                <span
                  className="hidden sm:inline"
                  style={{ fontSize: "32px" }}
                >
                  Bonjour{displayName ? `, ${displayName}` : ""}
                </span>
              </h1>
              <p
                className="font-sans text-muted-foreground mt-[8px]"
                style={{ fontSize: "13px", lineHeight: 1.3 }}
              >
                {ancrage}
              </p>
            </div>
          </div>

          {/* Bloc droit : utilitaires en pilules + toggle disponibilité */}
          <div className="flex items-center gap-[8px] shrink-0 flex-wrap">
            <Link
              to="/profile"
              aria-label="Modifier mon profil"
              className="inline-flex items-center justify-center gap-1.5 rounded-full border border-border bg-card hover:bg-muted/40 text-foreground font-semibold px-[14px] transition-colors"
              style={{ minHeight: "44px", fontSize: "12px" }}
            >
              <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Modifier</span>
            </Link>
            {userId && (
              <Link
                to={`/gardiens/${userId}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Voir votre profil public (nouvel onglet)"
                className="inline-flex items-center justify-center gap-1.5 rounded-full border border-border bg-card hover:bg-muted/40 text-foreground font-semibold px-[14px] transition-colors"
                style={{ minHeight: "44px", fontSize: "12px" }}
              >
                <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Profil public</span>
              </Link>
            )}
            <button
              id="sitter-availability-toggle"
              role="switch"
              aria-checked={isAvailable}
              aria-label={
                isAvailable
                  ? "Vous êtes disponible, désactiver"
                  : "Vous êtes indisponible, activer"
              }
              onClick={onToggleAvailability}
              className={`group inline-flex items-center justify-center gap-2 rounded-full border font-semibold px-[14px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                isAvailable
                  ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
                  : "bg-muted text-foreground border-border hover:bg-muted/80"
              }`}
              style={{
                minHeight: "44px",
                fontSize: "12px",
                boxShadow: isAvailable ? "0 6px 14px rgba(44,109,80,0.24)" : undefined,
              }}
            >
              <span
                className={`relative flex h-2 w-2 ${isAvailable ? "" : "opacity-40"}`}
                aria-hidden="true"
              >
                {isAvailable && (
                  <span className="absolute inline-flex h-full w-full rounded-full bg-primary-foreground opacity-60 animate-ping motion-reduce:hidden" />
                )}
                <span
                  className={`relative inline-flex h-2 w-2 rounded-full ${
                    isAvailable ? "bg-primary-foreground" : "bg-muted-foreground"
                  }`}
                />
              </span>
              {isAvailable ? "Disponible" : "Indisponible"}
            </button>
          </div>
        </div>
        <div className="notebook-card-edge" aria-hidden="true" />
      </div>
    </section>
  );
};

export default SitterCockpit;
