/**
 * Lot perf 12 : premier affichage de la fiche publique sur téléphone
 * (src/boot/bootSitView.ts), empaqueté avec le premier affichage de
 * /annonces. Part des lectures du HTML (window.__GUARDIENS_SIT__, lot perf 5),
 * attend la feuille de style, retiré par la vraie fiche à son premier rendu
 * (window.__guardiensBootSitDone), par un changement d'adresse ou au bout de
 * 30 s.
 */
import { BOOT_SIT_CSS, bootSitHtml, buildBootSitModel, type BootSitTexts } from "./bootSitView";

declare const __BOOT_SIT_TEXTS__: BootSitTexts;

export function bootSitEligible(pathname: string, isPhone: boolean): boolean {
  if (!isPhone) return false;
  const m = pathname.match(/^\/annonces\/([^/]+)\/?$/);
  return !!m && m[1] !== "international" && m[1] !== "demo";
}

(function () {
  try {
    const w = window as any;
    const slot = w.__GUARDIENS_SIT__;
    const phone = typeof window.matchMedia === "function" && window.matchMedia("(max-width: 767.98px)").matches;
    if (!slot || !slot.p || !bootSitEligible(location.pathname, phone)) return;
    const startPath = location.pathname;
    let done = false;
    let node: HTMLElement | null = null;
    let style: HTMLStyleElement | null = null;
    const remove = () => {
      done = true;
      if (node?.parentNode) node.parentNode.removeChild(node);
      if (style?.parentNode) style.parentNode.removeChild(style);
      node = null;
    };
    w.__guardiensBootSitDone = remove;
    window.addEventListener("popstate", remove);
    const timer = window.setTimeout(remove, 30_000);
    const cssReady = () => new Promise<void>((resolve) => {
      const link = document.querySelector('link[rel="stylesheet"][href*="/assets/index-"]') as HTMLLinkElement | null;
      if (!link || link.sheet) return resolve();
      link.addEventListener("load", () => resolve(), { once: true });
      link.addEventListener("error", () => resolve(), { once: true });
    });
    const bodyReady = () => new Promise<void>((resolve) => {
      const check = () => (document.body ? resolve() : window.setTimeout(check, 30));
      check();
    });
    Promise.resolve(slot.p).then(async (data: unknown) => {
      if (done) return;
      const model = buildBootSitModel(data, Date.now());
      if (!model) return;
      await Promise.all([cssReady(), bodyReady()]);
      if (done || location.pathname !== startPath) return;
      style = document.createElement("style");
      style.textContent = BOOT_SIT_CSS;
      document.head.appendChild(style);
      node = document.createElement("div");
      node.id = "boot-sit";
      node.setAttribute("aria-hidden", "true");
      node.innerHTML = bootSitHtml(model, __BOOT_SIT_TEXTS__);
      document.body.appendChild(node);
    }).catch(() => { window.clearTimeout(timer); remove(); });
  } catch {
    /* premier affichage accessoire : la vraie fiche s'affiche comme avant */
  }
})();
