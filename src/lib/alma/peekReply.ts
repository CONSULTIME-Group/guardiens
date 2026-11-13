/**
 * Lot ALMA4 (13/11/2026, arène « Alma vivante », lot L4) : l'aperçu qui se
 * répond. Les règles vivent dans supabase/functions/_shared/alma-reply-chip.ts,
 * lues aussi par alma-chat ; ce module les réexporte et ajoute la mise en
 * page de l'aperçu.
 */
import { isActionSurface } from "../../../supabase/functions/_shared/alma-reply-chip.ts";

export {
  isActionSurface,
  isReplyFactCompatible,
  isInSeason,
  pickReplyFact,
  replyActionChip,
  replyChipForWhisper,
  replyChipKindForFact,
  REPLY_CHIP_ACTION_SURFACES,
  REPLY_CHIP_DAILY_LIMIT,
  REPLY_CHIP_EMPTY_ANSWER,
  REPLY_CHIP_HUMOR_TYPE,
  REPLY_CHIP_INPUT_MODE,
  REPLY_CHIP_LABELS,
  type ReplyChipKind,
} from "../../../supabase/functions/_shared/alma-reply-chip.ts";

/**
 * Lignes de texte de l'aperçu, au plus : quatre sur un écran de découverte,
 * une sur un écran d'action. Mesure du 13/11/2026 : la blague de référence
 * (148 signes) tient en trois lignes à 390 px et en quatre à 360 px, le fait
 * le plus long de la base (185 signes) en quatre lignes à 390 px.
 */
export const PEEK_DISCOVERY_MAX_LINES = 4;

export function peekLines(surface: string | null | undefined): 1 | typeof PEEK_DISCOVERY_MAX_LINES {
  return isActionSurface(surface) ? 1 : PEEK_DISCOVERY_MAX_LINES;
}

/** Délai avant qu'un défilement referme l'aperçu (le saut de page d'une navigation passe avant). */
export const PEEK_SCROLL_ARM_MS = 800;
