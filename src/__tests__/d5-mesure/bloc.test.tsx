/**
 * Lot D5 (09/11/2026) : mesure par bloc de l'accueil. Vue une fois par
 * session quand le bloc est réellement à l'écran, clic sur tout lien ou
 * bouton du bloc, chemin sans paramètres, aucun texte enregistré.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { render, cleanup, act, fireEvent } from "@testing-library/react";
import { useState } from "react";

const track = vi.hoisted(() => vi.fn());
vi.mock("@/lib/analytics", () => ({ trackEvent: track }));

import DashboardBlock, {
  DASHBOARD_BLOCKS, blockClickTarget, blockSeenKey, isBlockSeen,
} from "@/components/dashboard/shared/DashboardBlock";

type Cb = (entries: any[]) => void;
let observers: { cb: Cb; disconnected: boolean }[] = [];
class FakeIO {
  rec: { cb: Cb; disconnected: boolean };
  constructor(cb: Cb) { this.rec = { cb, disconnected: false }; observers.push(this.rec); }
  observe() {}
  unobserve() {}
  disconnect() { this.rec.disconnected = true; }
  takeRecords() { return []; }
}
const entry = (height: number, visible: number, top = 100) => ({
  isIntersecting: visible > 0,
  boundingClientRect: { height, top },
  intersectionRect: { height: visible },
});
const fire = (e: any) => act(() => { for (const o of observers) if (!o.disconnected) o.cb([e]); });

beforeEach(() => {
  track.mockReset();
  observers = [];
  (globalThis as any).IntersectionObserver = FakeIO;
  try { sessionStorage.clear(); } catch {}
  Object.defineProperty(window, "innerHeight", { value: 765, configurable: true });
});
afterEach(() => cleanup());

describe("D5, règles pures", () => {
  it("vue : la moitié du bloc, plafonnée à 160 px", () => {
    expect(isBlockSeen(200, 99)).toBe(false);
    expect(isBlockSeen(200, 100)).toBe(true);
    expect(isBlockSeen(900, 159)).toBe(false);
    expect(isBlockSeen(900, 160)).toBe(true);
    expect(isBlockSeen(0, 0)).toBe(false);
  });
  it("clé de session par espace, mise en page et bloc", () => {
    expect(blockSeenKey("owner", "desktop", "cockpit")).toBe("guardiens_block_seen:owner:desktop:cockpit");
  });
  it("cible : chemin interne sans paramètres, hôte d'un lien externe, bouton sans destination", () => {
    const root = document.createElement("div");
    root.innerHTML = `<a id="i" href="/sits/abc?x=1#candidatures"><span id="s">Découvrir chez Laurence</span></a>
      <a id="e" href="https://exemple.org/page?q=1">x</a><button id="b">Ok</button><p id="p">texte</p>`;
    document.body.appendChild(root);
    expect(blockClickTarget(root.querySelector("#s"), root)).toEqual({ kind: "link", href: "/sits/abc" });
    expect(blockClickTarget(root.querySelector("#e"), root)).toEqual({ kind: "link", href: "exemple.org" });
    expect(blockClickTarget(root.querySelector("#b"), root)).toEqual({ kind: "button", href: null });
    expect(blockClickTarget(root.querySelector("#p"), root)).toBeNull();
    const outside = document.createElement("a");
    outside.setAttribute("href", "/x");
    document.body.appendChild(outside);
    expect(blockClickTarget(outside, root)).toBeNull();
    root.remove(); outside.remove();
  });
});

describe("D5, DashboardBlock", () => {
  it("vue envoyée une seule fois par session, au seuil réel, avec above_fold", () => {
    render(<DashboardBlock block="cockpit" space="owner" layout="desktop"><p>Bonjour</p></DashboardBlock>);
    fire(entry(300, 100));
    expect(track).not.toHaveBeenCalled();
    fire(entry(300, 200, 120));
    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith("dashboard_block_seen", {
      source: "/dashboard",
      metadata: { block: "cockpit", space: "owner", layout: "desktop", above_fold: true, viewport_h: 765 },
    });
    expect(sessionStorage.getItem("guardiens_block_seen:owner:desktop:cockpit")).toBe("1");
    cleanup();
    observers = [];
    render(<DashboardBlock block="cockpit" space="owner" layout="desktop"><p>Bonjour</p></DashboardBlock>);
    expect(observers).toHaveLength(0);
  });
  it("bloc sous le premier écran : above_fold faux", () => {
    render(<DashboardBlock block="family" space="owner" layout="phone"><p>Famille</p></DashboardBlock>);
    fire(entry(300, 300, 900));
    expect(track.mock.calls[0][1].metadata.above_fold).toBe(false);
  });
  it("clic sur un lien du bloc : chemin sans paramètres, jamais le texte", () => {
    const { getByText } = render(
      <DashboardBlock block="star" space="sitter" layout="desktop">
        <div><p>Une maison attend son gardien</p><a href="/sits/s1?from=dash">Découvrir chez Laurence</a></div>
      </DashboardBlock>,
    );
    fireEvent.click(getByText("Une maison attend son gardien"));
    expect(track).not.toHaveBeenCalled();
    fireEvent.click(getByText("Découvrir chez Laurence"));
    expect(track).toHaveBeenCalledWith("dashboard_block_clicked", {
      source: "/dashboard",
      metadata: { block: "star", space: "sitter", layout: "desktop", kind: "link", href: "/sits/s1" },
    });
    expect(JSON.stringify(track.mock.calls)).not.toContain("Laurence");
  });
  it("vide : hidden, puis visible quand son contenu arrive", async () => {
    let show: (v: boolean) => void = () => {};
    function Later() {
      const [on, setOn] = useState(false);
      show = setOn;
      return on ? <p>Contenu</p> : null;
    }
    const { container } = render(<DashboardBlock block="readings" space="owner" layout="desktop"><Later /></DashboardBlock>);
    const el = container.querySelector("[data-dashboard-block='readings']") as HTMLElement;
    expect(el.hidden).toBe(true);
    // MutationObserver : rappel en microtâche, avant le dessin suivant.
    await act(async () => { show(true); });
    expect(el.hidden).toBe(false);
  });
  it("sans IntersectionObserver : aucune vue, aucun plantage", () => {
    delete (globalThis as any).IntersectionObserver;
    render(<DashboardBlock block="alma" space="owner" layout="phone"><p>Alma</p></DashboardBlock>);
    expect(track).not.toHaveBeenCalled();
  });
});

describe("D5, couverture des deux accueils", () => {
  const src = (f: string) => readFileSync(`src/components/dashboard/${f}`, "utf8");
  const used = (s: string) => new Set([...s.matchAll(/<DashboardBlock block="([a-z_]+)"/g)].map((m) => m[1]));
  const owner = used(src("OwnerDashboard.tsx"));
  const sitter = used(src("SitterDashboard.tsx"));

  it("chaque bloc de la liste fermée est posé dans au moins un accueil", () => {
    for (const b of DASHBOARD_BLOCKS) expect(owner.has(b) || sitter.has(b), b).toBe(true);
  });
  it("propriétaire : accueil, vedette, récit, gardiens à proximité, famille, entraide et colonne de droite", () => {
    for (const b of ["cockpit", "star", "story", "departure", "nearby_sitters", "annonce", "family", "entraide", "pulse", "history", "next_step", "alma", "reassurance", "readings", "priority", "access_gate", "emergency"]) {
      expect(owner.has(b), b).toBe(true);
    }
  });
  it("gardien : accueil, récit, liste d'ouverture, gardes, entraide et colonne de droite", () => {
    for (const b of ["cockpit", "story", "opening", "match", "missing", "entraide", "pulse", "next_step", "alma", "reassurance", "readings", "access_gate"]) {
      expect(sitter.has(b), b).toBe(true);
    }
  });
  it("événements typés et libellés en admin", () => {
    const a = readFileSync("src/lib/analytics.ts", "utf8");
    const l = readFileSync("src/lib/admin/labels.ts", "utf8");
    for (const e of ["dashboard_block_seen", "dashboard_block_clicked"]) {
      expect(a).toContain(`"${e}"`);
      expect(l).toContain(`${e}:`);
    }
  });
});
