import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/* ── SVG illustrations ── */

const SleepingCat = () => (
  <svg viewBox="0 0 200 140" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-48 h-auto mx-auto" aria-hidden>
    {/* Cushion */}
    <ellipse cx="100" cy="115" rx="75" ry="18" fill="hsl(var(--primary) / 0.08)" />
    <ellipse cx="100" cy="112" rx="65" ry="14" fill="hsl(var(--primary) / 0.12)" />
    {/* Body curl */}
    <path d="M60 100 Q55 75 70 65 Q90 52 110 60 Q130 68 135 90 Q138 105 120 110 Q95 118 70 112 Z" stroke="hsl(var(--foreground))" strokeWidth="2" fill="none" strokeLinecap="round" />
    {/* Head */}
    <circle cx="72" cy="72" r="14" stroke="hsl(var(--foreground))" strokeWidth="2" fill="none" />
    {/* Ears */}
    <path d="M62 62 L56 48 L68 58" stroke="hsl(var(--foreground))" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M78 58 L82 44 L88 56" stroke="hsl(var(--foreground))" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    {/* Closed eyes */}
    <path d="M65 72 Q68 69 71 72" stroke="hsl(var(--foreground))" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M75 70 Q78 67 81 70" stroke="hsl(var(--foreground))" strokeWidth="1.5" strokeLinecap="round" />
    {/* Nose */}
    <circle cx="73" cy="76" r="1.5" fill="hsl(var(--foreground))" opacity="0.5" />
    {/* Tail */}
    <path d="M130 95 Q145 85 148 95 Q150 102 140 105" stroke="hsl(var(--foreground))" strokeWidth="2" fill="none" strokeLinecap="round" />
    {/* Zzz */}
    <text x="90" y="45" fill="hsl(var(--primary))" fontSize="11" fontWeight="600" opacity="0.5">z</text>
    <text x="100" y="35" fill="hsl(var(--primary))" fontSize="14" fontWeight="600" opacity="0.4">z</text>
    <text x="112" y="25" fill="hsl(var(--primary))" fontSize="17" fontWeight="600" opacity="0.3">z</text>
  </svg>
);

const EmptyMailbox = () => (
  <svg viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-48 h-auto mx-auto" aria-hidden>
    {/* Post */}
    <rect x="96" y="85" width="8" height="55" rx="2" fill="hsl(var(--muted-foreground) / 0.2)" />
    {/* Mailbox body */}
    <rect x="55" y="50" width="90" height="45" rx="8" stroke="hsl(var(--foreground))" strokeWidth="2" fill="none" />
    {/* Rounded top */}
    <path d="M55 65 Q55 50 70 45 Q100 35 130 45 Q145 50 145 65" stroke="hsl(var(--foreground))" strokeWidth="2" fill="none" />
    {/* Flag up */}
    <rect x="145" y="52" width="4" height="25" rx="1" fill="hsl(var(--primary))" opacity="0.6" />
    <path d="M149 52 L165 58 L149 64" fill="hsl(var(--primary))" opacity="0.4" />
    {/* Opening */}
    <rect x="80" y="68" width="40" height="4" rx="2" fill="hsl(var(--foreground))" opacity="0.2" />
    {/* Little heart */}
    <path d="M100 82 L97 79 Q94 76 97 73 Q100 70 100 73 Q100 70 103 73 Q106 76 103 79 Z" fill="hsl(var(--primary))" opacity="0.3" />
    {/* Ground */}
    <path d="M40 140 Q100 138 160 140" stroke="hsl(var(--muted-foreground))" strokeWidth="1" opacity="0.3" strokeLinecap="round" />
    {/* Small flower left */}
    <circle cx="65" cy="135" r="3" fill="hsl(var(--primary))" opacity="0.2" />
    <line x1="65" y1="135" x2="65" y2="142" stroke="hsl(var(--primary))" strokeWidth="1" opacity="0.2" />
    {/* Small flower right */}
    <circle cx="140" cy="133" r="3" fill="hsl(var(--primary))" opacity="0.15" />
    <line x1="140" y1="133" x2="140" y2="142" stroke="hsl(var(--primary))" strokeWidth="1" opacity="0.15" />
  </svg>
);

const WalkingDog = () => (
  <svg viewBox="0 0 220 140" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-52 h-auto mx-auto" aria-hidden>
    {/* Ground */}
    <path d="M20 120 Q110 118 200 120" stroke="hsl(var(--muted-foreground))" strokeWidth="1" opacity="0.3" strokeLinecap="round" />
    {/* Dog body */}
    <ellipse cx="110" cy="85" rx="35" ry="18" stroke="hsl(var(--foreground))" strokeWidth="2" fill="none" />
    {/* Head */}
    <circle cx="148" cy="68" r="14" stroke="hsl(var(--foreground))" strokeWidth="2" fill="none" />
    {/* Neck */}
    <path d="M138 80 Q142 75 145 72" stroke="hsl(var(--foreground))" strokeWidth="2" strokeLinecap="round" />
    {/* Snout */}
    <ellipse cx="160" cy="72" rx="7" ry="5" stroke="hsl(var(--foreground))" strokeWidth="1.5" fill="none" />
    <circle cx="162" cy="71" r="1.5" fill="hsl(var(--foreground))" opacity="0.5" />
    {/* Eye */}
    <circle cx="150" cy="64" r="2" fill="hsl(var(--foreground))" />
    {/* Ear */}
    <path d="M140 60 Q135 48 142 55" stroke="hsl(var(--foreground))" strokeWidth="2" strokeLinecap="round" />
    {/* Tail (wagging) */}
    <path d="M75 80 Q62 60 55 50" stroke="hsl(var(--foreground))" strokeWidth="2" strokeLinecap="round" />
    {/* Legs */}
    <line x1="95" y1="100" x2="90" y2="120" stroke="hsl(var(--foreground))" strokeWidth="2" strokeLinecap="round" />
    <line x1="105" y1="100" x2="100" y2="120" stroke="hsl(var(--foreground))" strokeWidth="2" strokeLinecap="round" />
    <line x1="120" y1="100" x2="125" y2="120" stroke="hsl(var(--foreground))" strokeWidth="2" strokeLinecap="round" />
    <line x1="130" y1="100" x2="135" y2="120" stroke="hsl(var(--foreground))" strokeWidth="2" strokeLinecap="round" />
    {/* Collar */}
    <path d="M140 78 Q145 82 150 78" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" />
    {/* Leash hint */}
    <path d="M145 80 Q160 95 175 100" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" strokeDasharray="3 3" />
  </svg>
);

const EmptyCalendar = () => (
  <svg viewBox="0 0 180 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-44 h-auto mx-auto" aria-hidden>
    {/* Calendar body */}
    <rect x="30" y="40" width="120" height="100" rx="10" stroke="hsl(var(--foreground))" strokeWidth="2" fill="none" />
    {/* Top bar */}
    <rect x="30" y="40" width="120" height="28" rx="10" fill="hsl(var(--primary) / 0.1)" stroke="hsl(var(--foreground))" strokeWidth="2" />
    {/* Rings */}
    <line x1="65" y1="32" x2="65" y2="48" stroke="hsl(var(--foreground))" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="115" y1="32" x2="115" y2="48" stroke="hsl(var(--foreground))" strokeWidth="2.5" strokeLinecap="round" />
    {/* Grid dots (empty days) */}
    {[0, 1, 2, 3].map(row =>
      [0, 1, 2, 3, 4].map(col => (
        <circle key={`${row}-${col}`} cx={52 + col * 22} cy={82 + row * 14} r="2.5" fill="hsl(var(--muted-foreground))" opacity="0.15" />
      ))
    )}
    {/* Paw print in center */}
    <circle cx="90" cy="100" r="4" fill="hsl(var(--primary))" opacity="0.3" />
    <circle cx="82" cy="92" r="2.5" fill="hsl(var(--primary))" opacity="0.25" />
    <circle cx="98" cy="92" r="2.5" fill="hsl(var(--primary))" opacity="0.25" />
    <circle cx="84" cy="84" r="2" fill="hsl(var(--primary))" opacity="0.2" />
    <circle cx="96" cy="84" r="2" fill="hsl(var(--primary))" opacity="0.2" />
  </svg>
);

const HeartBookmark = () => (
  <svg viewBox="0 0 180 150" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-44 h-auto mx-auto" aria-hidden>
    {/* Bookmark shape */}
    <path d="M60 25 L60 125 L90 105 L120 125 L120 25 Q120 20 115 18 L65 18 Q60 20 60 25 Z" stroke="hsl(var(--foreground))" strokeWidth="2" fill="hsl(var(--primary) / 0.05)" />
    {/* Heart */}
    <path d="M90 75 L80 65 Q70 55 80 45 Q90 35 90 50 Q90 35 100 45 Q110 55 100 65 Z" fill="hsl(var(--primary))" opacity="0.25" stroke="hsl(var(--primary))" strokeWidth="1.5" />
    {/* Sparkles */}
    <path d="M50 50 L52 45 L54 50 L59 52 L54 54 L52 59 L50 54 L45 52 Z" fill="hsl(var(--primary))" opacity="0.2" />
    <path d="M130 40 L131 37 L132 40 L135 41 L132 42 L131 45 L130 42 L127 41 Z" fill="hsl(var(--primary))" opacity="0.15" />
    <path d="M135 75 L136 72 L137 75 L140 76 L137 77 L136 80 L135 77 L132 76 Z" fill="hsl(var(--primary))" opacity="0.2" />
  </svg>
);

export const ILLUSTRATIONS = {
  sleepingCat: SleepingCat,
  emptyMailbox: EmptyMailbox,
  walkingDog: WalkingDog,
  emptyCalendar: EmptyCalendar,
  heartBookmark: HeartBookmark,
} as const;

export type IllustrationKey = keyof typeof ILLUSTRATIONS;

interface EmptyStateProps {
  illustration?: IllustrationKey;
  title: string;
  description?: string;
  actionLabel?: string;
  actionTo?: string;
  actionIcon?: LucideIcon;
  onAction?: () => void;
  className?: string;
}

const EmptyState = ({
  illustration = "sleepingCat",
  title,
  description,
  actionLabel,
  actionTo,
  actionIcon: ActionIcon = ArrowRight,
  onAction,
  className = "",
}: EmptyStateProps) => {
  const Illustration = ILLUSTRATIONS[illustration];

  return (
    <div className={`text-center py-16 px-4 space-y-5 animate-fade-in ${className}`}>
      <Illustration />
      <div className="space-y-2">
        <h3 className="font-heading text-lg font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">{description}</p>
        )}
      </div>
      {actionLabel && actionTo && (
        <Link to={actionTo}>
          <Button variant="outline" className="gap-2 mt-2">
            {actionLabel}
            <ActionIcon className="h-4 w-4" />
          </Button>
        </Link>
      )}
      {actionLabel && onAction && !actionTo && (
        <Button variant="outline" className="gap-2 mt-2" onClick={onAction}>
          {actionLabel}
          <ActionIcon className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
