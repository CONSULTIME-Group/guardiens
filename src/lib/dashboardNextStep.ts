/**
 * dashboardNextStep — contenu du bloc « prochain pas » du rail droit des
 * deux dashboards (refonte rail, août 2026).
 *
 * Logique pure, testable : calcule eyebrow, titre, phrase douce, CTA et
 * éventuelle barre de progression. Aucun texte ne signale un manque en
 * rouge : le ton reste celui de la charte (accompagnement, jamais reproche).
 *
 * Priorité gardien : une garde confirmée à venir prime toujours (info la
 * plus utile au quotidien), puis les étapes de profil, puis l'identité.
 */

export interface RailNextStep {
  eyebrow: string;
  title: string;
  phrase?: string;
  ctaLabel: string;
  ctaTo: string;
  /** Si défini, la carte affiche une barre de progression (0-100). */
  progressPct?: number;
}

export interface RailNextGuard {
  id: string;
  slug?: string | null;
  title?: string | null;
  city?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  ownerName?: string | null;
  pets?: Array<{ species?: string | null }>;
}

const clampPct = (n: number): number => Math.max(0, Math.min(100, Math.round(n)));

const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" });
const safeFmt = (d?: string | null): string | null => {
  if (!d) return null;
  try {
    return dateFmt.format(new Date(d));
  } catch {
    return null;
  }
};

// Traduction discrète des espèces (aucun emoji).
const speciesLabel = (s?: string | null): string | null => {
  if (!s) return null;
  const key = s.toLowerCase();
  if (key.includes("chien") || key === "dog") return "chien";
  if (key.includes("chat") || key === "cat") return "chat";
  if (key.includes("oiseau") || key === "bird") return "oiseau";
  if (key.includes("rongeur") || key === "rodent") return "rongeur";
  if (key.includes("nac")) return "NAC";
  return s;
};

export const nextGuardStep = (guard: RailNextGuard): RailNextStep => {
  const owner = (guard.ownerName || "").trim();
  const city = (guard.city || "").trim();
  const title = (guard.title || "").trim();

  let composed: string;
  if (owner && city) composed = `Chez ${owner}, à ${city}`;
  else if (owner) composed = `Chez ${owner}`;
  else if (city) composed = `À ${city}`;
  else composed = title || "Votre prochaine garde";

  const start = safeFmt(guard.start_date);
  const end = safeFmt(guard.end_date);
  const dateRange =
    start && end ? (start === end ? start : `du ${start} au ${end}`) : start || end || null;

  const petLabels = Array.from(
    new Set(
      (guard.pets || [])
        .map((p) => speciesLabel(p.species))
        .filter((v): v is string => !!v),
    ),
  );
  const petsMeta =
    petLabels.length === 0
      ? null
      : petLabels.length === 1
        ? petLabels[0]
        : `${petLabels.slice(0, -1).join(", ")} et ${petLabels[petLabels.length - 1]}`;

  const meta = [dateRange, petsMeta].filter(Boolean).join(" · ");

  return {
    eyebrow: "Votre prochaine garde",
    title: composed,
    phrase: meta || undefined,
    ctaLabel: "Préparer cette garde",
    ctaTo: `/sits/${guard.slug || guard.id}`,
  };
};

export interface SitterNextStepInput {
  nextGuard?: RailNextGuard | null;
  postalCode?: string | null;
  hasAvatar: boolean;
  hasBio: boolean;
  identityAction?: { title: string; cta: string; href: string } | null;
  /** Score de complétion 0-100 (barre de progression). */
  profileCompletion: number;
}

export const sitterNextStep = (input: SitterNextStepInput): RailNextStep | null => {
  const { nextGuard, postalCode, hasAvatar, hasBio, identityAction, profileCompletion } = input;
  const pct = clampPct(profileCompletion);

  if (nextGuard) return nextGuardStep(nextGuard);

  if (!hasAvatar) {
    return {
      eyebrow: "Votre prochain pas",
      title: "Ajoutez une photo de profil",
      phrase: "Quelques détails suffisent pour rassurer les propriétaires.",
      ctaLabel: "Compléter mon profil",
      ctaTo: "/sitter-profile?tab=profil",
      progressPct: pct,
    };
  }
  if (!hasBio) {
    return {
      eyebrow: "Votre prochain pas",
      title: "Écrivez votre bio",
      phrase: "Quelques détails suffisent pour rassurer les propriétaires.",
      ctaLabel: "Compléter mon profil",
      ctaTo: "/sitter-profile?tab=profil",
      progressPct: pct,
    };
  }
  if (!postalCode) {
    return {
      eyebrow: "Votre prochain pas",
      title: "Confirmez votre code postal",
      phrase: "C'est ce qui déclenche les alertes près de chez vous.",
      ctaLabel: "Compléter mon profil",
      ctaTo: "/sitter-profile?tab=alertes",
      progressPct: pct,
    };
  }
  if (identityAction) {
    return {
      eyebrow: "Votre prochain pas",
      title: identityAction.title,
      phrase: "Une vérification simple, pour des rencontres plus sereines.",
      ctaLabel: identityAction.cta,
      ctaTo: identityAction.href,
      progressPct: pct,
    };
  }
  if (pct < 100) {
    return {
      eyebrow: "Votre prochain pas",
      title: "Votre profil se complète en quelques minutes.",
      phrase: "Chaque détail aide une maison à vous choisir.",
      ctaLabel: "Compléter mon profil",
      ctaTo: "/sitter-profile?tab=profil",
      progressPct: pct,
    };
  }
  return null;
};

export const ownerNextStep = (input: { profileCompletion: number }): RailNextStep | null => {
  const pct = clampPct(input.profileCompletion);
  if (pct >= 100) return null;
  return {
    eyebrow: "Votre prochain pas",
    title: "Votre profil se complète en quelques minutes.",
    phrase: "Chaque détail aide un gardien à se projeter chez vous.",
    ctaLabel: "Compléter mon profil",
    ctaTo: "/owner-profile",
    progressPct: pct,
  };
};
