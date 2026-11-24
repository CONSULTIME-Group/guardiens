/**
 * Lot VE-1 (15/11/2026, maquette validée par Jérémie) : la vue d'ensemble
 * montre une ligne par personne ou par annonce, et son bouton fait le geste
 * sur place (« Écrire à Ludmila », « Prévenir les 2 gardiens »). Module pur :
 * il déplie la liste de travail (une ligne par type, lue aussi par l'email du
 * matin) en gestes, les range en deux temps (aujourd'hui, cette semaine) et
 * fusionne les signaux d'Alma d'un même membre.
 * Lot VE-6 (24/11/2026) : une annonce tient sur une seule ligne, tous types
 * de signaux confondus, et son bouton fait un geste faisable en un clic.
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
import { daysUntilStart, SIGNAL_TYPES, SIT_ACTION_PRIORITY } from "../../../supabase/functions/_shared/admin-signal-config.ts";
import type { MemberDraftTopic } from "./memberMessageDrafts";
import { ownerAbsenceLabel, ownerAbsentDays } from "./ownerAbsence";

export type GestureKind = "write" | "broadcast" | "card" | "link" | "more";
export type GestureBucket = "today" | "week";

export interface GestureWrite {
  userId: string;
  /** Prénom quand il est connu, sinon vide. */
  firstName: string;
  sitId?: string;
  topic: MemberDraftTopic;
}

/** Lot VE-6 : message au propriétaire d'une annonce, écrit par ownerMessageDraft. */
export interface GestureOwnerWrite {
  userId: string;
  /** Prénom quand il est connu, sinon vide. */
  firstName: string;
  sitId: string;
  /** Types des signaux de la ligne : le gabarit suit le type principal. */
  types: string[];
  /** Candidatures sans réponse de l'annonce. */
  applications: number;
  city: string | null;
  startDate: string | null;
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
  /** Lot VE-6 : annonce de la ligne, tous types de signaux confondus. */
  sitId?: string;
  /** Lot VE-6 : type du signal principal de la ligne. */
  type?: string;
  /** Lot VE-6 : jours avant le départ d'une annonce sans candidature. */
  daysToStart?: number | null;
  /** Lot VE-6 : le bouton écrit au propriétaire, les signaux se ferment à l'envoi. */
  ownerWrite?: GestureOwnerWrite;
  /** Lot VE-6 : propriétaire absent, le bouton écrit et « Diffuser l'annonce » passe en lien. */
  ownerAbsentDays?: number;
  sort: number;
}

/** Lot VE-6 : signaux de garde auxquels on répond par un message au propriétaire. */
export const OWNER_WRITE_TYPES = new Set(["owner_sit_unconfirmed", "stalled_discussion", "pending_application"]);

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

function noApplicationGesture(sitId: string, signals: PilotageSignal[], model: WorkListModel, family: WorkFamily, now: number): Gesture {
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
    key: `sit:${sitId}`,
    bucket: today ? "today" : "week",
    family,
    title: `${named} : aucune candidature`,
    detail: [
      start && days !== null ? `Départ le ${dayMonth(start)}, ${departureLabel(days)}.` : "",
      published > 0 ? `Publiée il y a ${published} ${published > 1 ? "jours" : "jour"}.` : "",
      // Lot VE-6 : le compte inclut les gardiens déjà prévenus (lot ANN-3), la ligne le dit.
      eligible > 0 ? `${eligible} ${eligible > 1 ? "gardiens" : "gardien"} à proximité, déjà prévenus compris.` : "Rayon de diffusion à élargir.",
    ].filter(Boolean).join(" "),
    chip: days !== null ? `Départ ${departureLabel(days)}` : "Cette semaine",
    tone: today ? "urgent" : "normal",
    kind: "broadcast",
    // Lot ANN-3 : le nombre de gardiens du coin inclut ceux déjà prévenus,
    // le bouton dit donc le geste, la fenêtre de diffusion dit qui le recevra.
    actionLabel: "Diffuser l'annonce",
    links: [{ label: "L'annonce", to: `/admin/listings?sit=${encodeURIComponent(sitId)}` }],
    signals,
    secondaryWrite: ownerId
      ? { userId: ownerId, firstName: "", sitId, topic: "no_applications", label: "Écrire au propriétaire" }
      : undefined,
    sitId, type: "no_applications", daysToStart: days,
    sort: days ?? 9999,
  };
}

/**
 * Lot VE-7 : « titre, ville » d'une annonce dans le détail d'une ligne. Le
 * titre saisi par le membre perd sa ponctuation finale, la ville n'est dite
 * qu'une fois (« Garde de maison et d'animaux, à Puycelsi »).
 */
export function sitLabel(title: string, city: string): string {
  const t = clean(title).replace(/[\s.,;:!?…]+$/, "") || "Annonce sans titre";
  const c = clean(city).replace(/[\s.,;:]+$/, "");
  return c && !t.toLowerCase().includes(c.toLowerCase()) ? `${t}, ${c}` : t;
}

/** Lot VE-7 : titre d'une ligne qui porte une seule annonce, quand le titre par type compte (« de 1 propriétaire »). */
const LINE_TITLES: Record<string, string> = {
  owner_missing_coordinates: "Corriger le lieu du propriétaire à situer sur la carte",
};

const bucketRank = (b: GestureBucket) => (b === "today" ? 0 : 1);
const byUrgency = (a: Gesture, b: Gesture) => bucketRank(a.bucket) - bucketRank(b.bucket) || toneRank(a.tone) - toneRank(b.tone) || a.sort - b.sort;
const sentence = (s: string) => (/[.!?…]$/.test(s.trim()) ? s.trim() : `${s.trim()}.`);

/** Lot VE-6 : un signal dit en mots courts dans « Aussi : … ». */
const ALSO_WORDS: Record<string, (k: number) => string> = {
  stalled_discussion: (k) => `${k} ${k > 1 ? "discussions" : "discussion"} à l'arrêt`,
  pending_application: (k) => `${k} ${k > 1 ? "candidatures" : "candidature"} sans réponse`,
  owner_sit_unconfirmed: () => "garde à confirmer",
  owner_missing_coordinates: () => "lieu à situer",
  sit_published_zero_reach: () => "zéro gardien touché",
  no_applications: () => "annonce sans candidature",
  stale_draft: () => "brouillon en attente",
  repeated_republish: () => "annonce republiée à répétition",
};

/** « 3 discussions à l'arrêt, garde à confirmer » : les autres signaux de l'annonce. */
export function alsoWords(signals: PilotageSignal[]): string {
  const counts = new Map<string, number>();
  for (const s of signals) counts.set(s.signal_type, (counts.get(s.signal_type) ?? 0) + 1);
  return [...counts]
    .map(([type, k]) => (ALSO_WORDS[type] ? ALSO_WORDS[type](k) : clean((SIGNAL_TYPES[type]?.label ?? "autre signal").toLowerCase())))
    .join(", ");
}

/** Signal principal d'une annonce : la diffusion, puis la cause, puis le verbe prioritaire, puis l'urgence. */
function mainOf(group: Gesture[]): Gesture {
  return group.find((g) => g.kind === "broadcast")
    ?? group.find((g) => g.type === "owner_missing_coordinates")
    ?? SIT_ACTION_PRIORITY.map((t) => group.find((g) => g.type === t)).find(Boolean)
    ?? [...group].sort(byUrgency)[0];
}

/**
 * Lot VE-6 : une ligne par annonce, tous types de signaux confondus. La ligne
 * « aucune candidature » absorbe les autres et garde son comportement ; sinon
 * le signal principal donne le titre et le bouton, le signal le plus pressé
 * donne l'échéance (une annonce garde sa place dans « Aujourd'hui »).
 */
function mergeSitGestures(list: Gesture[]): Gesture[] {
  const bySit = new Map<string, Gesture[]>();
  for (const g of list) if (g.sitId) bySit.set(g.sitId, [...(bySit.get(g.sitId) ?? []), g]);
  const out: Gesture[] = [];
  for (const g of list) {
    const group = g.sitId ? bySit.get(g.sitId) ?? [g] : [g];
    if (group.length === 1) { out.push(g); continue; }
    if (group[0] !== g) continue;
    const main = mainOf(group);
    const others = group.filter((x) => x !== main);
    const timing = main.kind === "broadcast" ? main : [...group].sort(byUrgency)[0];
    const links = [...main.links, ...others.flatMap((x) => x.links)]
      .filter((l, i, arr) => arr.findIndex((o) => o.to === l.to) === i);
    out.push({
      ...main,
      bucket: timing.bucket, tone: timing.tone, chip: timing.chip, sort: timing.sort,
      detail: `${sentence(main.detail)} Aussi : ${alsoWords(others.flatMap((x) => x.signals))}.`,
      links,
      signals: [...main.signals, ...others.flatMap((x) => x.signals)],
      secondaryWrite: main.secondaryWrite ?? others.map((x) => x.secondaryWrite).find(Boolean),
    });
  }
  return out;
}

/**
 * Lot VE-6 : une ligne de garde (garde à confirmer, discussion à l'arrêt,
 * candidatures sans réponse) écrit au propriétaire en un clic quand les
 * métadonnées donnent owner_id. La carte reste sous « Autres gestes ».
 */
function withOwnerWrite(g: Gesture, model: WorkListModel): Gesture {
  if (!g.sitId || g.kind !== "card" || !g.type || !OWNER_WRITE_TYPES.has(g.type)) return g;
  const withOwner = g.signals.find((s) => str(s.metadata?.owner_id));
  if (!withOwner) return g;
  const first = g.signals.map((s) => str(s.metadata?.owner_first_name)).find(Boolean) ?? "";
  const sit = model.sits.get(g.sitId);
  const meta = (k: string) => g.signals.map((s) => str(s.metadata?.[k])).find(Boolean) ?? "";
  return {
    ...g,
    kind: "write",
    actionLabel: first ? `Écrire à ${first}` : "Écrire au propriétaire",
    moreActions: true,
    ownerWrite: {
      userId: str(withOwner.metadata?.owner_id),
      firstName: first,
      sitId: g.sitId,
      types: g.signals.map((s) => s.signal_type),
      applications: g.signals.filter((s) => s.signal_type === "pending_application").length,
      city: str(sit?.city) || meta("sit_city") || meta("city") || null,
      startDate: str(sit?.start_date) || meta("start_date") || null,
    },
  };
}

/**
 * Lot VE-6 : « Diffuser » seulement quand le propriétaire est là. Absent
 * depuis plus de 14 jours (ownerAbsentDays), le bouton de la ligne « aucune
 * candidature » écrit au propriétaire et la diffusion passe en lien. Présent,
 * date inconnue ou lecture en échec (aucune entrée) : la ligne reste telle quelle.
 */
export function applyOwnerAbsence(gestures: Gesture[], lastSeenBySit: Map<string, string | null> | null | undefined, now: number = Date.now()): Gesture[] {
  if (!lastSeenBySit || lastSeenBySit.size === 0) return gestures;
  return gestures.map((g): Gesture => {
    if (g.children) return { ...g, children: applyOwnerAbsence(g.children, lastSeenBySit, now) };
    if (g.kind !== "broadcast" || !g.sitId || !g.secondaryWrite) return g;
    const days = ownerAbsentDays(lastSeenBySit.get(g.sitId), now);
    if (days === null) return g;
    return { ...g, ownerAbsentDays: days, actionLabel: g.secondaryWrite.label, detail: `${sentence(g.detail)} ${ownerAbsenceLabel(days)}.` };
  });
}

/** Annonces des lignes « aucune candidature », lignes repliées comprises. */
export function broadcastSitIds(gestures: Gesture[]): string[] {
  const ids = gestures.flatMap((g) => (g.children ? broadcastSitIds(g.children) : g.kind === "broadcast" && g.sitId ? [g.sitId] : []));
  return [...new Set(ids)].sort();
}

/** Une ligne par personne ou par annonce, triée : aujourd'hui, puis cette semaine. */
export function buildGestures(model: WorkListModel | null | undefined, now: number = Date.now()): Gesture[] {
  if (!model) return [];
  const built: Gesture[] = [];
  const alma = new Map<string, { signals: PilotageSignal[]; family: WorkFamily; today: boolean }>();

  for (const item of model.items) {
    if (item.signals.length === 0) {
      built.push({
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
        built.push(noApplicationGesture(sitId, signals, model, item.family, now));
        continue;
      }
      const m = signals[0].metadata ?? {};
      const sit = sitId ? model.sits.get(sitId) : undefined;
      const label = sitId
        ? sitLabel(str(sit?.title) || str(m.sit_title), str(sit?.city) || str(m.city))
        : clean(str(m.first_name) || str(m.title) || str(m.excerpt));
      const single = groups.size === 1;
      const own = elementLinkOf(signals[0]);
      const profile = profileOf(signals[0]);
      const first = str(m.first_name);
      // Lot VE-5 : meilleur gardien endormi, le bouton écrit ; le boost reste sous « Autres gestes ».
      if (item.type === "dormant_top_sitter" && profile) {
        const quiet = Number(m.days_since_last_application ?? 0) || 0;
        const reviews = Number(m.reviews_count ?? 0) || 0;
        built.push({
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
      built.push({
        key: `${item.key}:${key}`, bucket: isToday(item) ? "today" : "week", family: item.family,
        sitId: sitId ?? undefined, type: item.type,
        title: LINE_TITLES[item.type] ?? (single ? item.title : workCopy(item.type).title(1)),
        detail: [label, single ? item.detail : ""].filter(Boolean).map(sentence).join(" "),
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

  for (const [profileId, v] of alma) built.push(almaGesture(profileId, v.signals, v.family, v.today, now));

  // Lot VE-6 : une ligne par annonce, puis le geste d'écriture, puis les annonces lointaines.
  const merged = mergeSitGestures(built).map((g) => withOwnerWrite(g, model));
  const isFar = (g: Gesture) => g.kind === "broadcast" && g.daysToStart != null && g.daysToStart > NO_APPLICATION_WEEK_DAYS;
  const far = merged.filter(isFar);
  const out = merged.filter((g) => !isFar(g));

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

  return out.sort(byUrgency);
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
