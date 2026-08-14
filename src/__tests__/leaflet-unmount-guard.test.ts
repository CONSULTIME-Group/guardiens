import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Garde-fou statique : tout <MapContainer> doit embarquer
 * <LeafletUnmountGuard /> (cf. src/components/shared/LeafletUnmountGuard.tsx).
 *
 * Sans ce garde, démonter une carte pendant un zoom animé laisse courir le
 * setTimeout(250ms) de Leaflet vers _onZoomTransitionEnd, qui tape une carte
 * sans _mapPane : crash "reading '_leaflet_pos'" (empreinte lo413y).
 */

const SRC = join(process.cwd(), "src");

const walk = (dir: string): string[] => {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "__tests__") continue;
      out.push(...walk(full));
    } else if (full.endsWith(".tsx") && !full.endsWith(".test.tsx")) {
      out.push(full);
    }
  }
  return out;
};

describe("garde-fou Leaflet : démontage pendant un zoom animé", () => {
  it("tout composant rendant un MapContainer embarque LeafletUnmountGuard", () => {
    const offenders: string[] = [];
    for (const file of walk(SRC)) {
      const content = readFileSync(file, "utf8");
      if (!content.includes("<MapContainer")) continue;
      if (!content.includes("<LeafletUnmountGuard")) {
        offenders.push(file.slice(SRC.length + 1));
      }
    }
    expect(offenders).toEqual([]);
  });
});
