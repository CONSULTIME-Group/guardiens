import { describe, it, expect } from "vitest";
import {
  canEmit,
  makeInitialState,
  onDismiss,
  onEmit,
  pickNext,
  DISMISS_COOLDOWN_MS,
} from "../whisper-scheduler";
import type { AlmaWhisper } from "../whisper-types";

const mkWhisper = (
  type: AlmaWhisper["type"],
  overrides: Partial<AlmaWhisper> = {},
): AlmaWhisper => ({
  id: `id-${type}-${Math.random()}`,
  type,
  audience: "sitter",
  surface: "search",
  priority: "P2",
  message: "test",
  ...overrides,
});

describe("Alma whisper scheduler", () => {
  it("silent frequency bloque toute émission", () => {
    const s = makeInitialState("silent");
    expect(canEmit(s, "sitter_fresh_sit_detected").reason).toBe("silent");
  });

  it("balanced autorise 3 whispers max avec cooldown 5min", () => {
    let s = makeInitialState("balanced");
    const now = 1_000_000;
    expect(canEmit(s, "sitter_fresh_sit_detected", now).ok).toBe(true);
    s = onEmit(s, now);
    expect(canEmit(s, "sitter_fresh_sit_detected", now + 1000).reason).toBe("cooldown");
    // au-delà du cooldown
    s = onEmit(s, now + 6 * 60 * 1000);
    s = onEmit(s, now + 12 * 60 * 1000);
    expect(canEmit(s, "sitter_fresh_sit_detected", now + 18 * 60 * 1000).reason).toBe("quota");
  });

  it("talkative autorise 8 whispers avec cooldown 90s", () => {
    let s = makeInitialState("talkative");
    let now = 0;
    for (let i = 0; i < 8; i++) {
      expect(canEmit(s, "sitter_fresh_sit_detected", now).ok).toBe(true);
      s = onEmit(s, now);
      now += 91_000;
    }
    expect(canEmit(s, "sitter_fresh_sit_detected", now).reason).toBe("quota");
  });

  it("blacklist bloque un type précis", () => {
    const s = makeInitialState("balanced", ["sitter_search_indecision"]);
    expect(canEmit(s, "sitter_search_indecision").reason).toBe("blacklisted");
    expect(canEmit(s, "sitter_fresh_sit_detected").ok).toBe(true);
  });

  it("dismiss volontaire déclenche un cooldown de 15 min", () => {
    let s = makeInitialState("balanced");
    s = onDismiss(s, "closed_manually", 0);
    expect(canEmit(s, "sitter_fresh_sit_detected", 1000).reason).toBe("dismiss_cooldown");
    expect(canEmit(s, "sitter_fresh_sit_detected", DISMISS_COOLDOWN_MS + 1).ok).toBe(true);
  });

  it("2 dismiss volontaires dans la session activent le mode muted", () => {
    let s = makeInitialState("balanced");
    s = onDismiss(s, "closed_manually", 0);
    s = onDismiss(s, "closed_manually", 1000);
    expect(s.sessionMuted).toBe(true);
    expect(canEmit(s, "sitter_fresh_sit_detected", 999_999_999).reason).toBe("muted");
  });

  it("timeout ne mute pas la session", () => {
    let s = makeInitialState("balanced");
    s = onDismiss(s, "timeout", 0);
    s = onDismiss(s, "timeout", 1000);
    expect(s.sessionMuted).toBe(false);
  });

  it("pickNext choisit P0 avant P1 avant P2", () => {
    const s = makeInitialState("talkative");
    const queue: AlmaWhisper[] = [
      mkWhisper("sitter_fresh_sit_detected", { priority: "P2" }),
      mkWhisper("owner_reciprocal_interest", { audience: "owner", priority: "P0" }),
      mkWhisper("sitter_popular_sit_context", { priority: "P1" }),
    ];
    const next = pickNext(queue, s);
    expect(next?.type).toBe("owner_reciprocal_interest");
  });

  it("pickNext à priorité égale, le plus récent (dernier ajouté) gagne", () => {
    const s = makeInitialState("talkative");
    const older = mkWhisper("sitter_fresh_sit_detected", { priority: "P2" });
    const newer = mkWhisper("sitter_search_indecision", { priority: "P2" });
    const queue = [older, newer];
    const next = pickNext(queue, s);
    expect(next?.type).toBe("sitter_search_indecision");
  });

  it("pickNext exclut les whispers dont canEmit est faux", () => {
    const s = makeInitialState("balanced", ["owner_reciprocal_interest"]);
    const queue: AlmaWhisper[] = [
      mkWhisper("owner_reciprocal_interest", { audience: "owner", priority: "P0" }),
      mkWhisper("sitter_fresh_sit_detected", { priority: "P2" }),
    ];
    const next = pickNext(queue, s);
    expect(next?.type).toBe("sitter_fresh_sit_detected");
  });
});
