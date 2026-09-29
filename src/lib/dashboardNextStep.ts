/**
 * dashboardNextStep, contenu du bloc « prochain pas » du rail droit des
 * deux dashboards (refonte rail, août 2026).
 *
 * Logique pure, testable : calcule eyebrow, titre, phrase douce, CTA et
 * éventuelle barre de progression. Aucun texte ne signale un manque en
 * rouge : le ton reste celui de la charte (accompagnement, jamais reproche).
 *
 * Priorité gardien : une garde confirmée à venir prime toujours (info la
 * plus utile au quotidien), puis les étapes de profil, puis l'identité.
 */
import { ALMA_PROFILE_NUDGE_THRESHOLD } from "@/lib/alma/profileNudge";

export interface RailNextStep {
  eyebrow: string;
  title: string;
  phrase?: string;
  ctaLabel: string;
  ctaTo: string;
  /** Si défini, la carte affiche une barre de progression (0-100). */
  progressPct?: number;
  /** Lot J5 : lien texte discret sous le bouton. */
  secondaryLink?: { label: string; to: string };
}

/** Touche manquante du barème de complétion (label + précision éventuelle). */
export interface RailMissingItem {
  label: string;
  hint?: string;
  /** Points du barème, sert à cibler le CTA sur la touche la plus rentable. */
  points?: number;
  /** Lien profond vers la section du formulaire qui porte ce critère. */
  href?: string;
}

/** Lien profond de la touche manquante la plus rentable, si connue. */
export const topMissingHref = (
  missing?: RailMissingItem[] | null,
): string | null => {
  if (!missing || missing.length === 0) return null;
  const sorted = [...missing].sort((a, b) => (b.points ?? 0) - (a.points ?? 0));
  return sorted[0]?.href ?? null;
};


const lowerFirst = (s: string): string =>
  s.charAt(0).toLocaleLowerCase("fr-FR") + s.slice(1);

/**
 * Phrase précise du « reste à faire » quand le profil approche 100 %.
 * Au-dessus de 90 %, on nomme ce qui manque : à 97 %, il reste une touche,
 * pas « quelques minutes ». Sans détail disponible, repli honnête sur
 * l'échelle (une touche), jamais d'invitation générique.
 */
export const remainingTouchesPhrase = (
  missing?: RailMissingItem[] | null,
): string => {
  if (!missing || missing.length === 0) {
    return "Il ne reste qu'une touche pour compléter votre profil.";
  }
  const fmt = (m: RailMissingItem): string => {
    const label = lowerFirst(m.label.replace(/\.$/, ""));
    const hint = m.hint ? lowerFirst(m.hint.replace(/\.$/, "")) : null;
    return hint ? `${label} (${hint})` : label;
  };
  return `Reste à faire : ${missing.map(fmt).join(", ")}.`;
};

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
  /** Touches manquantes du barème, pour nommer le reste à faire >= 90 %. */
  missing?: RailMissingItem[] | null;
  /** Lot J5 : données d'action, utilisées à partir du seuil de 40 %. */
  action?: Omit<SitterActionInput, "missing"> | null;
}

export const sitterNextStep = (input: SitterNextStepInput): RailNextStep | null => {
  const { nextGuard, postalCode, hasAvatar, hasBio, identityAction, profileCompletion, missing } = input;
  const pct = clampPct(profileCompletion);

  if (nextGuard) return nextGuardStep(nextGuard);
  if (input.action && pct >= NEXT_STEP_ACTION_THRESHOLD) {
    return sitterActionStep({ ...input.action, missing });
  }

  if (!hasAvatar) {
    return {
      eyebrow: "Votre prochain pas",
      title: "Ajoutez une photo de profil",
      phrase: "Quelques détails suffisent pour rassurer les propriétaires.",
      ctaLabel: "Compléter mon profil",
      ctaTo: "/profile?tab=profil",
      progressPct: pct,
    };
  }
  if (!hasBio) {
    return {
      eyebrow: "Votre prochain pas",
      title: "Écrivez votre bio",
      phrase: "Quelques détails suffisent pour rassurer les propriétaires.",
      ctaLabel: "Compléter mon profil",
      ctaTo: "/profile?tab=profil",
      progressPct: pct,
    };
  }
  if (!postalCode) {
    return {
      eyebrow: "Votre prochain pas",
      title: "Confirmez votre code postal",
      phrase: "C'est ce qui déclenche les alertes près de chez vous.",
      ctaLabel: "Compléter mon profil",
      ctaTo: "/profile?tab=alertes",
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
    const deepLink = topMissingHref(missing) ?? "/profile?tab=profil";
    if (pct >= 90) {
      return {
        eyebrow: "Votre prochain pas",
        title: "Une dernière touche à votre profil gardien.",
        phrase: remainingTouchesPhrase(missing),
        ctaLabel: "Compléter mon profil",
        ctaTo: deepLink,
        progressPct: pct,
      };
    }
    return {
      eyebrow: "Votre prochain pas",
      title: "Votre profil gardien se complète en quelques minutes.",
      phrase: "Chaque détail aide une maison à vous choisir.",
      ctaLabel: "Compléter mon profil",
      ctaTo: deepLink,
      progressPct: pct,
    };
  }
  return null;
};

export interface OwnerNextStepInput {
  profileCompletion: number;
  /** Touches manquantes du barème, pour nommer le reste à faire >= 90 %. */
  missing?: RailMissingItem[] | null;
  /** Lot J5 : données d'action, utilisées à partir du seuil de 40 %. */
  action?: Omit<OwnerActionInput, "missing"> | null;
}

export const ownerNextStep = (input: OwnerNextStepInput): RailNextStep | null => {
  const pct = clampPct(input.profileCompletion);
  if (input.action && pct >= NEXT_STEP_ACTION_THRESHOLD) {
    return ownerActionStep({ ...input.action, missing: input.missing });
  }
  if (pct >= 100) return null;
  const deepLink = topMissingHref(input.missing) ?? "/owner-profile";
  if (pct >= 90) {
    return {
      eyebrow: "Votre prochain pas",
      title: "Une dernière touche à votre profil propriétaire.",
      phrase: remainingTouchesPhrase(input.missing),
      ctaLabel: "Compléter mon profil",
      ctaTo: deepLink,
      progressPct: pct,
    };
  }
  return {
    eyebrow: "Votre prochain pas",
    title: "Votre profil propriétaire se complète en quelques minutes.",
    phrase: "Chaque détail aide un gardien à se projeter chez vous.",
    ctaLabel: "Compléter mon profil",
    ctaTo: deepLink,
    progressPct: pct,
  };
};


/* ────────────────────────────────────────────────────────────────────────
 * Lot J5 : au dessus du seuil de profil d'Alma (40 %), la carte « Votre
 * prochain pas » propose la prochaine action concrète, avec un seul bouton
 * principal. Le reste du profil devient un lien texte discret, jamais une
 * barre. Le seuil est importé, jamais recopié.
 * ──────────────────────────────────────────────────────────────────────── */

export const NEXT_STEP_ACTION_THRESHOLD = ALMA_PROFILE_NUDGE_THRESHOLD;

export type RailActionStep = RailNextStep;

export interface RailNearbySit {
  id: string;
  slug?: string | null;
  title?: string | null;
  city?: string | null;
  start_date?: string | null;
  end_date?: string | null;
}

export interface RailNearbyMission {
  id: string;
  title?: string | null;
  city?: string | null;
  category?: string | null;
  status?: string | null;
}

/** Lien discret vers la touche de profil la plus rentable. */
export const profileSecondaryLink = (
  missing: RailMissingItem[] | null | undefined,
  fallbackTo: string,
): { label: string; to: string } | undefined => {
  if (!missing || missing.length === 0) return undefined;
  const top = [...missing].sort((a, b) => (b.points ?? 0) - (a.points ?? 0))[0];
  const to = top.href ?? fallbackTo;
  const gallery = missing.find((m) => /galerie|photos?/i.test(m.label));
  if (gallery) return { label: "Ajouter des photos à ma galerie", to: gallery.href ?? to };
  return { label: "Compléter mon profil", to };
};

const cityPart = (city?: string | null): string | null => {
  const c = (city || "").trim();
  return c ? `à ${c}` : null;
};

export interface SitterActionInput {
  nearbyListings: RailNearbySit[];
  nearbyMissions: RailNearbyMission[];
  /** Identifiant de la garde mise en avant par « Une garde faite pour vous ». */
  starSitId?: string | null;
  missing?: RailMissingItem[] | null;
}

export const sitterActionStep = (input: SitterActionInput): RailActionStep => {
  const secondaryLink = profileSecondaryLink(input.missing, "/profile?tab=profil");
  const open = (m: RailNearbyMission) => !m.status || m.status === "open";
  const sit = input.nearbyListings.find((s) => s.id && s.id !== input.starSitId);
  if (sit) {
    const start = safeFmt(sit.start_date);
    const end = safeFmt(sit.end_date);
    const dates = start && end ? (start === end ? `le ${start}` : `du ${start} au ${end}`) : null;
    const meta = [(sit.title || "").trim() || null, cityPart(sit.city), dates].filter(Boolean).join(", ");
    return {
      eyebrow: "Votre prochain pas",
      title: "Une garde qui vous attend",
      phrase: meta ? `${meta.charAt(0).toLocaleUpperCase("fr-FR")}${meta.slice(1)}.` : undefined,
      ctaLabel: "Voir cette garde",
      ctaTo: `/sits/${sit.slug || sit.id}`,
      secondaryLink,
    };
  }
  const help = input.nearbyMissions.find((m) => open(m) && m.category !== "projet");
  if (help) {
    const meta = [(help.title || "").trim() || null, cityPart(help.city)].filter(Boolean).join(", ");
    return {
      eyebrow: "Votre prochain pas",
      title: "Un coup de main près de chez vous",
      phrase: meta ? `${meta}.` : undefined,
      ctaLabel: "Proposer mon aide",
      ctaTo: `/petites-missions/${help.id}`,
      secondaryLink,
    };
  }
  const project = input.nearbyMissions.find((m) => open(m) && m.category === "projet");
  if (project) {
    const meta = [(project.title || "").trim() || null, cityPart(project.city)].filter(Boolean).join(", ");
    return {
      eyebrow: "Votre prochain pas",
      title: "Un projet près de chez vous",
      phrase: meta ? `${meta}.` : undefined,
      ctaLabel: "Voir le projet",
      ctaTo: `/petites-missions/${project.id}`,
      secondaryLink,
    };
  }
  return {
    eyebrow: "Votre prochain pas",
    title: "Des annonces vous attendent près de chez vous",
    ctaLabel: "Voir les annonces près de chez vous",
    ctaTo: "/search",
    secondaryLink,
  };
};

export interface OwnerActionInput {
  hasActiveSit: boolean;
  nearbySittersCount: number;
  /** Variante de « Une garde faite pour vous » côté propriétaire. */
  starVariant?: string | null;
  missing?: RailMissingItem[] | null;
}

export const ownerActionStep = (input: OwnerActionInput): RailActionStep => {
  const secondaryLink = profileSecondaryLink(input.missing, "/owner-profile");
  if (!input.hasActiveSit && input.starVariant !== "publish") {
    return {
      eyebrow: "Votre prochain pas",
      title: "Votre maison mérite son gardien",
      ctaLabel: "Publier mon annonce de garde",
      ctaTo: "/sits/create",
      secondaryLink,
    };
  }
  if (input.hasActiveSit && input.nearbySittersCount > 0) {
    return {
      eyebrow: "Votre prochain pas",
      title: "Des gardiens près de chez vous",
      ctaLabel: "Voir les gardiens à proximité",
      ctaTo: "/recherche-gardiens",
      secondaryLink,
    };
  }
  return {
    eyebrow: "Votre prochain pas",
    title: "Un coup de main près de chez vous",
    ctaLabel: "Demander un coup de main",
    ctaTo: "/petites-missions/creer",
    secondaryLink,
  };
};
