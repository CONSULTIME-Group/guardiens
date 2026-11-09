/**
 * Lot ADM10 (22/10/2026) puis lot ADM13 (09/11/2026) : le rangement de la vue
 * d'ensemble vit dans supabase/functions/_shared/admin-work-list.ts, lu aussi
 * par l'email du matin. Ce fichier le réexporte pour les écrans admin.
 */
export {
  AUTO_LABELS,
  HEBDO_LABELS,
  autoBreakdown,
  buildPilotage,
  buildWorkList,
  departureLabel,
  hebdoBreakdown,
  natureOf,
  sitIdOf,
  unavailableSentence,
  WORK_FAMILY_LABELS,
  WORK_FAMILY_ORDER,
  type DeadlineTone,
  type PilotageLine,
  type PilotageModel,
  type PilotageSignal,
  type PilotageSit,
  type WorkFamily,
  type WorkItem,
  type WorkListModel,
  type WorkListRaw,
} from "../../../supabase/functions/_shared/admin-work-list.ts";
