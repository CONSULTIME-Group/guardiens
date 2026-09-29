import { isFreeAccessForAll } from "@/lib/pricing";

interface FreePeriodBannerProps {
  className?: string;
}

/**
 * Ancien bandeau « Gratuit pour tous jusqu'au… ». Il annonçait une fin de
 * gratuité calculée depuis une date codée en dur (GRACE_END, retirée).
 * Masqué tant que l'accès est gratuit pour tous ; une fois le payant en
 * vigueur, il n'y a plus de période gratuite à annoncer, il reste masqué.
 * Composant conservé (export stable), sans aucune date codée en dur.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const FreePeriodBanner = (_props: FreePeriodBannerProps) => {
  if (isFreeAccessForAll()) return null;
  return null;
};

export default FreePeriodBanner;
