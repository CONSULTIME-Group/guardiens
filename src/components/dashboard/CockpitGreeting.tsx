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
 * Règle absolue : le prénom n'est jamais tronqué. Aucune ellipse, aucun
 * overflow masqué. La taille est fluide et bornée par clamp, avec une
 * borne basse lisible (16px). Si un prénom très long ne tient pas à la
 * borne basse, le titre passe sur deux lignes plutôt que d'être coupé.
 */
export function CockpitGreeting({ greeting, displayName, className = "" }: CockpitGreetingProps) {
  const label = `${greeting}${displayName ? `, ${displayName}` : ""}`;
  return (
    <h1
      className={`font-heading font-semibold tracking-tight leading-tight text-foreground min-w-0 break-words ${className}`}
      style={{
        fontSize: "clamp(16px, 5.4vw, 32px)",
        overflowWrap: "break-word",
        textWrap: "balance",
      }}
    >
      {label}
    </h1>
  );
}
