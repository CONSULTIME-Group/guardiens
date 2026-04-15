import { differenceInMonths } from 'date-fns'

// ─── TYPES ──────────────────────────────────────────────────

export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'steel'
export type BadgeCategory = 'gardien' | 'proprio' | 'special' | 'mission'

export interface BadgeDefinition {
  label: string           // nom complet — tooltip + aria-label
  labelArc: string        // texte pour BadgeSceauLarge (MAJUSCULES)
  category: BadgeCategory
  tooltip: string         // affiché au survol Radix Tooltip
  expirable: boolean      // false = jamais grisé (permanents)
  fixedTier?: BadgeTier   // si défini, getTier() retourne toujours cette valeur
  bg: string              // couleur fond du cercle
  iconColor: string       // couleur icône par défaut
  svgIcon: string         // paths SVG — viewBox 0 0 40 40
}

// ─── FONCTIONS UTILITAIRES ──────────────────────────────────

export const getTier = (id: string, count: number): BadgeTier => {
  const def = BADGE_DEFINITIONS[id]
  if (!def) return 'bronze'
  if (def.fixedTier) return def.fixedTier
  if (count >= 6) return 'gold'
  if (count >= 3) return 'silver'
  return 'bronze'
}

export const isBadgeActive = (id: string, lastObtainedAt: string): boolean => {
  const def = BADGE_DEFINITIONS[id]
  if (!def || !def.expirable) return true
  return differenceInMonths(new Date(), new Date(lastObtainedAt)) < 12
}

// IDs par catégorie — utilisés pour construire les grilles
export const GARDIEN_BADGE_IDS: string[] = [
  'animaux_heureux', 'maison_nickel', 'potager_respire', 'nouvelles_quot',
  'debrouillard', 'au_dela_attentes', 'voisins_adorent', 'invite_noel',
  'reactivite_flash', 'discretion_totale', 'autonomie_expert', 'confiance_aveugle',
]

export const PROPRIO_BADGE_IDS: string[] = [
  'guide_oignons', 'frigo_rempli', 'animaux_en_or', 'coin_de_reve',
  'toujours_joignable', 'confiance_imm', 'on_a_appris', 'on_reviendra',
  'equipement_top', 'flexibilite_dates', 'rencontre_humaine', 'cadre_serein',
]

export const SPECIAL_BADGE_IDS: string[] = [
  'fondateur', 'id_verifiee', 'gardien_urgence', 'courant_passe',
]

export const MISSION_BADGE_IDS: string[] = [
  'coup_de_main_or', 'super_voisin', 'on_remet_ca',
]

// ─── DÉFINITIONS — 31 BADGES ────────────────────────────────

export const BADGE_DEFINITIONS: Record<string, BadgeDefinition> = {

  // ══════════════════════════════════════════════════════════
  // GARDIENS — #1A3C34 | attribués par les proprios | max 3/avis
  // ══════════════════════════════════════════════════════════

  animaux_heureux: {
    label: "Les animaux l'adorent",
    labelArc: "LES ANIMAUX L'ADORENT",
    category: 'gardien', expirable: true,
    tooltip: "A su créer un lien de confiance immédiat et serein avec les animaux.",
    bg: '#1A3C34', iconColor: '#FDF0CC',
    svgIcon: `<circle cx="15" cy="13" r="2.5" fill="#FDF0CC"/><circle cx="20" cy="11" r="2.5" fill="#FDF0CC"/><circle cx="25" cy="13" r="2.5" fill="#FDF0CC"/><circle cx="12" cy="17" r="2" fill="#FDF0CC"/><circle cx="28" cy="17" r="2" fill="#FDF0CC"/><ellipse cx="20" cy="22" rx="5.5" ry="4.5" fill="#FDF0CC"/>`,
  },

  maison_nickel: {
    label: "Maison nickel",
    labelArc: "MAISON NICKEL",
    category: 'gardien', expirable: true,
    tooltip: "Logement rendu dans un état de propreté et de rangement irréprochable.",
    bg: '#1A3C34', iconColor: '#FDF0CC',
    svgIcon: `<path d="M20 11L29 20H26V29H14V20H11Z" fill="rgba(253,240,204,.1)" stroke="#FDF0CC" stroke-width="1.5" stroke-linejoin="round"/><path d="M16 22l3 3 5-5.5" stroke="#FDF0CC" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
  },

  potager_respire: {
    label: "Mains vertes",
    labelArc: "MAINS VERTES",
    category: 'gardien', expirable: true,
    tooltip: "Entretien expert du jardin, des plantes d'intérieur ou du potager.",
    bg: '#1A3C34', iconColor: '#FDF0CC',
    svgIcon: `<line x1="20" y1="29" x2="20" y2="17" stroke="#FDF0CC" stroke-width="1.5" stroke-linecap="round"/><path d="M20 23 Q12 18 13 11 Q20 12 20 23Z" fill="#FDF0CC"/><path d="M20 19 Q28 14 27 9 Q20 10 20 19Z" fill="#FDF0CC"/>`,
  },

  nouvelles_quot: {
    label: "Rassurant & Connecté",
    labelArc: "RASSURANT & CONNECTÉ",
    category: 'gardien', expirable: true,
    tooltip: "Communication parfaite : des nouvelles régulières, précises et illustrées.",
    bg: '#1A3C34', iconColor: '#FDF0CC',
    svgIcon: `<path d="M27 11 Q14 14 13 28 Q17 21 21 17" fill="#FDF0CC"/><path d="M21 17 L19 29 Q22 22 27 11Z" fill="#FDF0CC" opacity="0.6"/>`,
  },

  debrouillard: {
    label: "Débrouillardise",
    labelArc: "DÉBROUILLARDISE",
    category: 'gardien', expirable: true,
    tooltip: "A su gérer seul et avec calme un imprévu technique ou logistique ponctuel.",
    bg: '#1A3C34', iconColor: '#FDF0CC',
    svgIcon: `<path d="M27 11a5 5 0 0 0-4.5 6.8L13 27.3a2.4 2.4 0 1 0 3.4 3.4l9.5-9.5A5 5 0 1 0 27 11z" fill="none" stroke="#FDF0CC" stroke-width="1.5"/><circle cx="27" cy="13.5" r="2" fill="#FDF0CC"/>`,
  },

  au_dela_attentes: {
    label: "Au-delà des attentes",
    labelArc: "AU-DELÀ DES ATTENTES",
    category: 'gardien', expirable: true,
    tooltip: "A pris des initiatives généreuses non prévues initialement.",
    bg: '#1A3C34', iconColor: '#FDF0CC',
    svgIcon: `<path d="M22 10l-4 9h4l-3.5 9.5 9-12h-6z" fill="#FDF0CC"/><circle cx="13" cy="23" r="1.2" fill="#FDF0CC" opacity=".5"/>`,
  },

  voisins_adorent: {
    label: "Allié du quartier",
    labelArc: "ALLIÉ DU QUARTIER",
    category: 'gardien', expirable: true,
    tooltip: "Discrétion absolue et courtoisie exemplaire avec l'entourage.",
    bg: '#1A3C34', iconColor: '#FDF0CC',
    svgIcon: `<path d="M11 22h5l3.5-3.5 3.5 3.5h5" stroke="#FDF0CC" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/><rect x="11" y="22" width="5" height="6" rx="1" fill="#FDF0CC"/><rect x="24" y="22" width="5" height="6" rx="1" fill="#FDF0CC"/><line x1="16" y1="25" x2="24" y2="25" stroke="#FDF0CC" stroke-width="1.5" stroke-linecap="round"/>`,
  },

  invite_noel: {
    label: "Invité à Noël",
    labelArc: "INVITÉ À NOËL",
    category: 'gardien', expirable: false, fixedTier: 'gold',
    tooltip: "Une rencontre humaine rare qui dépasse le cadre du simple service.",
    bg: '#1A3C34', iconColor: '#FDF0CC',
    svgIcon: `<path d="M20 12L23.5 20H28L24 22.5 25.5 28 20 25 14.5 28 16 22.5 12 20H16.5Z" fill="#FDF0CC"/><rect x="18" y="27" width="4" height="3" fill="#FDF0CC"/><circle cx="20" cy="11" r="1.5" fill="#FFE27A"/>`,
  },

  reactivite_flash: {
    label: "Réactivité éclair",
    labelArc: "RÉACTIVITÉ ÉCLAIR",
    category: 'gardien', expirable: true,
    tooltip: "Grande disponibilité et rapidité d'action lors de la mission.",
    bg: '#1A3C34', iconColor: '#FDF0CC',
    svgIcon: `<path d="M22.5 10l-5 10h5l-4 10 9-13h-5z" fill="#FDF0CC"/><path d="M10 18l2.5 0M10 22l3 0M10.5 26l2 0" stroke="#FDF0CC" stroke-width="1.2" stroke-linecap="round" opacity="0.5"/>`,
  },

  discretion_totale: {
    label: "Ombre bienveillante",
    labelArc: "OMBRE BIENVEILLANTE",
    category: 'gardien', expirable: true,
    tooltip: "Présence extrêmement discrète, respectant totalement l'intimité du lieu.",
    bg: '#1A3C34', iconColor: '#FDF0CC',
    svgIcon: `<path d="M11 20 Q20 11 29 20 Q20 29 11 20Z" fill="none" stroke="#FDF0CC" stroke-width="1.5"/><circle cx="20" cy="20" r="3.5" fill="#FDF0CC"/><circle cx="20" cy="20" r="1.5" fill="#1A3C34"/>`,
  },

  autonomie_expert: {
    label: "Autonomie totale",
    labelArc: "AUTONOMIE TOTALE",
    category: 'gardien', expirable: true,
    tooltip: "Capacité démontrée à gérer seul une propriété complexe ou isolée, sans supervision.",
    bg: '#1A3C34', iconColor: '#FDF0CC',
    svgIcon: `<circle cx="16" cy="14" r="4" fill="none" stroke="#FDF0CC" stroke-width="1.5"/><path d="M9 29 Q9 21 16 21 Q23 21 23 29" fill="none" stroke="#FDF0CC" stroke-width="1.5" stroke-linecap="round"/><path d="M25 20l2.5 2.5 4.5-4.5" stroke="#FDF0CC" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
  },

  confiance_aveugle: {
    label: "Confiance totale",
    labelArc: "CONFIANCE TOTALE",
    category: 'gardien', expirable: true,
    tooltip: "Honnêteté et intégrité absolue validées — accès aux zones sensibles sans dérive.",
    bg: '#1A3C34', iconColor: '#FDF0CC',
    svgIcon: `<path d="M15 19 Q15 14 20 14 Q25 14 25 19" fill="none" stroke="#FDF0CC" stroke-width="1.5"/><rect x="13" y="19" width="14" height="10" rx="2" fill="none" stroke="#FDF0CC" stroke-width="1.5"/><path d="M20 23c0-1.5 2-1.5 2 0 0 1.5-2 2.5-2 2.5s-2-1-2-2.5c0-1.5 2-1.5 2 0" fill="#FDF0CC"/>`,
  },

  // ══════════════════════════════════════════════════════════
  // PROPRIOS — #191970 | attribués par les gardiens | max 3/avis
  // ══════════════════════════════════════════════════════════

  guide_oignons: {
    label: "Guide aux petits oignons",
    labelArc: "GUIDE PARFAIT",
    category: 'proprio', expirable: true,
    tooltip: "Consignes claires, précises et livret d'accueil parfaitement documenté.",
    bg: '#191970', iconColor: '#FDF0CC',
    svgIcon: `<circle cx="20" cy="20" r="8" fill="none" stroke="#FDF0CC" stroke-width="1.5"/><path d="M20 13v2M20 27v-2M13 20h2M27 20h-2" stroke="#FDF0CC" stroke-width="1.5" stroke-linecap="round"/><path d="M20 17 L21.5 20 L20 23 L18.5 20Z" fill="#FDF0CC"/><circle cx="20" cy="20" r="1" fill="#191970"/>`,
  },

  frigo_rempli: {
    label: "Bienvenue gourmande",
    labelArc: "BIENVENUE GOURMANDE",
    category: 'proprio', expirable: true,
    tooltip: "Accueil généreux avec des attentions comestibles ou produits locaux.",
    bg: '#191970', iconColor: '#FDF0CC',
    svgIcon: `<path d="M20 12 C14 12 11 17 11 22 L29 22 C29 17 26 12 20 12Z" fill="none" stroke="#FDF0CC" stroke-width="1.5"/><line x1="9" y1="22" x2="31" y2="22" stroke="#FDF0CC" stroke-width="2" stroke-linecap="round"/><circle cx="20" cy="11" r="1.5" fill="#FDF0CC"/><line x1="15" y1="26" x2="25" y2="26" stroke="#FDF0CC" stroke-width="1.5" stroke-linecap="round"/>`,
  },

  animaux_en_or: {
    label: "Animaux en or",
    labelArc: "ANIMAUX EN OR",
    category: 'proprio', expirable: true,
    tooltip: "Animaux particulièrement bien éduqués, sociables et faciles à garder.",
    bg: '#191970', iconColor: '#FDF0CC',
    svgIcon: `<circle cx="20" cy="16" r="6.5" fill="none" stroke="#FDF0CC" stroke-width="1.5"/><path d="M20 13l.9 2.7h2.8l-2.3 1.7.9 2.7-2.3-1.7-2.3 1.7.9-2.7-2.3-1.7h2.8z" fill="#FFE27A"/><path d="M17 22v6M23 22v6M17 27h6" stroke="#FDF0CC" stroke-width="1.5" stroke-linecap="round"/>`,
  },

  coin_de_reve: {
    label: "Écrin de vie",
    labelArc: "ÉCRIN DE VIE",
    category: 'proprio', expirable: true,
    tooltip: "Le cadre de vie proposé est exceptionnel par son calme ou son design.",
    bg: '#191970', iconColor: '#FDF0CC',
    svgIcon: `<path d="M9 29L20 14L31 29Z" fill="none" stroke="#FDF0CC" stroke-width="1.5" stroke-linejoin="round"/><circle cx="27" cy="14" r="3.5" fill="none" stroke="#FDF0CC" stroke-width="1.5"/><path d="M27 10v-1.5M31 14h1.5M27 18v1.5M23 14h-1.5" stroke="#FDF0CC" stroke-width="1.5" stroke-linecap="round"/>`,
  },

  toujours_joignable: {
    label: "Ultra réactif",
    labelArc: "ULTRA RÉACTIF",
    category: 'proprio', expirable: true,
    tooltip: "Propriétaire disponible et aidant à la moindre question du gardien.",
    bg: '#191970', iconColor: '#FDF0CC',
    svgIcon: `<path d="M20 11 C15 11 13 15 13 19.5 L13 22 L10 25.5 L30 25.5 L27 22 L27 19.5 C27 15 25 11 20 11Z" fill="none" stroke="#FDF0CC" stroke-width="1.5" stroke-linejoin="round"/><path d="M17 25.5 C17 27.5 23 27.5 23 25.5" fill="none" stroke="#FDF0CC" stroke-width="1.5" stroke-linecap="round"/><circle cx="20" cy="11" r="1.5" fill="#FDF0CC"/>`,
  },

  confiance_imm: {
    label: "Laisser-faire total",
    labelArc: "LAISSER-FAIRE TOTAL",
    category: 'proprio', expirable: true,
    tooltip: "A su déléguer les clés et les responsabilités avec une confiance innée.",
    bg: '#191970', iconColor: '#FDF0CC',
    svgIcon: `<circle cx="16" cy="19" r="6" fill="none" stroke="#FDF0CC" stroke-width="1.5"/><circle cx="16" cy="19" r="2.5" fill="#FDF0CC"/><path d="M21.5 19 L30 19 L30 22 L28 22 L28 24 L26 24 L26 22 L24 22 L24 19" stroke="#FDF0CC" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
  },

  on_a_appris: {
    label: "Transmission",
    labelArc: "TRANSMISSION",
    category: 'proprio', expirable: true,
    tooltip: "Échange riche en savoirs, culture ou conseils locaux passionnants.",
    bg: '#191970', iconColor: '#FDF0CC',
    svgIcon: `<path d="M20 11c-4.5 0-6.5 3-6.5 6 0 2.5 1.5 5 5 6v2.5h3V23c3.5-1 5-3.5 5-6 0-3-2-6-6.5-6z" fill="none" stroke="#FDF0CC" stroke-width="1.5"/><line x1="17" y1="27" x2="23" y2="27" stroke="#FDF0CC" stroke-width="1.5" stroke-linecap="round"/><line x1="18.5" y1="29" x2="21.5" y2="29" stroke="#FDF0CC" stroke-width="1.5" stroke-linecap="round"/>`,
  },

  on_reviendra: {
    label: "Coup de cœur",
    labelArc: "COUP DE CŒUR",
    category: 'proprio', expirable: true,
    tooltip: "Expérience si positive que le gardien souhaite revenir en priorité.",
    bg: '#191970', iconColor: '#FDF0CC',
    svgIcon: `<path d="M13 19a8 8 0 0 1 12.5-4" fill="none" stroke="#FDF0CC" stroke-width="1.5" stroke-linecap="round"/><path d="M25.5 15l.5 5-5 .5" fill="none" stroke="#FDF0CC" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M27 21a8 8 0 0 1-12.5 4" fill="none" stroke="#FDF0CC" stroke-width="1.5" stroke-linecap="round"/><path d="M14.5 25l-.5-5 5-.5" fill="none" stroke="#FDF0CC" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M20 20c0-1.6 2.5-1.6 2.5 0 0 1.8-2.5 3-2.5 3s-2.5-1.2-2.5-3c0-1.6 2.5-1.6 2.5 0" fill="#FDF0CC" transform="translate(-2.5,0)"/>`,
  },

  equipement_top: {
    label: "Équipement au top",
    labelArc: "ÉQUIPEMENT AU TOP",
    category: 'proprio', expirable: true,
    tooltip: "Matériel, outils et confort mis à disposition de haute qualité.",
    bg: '#191970', iconColor: '#FDF0CC',
    svgIcon: `<rect x="12" y="18" width="16" height="11" rx="1" fill="none" stroke="#FDF0CC" stroke-width="1.5"/><path d="M16 18v-3q0-2 2-2h4q2 0 2 2v3" fill="none" stroke="#FDF0CC" stroke-width="1.5"/><line x1="12" y1="23" x2="28" y2="23" stroke="#FDF0CC" stroke-width="1.2"/><line x1="20" y1="21" x2="20" y2="25" stroke="#FDF0CC" stroke-width="1.5" stroke-linecap="round"/>`,
  },

  flexibilite_dates: {
    label: "Flexibilité totale",
    labelArc: "FLEXIBILITÉ TOTALE",
    category: 'proprio', expirable: true,
    tooltip: "Grande souplesse sur les horaires et les dates d'arrivée ou de départ.",
    bg: '#191970', iconColor: '#FDF0CC',
    svgIcon: `<rect x="12" y="15" width="16" height="14" rx="1" fill="none" stroke="#FDF0CC" stroke-width="1.5"/><line x1="12" y1="19" x2="28" y2="19" stroke="#FDF0CC" stroke-width="1.2"/><line x1="16" y1="13" x2="16" y2="17" stroke="#FDF0CC" stroke-width="1.5" stroke-linecap="round"/><line x1="24" y1="13" x2="24" y2="17" stroke="#FDF0CC" stroke-width="1.5" stroke-linecap="round"/><path d="M16 23l3-2.5 3 2.5-3 2.5z" fill="#FDF0CC"/>`,
  },

  rencontre_humaine: {
    label: "Bel échange",
    labelArc: "BEL ÉCHANGE",
    category: 'proprio', expirable: true,
    tooltip: "Qualité remarquable du contact humain lors de la remise des clés.",
    bg: '#191970', iconColor: '#FDF0CC',
    svgIcon: `<circle cx="15" cy="15" r="4" fill="none" stroke="#FDF0CC" stroke-width="1.5"/><circle cx="25" cy="15" r="4" fill="none" stroke="#FDF0CC" stroke-width="1.5"/><path d="M9 29 Q9 22 15 22" fill="none" stroke="#FDF0CC" stroke-width="1.5" stroke-linecap="round"/><path d="M31 29 Q31 22 25 22" fill="none" stroke="#FDF0CC" stroke-width="1.5" stroke-linecap="round"/><path d="M15 22 Q20 26 25 22" fill="none" stroke="#FDF0CC" stroke-width="1.5" stroke-linecap="round"/>`,
  },

  cadre_serein: {
    label: "Havre de paix",
    labelArc: "HAVRE DE PAIX",
    category: 'proprio', expirable: true,
    tooltip: "Absence totale de nuisances sonores. Calme absolu.",
    bg: '#191970', iconColor: '#FDF0CC',
    svgIcon: `<circle cx="20" cy="14" r="4" fill="none" stroke="#FDF0CC" stroke-width="1.5"/><path d="M20 10v-1.5M24.5 11.5l1-1M26 16h1.5M24.5 20.5l1 1M20 22v1.5M15.5 21.5l-1 1M14 16h-1.5M15.5 11.5l-1-1" stroke="#FDF0CC" stroke-width="1.2" stroke-linecap="round"/><path d="M11 27 Q14 24 17 27 Q20 30 23 27 Q26 24 29 27" fill="none" stroke="#FDF0CC" stroke-width="1.5" stroke-linecap="round"/>`,
  },

  // ══════════════════════════════════════════════════════════
  // SPÉCIAUX — métal fixe | admin ou automatique
  // ══════════════════════════════════════════════════════════

  fondateur: {
    label: "Pionnier Fondateur",
    labelArc: "PIONNIER FONDATEUR",
    category: 'special', expirable: false, fixedTier: 'gold',
    tooltip: "Membre de la première heure ayant bâti les bases de Guardiens.",
    bg: '#7A5200', iconColor: '#FFE27A',
    svgIcon: `<path d="M20 10l2.4 7.3H30l-6.2 4.5 2.4 7.3-6.2-4.5-6.2 4.5 2.4-7.3L10 17.3h7.6z" fill="#FFE27A"/>`,
  },

  gardien_urgence: {
    label: "Gardien d'urgence",
    labelArc: "GARDIEN D'URGENCE",
    category: 'special', expirable: false, fixedTier: 'gold',
    tooltip: "Gardien certifié disponible pour des interventions sous 24h/48h.",
    bg: '#B22222', iconColor: '#FFE27A',
    svgIcon: `<path d="M22.5 10l-5.5 11h5.5L18 30l11-14h-7z" fill="#FFE27A"/>`,
  },

  id_verifiee: {
    label: "Profil vérifié",
    labelArc: "PROFIL VÉRIFIÉ",
    category: 'special', expirable: false, fixedTier: 'steel',
    tooltip: "Identité et documents officiels validés par nos services de sécurité.",
    bg: '#4A4A4A', iconColor: '#FDF0CC',
    svgIcon: `<path d="M20 11l9.5 3.5v7.5c0 4.5-4 7.5-9.5 8-5.5-.5-9.5-3.5-9.5-8v-7.5z" fill="none" stroke="#FDF0CC" stroke-width="1.5" stroke-linejoin="round"/><path d="M15.5 20.5l3.5 3.5 6-6" stroke="#FDF0CC" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
  },

  courant_passe: {
    label: "Le courant passe",
    labelArc: "LE COURANT PASSE",
    category: 'special', expirable: false, fixedTier: 'gold',
    tooltip: "Les deux parties se sont évalué positivement à l'issue de la garde.",
    bg: '#7A5200', iconColor: '#FFE27A',
    svgIcon: `<rect x="17" y="14" width="6" height="8" rx="1" fill="none" stroke="#FFE27A" stroke-width="1.5"/><line x1="19" y1="13" x2="19" y2="14" stroke="#FFE27A" stroke-width="2" stroke-linecap="round"/><line x1="21" y1="13" x2="21" y2="14" stroke="#FFE27A" stroke-width="2" stroke-linecap="round"/><path d="M20 22 L20 25 Q20 29 24 29 Q28 29 28 25 L28 22" fill="none" stroke="#FFE27A" stroke-width="1.5" stroke-linecap="round"/>`,
  },

  // ══════════════════════════════════════════════════════════
  // MISSIONS — #2F2F2F | 1 max par mission | métal fixe gris
  // ══════════════════════════════════════════════════════════

  coup_de_main_or: {
    label: "Coup de main",
    labelArc: "COUP DE MAIN",
    category: 'mission', expirable: false, fixedTier: 'bronze',
    tooltip: "Réussite d'une micro-mission de service ou d'entraide.",
    bg: '#2F2F2F', iconColor: '#FDF0CC',
    svgIcon: `<path d="M20 11l1.6 5H27l-4.2 3 1.6 5-4.2-3-4.2 3 1.6-5L13.5 16h5.3z" fill="#D4AF37"/><path d="M15 28V22h1.5v-3h1V22h1v-4h1V22h1v-3.5h1V22h2v4c0 1.5-1.5 2.5-4 2.5s-3.5-1-3.5-1" fill="#FDF0CC"/>`,
  },

  super_voisin: {
    label: "Personne en or",
    labelArc: "PERSONNE EN OR",
    category: 'mission', expirable: false, fixedTier: 'bronze',
    tooltip: "Entraide de proximité validée par la communauté.",
    bg: '#2F2F2F', iconColor: '#FDF0CC',
    svgIcon: `<path d="M20 12l9 9v8H11v-8z" fill="rgba(253,240,204,.08)" stroke="#FDF0CC" stroke-width="1.5" stroke-linejoin="round"/><path d="M20 23.5c0-2 3-2 3 0 0 2.5-3 4-3 4s-3-1.5-3-4c0-2 3-2 3 0" fill="#FDF0CC"/>`,
  },

  on_remet_ca: {
    label: "Mission récurrente",
    labelArc: "MISSION RÉCURRENTE",
    category: 'mission', expirable: false, fixedTier: 'bronze',
    tooltip: "Utilisateur ayant effectué plusieurs petites missions avec succès.",
    bg: '#2F2F2F', iconColor: '#FDF0CC',
    svgIcon: `<path d="M13 18a8 8 0 0 1 12.5-4.2" fill="none" stroke="#FDF0CC" stroke-width="1.5" stroke-linecap="round"/><path d="M25.5 13.8l.5 5-5 .5" fill="none" stroke="#FDF0CC" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M27 22a8 8 0 0 1-12.5 4.2" fill="none" stroke="#FDF0CC" stroke-width="1.5" stroke-linecap="round"/><path d="M14.5 26.2l-.5-5 5-.5" fill="none" stroke="#FDF0CC" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,
  },

}
