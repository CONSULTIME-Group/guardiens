/**
 * Alma Pass 4 — bibliothèque de messages narratifs (12 triggers matching).
 *
 * Chaque helper construit un objet AlmaWhisper prêt à être queué via
 * AlmaContext.queueWhisper. Messages < 140 caractères, vouvoiement pour
 * l'audience owner, tutoiement pour l'audience sitter, jamais de tiret
 * cadratin, jamais de mot proscrit.
 */
import { AlmaWhisper, AlmaWhisperType, WHISPER_PRIORITY } from "./whisper-types";

let counter = 0;
const newId = () => `alma-w-${Date.now()}-${counter++}`;

function base(type: AlmaWhisperType) {
  return {
    id: newId(),
    type,
    priority: WHISPER_PRIORITY[type],
  };
}

/* ---------------- SearchSitter (sitter) ---------------- */

export function buildFreshSitWhisper(params: {
  city: string;
  hoursAgo: number;
  onView: () => void;
}): AlmaWhisper {
  return {
    ...base("sitter_fresh_sit_detected"),
    audience: "sitter",
    surface: "search",
    message: `Alma te chuchote, cette annonce à ${params.city} vient d'être publiée il y a ${params.hoursAgo}h, encore aucun candidat.`,
    primaryAction: { label: "Voir l'annonce", onClick: params.onView, actionId: "view_sit" },
  };
}

export function buildSearchIndecisionWhisper(params: { onRefine: () => void }): AlmaWhisper {
  return {
    ...base("sitter_search_indecision"),
    audience: "sitter",
    surface: "search",
    message: "20 annonces vues, aucune retenue. Je peux affiner selon vos critères les plus forts ?",
    primaryAction: { label: "Affiner", onClick: params.onRefine, actionId: "refine" },
  };
}

export function buildSearchRepeatedNoActionWhisper(params: {
  onSeeTop: () => void;
}): AlmaWhisper {
  return {
    ...base("sitter_search_repeated_no_action"),
    audience: "sitter",
    surface: "search",
    message:
      "Vous explorez depuis un moment. Voulez-vous que je vous propose 3 annonces qui matchent le mieux votre profil ?",
    primaryAction: { label: "Voir mes 3 meilleures", onClick: params.onSeeTop, actionId: "top3" },
  };
}

/* ---------------- SitDetail (sitter) ---------------- */

export function buildPopularSitWhisper(params: {
  viewCount: number;
  applicationsCount: number;
  affinityScore: number;
  onApply: () => void;
}): AlmaWhisper {
  return {
    ...base("sitter_popular_sit_context"),
    audience: "sitter",
    surface: "sit_detail",
    message: `Cette annonce a été vue ${params.viewCount} fois cette semaine, ${params.applicationsCount} candidats. Votre affinité ${params.affinityScore}% vous met dans le top.`,
    primaryAction: { label: "Postuler maintenant", onClick: params.onApply, actionId: "apply" },
  };
}

export function buildReactiveOwnerWhisper(): AlmaWhisper {
  return {
    ...base("sitter_reactive_owner_context"),
    audience: "sitter",
    surface: "sit_detail",
    message: "L'auteur de cette annonce répond en moyenne en moins de 3h. Un bon signe.",
  };
}

/* ---------------- PublicSitterProfile (owner) ---------------- */

export function buildActiveSitterWhisper(params: {
  firstName: string;
  completedSits: number;
  longStays: number;
  onInvite: () => void;
}): AlmaWhisper {
  return {
    ...base("owner_active_sitter_context"),
    audience: "owner",
    surface: "sitter_profile",
    message: `${params.firstName} a fait ${params.completedSits} gardes récentes, dont ${params.longStays} de plus de 7 jours. Il connaît le métier.`,
    primaryAction: {
      label: "L'inviter à candidater",
      onClick: params.onInvite,
      actionId: "invite",
    },
  };
}

export function buildReciprocalInterestWhisper(params: {
  firstName: string;
  views: number;
  onInvite: () => void;
}): AlmaWhisper {
  return {
    ...base("owner_reciprocal_interest"),
    audience: "owner",
    surface: "sitter_profile",
    message: `${params.firstName} a consulté votre annonce ${params.views} fois cette semaine. Il a l'air très intéressé.`,
    primaryAction: {
      label: "L'inviter à candidater",
      onClick: params.onInvite,
      actionId: "invite",
    },
  };
}

/* ---------------- OwnerDashboard ---------------- */

export function buildViewTrendUpWhisper(params: {
  viewsThisWeek: number;
  variationPct: number;
}): AlmaWhisper {
  return {
    ...base("owner_view_trend_up"),
    audience: "owner",
    surface: "owner_dashboard",
    message: `Votre annonce a été vue ${params.viewsThisWeek} fois cette semaine, ${params.variationPct}% de plus que la semaine dernière. L'attention monte.`,
  };
}

export function buildTrafficNoActionWhisper(params: {
  views: number;
  onSuggestions: () => void;
}): AlmaWhisper {
  return {
    ...base("owner_traffic_no_action"),
    audience: "owner",
    surface: "owner_dashboard",
    message: `Votre annonce a été vue ${params.views} fois mais personne n'a candidaté. Je peux vous suggérer 2 ajustements ?`,
    primaryAction: {
      label: "Voir les suggestions",
      onClick: params.onSuggestions,
      actionId: "see_suggestions",
    },
  };
}

/* ---------------- Messages ---------------- */

export function buildConversationStagnantWhisper(params: {
  firstName: string;
  onProposeMeeting: () => void;
}): AlmaWhisper {
  return {
    ...base("owner_conversation_stagnant"),
    audience: "owner",
    surface: "messages",
    message: `Vous discutez avec ${params.firstName} depuis quelques jours. Voulez-vous fixer une rencontre ?`,
    primaryAction: {
      label: "Proposer une rencontre",
      onClick: params.onProposeMeeting,
      actionId: "propose_meeting",
    },
  };
}

/* ---------------- Cross ---------------- */

export function buildInternationalDiscoveryWhisper(params: {
  city: string;
  onExplore: () => void;
}): AlmaWhisper {
  return {
    ...base("sitter_international_discovery"),
    audience: "sitter",
    surface: "listings",
    message: `Alma remarque, une annonce à ${params.city} vient d'apparaître. Ce n'est pas votre zone, mais votre chien pourrait aimer le soleil.`,
    primaryAction: {
      label: "Voir les annonces internationales",
      onClick: params.onExplore,
      actionId: "explore_international",
    },
  };
}

export function buildLongAbsenceReturnWhisper(params: {
  firstName: string;
  newSits: number;
  matches: number;
  audience: "owner" | "sitter";
  onSeeMatches: () => void;
}): AlmaWhisper {
  const isOwner = params.audience === "owner";
  const msg = isOwner
    ? `Bon retour ${params.firstName}. Depuis 2 semaines, ${params.newSits} nouvelles annonces ont bougé dans votre zone, dont ${params.matches} qui matchent votre profil.`
    : `Bon retour ${params.firstName}. Depuis 2 semaines, ${params.newSits} nouvelles annonces ont bougé dans ta zone, dont ${params.matches} qui matchent ton profil.`;
  return {
    ...base("long_absence_return"),
    audience: params.audience,
    surface: "cross",
    message: msg,
    primaryAction: {
      label: "Voir les correspondances",
      onClick: params.onSeeMatches,
      actionId: "see_matches",
    },
  };
}
