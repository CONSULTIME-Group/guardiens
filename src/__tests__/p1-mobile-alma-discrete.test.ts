import { describe, it, expect, beforeEach, vi } from "vitest";
import { readFileSync } from "node:fs";

vi.mock("@/integrations/supabase/client", () => {
  const invoke = vi.fn(async () => ({ data: { condition: "clear" } }));
  const maybeSingle = vi.fn(async () => ({ data: { id: "u1", alma_hidden: true }, error: null }));
  const chain: any = { select: () => chain, eq: () => chain, maybeSingle };
  return { supabase: { functions: { invoke }, from: vi.fn(() => chain) } };
});

import { decideWhisperArrival, markSpontaneousUsed, spontaneousUsedThisSession, ALMA_PEEK_DURATION_MS } from "@/lib/alma/whisperArrival";
import { getDailyWeather } from "@/lib/alma/weatherCache";
import { fetchMyProfile, patchMyProfileCache } from "@/lib/myProfile";
import { registerAppQueryClient } from "@/lib/appQueryClient";
import { QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const DOCK = readFileSync("src/components/ai/alma/AlmaDock.tsx", "utf8");

describe("P1, Alma discrète sur mobile", () => {
  beforeEach(() => sessionStorage.clear());

  it("sous md, un whisper n'ouvre pas le panneau : bulle peek", () => {
    expect(decideWhisperArrival({ isMobile: true, pathname: "/petites-missions", spontaneousAlreadyUsed: false, formFieldFocused: false })).toBe("peek");
  });
  it("/dashboard mobile : ni bulle ni panneau", () => {
    expect(decideWhisperArrival({ isMobile: true, pathname: "/dashboard", spontaneousAlreadyUsed: false, formFieldFocused: false })).toBe("badge_only");
  });
  it("ordinateur : une ouverture spontanée par session au plus", () => {
    const first = decideWhisperArrival({ isMobile: false, pathname: "/sits", spontaneousAlreadyUsed: spontaneousUsedThisSession(), formFieldFocused: false });
    expect(first).toBe("open_spontaneous");
    markSpontaneousUsed();
    expect(decideWhisperArrival({ isMobile: false, pathname: "/sits", spontaneousAlreadyUsed: spontaneousUsedThisSession(), formFieldFocused: false })).toBe("badge_only");
  });
  it("ordinateur : jamais pendant qu'un champ a le focus", () => {
    expect(decideWhisperArrival({ isMobile: false, pathname: "/sits", spontaneousAlreadyUsed: false, formFieldFocused: true })).toBe("badge_only");
  });
  it("bulle : 6 s, toucher ouvre le panneau avec origin peek, mesure peek_shown", () => {
    expect(ALMA_PEEK_DURATION_MS).toBe(6000);
    expect(DOCK).toContain('onClick={(e) => openPanel("peek", e.currentTarget)}');
    expect(DOCK).toContain('"alma_whisper_peek_shown"');
  });
  it("aucune ouverture sur touchstart, conteneur en pointer-events-none", () => {
    const touch = DOCK.match(/onTouchStart=\{([^}]*)\}/g) ?? [];
    for (const t of touch) expect(t).not.toMatch(/openPanel|setExpanded/);
    expect(DOCK).toContain('"fixed z-40 pointer-events-none flex flex-col items-end"');
  });
});

describe("P1, météo une fois par jour", () => {
  beforeEach(() => localStorage.clear());
  it("second appel du jour sans appel serveur", async () => {
    const inv = (supabase.functions.invoke as any);
    inv.mockClear();
    expect(await getDailyWeather("u1", { defer: false })).toBe("clear");
    expect(await getDailyWeather("u1", { defer: false })).toBe("clear");
    expect(inv).toHaveBeenCalledTimes(1);
  });
});

describe("P1, profil lu une fois", () => {
  it("lectures multiples, une seule requête ; écriture mise en cache", async () => {
    registerAppQueryClient(new QueryClient());
    const from = supabase.from as any;
    from.mockClear();
    await Promise.all([fetchMyProfile("u1"), fetchMyProfile("u1"), fetchMyProfile("u1")]);
    await fetchMyProfile("u1");
    expect(from).toHaveBeenCalledTimes(1);
    patchMyProfileCache("u1", { alma_hidden: false });
    expect((await fetchMyProfile("u1")).data?.alma_hidden).toBe(false);
  });
});
