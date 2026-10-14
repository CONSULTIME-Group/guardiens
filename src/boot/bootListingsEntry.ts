/**
 * Lot perf 4 : point d'entrée du premier affichage de /annonces, empaqueté
 * seul et chargé par le HTML sur /annonces pour un visiteur
 * (scripts/vite-plugin-listings-prefetch.mjs). Affiche le haut de la page et
 * les cartes dès les lectures du HTML arrivées et la feuille de style prête ;
 * retiré par la vraie page à sa première recherche terminée
 * (window.__guardiensBootListingsDone, appelé par SearchSitter et
 * PublicListings), par un retour arrière, ou au bout de 60 s.
 */
import { BOOT_CSS, bootListingsHtml, buildBootModel, type BootTexts } from "./bootListingsView";
import { isListingsPrefetch } from "@/lib/listingsPrefetch";
import { parisTodayIso } from "@/lib/sitSearchRules";

declare const __BOOT_TEXTS__: BootTexts;

/** Paramètres d'adresse sans effet sur la liste d'un visiteur sans ville. */
const NEUTRAL_PARAMS = /^(perf_lab|utm_[a-z]+|fbclid|gclid|msclkid|ref|source)$/;

export function bootEligibleSearch(search: string): boolean {
  const params = new URLSearchParams(search);
  for (const k of params.keys()) if (!NEUTRAL_PARAMS.test(k)) return false;
  return true;
}

(function () {
  try {
    const w = window as any;
    const slot = w.__GUARDIENS_LISTINGS__;
    if (!slot || !slot.p || !bootEligibleSearch(location.search)) return;
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
    w.__guardiensBootListingsDone = remove;
    window.addEventListener("popstate", remove);
    // Garde-fou large : sur un réseau très lent, le code peut dépasser 20 s.
    const timer = window.setTimeout(remove, 60_000);

    const cssReady = () => new Promise<void>((resolve) => {
      const link = document.querySelector('link[rel="stylesheet"][href*="/assets/index-"]') as HTMLLinkElement | null;
      if (!link || link.sheet) return resolve();
      link.addEventListener("load", () => resolve(), { once: true });
      link.addEventListener("error", () => resolve(), { once: true });
    });
    // Jamais DOMContentLoaded : il attend l'exécution des scripts d'entrée
    // (modules différés), soit la fin du téléchargement du code. Le corps
    // existe dès que l'analyse du HTML l'atteint.
    const bodyReady = () => new Promise<void>((resolve) => {
      const check = () => (document.body ? resolve() : window.setTimeout(check, 30));
      check();
    });

    Promise.resolve(slot.p).then(async (data: unknown) => {
      if (done || !isListingsPrefetch(data)) return;
      await Promise.all([cssReady(), bodyReady()]);
      if (done || location.pathname !== startPath) return;
      const today = parisTodayIso();
      const model = buildBootModel(data, today);
      if (model.active.length === 0) return;
      // Repris par PublicListings (takeBootListingsCounts) : mêmes lignes au relais.
      w.__GUARDIENS_LISTINGS_COUNTS__ = { openCount: model.openCount, citiesCount: model.citiesCount, intlCount: model.intlCount, at: Date.now() };
      style = document.createElement("style");
      style.textContent = BOOT_CSS;
      document.head.appendChild(style);
      node = document.createElement("div");
      node.id = "boot-listings";
      node.innerHTML = bootListingsHtml(model, __BOOT_TEXTS__, today);
      document.body.appendChild(node);
    }).catch(() => { window.clearTimeout(timer); remove(); });
  } catch {
    /* premier affichage accessoire : la vraie page s'affiche comme avant */
  }
})();
