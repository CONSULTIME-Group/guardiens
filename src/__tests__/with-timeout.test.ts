import { describe, it, expect, vi, afterEach } from "vitest";
import { withTimeout, TimeoutError } from "@/lib/withTimeout";

describe("withTimeout", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("résout avec la valeur si la promesse tient dans le délai", async () => {
    await expect(withTimeout(Promise.resolve(42), 1000)).resolves.toBe(42);
  });

  it("rejette avec TimeoutError sur une promesse qui ne se résout jamais", async () => {
    vi.useFakeTimers();
    // Reproduction du blocage /admin/breeds : la promesse de génération ne
    // se résout jamais (connexion figée). Sans garde, l'état « en cours »
    // restait allumé pour toujours.
    const never = new Promise(() => {});
    const raced = withTimeout(never, 1500, "génération");
    const assertion = expect(raced).rejects.toBeInstanceOf(TimeoutError);
    await vi.advanceTimersByTimeAsync(1500);
    await assertion;
  });

  it("propage une erreur métier immédiatement, sans attendre le délai", async () => {
    await expect(
      withTimeout(Promise.reject(new Error("boom")), 60_000),
    ).rejects.toThrow("boom");
  });

  it("une promesse lente mais dans le délai résout normalement", async () => {
    vi.useFakeTimers();
    const slow = new Promise<string>((resolve) => setTimeout(() => resolve("ok"), 800));
    const raced = withTimeout(slow, 1500);
    await vi.advanceTimersByTimeAsync(800);
    await expect(raced).resolves.toBe("ok");
  });
});
