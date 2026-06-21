import { useMemo } from "react";

/**
 * Calcule l'action prioritaire unique à afficher en haut du dashboard gardien.
 *
 * Pourquoi un hook dédié : la règle de priorité doit être déterministe, testable,
 * et réutilisable (cockpit + analytics). On évite l'arbre `if/else` dans le JSX.
 *
 * Règle (priorité décroissante) :
 *  1. NextGuard programmée    → préparer la garde imminente
 *  2. Profil < 60%            → débloquer la visibilité
 *  3. Code postal manquant    → débloquer l'affichage géo
 *  4. Annonce à proximité     → postuler / découvrir
 *  5. Mode dispo OFF          → activer la visibilité
 *  6. Fallback                → explorer
 *
 * Ne fait AUCUN fetch — consomme les données déjà chargées par
 * `useSitterDashboardData` pour rester gratuit.
 */

export type SitterPriorityAction = {
  variant: "next-guard" | "profile" | "skills" | "postal" | "nearby" | "availability" | "explore";
  eyebrow: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaTo: string;
  urgency: "high" | "medium" | "low";
};

interface Input {
  nextGuard: any | null;
  profileCompletion: number;
  postalCode: string | null;
  nearbyListings: any[];
  isAvailable: boolean;
  competencesCount?: number;
  interestsCount?: number;
}

export function useSitterPriorityAction(input: Input): SitterPriorityAction {
  return useMemo(() => {
    const { nextGuard, profileCompletion, postalCode, nearbyListings, isAvailable, competencesCount = 0, interestsCount = 0 } = input;

    // 1. Prochaine garde imminente — toujours prioritaire
    if (nextGuard) {
      const d = nextGuard.daysUntil ?? 0;
      const dayLabel = d <= 0 ? "aujourd'hui" : d === 1 ? "demain" : `dans ${d} jours`;
      return {
        variant: "next-guard",
        eyebrow: "Prochaine garde",
        title: `Votre garde commence ${dayLabel}.`,
        description: `${nextGuard.title} · chez ${nextGuard.ownerName}`,
        ctaLabel: "Préparer cette garde",
        ctaTo: `/sits/${nextGuard.id}`,
        urgency: "high",
      };
    }

    // 2. Profil incomplet — bloque la découvrabilité
    if (profileCompletion < 60) {
      return {
        variant: "profile",
        eyebrow: "Visibilité bloquée",
        title: `Complétez votre profil à ${profileCompletion}% pour apparaître dans les recherches.`,
        description: "Photo, bio et expérience animale sont les 3 éléments les plus regardés par les propriétaires.",
        ctaLabel: "Compléter mon profil",
        ctaTo: "/profile",
        urgency: "high",
      };
    }

    // 3. Code postal manquant — bloque le géo
    if (!postalCode) {
      return {
        variant: "postal",
        eyebrow: "Géolocalisation requise",
        title: "Ajoutez votre code postal pour voir les annonces près de chez vous.",
        description: "Sans cette information, nous ne pouvons pas vous proposer de gardes locales.",
        ctaLabel: "Ajouter mon code postal",
        ctaTo: "/profile?focus=postal_code",
        urgency: "high",
      };
    }

    // 3b. Compétences absentes — débloque le feed d'entraide et qualifie le profil
    if (competencesCount === 0) {
      return {
        variant: "skills",
        eyebrow: "Dernière étape",
        title: "Déclarez au moins une compétence pour apparaître dans le feed d'entraide.",
        description: "Bricolage, jardin, courses, garde d'enfants : ce que vous savez faire devient un atout pour les gens du coin.",
        ctaLabel: "Ajouter mes compétences",
        ctaTo: "/profile?section=competences",
        urgency: "medium",
      };
    }

    // 3c. Centres d'intérêt absents — affine le matching d'affinité
    if (interestsCount === 0) {
      return {
        variant: "interests",
        eyebrow: "Affinez votre matching",
        title: "Ajoutez vos centres d'intérêt pour mieux matcher avec les propriétaires.",
        description: "Randonnée, jardinage, lecture, sport… On s'en sert pour pondérer l'affinité avec chaque foyer.",
        ctaLabel: "Ajouter mes centres d'intérêt",
        ctaTo: "/profile?section=profil",
        urgency: "low",
      };

    // 4. Annonce à proximité — opportunité fraîche
    //    On EXCLUT les annonces flaggées `is_beyond` : sinon le cockpit
    //    annonce « 2 annonces près de chez vous » alors que la carte
    //    plus bas affiche « Aucune garde à moins de 100 km ».
    const trulyNearby = nearbyListings.filter((s: any) => !s?.is_beyond);
    if (trulyNearby.length > 0) {
      const first = trulyNearby[0];
      const count = trulyNearby.length;
      return {
        variant: "nearby",
        eyebrow: `${count} annonce${count > 1 ? "s" : ""} près de chez vous`,
        title: count === 1 ? "Une annonce vient d'apparaître près de chez vous." : `${count} annonces vous attendent à proximité.`,
        description: first.title || "Découvrez les détails et postulez en un clic.",
        ctaLabel: count === 1 ? "Voir l'annonce" : "Voir les annonces",
        ctaTo: count === 1 ? `/sits/${first.id}` : "/search",
        urgency: "medium",
      };
    }

    // 4b. Annonces hors rayon : NE PAS dupliquer le message,
    // la section Découverte plus bas porte déjà « Annonces ailleurs en France ».
    // On laisse le cockpit basculer sur disponibilité ou explore.

    // 5. Mode dispo OFF — sans ça aucune sollicitation directe
    if (!isAvailable) {
      return {
        variant: "availability",
        eyebrow: "Mode disponibilité",
        title: "Activez votre disponibilité pour être contacté directement par les propriétaires.",
        description: "Vous restez maître de vos acceptations, c'est juste un signal de présence.",
        ctaLabel: "Activer la disponibilité",
        ctaTo: "#sitter-availability-toggle",
        urgency: "medium",
      };
    }

    // 6. Fallback — explorer
    return {
      variant: "explore",
      eyebrow: "Tout est en ordre",
      title: "Explorez les annonces de gardes près de chez vous.",
      description: "De nouvelles opportunités sont publiées chaque jour.",
      ctaLabel: "Parcourir les annonces",
      ctaTo: "/search",
      urgency: "low",
    };
  }, [input.nextGuard, input.profileCompletion, input.postalCode, input.nearbyListings, input.isAvailable]);
}
