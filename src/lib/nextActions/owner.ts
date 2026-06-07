/**
 * Moteur d'actions séquentielles + score d'activation, espace propriétaire.
 *
 * Différent de useOwnerPriorityAction (qui choisit LA seule action dominante) :
 * ici on construit une LISTE complète d'actions candidates, classées par
 * urgence, qu'on peut afficher en secondaire sous l'action principale.
 *
 * Et on calcule un score d'activation 0/6 inspiré des bonnes pratiques
 * onboarding gamifié : le propriétaire visualise sa progression vers
 * « prêt pour son premier sit réussi ».
 */

import { differenceInDays } from "date-fns";

export interface NextActionInput {
  sits: any[];
  pets: any[];
  pendingAppCount: number;
  pendingReviews: Array<{ sitId: string; sitterId: string; sitterName?: string }>;
  verificationStatus: string | null;
  profileCompletion: number;
  hasPropertyType: boolean;
}

export interface NextAction {
  id: string;
  eyebrow: string;
  title: string;
  ctaLabel: string;
  ctaTo: string;
  urgency: "high" | "medium" | "low";
}

export interface ActivationStep {
  key:
    | "profile"
    | "identity"
    | "pet"
    | "property"
    | "first_listing"
    | "first_sit";
  label: string;
  done: boolean;
  ctaTo?: string;
}

export interface ActivationScore {
  completed: number;
  total: number;
  percent: number;
  steps: ActivationStep[];
  /** Première étape non faite, sert au CTA principal de la carte. */
  nextStep: ActivationStep | null;
  /** True quand tout est fait, on bascule alors sur un état « accompli ». */
  allDone: boolean;
}

/** Construit la liste complète des actions candidates, triées par urgence. */
export function computeOwnerNextActions(input: NextActionInput): NextAction[] {
  const { sits, pendingAppCount, pendingReviews, verificationStatus } = input;
  const now = new Date();
  const out: NextAction[] = [];

  // Garde en cours
  const ongoing = sits.find(
    (s) =>
      s.status === "confirmed" &&
      s.start_date &&
      new Date(s.start_date) <= now &&
      s.end_date &&
      new Date(s.end_date) >= now
  );
  if (ongoing) {
    out.push({
      id: "ongoing",
      eyebrow: "Garde en cours",
      title: "Suivez la garde en temps réel.",
      ctaLabel: "Voir la garde",
      ctaTo: `/sits/${ongoing.id}`,
      urgency: "high",
    });
  }

  // Prochaine garde J-7
  const nextConfirmed = sits
    .filter(
      (s) => s.status === "confirmed" && s.start_date && new Date(s.start_date) > now
    )
    .sort(
      (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
    )[0];
  if (nextConfirmed) {
    const daysUntil = differenceInDays(new Date(nextConfirmed.start_date), now);
    if (daysUntil <= 7) {
      out.push({
        id: "next-sit",
        eyebrow: "Garde imminente",
        title:
          daysUntil <= 1
            ? `Garde ${daysUntil === 0 ? "aujourd'hui" : "demain"}, préparez le guide maison.`
            : `Garde dans ${daysUntil} jours, préparez le guide maison.`,
        ctaLabel: "Préparer la garde",
        ctaTo: `/sits/${nextConfirmed.id}`,
        urgency: "high",
      });
    }
  }

  // Candidatures à examiner
  if (pendingAppCount > 0) {
    out.push({
      id: "applications",
      eyebrow: "Candidatures",
      title: `${pendingAppCount} candidature${pendingAppCount > 1 ? "s" : ""} à examiner.`,
      ctaLabel: "Voir les candidatures",
      ctaTo: "/sits",
      urgency: "high",
    });
  }

  // Avis à laisser
  if (pendingReviews.length > 0) {
    const first = pendingReviews[0];
    out.push({
      id: "review",
      eyebrow: "Avis à laisser",
      title: first.sitterName
        ? `Notez ${first.sitterName} pour clôturer la garde.`
        : `${pendingReviews.length} avis à laisser.`,
      ctaLabel: "Laisser un avis",
      ctaTo: `/review/${first.sitId}?reviewee=${first.sitterId}`,
      urgency: "medium",
    });
  }

  // Annonce stagnante
  const stalled = sits.find(
    (s) =>
      s.status === "published" &&
      (s.applications || []).length === 0 &&
      s.created_at &&
      differenceInDays(now, new Date(s.created_at)) >= 3
  );
  if (stalled) {
    out.push({
      id: "stalled",
      eyebrow: "Annonce sans candidature",
      title: "Enrichissez votre annonce pour attirer plus de gardiens.",
      ctaLabel: "Améliorer l'annonce",
      ctaTo: `/sits/${stalled.id}/edit`,
      urgency: "medium",
    });
  }

  // Identité non vérifiée
  if (verificationStatus !== "verified" && verificationStatus !== "pending") {
    out.push({
      id: "verify",
      eyebrow: "Confiance",
      title: "Vérifiez votre identité pour rassurer les gardiens.",
      ctaLabel: "Vérifier mon identité",
      ctaTo: "/settings#verification",
      urgency: "medium",
    });
  }

  // Aucune annonce
  if (sits.length === 0) {
    out.push({
      id: "publish",
      eyebrow: "Première étape",
      title: "Publiez votre première annonce.",
      ctaLabel: "Publier une annonce",
      ctaTo: "/sits/create",
      urgency: "high",
    });
  }

  // Tri stable par urgence (high > medium > low)
  const order = { high: 0, medium: 1, low: 2 } as const;
  return out.sort((a, b) => order[a.urgency] - order[b.urgency]);
}

/** Calcule le score d'activation propriétaire sur 6 étapes structurantes. */
export function computeOwnerActivationScore(
  input: NextActionInput
): ActivationScore {
  const {
    sits,
    pets,
    profileCompletion,
    verificationStatus,
    hasPropertyType,
  } = input;

  const hasPublished = sits.some((s) =>
    ["published", "confirmed", "completed"].includes(s.status)
  );
  const hasSuccessfulSit = sits.some((s) =>
    ["confirmed", "completed"].includes(s.status)
  );

  const steps: ActivationStep[] = [
    {
      key: "profile",
      label: "Complétez votre profil",
      done: profileCompletion >= 60,
      ctaTo: "/owner-profile",
    },
    {
      key: "identity",
      label: "Vérifiez votre identité",
      done: verificationStatus === "verified" || verificationStatus === "pending",
      ctaTo: "/settings#verification",
    },
    {
      key: "pet",
      label: "Présentez vos animaux",
      done: pets.length > 0,
      ctaTo: "/owner-profile",
    },
    {
      key: "property",
      label: "Décrivez votre maison",
      done: hasPropertyType,
      ctaTo: "/owner-profile",
    },
    {
      key: "first_listing",
      label: "Publiez votre 1re annonce",
      done: hasPublished,
      ctaTo: "/sits/create",
    },
    {
      key: "first_sit",
      label: "Confirmez votre 1re garde",
      done: hasSuccessfulSit,
      ctaTo: "/sits",
    },
  ];

  const completed = steps.filter((s) => s.done).length;
  const nextStep = steps.find((s) => !s.done) ?? null;

  return {
    steps,
    completed,
    total: steps.length,
    percent: Math.round((completed / steps.length) * 100),
    nextStep,
    allDone: completed === steps.length,
  };
}
