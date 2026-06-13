import { useMemo } from "react";
import { differenceInDays } from "date-fns";

/**
 * Action prioritaire unique pour le dashboard propriétaire.
 *
 * Miroir de `useSitterPriorityAction` côté owner. Règle déterministe,
 * AUCUN fetch (consomme les données déjà chargées par useOwnerDashboardData).
 *
 * Priorité (décroissante) :
 *  1. Garde en cours              → contact gardien
 *  2. Garde confirmée J-7         → préparer le guide maison
 *  3. Candidatures en attente     → examiner
 *  4. Avis à laisser              → noter le gardien
 *  5. Annonce orpheline > 3j      → relancer
 *  6. Identité non vérifiée       → vérifier
 *  7. Aucune annonce              → publier
 *  8. Fallback                    → découvrir les gardiens proches
 */

export type OwnerPriorityAction = {
  variant:
    | "ongoing"
    | "next-sit"
    | "applications"
    | "review"
    | "stalled"
    | "verify"
    | "publish"
    | "explore";
  eyebrow: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaTo: string;
  urgency: "high" | "medium" | "low";
};

interface Input {
  sits: any[];
  pendingAppCount: number;
  pendingReviews: Array<{ sitId: string; sitterId: string; sitterName?: string }>;
  verificationStatus: string | null;
  nearbySittersCount?: number;
  nearbySittersRadius?: number | null;
}

export function useOwnerPriorityAction(input: Input): OwnerPriorityAction {
  return useMemo(() => {
    const { sits, pendingAppCount, pendingReviews, verificationStatus, nearbySittersCount, nearbySittersRadius } = input;
    const now = new Date();

    // 1. Garde en cours
    const ongoing = sits.find(
      (s) =>
        s.status === "confirmed" &&
        s.start_date &&
        new Date(s.start_date) <= now &&
        s.end_date &&
        new Date(s.end_date) >= now
    );
    if (ongoing) {
      const daysLeft = ongoing.end_date ? differenceInDays(new Date(ongoing.end_date), now) : 0;
      return {
        variant: "ongoing",
        eyebrow: "Garde en cours",
        title:
          daysLeft <= 0
            ? "Votre garde se termine aujourd'hui."
            : `Votre garde est en cours, fin dans ${daysLeft} jour${daysLeft > 1 ? "s" : ""}.`,
        description: "Gardez le contact avec votre gardien et consultez les nouvelles de votre maison.",
        ctaLabel: "Voir la garde",
        ctaTo: `/sits/${ongoing.id}`,
        urgency: "high",
      };
    }

    // 2. Prochaine garde confirmée à J-7
    const nextConfirmed = sits
      .filter((s) => s.status === "confirmed" && s.start_date && new Date(s.start_date) > now)
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())[0];
    if (nextConfirmed) {
      const daysUntil = differenceInDays(new Date(nextConfirmed.start_date), now);
      if (daysUntil <= 7) {
        return {
          variant: "next-sit",
          eyebrow: "Garde imminente",
          title:
            daysUntil <= 1
              ? `Votre garde commence ${daysUntil === 0 ? "aujourd'hui" : "demain"}.`
              : `Votre garde commence dans ${daysUntil} jours.`,
          description: "Préparez le guide maison pour que votre gardien arrive en confiance.",
          ctaLabel: "Préparer la garde",
          ctaTo: `/sits/${nextConfirmed.id}`,
          urgency: "high",
        };
      }
    }

    // 3. Candidatures à examiner
    if (pendingAppCount > 0) {
      return {
        variant: "applications",
        eyebrow: "Candidatures",
        title: `${pendingAppCount} candidature${pendingAppCount > 1 ? "s" : ""} à examiner.`,
        description: "Répondez sous 48 h pour garder vos chances et rassurer les gardiens.",
        ctaLabel: "Voir les candidatures",
        ctaTo: "/sits",
        urgency: "high",
      };
    }

    // 4. Avis en attente
    if (pendingReviews.length > 0) {
      const first = pendingReviews[0];
      return {
        variant: "review",
        eyebrow: "Avis à laisser",
        title: first.sitterName
          ? `Notez ${first.sitterName} pour clôturer la garde.`
          : `${pendingReviews.length} avis à laisser.`,
        description: "Votre retour aide la communauté à choisir en confiance.",
        ctaLabel: "Laisser un avis",
        ctaTo: `/review/${first.sitId}?reviewee=${first.sitterId}`,
        urgency: "medium",
      };
    }

    // 5. Annonce publiée sans candidature depuis 3+ jours
    const stalled = sits.find(
      (s) =>
        s.status === "published" &&
        (s.applications || []).length === 0 &&
        s.created_at &&
        differenceInDays(now, new Date(s.created_at)) >= 3
    );
    if (stalled) {
      return {
        variant: "stalled",
        eyebrow: "Annonce sans candidature",
        title: "Votre annonce n'a pas encore reçu de candidature.",
        description: "Enrichissez les photos et les détails de la maison pour attirer plus de gardiens.",
        ctaLabel: "Améliorer mon annonce",
        ctaTo: `/sits/${stalled.id}/edit`,
        urgency: "medium",
      };
    }

    // 6. Identité non vérifiée
    if (verificationStatus !== "verified" && verificationStatus !== "pending") {
      return {
        variant: "verify",
        eyebrow: "Confiance",
        title: "Vérifiez votre identité pour rassurer les gardiens.",
        description: "Les annonces vérifiées reçoivent en moyenne plus de candidatures de qualité.",
        ctaLabel: "Vérifier mon identité",
        ctaTo: "/settings#verification",
        urgency: "medium",
      };
    }

    // 7. Aucune annonce du tout
    if (sits.length === 0) {
      return {
        variant: "publish",
        eyebrow: "Première étape",
        title: "Publiez votre première annonce pour trouver un gardien.",
        description: "Quelques minutes suffisent pour décrire votre maison et vos animaux.",
        ctaLabel: "Publier une annonce",
        ctaTo: "/sits/create",
        urgency: "high",
      };
    }

    // 8. Fallback : préparer la prochaine garde (CTA distinct de l'aside qui montre déjà les gardiens proches)
    return {
      variant: "explore",
      eyebrow: "Tout est en ordre",
      title: "Préparez votre prochaine garde.",
      description: "Republiez votre dernière annonce ou créez,en une nouvelle pour anticiper vos absences. Les gardiens près de chez vous sont listés à droite.",
      ctaLabel: "Nouvelle annonce",
      ctaTo: "/sits/create",
      urgency: "low",
    };
  }, [
    input.sits,
    input.pendingAppCount,
    input.pendingReviews,
    input.verificationStatus,
    input.nearbySittersCount,
    input.nearbySittersRadius,
  ]);
}
