/**
 * Traduction des erreurs de base sur une annonce en messages compréhensibles.
 *
 * Le code P0001 est ambigu : trois contrôles distincts l'utilisent, l'absence
 * d'animal, la liste d'environnements et l'expérience minimale demandée. Le
 * code seul ne suffit donc pas, on lit le texte du message pour distinguer, et
 * à défaut on renvoie une phrase prudente qui n'affirme rien de faux.
 */

export interface SitDbErrorLike {
  code?: string | null;
  message?: string | null;
}

const has = (haystack: string, needle: string) => haystack.includes(needle);

export const describeSitWriteError = (
  err: SitDbErrorLike | null | undefined,
  context: "publish" | "republish" = "publish",
): string => {
  const code = String(err?.code || "");
  const msg = String(err?.message || "").toLowerCase();
  const verb = context === "republish" ? "republiée" : "publiée";

  if (code === "P0001") {
    if (has(msg, "animal")) {
      return `Votre annonce ne peut pas être ${verb} sans au moins un animal à faire garder. Ajoutez-le dans votre logement, puis recommencez.`;
    }
    if (has(msg, "environnement")) {
      return "Les environnements de cette annonce ne sont pas valides : trois au maximum, parmi les choix proposés dans le formulaire.";
    }
    if (has(msg, "min_gardien_sits") || has(msg, "expérience") || has(msg, "experience")) {
      return "L'expérience minimale demandée au gardien n'est pas valide : choisissez une des options proposées dans le formulaire.";
    }
    return `Un contrôle de la base a refusé cette annonce : vérifiez les animaux de votre logement, les environnements et l'expérience demandée, puis recommencez.`;
  }
  if (code === "23505") {
    return "Une annonce identique existe déjà. Ouvrez la liste de vos annonces, l'annonce y figure peut-être déjà.";
  }
  if (code === "42501" || code === "PGRST301") {
    return context === "republish"
      ? "Vous n'avez pas les droits pour republier cette annonce."
      : "Vous n'avez pas les droits pour publier cette annonce. Reconnectez-vous, puis recommencez.";
  }
  if (code === "23514" || code === "23502") {
    return "Un élément obligatoire manque ou n'est pas valide : titre, dates, description ou photo. Vérifiez le formulaire.";
  }
  return context === "republish"
    ? "La base a refusé la republication : vérifiez le titre, les dates, la description et la photo de cette annonce, puis republiez."
    : "La publication n'a pas abouti. Vérifiez votre connexion, puis vos informations de titre, de dates, de description et de photo.";
};

/**
 * Vrai quand l'erreur n'entre dans aucun cas connu et traduit. Ces erreurs
 * doivent produire un signal admin (RPC signal_sit_publish_error) : sinon un
 * propriétaire se heurte à un mur sans que personne ne le sache jamais.
 *
 * Cas particulier : le refus « animal exigé » (P0001) contredit la décision
 * produit du 12/08/2026 et son déclencheur a été retiré le 18/08/2026. S'il
 * réapparaît, c'est une régression de la base à voir immédiatement.
 */
export const sitWriteErrorNeedsSignal = (err: SitDbErrorLike | null | undefined): boolean => {
  const code = String(err?.code || "");
  const msg = String(err?.message || "").toLowerCase();
  if (code === "P0001") {
    if (has(msg, "animal")) return true;
    if (has(msg, "environnement") || has(msg, "min_gardien_sits") || has(msg, "expérience") || has(msg, "experience")) return false;
    return true;
  }
  if (["23505", "42501", "PGRST301", "23514", "23502"].includes(code)) return false;
  return true;
};
