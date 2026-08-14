import { Link } from "react-router-dom";
import { CockpitGreeting } from "@/components/dashboard/CockpitGreeting";
import { Eye, Pencil } from "lucide-react";
import cockpitMorning from "@/assets/illustrations/sitter-cockpit-morning.webp";
import cockpitWaiting from "@/assets/illustrations/sitter-match-empty.webp";
import { avatarImageUrl } from "@/lib/storageImage";


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
  /** Salutation configurable, "Bonjour" par défaut. La branche nouveau gardien
   * passe "Bienvenue" pour marquer l'arrivée. */
  greeting?: string;
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
  greeting = "Bonjour",
}: SitterCockpitProps) => {

  const displayName = firstName ? capitalize(firstName) : "";
  const initial = displayName ? displayName.charAt(0) : "?";
  const ancrage = momentAncrage();

  return (
    <section
      aria-label="Espace gardien, accueil"
      className="pt-4 sm:pt-6 pb-2"
    >
      {/* Couverture de carnet : papier hero-paper, lavis aquarelle discret,
          bord droit déchiré, ombre douce. Wrapper conservé de la vague 0. */}
      <div className="notebook-card relative p-[18px] pr-[30px] sm:p-[34px] sm:pr-[52px]">
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
        {/* Aquarelle signature Guardiens, choisie selon l'état du gardien :
            scène "matin du gardien" quand la disponibilité est active, scène
            d'attente quand elle ne l'est pas. Décorative (aria-hidden, alt
            vide), masque radial via .illustration-blend qui fond les bords
            dans le papier. En mobile elle est ancrée en haut à droite pour
            occuper le vide existant, sans allonger la carte. */}
        <div
          aria-hidden="true"
          className="illustration-wrapper pointer-events-none absolute top-[-14px] right-[-10px] w-[100px] h-[100px] sm:top-auto sm:bottom-[-12px] sm:right-[-16px] sm:w-[150px] sm:h-[150px] min-[1100px]:w-[180px] min-[1100px]:h-[180px]"
        >
          <img
            src={isAvailable ? cockpitMorning : cockpitWaiting}
            alt=""
            width={180}
            height={180}
            loading="eager"
            decoding="async"
            className="illustration-blend animate-painted-reveal w-full h-full object-cover"
          />
        </div>



        <div className="relative flex flex-col sm:flex-row sm:items-start sm:justify-between gap-[10px] sm:gap-[22px]">
          <div className="min-w-0 flex-1">
            {/* 1. Avatar dans le flux, avec l'eyebrow, côte à côte */}
            <div className="flex items-center gap-[12px] min-w-0 pr-[56px] sm:pr-0">
              <Link
                to="/profile"
                aria-label="Modifier mon profil"
                className="shrink-0 flex items-center justify-center w-[48px] h-[48px] rounded-full overflow-hidden border border-border ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                style={{ backgroundColor: "hsl(var(--primary) / 0.12)" }}
              >
                {avatarUrl ? (
                  <img src={avatarImageUrl(avatarUrl, 48)} alt="" className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <span className="font-heading font-semibold text-lg text-foreground/80">
                    {initial}
                  </span>
                )}
              </Link>
              <p
                className="font-heading italic text-secondary min-w-0 truncate"
                style={{ fontSize: "13px", lineHeight: 1.2 }}
              >
                Espace gardien
              </p>
            </div>

            {/* 2. Salutation, pleine largeur */}
            <CockpitGreeting greeting={greeting} displayName={displayName} className="mt-[10px]" />

            {/* 3. Horodatage */}
            <p
              className="font-sans text-muted-foreground mt-[6px]"
              style={{ fontSize: "13px", lineHeight: 1.3 }}
            >
              {ancrage}
            </p>
          </div>

          {/* Rangée d'actions, sous le texte en mobile, à droite au dessus de 768 px */}
          <div className="flex items-center gap-[8px] sm:shrink-0 flex-wrap">
            <Link
              to="/profile"
              aria-label="Modifier mon profil"
              className="inline-flex items-center justify-center gap-1.5 rounded-full border border-border bg-card hover:bg-muted/40 text-foreground font-semibold px-[14px] transition-colors"
              style={{ minHeight: "44px", fontSize: "12px" }}
            >
              <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
              Modifier
            </Link>
            {userId && (
              <Link
                to={`/gardiens/${userId}`}
                aria-label="Voir votre profil public"
                className="inline-flex items-center justify-center gap-1.5 rounded-full border border-border bg-card hover:bg-muted/40 text-foreground font-semibold px-[14px] transition-colors"
                style={{ minHeight: "44px", fontSize: "12px" }}
              >
                <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                Profil public
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
