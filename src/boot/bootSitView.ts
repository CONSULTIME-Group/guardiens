/**
 * Lot perf 12 (26/10/2026) : premier affichage de la fiche publique d'une
 * annonce sur téléphone, avant le code de la page. Construit à partir des
 * lectures du HTML (lot perf 5, sitPrefetchScript) : haut de PublicSitView
 * (pastille, titre, lieu, dates, type de logement) et photo principale du
 * carrousel de SitHero, aux mêmes classes. Posé sous l'en-tête (77 px), hors
 * du flux (aucun décalage au relais), retiré par la vraie fiche dès son
 * premier rendu (window.__guardiensBootSitDone, appelé par PublicSitDetail).
 *
 * Toute retouche du haut de PublicSitView, des libellés de PublicSitDetail
 * (titre, lieu, dates, urgence, type) ou du carrousel mobile de SitHero se
 * reporte ici (parité verrouillée par src/__tests__/perf12/).
 */
import { sanitizeUserTitle } from "@/lib/sanitizeTitle";
import { TYPE_LABELS } from "@/components/sits/shared/sitConstants";
import { storageImageUrl } from "@/lib/storageImage";

export interface BootSitTexts {
  badgeStay: string;
  share: string;
  shareAria: string;
}

export interface BootSitModel {
  title: string;
  cityLabel: string;
  dateLabel: string;
  urgencyLabel: string | null;
  typeLabel: string | null;
  heroUrl: string;
}

const DAY = 1000 * 60 * 60 * 24;
const fmtDayMonth = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" });
const fmtDayMonthYear = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" });

/** « Du 20 décembre au 2 janvier 2027 · 14 jours » (même texte que PublicSitDetail). */
export function bootDateLabel(start: string | null | undefined, end: string | null | undefined): string {
  if (!start || !end) return "Dates flexibles";
  const s = new Date(start);
  const e = new Date(end);
  const base = `Du ${fmtDayMonth.format(s)} au ${fmtDayMonthYear.format(e)}`;
  const st = s.getTime();
  const et = e.getTime();
  if (Number.isNaN(st) || Number.isNaN(et) || et < st) return base;
  const days = Math.max(1, Math.round((et - st) / DAY) + 1);
  return `${base} · ${days} jour${days > 1 ? "s" : ""}`;
}

/** Badge d'urgence de PublicSitDetail (annonce ouverte, début sous 14 jours). */
export function bootUrgencyLabel(start: string | null | undefined, now: number): string | null {
  if (!start) return null;
  const diff = Math.ceil((new Date(start).getTime() - now) / DAY);
  if (Number.isNaN(diff) || diff < 0) return null;
  if (diff === 0) return "Commence aujourd'hui";
  if (diff === 1) return "Commence demain";
  if (diff <= 14) return `Dans ${diff} jours`;
  return null;
}

/** Même choix que PublicSitDetail puis SitHero : galerie, sinon photos du logement. */
export function bootHeroPhoto(gallery: unknown, property: unknown): string | null {
  const g = Array.isArray(gallery) ? gallery : [];
  let list: unknown[] = g.map((r: any) => r?.photo_url).filter(Boolean);
  if (list.length === 0) {
    const p = Array.isArray(property) ? (property[0] as any) : null;
    list = Array.isArray(p?.photos) ? p.photos : [];
  }
  for (const u of list) if (typeof u === "string" && u.trim()) return u;
  return null;
}

/**
 * Modèle du premier affichage, ou null quand la fiche s'afficherait
 * autrement (annonce non publiée, close, passée, dates masquées, sans lieu
 * lisible, sans photo transformable).
 */
export function buildBootSitModel(data: any, now: number): BootSitModel | null {
  const sit = Array.isArray(data?.sit) ? data.sit[0] : null;
  if (!sit || sit.status !== "published" || sit.accepting_applications === false || sit.dates_hidden === true) return null;
  if (sit.end_date) {
    const end = new Date(sit.end_date);
    const today = new Date(now);
    end.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    if (Number.isNaN(end.getTime()) || end.getTime() < today.getTime()) return null;
  }
  const owner = Array.isArray(data?.owner) ? data.owner[0] : null;
  const cityLabel = (typeof sit.city === "string" && sit.city.trim()) || owner?.city;
  if (!cityLabel) return null;
  const photo = bootHeroPhoto(data?.gallery, data?.property);
  if (!photo) return null;
  const heroUrl = storageImageUrl(photo, { width: 768, height: 480 });
  if (!heroUrl || heroUrl === photo) return null;
  const property = Array.isArray(data?.property) ? data.property[0] : null;
  const title = sit.title ? sanitizeUserTitle(sit.title) : "";
  if (!title) return null;
  return {
    title,
    cityLabel,
    dateLabel: bootDateLabel(sit.start_date, sit.end_date),
    urgencyLabel: bootUrgencyLabel(sit.start_date, now),
    typeLabel: property ? TYPE_LABELS[property.type] ?? null : null,
    heroUrl,
  };
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/[<]/g, "&lt;").replace(/[>]/g, "&gt;").replace(/"/g, "&quot;");

const bullet = (text: string) =>
  `<div class="flex items-center gap-2"><span class="w-1.5 h-1.5 rounded-full bg-foreground/30"></span><span>${esc(text)}</span></div>`;

const SHARE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-3.5 w-3.5" aria-hidden="true"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"></line><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"></line></svg>`;

/** Haut de PublicSitView et carrousel mobile de SitHero, mêmes classes. */
export function bootSitHtml(m: BootSitModel, t: BootSitTexts): string {
  const urgency = m.urgencyLabel
    ? `<span class="inline-block px-4 py-1.5 bg-secondary/20 text-secondary-foreground border border-secondary/30 rounded-full text-[10px] font-bold tracking-widest uppercase">${esc(m.urgencyLabel)}</span>`
    : "";
  return `<div class="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 md:py-12"><div class="mb-4 md:mb-8"></div>`
    + `<header class="mb-6 md:mb-10"><div class="flex items-start gap-3 mb-6 flex-nowrap"><div class="flex flex-wrap items-center gap-2 min-w-0">`
    + `<span class="inline-block px-4 py-1.5 bg-primary/10 text-primary rounded-full text-[10px] font-bold tracking-widest uppercase">${esc(t.badgeStay)}</span>${urgency}</div>`
    + `<span class="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium font-body border border-input bg-background h-9 px-4 gap-1.5 rounded-full ml-auto shrink-0" aria-hidden="true">${SHARE_ICON} ${esc(t.share)}</span></div>`
    + `<h1 class="font-heading text-3xl md:text-5xl lg:text-6xl font-bold leading-[1.1] mb-5 md:mb-6 text-foreground">${esc(m.title)}</h1>`
    + `<div class="flex flex-wrap items-center gap-x-5 gap-y-2 text-base text-muted-foreground">${bullet(m.cityLabel)}${bullet(m.dateLabel)}${m.typeLabel ? bullet(m.typeLabel) : ""}</div></header>`
    + `<div class="mb-7 md:mb-12"><section class="mb-6"><div class="relative overflow-hidden bg-muted -mx-3" style="min-height:240px;height:56vw;max-height:340px">`
    + `<img src="${esc(m.heroUrl)}" alt="" fetchpriority="high" decoding="async" class="w-full h-full object-cover">`
    + `<div class="absolute inset-x-0 bottom-0 h-28 pointer-events-none" aria-hidden="true" style="background:linear-gradient(to top, hsl(var(--foreground)/0.72) 0%, transparent 100%)"></div>`
    + `<div class="absolute bottom-3 left-3 right-14 flex flex-col gap-1 pointer-events-none"><p class="text-xs font-semibold text-primary-foreground/90 leading-none">${esc(m.cityLabel)}</p></div>`
    + `</div></section></div></div>`;
}

export const BOOT_SIT_CSS = `#boot-sit{position:absolute;top:77px;left:0;right:0;z-index:40;min-height:calc(100vh - 77px);background:hsl(var(--background));color:hsl(var(--foreground));pointer-events:none}`;
