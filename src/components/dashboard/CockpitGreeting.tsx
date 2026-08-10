interface CockpitGreetingProps {
  /** Formule d'accueil, par exemple "Bonjour" ou "Bienvenue". */
  greeting: string;
  /** Prénom affiché, éventuellement vide. */
  displayName?: string | null;
  className?: string;
}

/**
 * Titre de la carte d'accueil, toutes variantes de rôle et de formule.
 *
 * La taille est fluide et bornée (clamp), calculée sur la largeur du
 * conteneur (cqi) avec repli en vw quand les container queries ne sont pas
 * disponibles. Le titre tient ainsi sur une seule ligne aussi bien avec
 * "Bonjour, Léa" qu'avec "Bienvenue, Jean-Christophe", et se tronque au
 * besoin plutôt que de passer sur deux lignes.
 */
export function CockpitGreeting({ greeting, displayName, className = "" }: CockpitGreetingProps) {
  const label = `${greeting}${displayName ? `, ${displayName}` : ""}`;
  return (
    <h1
      className={`font-heading font-semibold tracking-tight leading-tight text-foreground whitespace-nowrap truncate min-w-0 ${className}`}
      style={{
        containerType: "inline-size",
        fontSize: "clamp(18px, min(6.4cqi, 6.4vw), 32px)",
      }}
      title={label}
    >
      {label}
    </h1>
  );
}
