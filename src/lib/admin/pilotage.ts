/**
 * Lot ADM10 (22/10/2026, maquette validée par Jérémie) : la vue d'ensemble
 * admin répond à trois questions. Ce module pur range les signaux ouverts :
 * - « Ce qui vous attend aujourd'hui » : départ sous 7 jours (quelle que soit
 *   la nature), puis ce que seul un fondateur peut faire (nature « vous ») ;
 * - « Le système s'en charge » : nature « auto », hors départ imminent ;
 * - le reste : « technique » avec l'état du site, « hebdo » au lundi.
 * Une ligne regroupe un type ; ses cartes d'action existantes s'ouvrent dessous.
 */
import {
  SIGNAL_TYPES,
  daysUntilStart,
  isSitImminent,
  isSitStarted,
  signalAction,
  signalNature,
  SIT_TIMED_TYPES,
  type SignalNature,
} from "../../../supabase/functions/_shared/admin-signal-config.ts";

export interface PilotageSignal {
  id: string;
  signal_type: string;
  severity: string;
  entity_type: string | null;
  entity_id: string | null;
  detected_at: string;
  metadata: Record<string, unknown> | null;
}

export interface PilotageSit { id: string; start_date: string | null }

export type DeadlineTone = "urgent" | "late" | "normal";

export interface PilotageLine {
  key: string;
  type: string;
  title: string;
  detail: string;
  deadline: string;
  tone: DeadlineTone;
  /** Libellé du bouton qui ouvre les cartes d'action. */
  action: string;
  signals: PilotageSignal[];
}

export interface PilotageModel {
  urgent: PilotageLine[];
  vous: PilotageLine[];
  technique: PilotageSignal[];
  /** Situations suivies par les relances, par type, hors départ imminent. */
  auto: { type: string; count: number }[];
  autoTotal: number;
  /** Synthèse du lundi, par type. */
  hebdo: { type: string; count: number }[];
}

export const sitIdOf = (s: PilotageSignal): string | null => {
  const m = s.metadata ?? {};
  if (typeof m.sit_id === "string") return m.sit_id;
  if (s.entity_type === "sit" && s.entity_id) return s.entity_id;
  return null;
};

const n = (k: number, one: string, many: string) => (k > 1 ? many : one);

/** « aujourd'hui », « demain », « dans 3 jours ». */
export function departureLabel(days: number): string {
  if (days <= 0) return "aujourd'hui";
  if (days === 1) return "demain";
  return `dans ${days} jours`;
}

const shortDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", timeZone: "Europe/Paris" });
};

/** Titre et précision d'une ligne « départ sous 7 jours ». */
function urgentCopy(type: string, sits: number, days: number): { title: string; detail: string; action: string } {
  const dep = departureLabel(days);
  switch (type) {
    case "stale_draft":
      return {
        title: `Écrire ${n(sits, "au propriétaire dont le brouillon part", `aux ${sits} propriétaires dont le brouillon part`)} ${dep}`,
        detail: "Annonce jamais publiée, le rappel automatique est parti sans effet.",
        action: "Écrire",
      };
    case "pending_application":
      return {
        title: `Relancer ${n(sits, "le propriétaire qui n'a pas répondu à ses candidats", `les ${sits} propriétaires qui n'ont pas répondu à leurs candidats`)}`,
        detail: `Départ ${dep}, la relance automatique est déjà partie.`,
        action: "Relancer",
      };
    case "owner_sit_unconfirmed":
      return {
        title: `Aider ${n(sits, "le propriétaire", `les ${sits} propriétaires`)} à confirmer ${n(sits, "son gardien", "leur gardien")}`,
        detail: `Départ ${dep}, la garde reste à confirmer.`,
        action: "Aider",
      };
    case "stalled_discussion":
      return {
        title: `Relancer ${n(sits, "la discussion à l'arrêt", `les ${sits} discussions à l'arrêt`)}`,
        detail: `Départ ${dep}, le rappel automatique est déjà parti.`,
        action: "Relancer",
      };
    case "no_applications":
      return {
        title: `Diffuser ${n(sits, "l'annonce restée sans candidature", `les ${sits} annonces restées sans candidature`)}`,
        detail: `Départ ${dep}, gardiens à proximité à solliciter.`,
        action: "Diffuser",
      };
    default:
      return {
        title: `${SIGNAL_TYPES[type]?.label ?? type} : ${sits}`,
        detail: `Départ ${dep}. ${signalAction(type)}`,
        action: "Ouvrir",
      };
  }
}

/** Titre et verbe d'une ligne « seul vous pouvez trancher ». */
function vousCopy(type: string, k: number): { title: string; action: string } {
  switch (type) {
    case "alma_contact_request":
      return { title: k > 1 ? `Répondre aux ${k} membres qui vous ont écrit depuis Alma` : "Répondre au membre qui vous a écrit depuis Alma", action: "Répondre" };
    case "alma_frustration":
      return { title: `Écrire ${n(k, "au membre en difficulté", `aux ${k} membres en difficulté`)} avec Alma`, action: "Écrire" };
    case "alma_churn":
      return { title: `Écrire ${n(k, "au membre qui veut partir", `aux ${k} membres qui veulent partir`)}`, action: "Écrire" };
    case "alma_bug_report":
      return { title: `Reproduire ${n(k, "le problème signalé", `les ${k} problèmes signalés`)} à Alma`, action: "Ouvrir" };
    case "alma_safety":
      return { title: `Lire ${n(k, "le sujet de sûreté confié", `les ${k} sujets de sûreté confiés`)} à Alma`, action: "Lire" };
    case "suspicious_account":
      return { title: `Examiner ${k} ${n(k, "compte suspect", "comptes suspects")}`, action: "Examiner" };
    case "sit_like_mission":
      return { title: `Vérifier ${k} ${n(k, "coup de main qui ressemble à une garde", "coups de main qui ressemblent à une garde")}`, action: "Vérifier" };
    case "animal_rehoming_listing":
      return { title: `Vérifier ${k} ${n(k, "annonce de cession d'animal", "annonces de cession d'animal")}`, action: "Vérifier" };
    case "no_applications":
      return { title: `Diffuser ${k} ${n(k, "annonce sans candidature", "annonces sans candidature")} après 48 heures`, action: "Diffuser" };
    case "identity_needs_review":
    case "stale_verification":
    case "identity_orphan_documents":
      return { title: `Contrôler ${k} ${n(k, "vérification d'identité", "vérifications d'identité")}`, action: "Contrôler" };
    case "dormant_top_sitter":
      return { title: `Écrire ${n(k, "au meilleur gardien endormi", `aux ${k} meilleurs gardiens endormis`)}`, action: "Écrire" };
    default:
      return { title: `${SIGNAL_TYPES[type]?.label ?? type} : ${k}`, action: "Ouvrir" };
  }
}

const DAY = 86_400_000;

/** Ordre des natures pour les tests et l'email : une seule source. */
export const natureOf = (type: string): SignalNature => signalNature(type);

export function buildPilotage(
  signals: PilotageSignal[],
  sits: Map<string, PilotageSit>,
  now: number = Date.now(),
): PilotageModel {
  const startOf = (s: PilotageSignal): string | null => {
    const id = sitIdOf(s);
    const fromSit = id ? sits.get(id)?.start_date ?? null : null;
    const fromMeta = typeof s.metadata?.start_date === "string" ? (s.metadata.start_date as string) : null;
    return fromSit ?? fromMeta;
  };

  const urgentByType = new Map<string, PilotageSignal[]>();
  const vousByType = new Map<string, PilotageSignal[]>();
  const autoByType = new Map<string, number>();
  const hebdoByType = new Map<string, number>();
  const technique: PilotageSignal[] = [];

  for (const s of signals) {
    if (s.severity === "info") continue;
    const nature = signalNature(s.signal_type);
    const start = startOf(s);
    // Garde commencée : plus aucune action avant le départ (règle ADM1).
    if (sitIdOf(s) && SIT_TIMED_TYPES.has(s.signal_type) && isSitStarted(start, now)) continue;
    const imminent = (nature === "auto" || nature === "vous") && !!sitIdOf(s) && isSitImminent(start, now);
    if (imminent) {
      const arr = urgentByType.get(s.signal_type) ?? [];
      arr.push(s);
      urgentByType.set(s.signal_type, arr);
    } else if (nature === "vous") {
      const arr = vousByType.get(s.signal_type) ?? [];
      arr.push(s);
      vousByType.set(s.signal_type, arr);
    } else if (nature === "auto") {
      autoByType.set(s.signal_type, (autoByType.get(s.signal_type) ?? 0) + 1);
    } else if (nature === "technique") {
      technique.push(s);
    } else {
      hebdoByType.set(s.signal_type, (hebdoByType.get(s.signal_type) ?? 0) + 1);
    }
  }

  const urgent: PilotageLine[] = [...urgentByType].map(([type, arr]) => {
    const sitIds = [...new Set(arr.map(sitIdOf).filter((x): x is string => !!x))];
    const days = Math.min(...arr.map((s) => daysUntilStart(startOf(s), now) ?? 7));
    const copy = urgentCopy(type, sitIds.length, days);
    return {
      key: `urgent:${type}`,
      type,
      title: copy.title,
      detail: copy.detail,
      deadline: days <= 3 ? "Avant ce soir" : "Aujourd'hui",
      tone: "urgent" as const,
      action: copy.action,
      signals: arr,
    };
  }).sort((a, b) => minDays(a, startOf, now) - minDays(b, startOf, now));

  const vous: PilotageLine[] = [...vousByType].map(([type, arr]) => {
    const oldest = arr.reduce((m, s) => (s.detected_at < m ? s.detected_at : m), arr[0].detected_at);
    const ageDays = Math.max(0, Math.floor((now - new Date(oldest).getTime()) / DAY));
    const critical = arr.some((s) => s.severity === "critical");
    const copy = vousCopy(type, arr.length);
    const late = ageDays > 3 && (critical || type.startsWith("alma_"));
    return {
      key: `vous:${type}`,
      type,
      title: copy.title,
      detail: arr.length > 1 ? `Le plus ancien attend depuis le ${shortDate(oldest)}.` : `Depuis le ${shortDate(oldest)}.`,
      deadline: late ? `En retard de ${ageDays} jours` : critical ? "Aujourd'hui" : "Cette semaine",
      tone: (late ? "late" : "normal") as DeadlineTone,
      action: copy.action,
      signals: arr,
    };
  }).sort((a, b) => toneRank(a.tone) - toneRank(b.tone) || oldestOf(a).localeCompare(oldestOf(b)));

  const auto = [...autoByType].map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count);
  const hebdo = [...hebdoByType].map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count);
  return { urgent, vous, technique, auto, autoTotal: auto.reduce((t, x) => t + x.count, 0), hebdo };
}

function minDays(l: PilotageLine, startOf: (s: PilotageSignal) => string | null, now: number) {
  return Math.min(...l.signals.map((s) => daysUntilStart(startOf(s), now) ?? 7));
}
const toneRank = (t: DeadlineTone) => (t === "urgent" ? 0 : t === "late" ? 1 : 2);
const oldestOf = (l: PilotageLine) => l.signals.reduce((m, s) => (s.detected_at < m ? s.detected_at : m), l.signals[0].detected_at);

/** Libellés courts des situations suivies par les relances. */
export const AUTO_LABELS: Record<string, { one: string; many: string }> = {
  pending_application: { one: "candidature sans réponse", many: "candidatures sans réponse" },
  stale_draft: { one: "brouillon", many: "brouillons" },
  stalled_discussion: { one: "discussion à l'arrêt", many: "discussions à l'arrêt" },
  owner_sit_unconfirmed: { one: "garde à confirmer", many: "gardes à confirmer" },
};

/** « 18 candidatures sans réponse, 12 brouillons, 7 discussions à l'arrêt ». */
export function autoBreakdown(auto: { type: string; count: number }[]): string {
  return auto
    .map(({ type, count }) => {
      const l = AUTO_LABELS[type];
      return l ? `${count} ${count > 1 ? l.many : l.one}` : `${count} ${SIGNAL_TYPES[type]?.label ?? type}`;
    })
    .join(", ");
}

/** Libellés de la synthèse du lundi. */
export const HEBDO_LABELS: Record<string, string> = {
  dormant_sitter: "gardiens dormants",
  affinity_onboarding_stale: "onboarding inachevé",
  city_coverage_gap: "couverture des villes",
  city_seo_tension: "tension SEO des villes",
  alma_unanswered: "questions sans réponse d'Alma",
};

export function hebdoBreakdown(hebdo: { type: string; count: number }[]): string {
  return hebdo.map(({ type, count }) => `${HEBDO_LABELS[type] ?? SIGNAL_TYPES[type]?.label ?? type} (${count})`).join(", ");
}
