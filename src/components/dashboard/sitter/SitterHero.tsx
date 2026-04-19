import { Link } from "react-router-dom";
import FounderBadge from "@/components/badges/FounderBadge";

const capitalize = (name: string) =>
  name ? name.charAt(0).toUpperCase() + name.slice(1).toLowerCase() : "";

interface SitterHeroProps {
  userId?: string;
  firstName?: string;
  isFounder?: boolean;
  subtitle: string;
  isAvailable: boolean;
  onToggleAvailability: () => void;
}

const SitterHero = ({
  userId, firstName, isFounder, subtitle, isAvailable, onToggleAvailability,
}: SitterHeroProps) => (
  <div className="relative overflow-hidden bg-sitter-hero rounded-b-3xl px-4 sm:px-5 md:px-10 pt-5 sm:pt-6 md:pt-8 pb-4 sm:pb-5 md:pb-6 mb-6 md:mb-8">
    <div className="absolute right-0 top-0 opacity-[0.07] pointer-events-none">
      <svg width="300" height="200" viewBox="0 0 300 200">
        <circle cx="250" cy="50" r="120" fill="white" />
        <circle cx="200" cy="150" r="80" fill="white" />
      </svg>
    </div>

    <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <p className="text-xs uppercase tracking-[3px] text-white/60 font-sans mb-1">
          Espace gardien
        </p>
        <div className="flex items-center gap-3">
          <h1 className="text-xl sm:text-2xl md:text-4xl font-heading font-bold text-white leading-tight mb-1">
            Bonjour{firstName ? `, ${capitalize(firstName)}` : ""} !
          </h1>
          {isFounder && <FounderBadge size="sm" />}
        </div>
        <p className="text-sm text-white/75 font-sans">{subtitle}</p>
      </div>

      <div className="flex flex-col items-start md:items-end gap-3 shrink-0">
        {userId ? (
          <Link
            to={`/gardiens/${userId}`}
            className="text-xs text-white/70 font-sans flex items-center gap-1 hover:text-white/90"
          >
            Voir votre profil public ↗
          </Link>
        ) : (
          <span className="text-xs text-white/40 font-sans">Chargement…</span>
        )}

        <div className="flex items-center gap-3 bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 w-full md:w-auto">
          <div className="flex-1 md:flex-none">
            <p className="text-sm text-white font-sans font-medium leading-none mb-0.5">
              Je suis disponible
            </p>
            <p className="text-xs text-white/60 font-sans">
              {isAvailable ? "Visible dans les résultats" : "Activez pour apparaître"}
            </p>
          </div>
          <button
            role="switch"
            aria-checked={isAvailable}
            aria-label="Basculer la disponibilité"
            onClick={onToggleAvailability}
            className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${isAvailable ? "bg-toggle-active" : "bg-white/20"}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 bg-background rounded-full shadow transition-all duration-200 ${isAvailable ? "left-5" : "left-0.5"}`} />
          </button>
        </div>
      </div>
    </div>
  </div>
);

export default SitterHero;
