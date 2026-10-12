/**
 * Chargement paresseux et facultatif d'AfterPaintExtras (lot P2b) : un échec
 * de chargement ne fait jamais tomber la page (une nouvelle tentative, puis
 * rien), contrairement à lazyWithRetry qui recharge la page.
 * Lot F2 : un module résolu à vide (fichier périmé après publication) compte
 * comme un échec (src/lib/optionalLazy.ts).
 */
import { optionalLazy } from "@/lib/optionalLazy";

export default optionalLazy(() => import("./AfterPaintExtras"));
