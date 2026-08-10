/**
 * Cockpit propriétaire (vague 10, refonte accueil).
 *
 * Miroir strict de SitterCockpit : couverture de carnet notebook-card,
 * papier hero-paper, bord droit déchiré, lavis discret, aquarelle
 * signature dans le coin bas droit. Différences avec le cockpit gardien :
 *  - kicker Playfair italique "Espace propriétaire" en terracotta ;
 *  - avatar rond 46 px sur fond terracotta doux ;
 *  - une seule pilule "Mon profil public" (pas de toggle disponibilité,
 *    pas de bouton Publier : le primaire vit dans la star).
 */
import { Link } from "react-router-dom";
import { CockpitGreeting } from "@/components/dashboard/CockpitGreeting";
import { Eye } from "lucide-react";
import ownerHome from "@/assets/illustrations/owner-cockpit-home.webp";

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

interface OwnerCockpitProps {
  userId?: string;
  firstName?: string;
  avatarUrl?: string | null;
  subtitle?: string;
  greeting?: string;
}

const OwnerCockpit = ({
  userId,
  firstName,
  avatarUrl,
  subtitle,
  greeting = "Bonjour",
}: OwnerCockpitProps) => {
  const displayName = firstName ? capitalize(firstName) : "";
  const initial = displayName ? displayName.charAt(0) : "?";
  const ancrage = momentAncrage();

  return (
    <section
      aria-label="Espace propriétaire, accueil"
      className="pt-4 sm:pt-6 pb-2"
    >
      <div className="notebook-card relative p-[14px] pr-[22px] sm:p-[34px] sm:pr-[52px]">
        <div className="notebook-card-paper absolute inset-0" aria-hidden="true" />
        {/* Lavis discret terracotta, coin bas gauche */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-50"
          style={{
            backgroundImage: [
              "radial-gradient(circle at 6% 96%, hsl(var(--secondary) / 0.14), transparent 46%)",
            ].join(", "),
          }}
        />
        {/* Aquarelle signature, fondue à droite, jamais au dessus du texte */}
        <div
          aria-hidden="true"
          className="illustration-wrapper pointer-events-none absolute top-[-10px] right-[-14px] w-[104px] h-[104px] sm:top-auto sm:bottom-[-12px] sm:right-[-16px] sm:w-[150px] sm:h-[150px] min-[1100px]:w-[180px] min-[1100px]:h-[180px]"
        >
          <img
            src={ownerHome}
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
                to="/owner-profile"
                aria-label="Modifier mon profil"
                className="shrink-0 flex items-center justify-center w-[48px] h-[48px] rounded-full overflow-hidden border border-border ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                style={{ backgroundColor: "hsl(var(--secondary) / 0.12)" }}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
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
                Espace propriétaire
              </p>
            </div>

            {/* 2. Salutation, une seule ligne, taille fluide bornée */}
            <CockpitGreeting greeting={greeting} displayName={displayName} className="mt-[10px]" />

            {/* 3. Horodatage */}
            <p
              className="font-sans text-muted-foreground mt-[6px]"
              style={{ fontSize: "13px", lineHeight: 1.3 }}
            >
              {ancrage}
            </p>

            {/* 4. Phrase de contexte, pleine largeur */}
            {subtitle && (
              <p
                className="font-sans text-foreground/80 mt-[6px]"
                style={{ fontSize: "13.5px", lineHeight: 1.4 }}
              >
                {subtitle}
              </p>
            )}
          </div>

          {/* 5. Bouton, libellé complet, aligné à gauche sous 768 px */}
          <div className="flex items-center gap-[8px] sm:shrink-0 flex-wrap">
            {userId && (
              <Link
                to={`/gardiens/${userId}?tab=proprio`}
                aria-label="Voir mon profil public"
                className="inline-flex items-center justify-center gap-1.5 rounded-full border border-border bg-card hover:bg-muted/40 text-foreground font-semibold px-[14px] transition-colors"
                style={{ minHeight: "44px", fontSize: "12px" }}
              >
                <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                Mon profil public
              </Link>
            )}
          </div>
        </div>
        <div className="notebook-card-edge" aria-hidden="true" />
      </div>
    </section>
  );
};

export default OwnerCockpit;
