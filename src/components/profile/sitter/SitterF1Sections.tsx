/**
 * Fiche gardien publique allégée (lot F1), onglet « Côté gardien ».
 * Sections sans cadre, séparées par l'espace. Tokens existants uniquement.
 */
import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { type HelpOffer } from "@/lib/profileSignals";
import type { HeroCtaVariant } from "@/components/profile/ProfileHero";
import { BADGE_DEFINITIONS } from "@/components/badges/badge-definitions";
import { avatarImageUrl } from "@/lib/storageImage";
import { getMemberAvatarUrl, getMemberPublicFirstName } from "@/lib/memberUtils";
import { capitalizeFirstName } from "@/lib/displayName";
import { reviewDateLabel } from "@/lib/sitterProfileFacts";
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
    className="flex items-center gap-[14px] md:gap-[22px] border-t border-border pt-[22px]"
  >
    <img src={spotVerger} alt="" aria-hidden="true" width={76} height={76} loading="lazy" decoding="async" className="h-[52px] w-[52px] md:h-[76px] md:w-[76px] shrink-0 object-contain" />
    <div className="min-w-0">
      <p className="text-[15.5px] leading-relaxed text-foreground font-body whitespace-pre-line break-words">{text}</p>
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

/* ── Offre d'entraide déclarée (lot L3, refondue au lot FG1) ─────── */
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
    <section aria-labelledby="ses-coups-de-main" className="relative overflow-hidden rounded-[22px] bg-[hsl(var(--hero-paper))] px-5 py-6 md:px-7" data-entraide-offer>
      <img src={SPOTS["spot-jardin"]} alt="" aria-hidden="true" width={80} height={80} loading="lazy" decoding="async" className="pointer-events-none absolute right-3 top-3 h-[72px] w-[72px] object-contain md:h-20 md:w-20" />
      <h2 id="ses-coups-de-main" className="max-w-[calc(100%-5rem)] font-heading text-[21px] md:text-[24px] font-semibold leading-tight text-foreground">
        Ses coups de main
      </h2>
      <p className="mt-2 max-w-[calc(100%-5rem)] text-[15.5px] leading-relaxed text-foreground">
        {firstName} aide{city ? ` autour de ${city}` : ""}{offer.categories.length > 0 ? ` : ${offer.categories.map((c) => c.label.toLowerCase()).join(", ")}.` : "."}
      </p>
      {offer.line && (
        <p className="mt-3 whitespace-pre-line break-words font-heading text-[17px] italic leading-relaxed text-foreground">« {offer.line} »</p>
      )}
      {offer.categories.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-1.5">
          {offer.categories.map((c) => (
            <li key={c.key} className="rounded-full border border-secondary/30 bg-card px-3 py-1 text-[14px] text-foreground">{c.label}</li>
          ))}
        </ul>
      )}
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

/* ── Carte contact (lot FG1) : une phrase, un bouton, dans le flux ─── */
export const SitterContactCard = ({
  firstName,
  cta,
  reassurance,
  showButton,
  ctaVisible = true,
  sticky,
  secondary,
  title,
  text,
}: {
  firstName: string;
  cta: HeroCtaVariant;
  reassurance?: string;
  /** "always" : desktop ; "md" : à partir de lg (téléphone porté par la barre collante). */
  showButton: "always" | "md";
  ctaVisible?: boolean;
  sticky?: boolean;
  /** Action secondaire visible à toutes les tailles (lot I1 : inviter sur une garde publiée). */
  secondary?: ReactNode;
  title?: string;
  text?: string;
}) => {
  if (cta.kind === "own") return null;
  const btnCls =
    "flex w-full h-[50px] items-center justify-center rounded-[99px] bg-card px-5 text-[15px] font-semibold text-primary hover:bg-card/90 transition-colors text-center leading-tight";
  return (
    <div
      className={`rounded-[22px] bg-primary px-6 py-6 text-primary-foreground ${
        sticky ? "lg:sticky lg:top-[calc(var(--public-header-h,0px)+16px)] lg:z-10" : ""
      }`}
      data-contact-card
      data-contact-v2
    >
      <h2 className="font-heading text-[21px] md:text-[23px] font-semibold leading-tight">
        {title ?? `Présentez votre maison à ${firstName}`}
      </h2>
      <p className="mt-2 text-[14.5px] leading-relaxed text-primary-foreground/90">
        {text ?? "Vous échangez à votre rythme dans votre messagerie Guardiens, et vous vous rencontrez si vous le souhaitez."}
      </p>
      <div className={!ctaVisible ? "hidden" : showButton === "md" ? "hidden lg:block" : ""}>
        <div className="mt-4">
          <CtaButton cta={cta} firstName={firstName} className={btnCls} short={cta.kind === "owner" || cta.kind === "sitter"} />
        </div>
        {reassurance && (
          <p className="mt-2 text-center text-[12.5px] text-primary-foreground/85">{reassurance}</p>
        )}
      </div>
      {secondary ? <div className="mt-3 [&_button]:border-primary-foreground/40 [&_button]:bg-transparent [&_button]:text-primary-foreground" data-contact-secondary>{secondary}</div> : null}
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
  // Lot FG2 : la note vit dans le bandeau et les avis, la barre dit la disponibilité.
  void avgRating;
  void reviewCount;
  const sub = isAvailable ? "Disponible" : "";
  return (
    <div
      data-sitter-sticky-bar
      className="lg:hidden fixed left-0 right-0 z-40 bottom-[var(--bottom-nav-h,0px)] bg-card border-t border-border px-3 pt-2 pb-[calc(8px+env(safe-area-inset-bottom))]"
    >
      <div className="flex items-center gap-3 min-w-0">
        <Avatar className="w-10 h-10 shrink-0">
          {avatarUrl ? <AvatarImage src={avatarImageUrl(avatarUrl, 80)} alt="" /> : null}
          <AvatarFallback className="bg-muted text-sm">{firstName.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-foreground font-body truncate">{firstName}</p>
          {sub && <p className="text-[13px] text-primary font-body truncate">{sub}</p>}
        </div>
        <CtaButton
          cta={cta}
          firstName={firstName}
          short
          className="inline-flex h-11 shrink-0 max-w-[62%] items-center justify-center rounded-[99px] bg-primary px-5 text-[14px] font-medium text-primary-foreground text-center leading-tight"
        />
      </div>
    </div>
  );
};

/* ── En bref : preuves chiffrées sous la gouache (lot F, refondu au lot FG1) ──
 * Chiffres réels seulement, chacun une fois ; la liste d'animaux vit dans
 * « Son quotidien ». Un trait d'accent au-dessus de chaque chiffre. */
export const SitterGlanceBand = ({
  items,
}: {
  items: Array<{ value: string; label: string; anchor?: string }>;
}) => {
  if (items.length === 0) return null;
  return (
    <dl
      aria-label="En bref"
      data-profile-glance
      className="profile-glance grid grid-cols-2 md:grid-cols-4 overflow-hidden rounded-[18px] border border-secondary/25 bg-card"
    >
      {items.map((it) => (
        <div key={it.label} className="flex min-w-0 flex-col-reverse gap-1 border-secondary/15 px-4 py-4 md:px-7 md:py-5 [&:not(:last-child)]:md:border-r even:border-l md:even:border-l-0 [&:nth-child(n+3)]:border-t md:[&:nth-child(n+3)]:border-t-0">
          <dt className="text-[12.5px] md:text-[13px] text-muted-foreground font-body">
            {it.anchor ? <a href={`#${it.anchor}`} className="underline-offset-4 hover:underline">{it.label}</a> : it.label}
          </dt>
          <dd className="font-heading text-[24px] md:text-[32px] font-semibold leading-none text-foreground">
            <span aria-hidden="true" className="mb-2.5 block h-[3px] w-7 rounded-full bg-secondary/70" />
            {it.value}
          </dd>
        </div>
      ))}
    </dl>
  );
};
