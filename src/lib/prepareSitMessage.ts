/**
 * Lot L9 (09/11/2026, arène tableau de bord v2, emprunt A-15) : « Préparer
 * votre garde ». Le gardien retenu choisit son heure d'arrivée et, s'il le
 * souhaite, une rencontre avant la garde ; le message envoyé au propriétaire
 * ne cite que ces choix, la date enregistrée et les prénoms déclarés.
 * La rencontre reste facultative : aucune option n'est choisie d'office.
 */
import { storyDate } from "@/lib/dashboardStory";

export type ArrivalSlot = "matin" | "midi" | "apres_midi" | "soir";
export type MeetingChoice = "appel" | "visite";

export const ARRIVAL_SLOTS: ReadonlyArray<{ value: ArrivalSlot; label: string; phrase: string }> = [
  { value: "matin", label: "Le matin", phrase: "dans la matinée" },
  { value: "midi", label: "Vers midi", phrase: "vers midi" },
  { value: "apres_midi", label: "L'après-midi", phrase: "dans l'après-midi" },
  { value: "soir", label: "En soirée", phrase: "en soirée" },
];

export const MEETING_CHOICES: ReadonlyArray<{ value: MeetingChoice; label: string; phrase: string }> = [
  { value: "appel", label: "Un appel avant", phrase: "Si vous le souhaitez, nous pouvons nous appeler avant la garde." },
  { value: "visite", label: "Une visite avant", phrase: "Si vous le souhaitez, je peux passer vous rencontrer avant la garde." },
];

const firstWord = (s: string | null | undefined) => (s ?? "").trim().split(/\s+/)[0] ?? "";

export interface PrepareMessageInput {
  ownerFirstName?: string | null;
  sitterFirstName?: string | null;
  /** Premier jour de la garde, AAAA-MM-JJ. */
  startDate?: string | null;
  slot: ArrivalSlot | null;
  meeting?: MeetingChoice | null;
}

/** Message proposé, modifiable avant l'envoi. Vide tant que l'heure d'arrivée manque. */
export function prepareMessage(i: PrepareMessageInput): string {
  if (!i.slot) return "";
  const owner = firstWord(i.ownerFirstName);
  const sitter = firstWord(i.sitterFirstName);
  const date = storyDate(i.startDate);
  const slot = ARRIVAL_SLOTS.find((s) => s.value === i.slot)!.phrase;
  const lines = [
    owner ? `Bonjour ${owner},` : "Bonjour,",
    "",
    date ? `J'arriverai le ${date} ${slot}.` : `J'arriverai le premier jour de la garde ${slot}.`,
  ];
  const meeting = i.meeting ? MEETING_CHOICES.find((m) => m.value === i.meeting)?.phrase : null;
  if (meeting) lines.push(meeting);
  lines.push("", sitter ? `À bientôt,\n${sitter}` : "À bientôt.");
  return lines.join("\n");
}

/** Événements de mesure de la feuille. */
export const PREPARE_EVENTS = {
  opened: "dashboard_prepare_sheet_opened",
  sent: "dashboard_prepare_sheet_sent",
} as const;
