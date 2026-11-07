// Lot PUB2 : une fermeture ou un rechargement n'est plus compté comme abandon
// réel ; une réouverture dans le même onglet est mesurée.
import { describe, expect, it } from "vitest";
import {
  REOPEN_WINDOW_MS,
  buildAbandonMetadata,
  buildCloseMarker,
  buildReopenMetadata,
  classifyAbandonExit,
} from "@/lib/sitCreateAbandon";

describe("fermeture de page", () => {
  it("une fermeture (pagehide) est « closed », jamais « abandon »", () => {
    expect(classifyAbandonExit({ exit: "page_close" })).toBe("closed");
    expect(buildAbandonMetadata({
      step: 1, hasDraftParam: true, exit: "page_close", formShown: true, lastField: null, draftSaved: true,
    }).exit_kind).toBe("closed");
  });

  it("une navigation ailleurs sans geste du formulaire reste un abandon", () => {
    expect(classifyAbandonExit({ exit: "route_change", nextPath: "/dashboard" })).toBe("abandon");
  });
});

describe("réouverture après fermeture", () => {
  const now = Date.parse("2026-11-07T21:00:00Z");

  it("un rechargement 1 seconde après donne l'étape et le délai", () => {
    const marker = JSON.stringify(buildCloseMarker(2, now - 1000));
    expect(buildReopenMetadata(marker, now, "reload")).toEqual({ closed_step: 2, gap_s: 1, navigation: "reload" });
  });

  it("au-delà de 30 minutes, ce n'est plus une réouverture", () => {
    const marker = buildCloseMarker(0, now - REOPEN_WINDOW_MS - 1);
    expect(buildReopenMetadata(marker, now, "navigate")).toBeNull();
  });

  it("repère absent, illisible ou daté dans le futur : rien n'est mesuré", () => {
    expect(buildReopenMetadata(null, now, "reload")).toBeNull();
    expect(buildReopenMetadata("pas du json", now, "reload")).toBeNull();
    expect(buildReopenMetadata(buildCloseMarker(0, now + 5000), now, "reload")).toBeNull();
  });

  it("type de navigation inconnu ramené à « unknown »", () => {
    expect(buildReopenMetadata(buildCloseMarker(0, now - 10_000), now, "autre")?.navigation).toBe("unknown");
  });
});
