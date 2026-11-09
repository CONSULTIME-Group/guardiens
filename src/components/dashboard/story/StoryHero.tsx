/**
 * Lot L4 (08/11/2026, arène tableau de bord v2, direction B « Votre garde,
 * racontée ») : le récit en tête de l'accueil sur téléphone.
 *
 * Une gouache, le chapitre, la phrase, la frise quand l'annonce existe, un
 * seul bouton plein, un lien second facultatif. Avant la première annonce, la
 * question « Vous partez quand ? » remplace la frise (puces en contour).
 * Mode compact (texte agrandi, zoom) : gouache retirée, bouton juste sous le
 * titre, phrase et frise ensuite (bouton visible à 130 %).
 */
import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { trackEvent } from "@/lib/analytics";
import { STORY_EVENTS, type Story, type StoryLink } from "@/lib/dashboardStory";
import { PERIOD_BUTTONS, type DeparturePeriod } from "@/lib/ownerDeparture";
import { cn } from "@/lib/utils";
import DashEyebrow from "@/components/dashboard/owner/DashEyebrow";
import GardeFrise from "./GardeFrise";
import { STORY_ART } from "./storyArt";

export interface StoryPeriodPicker {
  value: DeparturePeriod | null;
  onPick: (p: DeparturePeriod) => void;
  busy?: boolean;
}

interface Props {
  story: Story;
  compact?: boolean;
  /** Première annonce : la question de départ, en puces. */
  periodPicker?: StoryPeriodPicker | null;
  /** Mesure : un seul « vu » par chapitre et par montage. */
  track?: boolean;
  /**
   * Lot L9 : geste ouvert sur place (lien porteur d'une action, « prepare »).
   * Sans ce rappel, le lien est suivi comme avant.
   */
  onAction?: (link: StoryLink) => void;
  /**
   * Lot D3 : sur ordinateur, le récit vit sous l'accueil (qui porte le h1) :
   * titre en h2, bouton à sa largeur, mesure notée layout desktop.
   */
  layout?: "phone" | "desktop";
}

/** Vrai si le bas du bouton tient dans la fenêtre au premier affichage. */
export function ctaAboveFold(el: Element | null): boolean | null {
  if (!el || typeof window === "undefined") return null;
  const r = el.getBoundingClientRect();
  if (!r.height) return null;
  return r.bottom <= window.innerHeight;
}

export default function StoryHero({ story, compact = false, periodPicker, track = true, onAction, layout = "phone" }: Props) {
  const desktop = layout === "desktop";
  const ctaRef = useRef<HTMLAnchorElement & HTMLButtonElement>(null);
  const seenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!track) return;
    const key = `${story.space}:${story.chapter}`;
    if (seenRef.current === key) return;
    seenRef.current = key;
    trackEvent(STORY_EVENTS.seen, {
      source: "/dashboard",
      metadata: {
        space: story.space,
        chapter: story.chapter,
        compact,
        above_fold: ctaAboveFold(ctaRef.current),
        layout,
      },
    });
  }, [story.space, story.chapter, compact, track, layout]);

  const onCta = () => {
    if (!track) return;
    trackEvent(STORY_EVENTS.ctaClicked, {
      source: "/dashboard",
      metadata: { space: story.space, chapter: story.chapter, href: story.cta.href, action: story.cta.action ?? null, layout },
    });
  };
  const ctaAction = story.cta.action && onAction ? () => onAction(story.cta) : null;
  const secondaryAction = story.secondary?.action && onAction ? () => onAction(story.secondary!) : null;
  const ctaClass = desktop
    ? "inline-flex min-h-[48px] items-center justify-center rounded-full bg-primary px-[22px] text-center text-[15px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
    : cn("flex min-h-[48px] w-full items-center justify-center rounded-full bg-primary px-[20px] text-center text-[16px] font-semibold text-primary-foreground transition-opacity hover:opacity-90", compact ? "mt-[14px]" : "mt-[18px]");
  const secondaryClass = desktop
    ? "ml-[18px] inline-flex min-h-[44px] items-center text-[14px] font-medium text-foreground underline underline-offset-4"
    : "mt-[6px] flex min-h-[44px] w-full items-center justify-center text-[15px] font-medium text-foreground underline underline-offset-4";

  const art = STORY_ART[story.art];
  const actions = (
    <>
      {ctaAction ? (
        <button
          ref={ctaRef}
          type="button"
          onClick={() => {
            onCta();
            ctaAction();
          }}
          data-testid="story-cta"
          aria-haspopup="dialog"
          className={ctaClass}
        >
          {story.cta.label}
        </button>
      ) : (
        <Link ref={ctaRef} to={story.cta.href} onClick={onCta} data-testid="story-cta" className={ctaClass}>
          {story.cta.label}
        </Link>
      )}
      {story.secondary &&
        (secondaryAction ? (
          <button type="button" onClick={secondaryAction} data-testid="story-secondary" aria-haspopup="dialog" className={secondaryClass}>
            {story.secondary.label}
          </button>
        ) : (
          <Link to={story.secondary.href} data-testid="story-secondary" className={secondaryClass}>
            {story.secondary.label}
          </Link>
        ))}
    </>
  );

  return (
    <section
      aria-label="Votre garde"
      data-testid="story-hero"
      data-chapter={story.chapter}
      data-compact={compact ? "true" : "false"}
      data-layout={layout}
      className={cn("rounded-[20px]", desktop ? "px-[32px] py-[28px]" : compact ? "p-[16px]" : "p-[20px]")}
      style={{ backgroundColor: "hsl(var(--hero-paper))" }}
    >
      <div className="flex items-start justify-between gap-[12px]">
        <div className="min-w-0 pt-[4px]">
          <DashEyebrow>{story.eyebrow}</DashEyebrow>
        </div>
        {!compact && art && (
          <img
            src={art}
            alt=""
            aria-hidden="true"
            width={88}
            height={72}
            fetchPriority="high"
            decoding="async"
            className="-mt-[6px] -mr-[4px] h-[72px] w-[88px] shrink-0 object-contain"
            data-testid="story-art"
          />
        )}
      </div>

      {desktop ? (
        <h2 className="mt-[2px] font-heading text-[28px] font-semibold leading-[1.15] text-foreground">{story.title}</h2>
      ) : (
        <h1
          className={cn(
            "font-heading font-semibold text-foreground leading-[1.15]",
            compact ? "mt-[8px] text-[22px]" : "mt-[2px] text-[25px]",
          )}
        >
          {story.title}
        </h1>
      )}
      {compact && actions}
      {story.lead && (
        <p className={cn("leading-snug text-foreground/80", compact ? "mt-[12px] text-[14px]" : "mt-[8px] text-[15px]")}>{story.lead}</p>
      )}

      {story.frieze && <GardeFrise frieze={story.frieze} compact={compact} />}

      {periodPicker && !story.frieze && (
        <div className="mt-[14px] flex flex-wrap gap-[8px]" role="group" aria-label="Vous partez quand ?" data-testid="story-periods">
          {PERIOD_BUTTONS.filter((b) => b.period !== "plus_tard").map((b) => {
            const on = periodPicker.value === b.period;
            return (
              <button
                key={b.period}
                type="button"
                disabled={periodPicker.busy}
                aria-pressed={on}
                onClick={() => periodPicker.onPick(b.period)}
                className={cn(
                  "min-h-[44px] rounded-full border-[1.5px] px-[14px] text-[14px] font-semibold transition-colors disabled:opacity-60",
                  on ? "border-primary bg-primary/10 text-foreground" : "border-border bg-card text-foreground",
                )}
              >
                {b.label}
              </button>
            );
          })}
        </div>
      )}

      {!compact && (desktop ? <div className="mt-[20px] flex flex-wrap items-center">{actions}</div> : actions)}
    </section>
  );
}
