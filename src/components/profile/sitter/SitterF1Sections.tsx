import { formatRatingFr } from "@/lib/formatRatingFr";
/**
 * Fiche gardien publique allégée (lot F1), onglet « Côté gardien ».
 * Sections sans cadre, séparées par l'espace. Tokens existants uniquement.
 */
import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Shield } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import FavoriteButton from "@/components/shared/FavoriteButton";
import StatutGardienBadge from "@/components/profile/StatutGardienBadge";
import { lastVisitLabel, type HelpOffer } from "@/lib/profileSignals";
import ResponsivenessBadge from "@/components/profile/ResponsivenessBadge";
import type { HeroCtaVariant } from "@/components/profile/ProfileHero";
import { BADGE_DEFINITIONS } from "@/components/badges/badge-definitions";
import { avatarImageUrl } from "@/lib/storageImage";
import { getMemberAvatarUrl, getMemberPublicFirstName } from "@/lib/memberUtils";
import { capitalizeFirstName } from "@/lib/displayName";
import type { SkillGroup, SkillSpot } from "@/lib/sitterSkillGroups";
import { cutLongText, reviewDateLabel } from "@/lib/sitterProfileFacts";
import spotVerger from "@/assets/missions/spot-verger-160.webp";

import { SPOTS } from "@/components/profile/skillSpots";
export { SPOTS };

/* ── Titre de section : trait 22 px + eyebrow + H2 ─────────────────── */
export const SectionHeading = ({ eyebrow, title, id }: { eyebrow: string; title: ReactNode; id?: string }) => (
  <div className="mb-[22px]">
    <p className="flex items-center gap-2 text-[12px] uppercase tracking-[0.16em] text-secondary font-body font-semibold">
      <span aria-hidden="true" className="inline-block h-px w-[22px] bg-secondary" />
      {eyebrow}
    </p>
    <h2 id={id} className="font-heading text-[24px] md:text-[30px] font-semibold text-foreground mt-2 leading-tight">
      {title}
    </h2>
  </div>
);

/* ── Ses savoir-faire ─────────────────────────────────────────────── */
export const SitterSkillsSection = ({
  groups,
  totalCount,
  headline,
  competences,
  specialSkills,
}: {
  groups: SkillGroup[];
  totalCount: number;
  headline: string;
  competences: string[];
  specialSkills: string[];
}) => {
  const [open, setOpen] = useState(false);
  if (groups.length === 0) return null;
  return (
    <section aria-label="Ses savoir-faire" className="scroll-mt-20">
      <SectionHeading eyebrow="Ses savoir-faire" title={headline} />
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-y-5 gap-x-10">
        {groups.map((g) => (
          <li key={g.key} className="flex items-center gap-[14px] min-w-0">
            {SPOTS[g.spot] ? (
              <img src={SPOTS[g.spot]} alt="" aria-hidden="true" width={46} height={46} loading="lazy" decoding="async" className="h-[46px] w-[46px] shrink-0 object-contain" />
            ) : (
              <span aria-hidden="true" className="h-[46px] w-[46px] shrink-0" />
            )}
            <span className="min-w-0">
              <span className="block text-[15px] font-semibold text-foreground font-body">{g.label}</span>
              {g.detail && <span className="block text-[13.5px] text-muted-foreground font-body">{g.detail}</span>}
            </span>
          </li>
        ))}
      </ul>
      {totalCount > 0 && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="mt-[22px] inline-flex items-center gap-1.5 text-[14px] font-medium text-primary underline underline-offset-4 font-body"
        >
          {open ? "Replier la liste" : `Voir ses ${totalCount} savoir-faire`}
          <ArrowRight className={`h-4 w-4 transition-transform ${open ? "rotate-90" : ""}`} aria-hidden="true" />
        </button>
      )}
      {open && (
        <div className="mt-[22px] grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
          {competences.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-foreground font-body mb-2.5">Savoir-faire</h3>
              <div className="flex flex-wrap gap-1.5">
                {competences.map((c) => (
                  <span key={c} className="border border-border bg-card rounded-full text-xs px-2.5 py-1 text-foreground/80 font-body">{c}</span>
                ))}
              </div>
            </div>
          )}
          {specialSkills.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-foreground font-body mb-2.5">Soins spécifiques</h3>
              <div className="flex flex-wrap gap-1.5">
                {specialSkills.map((c) => (
                  <span key={c} className="border border-border bg-card rounded-full text-xs px-2.5 py-1 text-foreground/80 font-body">{c}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

/* ── Avis éditoriaux ──────────────────────────────────────────────── */
export const EditorialReview = ({ review, badgeIds }: { review: any; badgeIds: string[] }) => {
  const name = capitalizeFirstName(getMemberPublicFirstName(review.reviewer, "Membre"));
  const avatarUrl = getMemberAvatarUrl(review.reviewer);
  const rating = Number(review.overall_rating) || 0;
  const labels = badgeIds.map((b) => BADGE_DEFINITIONS[b]?.label).filter(Boolean) as string[];
  return (
    <article className="py-[34px] first:pt-0 border-t border-border first:border-t-0">
      <div className="flex items-center gap-3 text-[13.5px] text-muted-foreground font-body">
        {rating > 0 && (
          <span className="text-founder tracking-wide" aria-label={`${rating} sur 5`}>
            {"★".repeat(rating)}
          </span>
        )}
        <span>{reviewDateLabel(review.sit_start_date, review.sit_end_date, review.created_at)}</span>
      </div>
      {review.comment && (
        <p className="mt-[14px] font-heading italic text-[18px] md:text-[21px] leading-[1.55] text-foreground whitespace-pre-line">
          « {review.comment} »
        </p>
      )}
      <footer className="mt-[14px] flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Avatar className="w-9 h-9">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
            <AvatarFallback className="text-xs bg-founder-soft text-founder-foreground">{name.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <span className="text-sm font-semibold text-foreground font-body">{name}</span>
        </div>
        {labels.length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label="Badges attribués pendant cette garde">
            {labels.map((l, i) => (
              <li key={l} className="rounded-full bg-founder-soft border border-founder-border px-2.5 py-0.5 text-[12px] text-founder-foreground font-body">
                {i === 0 ? `★ ${l}` : l}
              </li>
            ))}
          </ul>
        )}
      </footer>
    </article>
  );
};

/* ── Qui est {prénom} ─────────────────────────────────────────────── */
export const SitterAboutSection = ({
  firstName,
  motivation,
  bio,
  facts,
  deptLink,
  children,
}: {
  firstName: string;
  motivation: string;
  bio: string;
  facts: Array<{ label: string; value: string }>;
  deptLink: { href: string; label: string } | null;
  children?: ReactNode;
}) => {
  const [open, setOpen] = useState(false);
  const full = [motivation, bio].filter(Boolean).join("\n\n");
  const cut = cutLongText(full);
  // L5 : section masquée quand rien de réel n'est à montrer.
  if (!full && facts.length === 0 && !children) return null;
  return (
    <section aria-label={`À propos de ${firstName}`} className="scroll-mt-20">
      <SectionHeading eyebrow="À propos" title={`Qui est ${firstName}.`} />
      {full && (
        <div className="max-w-[700px]">
          <p className="text-[16px] leading-[1.7] text-foreground font-body whitespace-pre-line">
            {open || !cut.truncated ? full : cut.text}
          </p>
          {cut.truncated && (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              className="mt-2 text-[14px] font-medium text-primary underline underline-offset-4 font-body"
            >
              {open ? "Replier" : "Lire la suite"}
            </button>
          )}
        </div>
      )}
      {facts.length > 0 && (
        <dl className="mt-[34px] pt-[22px] border-t border-border grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-5">
          {facts.map((f) => (
            <div key={f.label} className="min-w-0">
              <dt className="text-[11.5px] uppercase tracking-[0.14em] text-secondary font-body font-semibold">{f.label}</dt>
              <dd className="mt-1 text-[14.5px] text-foreground font-body break-words">{f.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {deptLink && (
        <p className="mt-[22px]">
          <Link to={deptLink.href} className="text-[14px] text-muted-foreground underline underline-offset-4 hover:text-foreground">
            {deptLink.label}
          </Link>
        </p>
      )}
      {children && <div className="mt-[34px]">{children}</div>}
    </section>
  );
};

/* ── Bandeau entraide ─────────────────────────────────────────────── */
export const EntraideBand = ({
  text,
  link,
}: {
  text: string;
  link: { label: string; to?: string; onClick?: () => void } | null;
}) => (
  <section
    aria-label="Aussi là pour un coup de main"
    className="flex items-start gap-[14px] md:gap-[22px] rounded-[20px] bg-secondary/10 pt-[22px] pr-[28px] pb-[22px] pl-[18px]"
  >
    <img src={spotVerger} alt="" aria-hidden="true" width={76} height={76} loading="lazy" decoding="async" className="h-[52px] w-[52px] md:h-[76px] md:w-[76px] shrink-0 object-contain" />
    <div className="min-w-0">
      <p className="text-[12px] uppercase tracking-[0.16em] text-secondary font-body font-semibold">Aussi là pour un coup de main</p>
      <p className="mt-2 text-[15.5px] leading-relaxed text-foreground font-body whitespace-pre-line break-words">{text}</p>
      {link && (
        link.to ? (
          <Link to={link.to} className="mt-2 inline-flex items-center gap-1 text-[14px] font-medium text-primary underline underline-offset-4">
            {link.label} <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        ) : (
          <button type="button" onClick={link.onClick} className="mt-2 inline-flex items-center gap-1 text-[14px] font-medium text-primary underline underline-offset-4">
            {link.label} <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        )
      )}
    </div>
  </section>
);

/* ── Offre d'entraide déclarée (lot L3) ──────────────────────────── */
export const EntraideOfferSection = ({
  offer,
  firstName,
  city,
}: {
  offer: HelpOffer;
  firstName: string;
  city: string | null;
}) => {
  if (!offer.offered) return null;
  return (
    <section aria-label={`Ce que propose ${firstName}`} className="space-y-4">
      <SectionHeading eyebrow="Ce que je propose" title={`${firstName} propose un coup de main${city ? ` autour de ${city}` : ""}`} />
      {offer.line && (
        <p className="text-[15.5px] leading-relaxed text-foreground font-body whitespace-pre-line break-words">« {offer.line} »</p>
      )}
      {offer.categories.length > 0 && (
        <ul className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {offer.categories.map((c) => (
            <li key={c.key} className="flex flex-col items-center gap-2 rounded-xl bg-secondary/10 px-3 py-4 text-center">
              <img src={SPOTS[c.spot]} alt="" aria-hidden="true" width={64} height={64} loading="lazy" decoding="async" className="h-16 w-16 object-contain" />
              <span className="text-sm font-medium text-foreground font-body">{c.label}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

/* ── Comment ça se passe ──────────────────────────────────────────── */
export const HowItWorksSteps = ({ firstName }: { firstName: string }) => {
  const steps = [
    `Vous écrivez à ${firstName} et lui présentez votre maison et vos animaux.`,
    "Vous faites connaissance. Une rencontre avant la garde est conseillée.",
    `${firstName} s'installe chez vous. Vous partez l'esprit léger.`,
  ];
  return (
    <section aria-label="Comment ça se passe" className="scroll-mt-20">
      <SectionHeading eyebrow="Comment ça se passe" title="Trois étapes, à votre rythme." />
      <ol className="grid grid-cols-1 md:grid-cols-3 gap-[22px] md:gap-[34px]">
        {steps.map((s, i) => (
          <li key={i} className="border-t-[1.5px] border-border pt-[14px]">
            <span className="block font-heading text-[24px] text-primary leading-none">{i + 1}</span>
            <p className="mt-2 text-[15px] leading-relaxed text-foreground font-body">{s}</p>
          </li>
        ))}
      </ol>
    </section>
  );
};

/* ── Bouton d'action (carte contact et barre collante) ────────────── */
export const CtaButton = ({
  cta,
  firstName,
  className,
  short = false,
}: {
  cta: HeroCtaVariant;
  firstName: string;
  className: string;
  short?: boolean;
}) => {
  const mutedCls = `${className} !bg-muted !text-muted-foreground cursor-not-allowed opacity-70`;
  if (cta.kind === "own") return null;
  if (cta.kind === "muted") {
    return (
      <button type="button" disabled aria-disabled="true" title={cta.hint} className={mutedCls}>
        {cta.label}
      </button>
    );
  }
  if (cta.kind === "unauthenticated") {
    return (
      <Link to={cta.signupHref} className={className}>
        {short ? "S'inscrire pour écrire" : cta.label ?? `S'inscrire pour contacter ${firstName}`}
      </Link>
    );
  }
  const onClick = cta.kind === "owner" ? cta.onContact : cta.onActivate;
  return (
    <button type="button" onClick={onClick} className={className}>
      {short ? `Écrire à ${firstName}` : cta.label ?? `Contacter ${firstName}`}
    </button>
  );
};

/* ── Carte contact du rail ────────────────────────────────────────── */
export const SitterContactCard = ({
  firstName,
  cta,
  reassurance,
  facts,
  showButton,
  sticky,
}: {
  firstName: string;
  cta: HeroCtaVariant;
  reassurance?: string;
  facts: Array<{ label: string; value: string }>;
  /** "always" : desktop ; "md" : à partir de md (mobile porté par la barre collante). */
  showButton: "always" | "md";
  sticky?: boolean;
}) => {
  if (cta.kind === "own") return null;
  const btnCls =
    "flex w-full h-[52px] items-center justify-center rounded-[99px] bg-primary px-5 text-[15px] font-medium text-primary-foreground hover:bg-primary/90 transition-colors text-center leading-tight";
  return (
    <div
      className={`rounded-[22px] bg-card p-[22px] shadow-[0_10px_30px_-12px_hsl(var(--foreground)/0.18)] ${
        sticky ? "lg:sticky lg:top-[calc(var(--public-header-h,0px)+16px)] lg:z-10" : ""
      }`}
      data-contact-card
    >
      <h2 className="font-heading text-[23px] font-semibold text-foreground leading-tight">Faire garder avec {firstName}</h2>
      <p className="mt-2 text-[14.5px] text-muted-foreground font-body">
        Présentez votre maison et vos animaux à {firstName}, puis faites connaissance.
      </p>
      <div className={showButton === "md" ? "hidden md:block" : ""}>
        <div className="mt-[14px]">
          <CtaButton cta={cta} firstName={firstName} className={btnCls} />
        </div>
        <p className="mt-2 text-center text-[12.5px] text-muted-foreground font-body">
          {reassurance || "Vous échangez d'abord, vous décidez ensuite."}
        </p>
      </div>
      {facts.length > 0 && (
        <dl className="mt-[14px]">
          {facts.map((f) => (
            <div key={f.label} className="flex items-baseline justify-between gap-4 border-t border-border py-2.5 text-[14px] font-body">
              <dt className="text-muted-foreground shrink-0">{f.label}</dt>
              <dd className="text-foreground text-right min-w-0 break-words">{f.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
};

/* ── Barre collante mobile ────────────────────────────────────────── */
export const SitterStickyBar = ({
  firstName,
  avatarUrl,
  cta,
  avgRating,
  reviewCount,
  isAvailable,
}: {
  firstName: string;
  avatarUrl: string | null;
  cta: HeroCtaVariant;
  avgRating: number;
  reviewCount: number;
  isAvailable: boolean;
}) => {
  if (cta.kind === "own") return null;
  const sub = [
    avgRating > 0 && reviewCount > 0 ? `★ ${formatRatingFr(avgRating)}` : null,
    isAvailable ? "Disponible" : null,
  ].filter(Boolean).join(" · ");
  return (
    <div
      data-sitter-sticky-bar
      className="md:hidden fixed left-0 right-0 z-40 bottom-[var(--bottom-nav-h,0px)] bg-background/[0.97] border-t border-border shadow-[0_-6px_20px_-10px_hsl(var(--foreground)/0.2)] px-5 pt-3 pb-[calc(22px+env(safe-area-inset-bottom))]"
    >
      <div className="flex items-center gap-3 min-w-0">
        <Avatar className="w-10 h-10 shrink-0">
          {avatarUrl ? <AvatarImage src={avatarImageUrl(avatarUrl, 80)} alt="" /> : null}
          <AvatarFallback className="bg-muted text-sm">{firstName.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-foreground font-body truncate">{firstName}</p>
          {sub && <p className="text-[12.5px] text-muted-foreground font-body truncate">{sub}</p>}
        </div>
        <CtaButton
          cta={cta}
          firstName={firstName}
          short
          className="inline-flex h-12 shrink-0 max-w-[60%] items-center justify-center rounded-[99px] bg-primary px-5 text-[14px] font-medium text-primary-foreground text-center leading-tight"
        />
      </div>
    </div>
  );
};
