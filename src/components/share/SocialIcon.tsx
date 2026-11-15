import { Facebook, Instagram, Linkedin, Youtube, type LucideProps } from "lucide-react";
import type { SocialLink } from "@/data/socialLinks";

/** Logo TikTok en tracé simple (lucide-react n'en fournit pas). */
const TikTok = ({ className }: Pick<LucideProps, "className">) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true" focusable="false">
    <path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5 2.6 2.6 0 0 1 0-5.2c.27 0 .53.04.78.12V9.65a5.7 5.7 0 0 0-.78-.05 5.7 5.7 0 1 0 5.68 5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3a4.3 4.3 0 0 1-3.24-1.48Z" />
  </svg>
);

/** Icône d'un réseau de SOCIAL_LINKS, partagée par la page contact et le pied de page. */
export function SocialIcon({ name, className }: { name: SocialLink["name"]; className?: string }) {
  switch (name) {
    case "Facebook":
      return <Facebook className={className} aria-hidden="true" />;
    case "Instagram":
      return <Instagram className={className} aria-hidden="true" />;
    case "TikTok":
      return <TikTok className={className} />;
    case "YouTube":
      return <Youtube className={className} aria-hidden="true" />;
    case "LinkedIn":
      return <Linkedin className={className} aria-hidden="true" />;
  }
}
