/**
 * Pages officielles de Guardiens sur les réseaux sociaux (vérifiées le 08/11/2026
 * depuis les comptes administrateurs). Source unique pour la page contact et le
 * sameAs du balisage Organization de l'accueil.
 */
export type SocialLink = { name: "Facebook" | "Instagram" | "LinkedIn"; label: string; url: string };

export const SOCIAL_LINKS: SocialLink[] = [
  { name: "Facebook", label: "Page Facebook Guardiens", url: "https://www.facebook.com/profile.php?id=61592310607948" },
  { name: "Instagram", label: "Instagram @guardiens_fr", url: "https://www.instagram.com/guardiens_fr/" },
  { name: "LinkedIn", label: "Page LinkedIn Guardiens", url: "https://www.linkedin.com/company/guardiens/" },
];
