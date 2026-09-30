/**
 * Chargement paresseux et facultatif d'AfterPaintExtras (lot P2b) : un échec
 * de chargement ne fait jamais tomber la page (une nouvelle tentative, puis
 * rien), contrairement à lazyWithRetry qui recharge la page.
 */
import { lazy, type ComponentType } from "react";

const load = () => import("./AfterPaintExtras");

export default lazy(async (): Promise<{ default: ComponentType }> => {
  try { return await load(); } catch {
    try { await new Promise((r) => setTimeout(r, 500)); return await load(); } catch { return { default: () => null }; }
  }
});
