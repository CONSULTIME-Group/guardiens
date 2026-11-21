/** Lot MSG3 : une bulle courte (« Stop ») tient sur une ligne. */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const src = readFileSync("src/components/messages/MessageBubble.tsx", "utf8");

describe("MSG3, bulle de message courte", () => {
  it("la rangée de la bulle prend toute la largeur du fil", () => {
    // La largeur maximale de 78 % se mesure sur la rangée. Une rangée ajustée au texte
    // donnait une bulle de 78 % de son propre texte, coupée lettre par lettre.
    const row = src.match(/<div className=\{`flex ([^`]*)`\} data-testid="message-bubble-row">/);
    expect(row).not.toBeNull();
    expect(row![1].split(/\s+/)).toContain("w-full");
  });

  it("la bulle garde sa largeur maximale de 78 %", () => {
    expect(src).toContain('"max-w-[78%] px-4 py-2.5"');
  });
});
