/**
 * Lot TRF-5 : freins de l'inscription et de la première annonce, rangés par
 * volume. Règles pures.
 */
export interface BrakeInput {
  blocked: { reason: string; volume: number }[];
  failed: { code: string; volume: number }[];
  sitAbandons: number;
}

export interface Brake { key: string; title: string; volume: number; detail: string; action: string; href: string }

const FORM = "/inscription";

const KNOWN: Record<string, Omit<Brake, "key" | "volume">> = {
  "blocked:terms_not_accepted": { title: "Conditions à cocher avant l'envoi", detail: "Le formulaire arrête l'envoi et affiche le message sous la case.", action: "Voir le formulaire", href: FORM },
  "blocked:terms_unchecked": { title: "Conditions à cocher avant l'envoi", detail: "Le formulaire arrête l'envoi et affiche le message sous la case.", action: "Voir le formulaire", href: FORM },
  "failed:weak_password": { title: "Mot de passe refusé", detail: "Présent dans une liste de mots de passe divulgués. Depuis le 15/11/2026, le formulaire propose un mot de passe.", action: "Voir le formulaire", href: FORM },
  "failed:rate_limited": { title: "Second envoi dans la minute", detail: "Le premier envoi avait créé le compte. Depuis le 15/11/2026, l'écran de confirmation s'ouvre.", action: "Voir le formulaire", href: FORM },
  "failed:already_registered": { title: "Compte déjà existant", detail: "La fenêtre de connexion s'ouvre avec l'email saisi.", action: "Voir la page de connexion", href: "/login" },
  "failed:invalid_email": { title: "Adresse email invalide", detail: "Le format de l'adresse est refusé à l'envoi.", action: "Voir le formulaire", href: FORM },
  "failed:timeout": { title: "Délai dépassé à l'envoi", detail: "La création du compte a mis plus de 15 secondes.", action: "Voir les erreurs", href: "/admin/errors" },
};

export function buildBrakes(input: BrakeInput): Brake[] {
  const merged = new Map<string, Brake>();
  const add = (key: string, volume: number, fallbackTitle: string) => {
    if (!(volume > 0)) return;
    const known = KNOWN[key] ?? { title: fallbackTitle, detail: "Motif relevé par le formulaire d'inscription.", action: "Voir le formulaire", href: FORM };
    // Deux codes d'un même frein (anciens et nouveaux libellés) s'additionnent.
    const id = known.title;
    const cur = merged.get(id);
    if (cur) cur.volume += volume;
    else merged.set(id, { key: id, volume, ...known });
  };
  for (const b of input.blocked) add(`blocked:${b.reason}`, Number(b.volume), `Blocage du formulaire (${b.reason})`);
  for (const f of input.failed) add(`failed:${f.code}`, Number(f.volume), `Échec à l'envoi (${f.code})`);
  if (input.sitAbandons > 0) {
    merged.set("annonce", {
      key: "annonce", volume: input.sitAbandons,
      title: "Création d'annonce quittée à l'étape « L'essentiel »",
      detail: "Sorties sans publication. Le détail par dernier champ touché se lit plus bas.",
      action: "Ouvrir la création d'annonce", href: "/sits/create",
    });
  }
  return [...merged.values()].sort((a, b) => b.volume - a.volume);
}
