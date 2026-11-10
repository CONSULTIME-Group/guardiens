import { Car, Clock, HandHeart, Heart, House, PawPrint } from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS = { car: Car, clock: Clock, hand: HandHeart, heart: Heart, home: House, paw: PawPrint } as const;
export type SectionBadgeTone = "sage" | "peach" | "honey" | "sky";

const TONES: Record<SectionBadgeTone, string> = {
  sage: "bg-pastel-sage text-pastel-sage-ink",
  peach: "bg-pastel-peach text-pastel-peach-ink",
  honey: "bg-pastel-honey text-pastel-honey-ink",
  sky: "bg-pastel-sky text-pastel-sky-ink",
};

/** Pastille ronde d'icône en tête de bloc (design pastel, 10/11/2026). */
const SectionBadge = ({
  icon,
  tone,
  size = 40,
  className,
}: {
  icon: keyof typeof ICONS;
  tone: SectionBadgeTone;
  size?: 32 | 36 | 40;
  className?: string;
}) => {
  const Icon = ICONS[icon];
  const box = size === 40 ? "h-10 w-10" : size === 36 ? "h-9 w-9" : "h-8 w-8";
  return (
    <span aria-hidden className={cn("inline-flex shrink-0 items-center justify-center rounded-full", box, TONES[tone], className)}>
      <Icon className={size === 32 ? "h-4 w-4" : "h-5 w-5"} />
    </span>
  );
};

export default SectionBadge;
