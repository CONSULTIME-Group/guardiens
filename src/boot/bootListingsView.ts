/**
 * Lot perf 4 (14/10/2026) : premier affichage de /annonces avant le code de
 * la page.
 *
 * Pour un visiteur, les lectures lancées par le HTML (lot perf 3) arrivent
 * vers 1,6 s sur mobile ralenti, le code de la page vers 5 s. Ce module pur
 * construit, avec ces lectures, le haut de la page et les cartes « Annonces
 * disponibles » à l'identique de PublicListings et SearchListingCard (mêmes
 * classes, mêmes règles : lieu du propriétaire, France stricte, ouvertes,
 * ordre de la liste, photo, libellé de lieu, dates). La vraie page prend le
 * relais dès sa première recherche terminée.
 *
 * Aucune dépendance au code de l'application hors règles pures : il est
 * empaqueté seul (scripts/vite-plugin-listings-prefetch.mjs).
 */
import { isFrancePlace, isOpenSit, isPastSit, resolveSitPlace } from "@/lib/sitSearchRules";
import { isAbroadPlace } from "../../supabase/functions/_shared/sit-place";
import { pickPlaceCover } from "@/lib/coverPriority";
import { storageImageUrl } from "@/lib/storageImage";
import { departementNameFromCode, formatCityDepartement } from "@/lib/locationLabel";
import { DEPT_NAMES } from "@/lib/departments";
import { OVERSEAS_NAMES } from "@/lib/homeListingPlace";
import { STARTED_SIT_NOTICE, isStartedOpenSit } from "@/lib/sitStarted";
import type { ListingsPrefetch } from "@/lib/listingsPrefetch";

export interface BootTexts {
  h1: string;
  subtitle: string;
  eyebrow: string;
  eyebrowStatsOne: string;
  eyebrowStatsOther: string;
  citiesOne: string;
  citiesOther: string;
  allFrance: string;
  seeAlsoMissions: string;
  localGuides: string;
  pricing: string;
  intlOne: string;
  intlOther: string;
  groupAvailable: string;
}

/** Cartes visibles avant « Voir plus » (visibleCount de SearchSitter). */
export const BOOT_VISIBLE = 12;

const NAMES = new Map<string, string>([...Object.entries(DEPT_NAMES), ...Object.entries(OVERSEAS_NAMES)]);

export const escapeHtml = (s: unknown): string =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

const plural = (n: number, one: string, other: string) => (n === 1 ? one : other).replace(/\{\{count\}\}/g, String(n));

/** Même rendu que date-fns format(d, "d MMM", { locale: fr }). */
const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
export const bootFormatDate = (d: string | null | undefined): string => {
  if (!d) return "";
  const x = new Date(d);
  if (isNaN(x.getTime())) return "";
  return `${x.getDate()} ${MONTHS[x.getMonth()]}`;
};

const ICON_ATTRS = 'xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
const ICONS: Record<string, string> = {
  paw: '<circle cx="11" cy="4" r="2"></circle><circle cx="18" cy="8" r="2"></circle><circle cx="20" cy="16" r="2"></circle><path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z"></path>',
  cat: '<path d="M12 5c.67 0 1.35.09 2 .26 1.78-2 5.03-2.84 6.42-2.26 1.4.58-.42 7-.42 7 .57 1.07 1 2.24 1 3.44C21 17.9 16.97 21 12 21s-9-3-9-7.56c0-1.25.5-2.4 1-3.44 0 0-1.89-6.42-.5-7 1.39-.58 4.72.23 6.5 2.23A9.04 9.04 0 0 1 12 5Z"></path><path d="M8 14v.5"></path><path d="M16 14v.5"></path><path d="M11.25 16.25h1.5L12 17l-.75-.75Z"></path>',
  bird: '<path d="M16 7h.01"></path><path d="M3.4 18H12a8 8 0 0 0 8-8V7a4 4 0 0 0-7.28-2.3L2 20"></path><path d="m20 7 2 .5-2 .5"></path><path d="M10 18v3"></path><path d="M14 17.75V21"></path><path d="M7 18a6 6 0 0 0 3.84-10.61"></path>',
};
const SPECIES_ICON: Record<string, string> = { cat: "cat", bird: "bird", farm_animal: "bird" };
const icon = (name: string, cls: string) => `<svg ${ICON_ATTRS} class="${cls}" aria-hidden="true">${ICONS[name]}</svg>`;

/** Chemin public d'une annonce (sitPath) : slug, sinon identifiant. */
const sitHref = (s: { slug?: string | null; id: string }) => `/annonces/${encodeURIComponent(s.slug || s.id)}`;

export interface BootModel {
  /** Annonces disponibles, dans l'ordre de la liste. */
  active: any[];
  inactiveCount: number;
  openCount: number;
  citiesCount: number;
  intlCount: number;
}

/** Même population et même ordre que SearchSitter pour un visiteur sans ville. */
export function buildBootModel(data: ListingsPrefetch, today: string): BootModel {
  const ownerById = new Map(data.owners.map((o: any) => [o.id, o]));
  const galleryByOwner = new Map<string, any[]>();
  [...data.gallery].sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0)).forEach((g: any) => {
    if (!g?.user_id || !g?.photo_url) return;
    const arr = galleryByOwner.get(g.user_id) || [];
    arr.push(g);
    galleryByOwner.set(g.user_id, arr);
  });
  const petsByProperty = new Map<string, any[]>();
  data.pets.forEach((p: any) => {
    if (!p?.property_id) return;
    const arr = petsByProperty.get(p.property_id) || [];
    arr.push(p);
    petsByProperty.set(p.property_id, arr);
  });
  const items = [...data.open, ...data.closed].map((s: any) => {
    const owner = ownerById.get(s.user_id) || null;
    const gallery = galleryByOwner.get(s.user_id);
    const isCompleted = s.status === "completed";
    return {
      ...s,
      owner,
      ownerGalleryFirstPhoto: gallery ? pickPlaceCover(gallery) : null,
      pets: s.property_id ? petsByProperty.get(s.property_id) || [] : [],
      isAssigned: s.status === "confirmed" || s.status === "in_progress",
      isCompleted,
      isPast: !isCompleted && isPastSit(s, today),
    };
  });
  const french = items.filter((s) => isFrancePlace(s));
  const active = french.filter((s) => !s.isAssigned && !s.isCompleted && !s.isPast);
  const inactiveCount = french.length - active.length;
  // Compteurs de l'en-tête de PublicListings : annonces ouvertes au pays FR
  // de l'annonce, villes distinctes ; hors France par le lieu résolu.
  const openFr = data.open.filter((s: any) => isOpenSit(s, today) && s.country === "FR");
  const cities = new Set(openFr.map((s: any) => (s.city || "").trim().toLowerCase()).filter(Boolean));
  const intlCount = data.open.filter((s: any) => isOpenSit(s, today) && isAbroadPlace({ ...s, owner: ownerById.get(s.user_id) ?? null })).length;
  return { active, inactiveCount, openCount: openFr.length, citiesCount: cities.size, intlCount };
}

/** Carte d'annonce, mêmes classes que SearchListingCard (carte « sit », visiteur). */
export function bootCardHtml(item: any, listIndex: number, today: string): string {
  const place = resolveSitPlace(item);
  const deptName = departementNameFromCode(place.dept, NAMES);
  const commune = (place.city ?? "").trim() || null;
  const locationLabel = commune
    ? formatCityDepartement(commune, deptName)
    : deptName ? `Lieu à préciser, ${deptName}` : "Lieu à préciser";
  const photos: string[] = item.property?.photos || [];
  const cover = item.cover_photo_url || item.property?.cover_photo_url || photos[0] || item.ownerGalleryFirstPhoto || null;
  const petGroups: Record<string, number> = {};
  (item.pets || []).forEach((p: any) => { petGroups[p.species] = (petGroups[p.species] || 0) + 1; });
  const petEntries = Object.entries(petGroups).slice(0, 3);
  const dateLabel = item.start_date ? `${bootFormatDate(item.start_date)} → ${bootFormatDate(item.end_date)}` : null;
  const started = isStartedOpenSit(item, today);
  const title = escapeHtml(item.title || "Sans titre");

  // Première photo demandée tout de suite, en priorité haute (même adresse
  // que la vraie carte : elle la reprend du cache).
  const imgLoad = listIndex === 0 ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"';
  const img = cover
    ? `<img src="${escapeHtml(storageImageUrl(cover, { width: 880, height: 660 }))}" alt="" class="w-full h-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.03]" ${imgLoad}>`
    : `<div class="absolute inset-0 flex items-center justify-center text-muted-foreground/40">${icon("paw", "lucide lucide-paw-print h-10 w-10")}</div>`;

  const pets = petEntries.map(([species, count], idx) =>
    `<span class="inline-flex items-center gap-1">${idx > 0 ? '<span aria-hidden="true" class="opacity-40">·</span>' : ""}${icon(SPECIES_ICON[species] || "paw", "h-3 w-3 opacity-70")}${count > 1 ? `<span>×${count}</span>` : ""}</span>`,
  ).join("");
  const dates = dateLabel
    ? `${petEntries.length > 0 ? '<span aria-hidden="true" class="opacity-40">·</span>' : ""}<span>${escapeHtml(dateLabel)}</span>`
    : "";
  const verified = item.owner?.identity_verified
    ? '<span class="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/[0.06] text-primary text-[11px] font-semibold px-2 py-0.5">Vérifié</span>'
    : "";

  return `<a href="${sitHref(item)}"><article class="group relative flex h-full flex-col cursor-pointer  " data-testid="search-card-boot" data-demo="false" data-list-index="${listIndex + 1}">`
    // Emplacement du favori (vide pour un visiteur, comme FavoriteButton).
    + `<div class="relative aspect-[4/3] overflow-hidden rounded-2xl bg-muted border border-black/[0.06] shadow-[0_1px_3px_rgba(11,31,26,0.05),0_4px_16px_-4px_rgba(11,31,26,0.06)] transition-all duration-500 ease-out group-hover:shadow-[0_4px_12px_rgba(11,31,26,0.08),0_16px_40px_-8px_rgba(11,31,26,0.10)]">${img}<div class="absolute top-3 right-3"></div></div>`
    + `<div class="mt-4 px-0.5 flex flex-col flex-1">`
    + `<p class="text-[11px] uppercase tracking-[0.16em] font-medium truncate text-primary/70"><span class="truncate">${escapeHtml(locationLabel || "France")}</span></p>`
    + `<div class="mt-1.5 flex items-start justify-between gap-2"><h3 class="font-sans text-[15px] sm:text-[16px] font-medium leading-snug text-foreground line-clamp-2">${title}</h3></div>`
    + `<div class="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted-foreground">${pets}${dates}</div>`
    + `<div class="mt-3 flex flex-wrap items-center gap-1.5">${verified}</div>`
    + `<div class="mt-auto">${started ? `<p class="mt-2 text-[11px] font-medium text-primary" data-testid="started-sit-notice">${escapeHtml(STARTED_SIT_NOTICE)}</p>` : ""}</div>`
    + `</div></article></a>`;
}

/** Haut de la page (PublicListings), contrôles de recherche en attente, cartes disponibles. */
export function bootListingsHtml(model: BootModel, texts: BootTexts, today: string): string {
  const eyebrow = model.openCount > 0
    ? plural(model.openCount, texts.eyebrowStatsOne, texts.eyebrowStatsOther).replace(
        /\{\{cities\}\}/g,
        model.citiesCount >= 2 ? plural(model.citiesCount, texts.citiesOne, texts.citiesOther) : texts.allFrance,
      )
    : texts.eyebrow;
  const intlLabel = escapeHtml(plural(model.intlCount, texts.intlOne, texts.intlOther));
  const dot = `<span class="relative flex h-2 w-2 shrink-0" aria-hidden="true">${model.intlCount >= 3 ? '<span class="absolute inline-flex h-full w-full rounded-full bg-primary opacity-60 animate-ping"></span>' : ""}<span class="relative inline-flex h-2 w-2 rounded-full bg-primary"></span></span>`;
  const intlDesktop = model.intlCount > 0
    ? `<a href="/annonces/international" class="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors" aria-label="${intlLabel}">${dot}${intlLabel}</a>`
    : "";
  const intlMobile = model.intlCount > 0
    ? `<a href="/annonces/international" class="md:hidden mt-4 inline-flex items-center gap-2 rounded-full bg-accent/40 hover:bg-accent/60 border border-border px-3.5 py-2 text-xs transition-colors" aria-label="${intlLabel}">${dot}<span class="text-foreground">${intlLabel}</span><span class="text-muted-foreground" aria-hidden="true">→</span></a>`
    : "";
  const hero = `<section class="max-w-6xl mx-auto px-4 md:px-6 pt-8 md:pt-14 pb-5 md:pb-8">`
    + `<p class="text-xs font-body font-semibold tracking-widest uppercase text-primary/60 mb-4 md:mb-5">${escapeHtml(eyebrow)}</p>`
    + `<div class="flex flex-col md:flex-row md:items-end md:justify-between gap-4 md:gap-8">`
    + `<p role="presentation" class="font-heading text-3xl md:text-4xl lg:text-5xl font-bold leading-tight text-foreground tracking-tight max-w-3xl">${escapeHtml(texts.h1)}</p>`
    + `<nav aria-label="Liens annexes" class="hidden md:flex flex-wrap items-center gap-x-5 gap-y-1 text-sm shrink-0">`
    + `<a href="/petites-missions" class="inline-flex items-center gap-1.5 text-primary font-semibold hover:underline underline-offset-4">${escapeHtml(texts.seeAlsoMissions)} <span aria-hidden="true">→</span></a>`
    + `<a href="/guides" class="text-muted-foreground hover:text-foreground transition-colors">${escapeHtml(texts.localGuides)}</a>`
    + `<a href="/tarifs" class="text-muted-foreground hover:text-foreground transition-colors">${escapeHtml(texts.pricing)}</a>`
    + intlDesktop
    + `</nav></div>`
    + `<p class="mt-4 md:mt-5 text-sm md:text-base text-muted-foreground max-w-2xl leading-relaxed">${escapeHtml(texts.subtitle)}</p>`
    + intlMobile
    + `<div class="mt-7 md:mt-10 h-px bg-border/60" aria-hidden="true"></div></section>`;
  // Contrôles de recherche : formes en attente, même hauteur que les vrais
  // (mesurée le 14/10/2026 : 199 px sous 640 px de large, 201 px jusqu'à
  // 767 px, 227 px au-delà, marge haute de la liste comprise).
  const controls = `<div class="boot-controls" aria-hidden="true"><div class="boot-row"><span class="boot-pill boot-wide"></span><span class="boot-pill boot-grow"></span></div><div class="boot-row"><span class="boot-pill"></span><span class="boot-pill"></span><span class="boot-pill"></span><span class="boot-pill"></span></div></div>`;
  const cards = model.active.slice(0, BOOT_VISIBLE).map((s, i) => bootCardHtml(s, i, today)).join("");
  const header = model.inactiveCount > 0
    ? `<div class="mb-4 flex items-baseline justify-between gap-3"><h3 class="font-heading text-base sm:text-lg font-semibold text-foreground">${escapeHtml(texts.groupAvailable)} <span class="text-muted-foreground font-normal">(${model.active.length})</span></h3></div>`
    : "";
  const list = model.active.length > 0
    ? `<div class="px-6"><section class="mb-10">${header}<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 lg:gap-x-8 gap-y-8 sm:gap-y-10">${cards}</div></section></div>`
    : "";
  return hero + controls + list;
}

/** Feuille propre aux formes en attente (aucune classe utilitaire à hauteur fixe). */
export const BOOT_CSS = `#boot-listings{position:absolute;top:77px;left:0;right:0;z-index:40;min-height:calc(100vh - 77px);background:hsl(var(--background))}
#boot-listings .boot-controls{height:199px;padding:24px 24px 0;display:flex;flex-direction:column;gap:14px;box-sizing:border-box}
#boot-listings .boot-row{display:flex;gap:10px;overflow:hidden}
#boot-listings .boot-pill{display:block;height:44px;width:88px;flex:none;border-radius:9999px;background:hsl(var(--muted));animation:boot-pulse 1.6s ease-in-out infinite}
#boot-listings .boot-wide{width:100%}
#boot-listings .boot-grow{display:none}
@media (min-width:640px){#boot-listings .boot-controls{height:201px}}
@media (min-width:768px){#boot-listings .boot-controls{height:227px}#boot-listings .boot-wide{width:224px;border-radius:1rem;height:56px}#boot-listings .boot-grow{display:block;flex:1;width:auto;border-radius:1rem;height:56px}}
@keyframes boot-pulse{50%{opacity:.55}}
@media (prefers-reduced-motion:reduce){#boot-listings .boot-pill{animation:none}}`;

