import { readFileSync } from "node:fs";

const source = () => readFileSync("src/main.tsx", "utf8");

/** Exécute le vrai repli de main.tsx, sans monter l'application entière. */
export function productionFallback(): () => void {
  const code = source().match(/const markPrerenderReady = (\(\) => \{[\s\S]*?\n\});/)?.[1];
  if (!code) throw new Error("Repli de démarrage introuvable");
  return new Function("window", "location", `return ${code};`)(window, window.location);
}

/** Exécute le verrou réel placé avant createRoot et les routes lazy. */
export function bootState(pathname: string): { prerenderMetaPending?: boolean; prerenderReady?: boolean } {
  const code = source();
  const start = code.indexOf("const LATE_META_PATH =");
  const end = code.indexOf("// Guardiens est monolingue", start);
  if (start < 0 || end < 0) throw new Error("Verrou de démarrage introuvable");
  const state = {};
  new Function("window", "location", code.slice(start, end))(state, { pathname });
  return state;
}
