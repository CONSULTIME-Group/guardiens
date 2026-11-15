/**
 * Lot VE-1 (15/11/2026, maquette validée par Jérémie) : la vue d'ensemble
 * montre une ligne par personne ou par annonce, et son bouton fait le geste
 * sur place (« Écrire à Ludmila », « Prévenir les 2 gardiens »). Module pur :
 * il déplie la liste de travail (une ligne par type, lue aussi par l'email du
 * matin) en gestes, les range en deux temps (aujourd'hui, cette semaine) et
 * fusionne les signaux d'Alma d'un même membre.
 */
import {
  departureLabel,
  sitIdOf,
  type DeadlineTone,
  type PilotageSignal,
  type WorkFamily,
  type WorkItem,
  type WorkListModel,
} from "./pilotage";
import { elementLinkOf, workCopy } from "../../../supabase/functions/_shared/admin-work-list.ts";
import { daysUntilStart } from "../../../supabase/functions/_shared/admin-signal-config.ts";
import type { MemberDraftTopic } from "./memberMessageDrafts";

export type GestureKind = "write" | "broadcast" | "card" | "link" | "more";
export type GestureBucket = "today" | "week";

export interface GestureWrite {
  userId: string;
  /** Prénom quand il est connu, sinon vide. */
  firstName: string;
  sitId?: string;
  topic: MemberDraftTopic;
}

export interface Gesture {
  key: string;
  bucket: GestureBucket;
  family: WorkFamily;
  title: string;
  detail: string;
  /** Phrase du membre, citée telle quelle. */
  quote?: string;
  chip: string;
  tone: DeadlineTone;
  kind: GestureKind;
  /** Libellé du bouton : le verbe du geste. */
  actionLabel: string;
  /** Destination d'un geste « link ». */
  link?: string;
  links: { label: string; to: string }[];
  signals: PilotageSignal[];
  write?: GestureWrite;
  /** Second geste d'écriture, en lien (propriétaire d'une annonce sans candidature). */
  secondaryWrite?: GestureWrite & { label: string };
  children?: Gesture[];
  /** Lot VE-5 : la carte d'action du signal reste accessible sous « Autres gestes ». */
  moreActions?: boolean;
  sort: number;
}

/** Signaux d'Alma auxquels on répond par un message au membre. */
export const ALMA_WRITE_TYPES = new Set(["alma_frustration", "alma_bug_report", "alma_churn"]);

/** Annonce sans candidature : départ sous ce nombre de jours = aujourd'hui. */
export const NO_APPLICATION_TODAY_DAYS = 10;
/** Au-delà, les annonces lointaines se rangent dans une seule ligne. */
export const NO_APPLICATION_WEEK_DAYS = 30;

const DAY = 86_400_000;
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : "");
const clean = (s: string) => s.replace(/[\u2014\u2013]/g, ",").replace(/\s+/g, " ").trim();
const profileOf = (s: PilotageSignal) => str(s.metadata?.profile_id) || (s.entity_type === "profile" ? str(s.entity_id) : "");
const isToday = (i: WorkItem) => i.tone !== "normal" || i.deadline.startsWith("Aujourd") || i.deadline.startsWith("Avant");
const toneRank = (t: DeadlineTone) => (t === "urgent" ? 0 : t === "late" ? 1 : 2);
const ROLE: Record<string, string> = { owner: "propriétaire", sitter: "gardien", both: "membre" };
const PAGE: Record<string, string> = {
  "/owner-profile": "son profil propriétaire",
  "/sitter-profile": "son profil gardien",
  "/sits": "ses annonces",
  "/dashboard": "son tableau de bord",
  "/messages": "sa messagerie",
};

const longDay = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Paris" });
};
const dayMonth = (iso: string) => {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" });
};
const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** « Aujourd'hui », « Depuis hier », « Depuis 4 jours ». */
export function sinceLabel(iso: string, now: number): string {
  const days = Math.max(0, Math.floor((now - new Date(iso).getTime()) / DAY));
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return "Depuis hier";
  return `Depuis ${days} jours`;
}

function almaGesture(profileId: string, signals: PilotageSignal[], family: WorkFamily, today: boolean, now: number): Gesture {
  const types = new Set(signals.map((s) => s.signal_type));
  const meta = signals.map((s) => s.metadata ?? {});
  const pick = (k: string) => meta.map((m) => str(m[k])).find(Boolean) ?? "";
  const first = pick("first_name");
  const role = ROLE[pick("role")] ?? "";
  const city = pick("city");
  const messages = meta.flatMap((m) => (Array.isArray(m.messages) ? (m.messages as { text?: string; bug_item?: string; page_path?: string }[]) : []));
  const quote = clean(messages.map((x) => str(x?.text)).find(Boolean) ?? pick("excerpt"));
  const hint = messages.map((x) => str(x?.bug_item)).find(Boolean) ?? "";
  const page = pick("page_path") || (messages.map((x) => str(x?.page_path)).find(Boolean) ?? "");
  const oldest = signals.reduce((m, s) => (s.detected_at < m ? s.detected_at : m), signals[0].detected_at);
  const phrase = types.has("alma_churn")
    ? "pense à quitter Guardiens"
    : types.has("alma_frustration")
      ? "cherche de l'aide après un échange avec Alma"
      : "signale un problème à Alma";
  const who = [first || "Un membre", [role, city ? `à ${city}` : ""].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  const where = page ? `, depuis ${PAGE[page] ?? `la page ${page}`}` : "";
  return {
    key: `alma:${profileId}`,
    bucket: today ? "today" : "week",
    family,
    title: `${who}${role || city ? "," : ""} ${phrase}`,
    detail: `${cap(longDay(oldest))}${where}.${hint ? ` Sujet : ${clean(hint)}.` : ""}`,
    quote: quote || undefined,
    chip: sinceLabel(oldest, now),
    tone: today ? "urgent" : "normal",
    kind: "write",
    actionLabel: first ? `Écrire à ${first}` : "Écrire au membre",
    links: [
      { label: "Sa fiche", to: `/admin/users?user=${encodeURIComponent(profileId)}` },
      { label: "Les échanges avec Alma", to: "/admin/alma" },
    ],
    signals,
    write: { userId: profileId, firstName: first, topic: types.has("alma_churn") ? "alma_churn" : "alma_help" },
    sort: new Date(oldest).getTime(),
  };
}

function noApplicationGesture(sitId: string, signals: PilotageSignal[], model: WorkListModel, family: WorkFamily, now: number): { g: Gesture; days: number | null } {
  const m = signals[0].metadata ?? {};
  const sit = model.sits.get(sitId);
  const title = clean(str(sit?.title) || str(m.sit_title) || "Annonce sans titre");
  const city = str(sit?.city) || str(m.sit_city) || str(m.city);
  const start = str(sit?.start_date) || str(m.start_date);
  const days = start ? daysUntilStart(start, now) : null;
  const eligible = Number(m.eligible_sitters_count ?? 0) || 0;
  const published = Number(m.days_since_published ?? 0) || 0;
  const today = days !== null && days <= NO_APPLICATION_TODAY_DAYS;
  const named = city && !title.toLowerCase().includes(city.toLowerCase()) ? `${title}, ${city}` : title;
  const ownerId = str(m.owner_id);
  return {
    days,
    g: {
      key: `sit:${sitId}`,
      bucket: today ? "today" : "week",
      family,
      title: `${named} : aucune candidature`,
      detail: [
        start && days !== null ? `Départ le ${dayMonth(start)}, ${departureLabel(days)}.` : "",
        published > 0 ? `Publiée il y a ${published} ${published > 1 ? "jours" : "jour"}.` : "",
        eligible > 0 ? `${eligible} ${eligible > 1 ? "gardiens" : "gardien"} à proximité.` : "Rayon de diffusion à élargir.",
      ].filter(Boolean).join(" "),
      chip: days !== null ? `Départ ${departureLabel(days)}` : "Cette semaine",
      tone: today ? "urgent" : "normal",
      kind: "broadcast",
      actionLabel: eligible > 1 ? `Prévenir les ${eligible} gardiens` : eligible === 1 ? "Prévenir le gardien" : "Élargir la diffusion",
      links: [{ label: "L'annonce", to: `/admin/listings?sit=${encodeURIComponent(sitId)}` }],
      signals,
      secondaryWrite: ownerId
        ? { userId: ownerId, firstName: "", sitId, topic: "no_applications", label: "Écrire au propriétaire" }
        : undefined,
      sort: days ?? 9999,
    },
  };
}

/** Une ligne par personne ou par annonce, triée : aujourd'hui, puis cette semaine. */
export function buildGestures(model: WorkListModel | null | undefined, now: number = Date.now()): Gesture[] {
  if (!model) return [];
  const out: Gesture[] = [];
  const alma = new Map<string, { signals: PilotageSignal[]; family: WorkFamily; today: boolean }>();
  const far: Gesture[] = [];

  for (const item of model.items) {
    if (item.signals.length === 0) {
      out.push({
        key: item.key, bucket: isToday(item) ? "today" : "week", family: item.family,
        title: item.title, detail: item.detail, chip: item.deadline, tone: item.tone,
        kind: "link", actionLabel: item.title.split(" ")[0] || "Ouvrir", link: item.link,
        links: [], signals: [], sort: item.waitingSince ? new Date(item.waitingSince).getTime() : now,
      });
      continue;
    }
    const groups = new Map<string, PilotageSignal[]>();
    for (const s of item.signals) {
      const profile = profileOf(s);
      if (ALMA_WRITE_TYPES.has(s.signal_type) && profile) {
        const cur = alma.get(profile) ?? { signals: [], family: item.family, today: false };
        cur.signals.push(s);
        cur.today = cur.today || isToday(item);
        alma.set(profile, cur);
        continue;
      }
      const key = sitIdOf(s) ?? (profile || s.id);
      groups.set(key, [...(groups.get(key) ?? []), s]);
    }
    for (const [key, signals] of groups) {
      const sitId = sitIdOf(signals[0]);
      if (item.type === "no_applications" && sitId) {
        const { g, days } = noApplicationGesture(sitId, signals, model, item.family, now);
        if (days !== null && days > NO_APPLICATION_WEEK_DAYS) far.push(g);
        else out.push(g);
        continue;
      }
      const m = signals[0].metadata ?? {};
      const sit = sitId ? model.sits.get(sitId) : undefined;
      const label = clean(sitId
        ? [str(sit?.title) || str(m.sit_title) || "Annonce sans titre", str(sit?.city) || str(m.city)].filter(Boolean).join(", ")
        : str(m.first_name) || str(m.title) || str(m.excerpt));
      const single = groups.size === 1;
      const own = elementLinkOf(signals[0]);
      const profile = profileOf(signals[0]);
      const first = str(m.first_name);
      // Lot VE-5 : meilleur gardien endormi, le bouton écrit ; le boost reste sous « Autres gestes ».
      if (item.type === "dormant_top_sitter" && profile) {
        const quiet = Number(m.days_since_last_application ?? 0) || 0;
        const reviews = Number(m.reviews_count ?? 0) || 0;
        out.push({
          key: `${item.key}:${key}`, bucket: isToday(item) ? "today" : "week", family: item.family,
          title: `${first || "Un gardien très apprécié"} a cessé de candidater`,
          detail: [reviews > 0 ? `${reviews} avis` : "", Number(m.avg_rating) ? `note de ${String(m.avg_rating).replace(".", ",")} sur 5` : "", quiet > 0 ? `dernière candidature il y a ${quiet} jours` : ""].filter(Boolean).join(", ").replace(/^./, (c) => c.toUpperCase()) + ".",
          chip: item.deadline, tone: item.tone, kind: "write", actionLabel: first ? `Écrire à ${first}` : "Écrire au gardien",
          links: own ? [{ label: "Sa fiche", to: own }] : [],
          signals, write: { userId: profile, firstName: first, topic: "dormant_sitter" }, moreActions: true,
          sort: new Date(signals[0].detected_at).getTime(),
        });
        continue;
      }
      out.push({
        key: `${item.key}:${key}`, bucket: isToday(item) ? "today" : "week", family: item.family,
        title: single ? item.title : workCopy(item.type).title(1),
        detail: [label, single ? item.detail : ""].filter(Boolean).join(". ").replace(/\.\.$/, "."),
        chip: item.deadline, tone: item.tone, kind: "card", actionLabel: item.action || "Traiter",
        links: own ? [{ label: sitId ? "L'annonce" : "Sa fiche", to: own }] : [],
        signals, sort: new Date(signals[0].detected_at).getTime(),
        // Lot VE-5 : compte à examiner, un mot de bienvenue en second geste.
        secondaryWrite: item.type === "suspicious_account" && profile
          ? { userId: profile, firstName: first, topic: "account_welcome", label: first ? `Écrire à ${first}` : "Écrire au membre" }
          : undefined,
      });
    }
  }

  for (const [profileId, v] of alma) out.push(almaGesture(profileId, v.signals, v.family, v.today, now));

  if (far.length === 1) out.push(far[0]);
  else if (far.length > 1) {
    far.sort((a, b) => a.sort - b.sort);
    const cities = far.map((g) => g.title.replace(/ : aucune candidature$/, "")).slice(0, 6);
    out.push({
      key: "sit:far", bucket: "week", family: far[0].family,
      title: `${far.length} autres annonces sans candidature`,
      detail: `Départs ${far[0].chip.replace(/^Départ /, "")} et au-delà : ${cities.join(" · ")}${far.length > cities.length ? "…" : ""}.`,
      chip: `${far[0].chip} et plus`, tone: "normal", kind: "more", actionLabel: `Afficher les ${far.length}`,
      links: [], signals: far.flatMap((g) => g.signals), children: far, sort: far[0].sort + 10_000,
    });
  }

  const bucketRank = (b: GestureBucket) => (b === "today" ? 0 : 1);
  return out.sort((a, b) => bucketRank(a.bucket) - bucketRank(b.bucket) || toneRank(a.tone) - toneRank(b.tone) || a.sort - b.sort);
}

/** « 3 gestes aujourd'hui, 2 cette semaine. » */
export function gesturesSentence(gestures: Gesture[]): string {
  const today = gestures.filter((g) => g.bucket === "today").length;
  const week = gestures.length - today;
  if (gestures.length === 0) return "Tout est à jour aujourd'hui.";
  const t = `${today} ${today > 1 ? "gestes" : "geste"} aujourd'hui`;
  const w = `${week} cette semaine`;
  return today > 0 && week > 0 ? `${t}, ${w}.` : today > 0 ? `${t}.` : `${week} ${week > 1 ? "gestes" : "geste"} cette semaine.`;
}
