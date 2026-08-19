import { Link } from "react-router-dom";
import { CockpitGreeting } from "@/components/dashboard/CockpitGreeting";
import cockpitMorning from "@/assets/illustrations/sitter-cockpit-morning.webp";
import cockpitWaiting from "@/assets/illustrations/sitter-match-empty.webp";
import { avatarImageUrl } from "@/lib/storageImage";


/**
 * Cockpit gardien, vague 1 sur 4, refonte accueil.
 *
 * Accueil calme : aucun bouton d'action fort, aucun CTA prioritaire.
 * La star de l'écran sera la carte rencontre (vague 2). Ici on pose
 * une couverture de carnet, une salutation adressée et un ancrage temporel
 * discret. L'édition du profil, le profil public et la disponibilité vivent
 * dans /profile et le menu profil (redondances retirées, lot navigation).
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
  firstName?: string;
  avatarUrl?: string | null;
  isFounder?: boolean;
  isAvailable: boolean;
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
  firstName,
  avatarUrl,
  isAvailable,
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
        </div>
        <div className="notebook-card-edge" aria-hidden="true" />
      </div>
    </section>
  );
};

export default SitterCockpit;
