/**
 * Point d'entrée éditorial discret du dashboard (lot 4).
 *
 * Remplace l'ancienne grille de cartes d'articles : une seule ligne de texte,
 * sans image ni bouton, qui renvoie vers le journal. Les guides, fiches races
 * et questions restent accessibles depuis la navigation.
 */
import { Link } from "react-router-dom";

const JournalLine = () => (
  <p className="font-sans text-[13px] leading-relaxed text-muted-foreground">
    Envie de lire&nbsp;?{" "}
    <Link
      to="/actualites"
      className="font-semibold text-primary underline-offset-4 hover:underline"
    >
      Le journal du coin
    </Link>{" "}
    rassemble les histoires et les conseils publiés cette semaine.
  </p>
);

export default JournalLine;
