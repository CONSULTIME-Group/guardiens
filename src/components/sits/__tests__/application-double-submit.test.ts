/**
 * Garde-fou anti double candidature.
 *
 * Incident du 31/07/2026 : 8 lignes créées dans `applications` pour 4
 * candidatures réelles, à environ 30 ms d'intervalle. Cause : `setSending(true)`
 * n'était posé qu'après plusieurs `await` (import dynamique, modération), donc
 * un second événement passait la garde `sending` avant tout rendu React.
 *
 * Ce test est statique : il vérifie que le verrou synchrone par ref est bien
 * présent dans le composant, et il vérifie en dynamique qu'un tel verrou
 * empêche effectivement une seconde exécution concurrente.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const FILE = path.join(process.cwd(), "src/components/sits/ApplicationModal.tsx");

describe("ApplicationModal, protection anti double soumission", () => {
  const src = fs.readFileSync(FILE, "utf8");

  it("déclare un verrou synchrone par ref", () => {
    expect(src).toMatch(/const sendingRef = useRef\(false\)/);
  });

  it("pose le verrou avant tout await dans doSend", () => {
    const start = src.indexOf("const doSend = async");
    expect(start).toBeGreaterThan(-1);
    const body = src.slice(start, start + 400);
    const guardIdx = body.indexOf("if (sendingRef.current) return;");
    const lockIdx = body.indexOf("sendingRef.current = true;");
    const awaitIdx = body.indexOf("await");
    expect(guardIdx).toBeGreaterThan(-1);
    expect(lockIdx).toBeGreaterThan(guardIdx);
    expect(awaitIdx).toBeGreaterThan(lockIdx);
  });

  it("relâche le verrou dans un finally", () => {
    expect(src).toMatch(/finally\s*{\s*sendingRef\.current = false;/);
  });

  it("handleSend contrôle aussi le verrou synchrone", () => {
    expect(src).toMatch(/sending \|\| sendingRef\.current/);
  });
});

describe("sémantique du verrou synchrone", () => {
  it("un second appel concurrent est ignoré", async () => {
    const lock = { current: false };
    let inserts = 0;
    const inner = async () => {
      await new Promise((r) => setTimeout(r, 10));
      inserts += 1;
    };
    const send = async () => {
      if (lock.current) return;
      lock.current = true;
      try {
        await inner();
      } finally {
        lock.current = false;
      }
    };
    await Promise.all([send(), send(), send()]);
    expect(inserts).toBe(1);
  });

  it("un envoi séquentiel reste possible après relâche", async () => {
    const lock = { current: false };
    let inserts = 0;
    const send = async () => {
      if (lock.current) return;
      lock.current = true;
      try {
        inserts += 1;
      } finally {
        lock.current = false;
      }
    };
    await send();
    await send();
    expect(inserts).toBe(2);
  });
});
