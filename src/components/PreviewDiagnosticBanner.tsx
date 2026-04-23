import { useEffect, useState } from "react";
import { AlertTriangle, RefreshCw, X } from "lucide-react";

/**
 * Banner de diagnostic visible uniquement en preview (sandbox iframe).
 * Détecte automatiquement :
 *  - les erreurs 504 sur les modules Vite (échecs de pré-bundling)
 *  - les "Failed to fetch dynamically imported module" (chunks cassés)
 *  - les erreurs de bootstrap React
 *
 * Propose un bouton "Restart preview" qui force un rechargement complet
 * en bypass cache.
 */

type DiagnosticIssue = {
  kind: "module-504" | "dynamic-import" | "bootstrap" | "chunk";
  detail: string;
  at: number;
};

const isPreviewEnv = () => {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return (
    host.includes("lovableproject.com") ||
    host.includes("lovable.app") ||
    host.includes("lovable.dev") ||
    host === "localhost" ||
    host === "127.0.0.1"
  );
};

export const PreviewDiagnosticBanner = () => {
  const [issues, setIssues] = useState<DiagnosticIssue[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!isPreviewEnv()) return;

    const pushIssue = (issue: DiagnosticIssue) => {
      setIssues((prev) => {
        // Déduplication par kind + detail
        if (prev.some((p) => p.kind === issue.kind && p.detail === issue.detail)) {
          return prev;
        }
        // Garde max 5 dernières
        return [...prev, issue].slice(-5);
      });
    };

    // 1. Détection erreurs réseau (504, 502, 503) sur modules Vite via PerformanceObserver
    let perfObserver: PerformanceObserver | null = null;
    try {
      perfObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType !== "resource") continue;
          const r = entry as PerformanceResourceTiming;
          // Heuristique : transferSize 0 + duration > 0 sur du JS = échec probable
          // Mais le vrai signal vient des erreurs JS captées plus bas.
          if (
            r.name.includes("/node_modules/.vite/") &&
            r.transferSize === 0 &&
            r.decodedBodySize === 0 &&
            r.duration > 100
          ) {
            const moduleName = r.name.split("/node_modules/.vite/").pop()?.split("?")[0] ?? r.name;
            pushIssue({
              kind: "module-504",
              detail: moduleName,
              at: Date.now(),
            });
          }
        }
      });
      perfObserver.observe({ entryTypes: ["resource"] });
    } catch {
      // PerformanceObserver indisponible → on ignore
    }

    // 2. Détection via window.onerror (échecs d'import dynamique)
    const onError = (event: ErrorEvent) => {
      const msg = event.message || "";
      if (msg.includes("Failed to fetch dynamically imported module")) {
        pushIssue({
          kind: "dynamic-import",
          detail: event.filename || msg,
          at: Date.now(),
        });
      } else if (msg.includes("Importing a module script failed") || msg.includes("Loading chunk")) {
        pushIssue({
          kind: "chunk",
          detail: event.filename || msg,
          at: Date.now(),
        });
      }
    };

    // 3. Détection via unhandledrejection
    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const msg = reason instanceof Error ? reason.message : String(reason ?? "");
      if (msg.includes("Failed to fetch dynamically imported module")) {
        pushIssue({
          kind: "dynamic-import",
          detail: msg.slice(0, 120),
          at: Date.now(),
        });
      } else if (msg.includes("504") && msg.toLowerCase().includes("module")) {
        pushIssue({
          kind: "module-504",
          detail: msg.slice(0, 120),
          at: Date.now(),
        });
      }
    };

    // 4. Watchdog bootstrap : si #root toujours vide après 6s, signaler
    const bootstrapTimeout = window.setTimeout(() => {
      const root = document.getElementById("root");
      if (root && root.childElementCount === 0) {
        pushIssue({
          kind: "bootstrap",
          detail: "Aucun composant rendu dans #root après 6s",
          at: Date.now(),
        });
      }
    }, 6000);

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);

    return () => {
      perfObserver?.disconnect();
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
      window.clearTimeout(bootstrapTimeout);
    };
  }, []);

  if (!isPreviewEnv() || dismissed || issues.length === 0) return null;

  const handleRestart = () => {
    // Bypass cache : ajoute un cache-buster et force reload
    const url = new URL(window.location.href);
    url.searchParams.set("__restart", String(Date.now()));
    window.location.replace(url.toString());
  };

  const labelFor = (kind: DiagnosticIssue["kind"]) => {
    switch (kind) {
      case "module-504":
        return "Module Vite indisponible (504)";
      case "dynamic-import":
        return "Import dynamique échoué";
      case "chunk":
        return "Chargement de chunk échoué";
      case "bootstrap":
        return "Bootstrap incomplet";
    }
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed top-3 left-1/2 -translate-x-1/2 z-[2147483646] w-[min(640px,calc(100vw-24px))] rounded-lg border border-amber-300 bg-amber-50 shadow-lg dark:bg-amber-950 dark:border-amber-800"
      data-testid="preview-diagnostic-banner"
    >
      <div className="p-3 sm:p-4">
        <div className="flex items-start gap-3">
          <div className="shrink-0 rounded-full bg-amber-200 dark:bg-amber-900 p-1.5 mt-0.5">
            <AlertTriangle className="h-4 w-4 text-amber-700 dark:text-amber-300" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-semibold text-sm text-amber-900 dark:text-amber-100">
                Problème de chargement détecté en preview
              </h2>
              <button
                onClick={() => setDismissed(true)}
                aria-label="Fermer"
                className="shrink-0 rounded p-0.5 text-amber-700/70 hover:text-amber-900 dark:text-amber-300/70 dark:hover:text-amber-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <p className="mt-1 text-xs text-amber-800 dark:text-amber-200">
              {issues.length} signal{issues.length > 1 ? "aux" : ""} détecté
              {issues.length > 1 ? "s" : ""}. Le serveur de preview a peut-être
              besoin d'être redémarré pour repeupler son cache.
            </p>

            <ul className="mt-2 space-y-0.5 text-[11px] font-mono text-amber-900/80 dark:text-amber-200/80 max-h-24 overflow-auto">
              {issues.map((i, idx) => (
                <li key={idx} className="truncate" title={i.detail}>
                  <span className="font-semibold">{labelFor(i.kind)}</span>
                  {" — "}
                  <span className="opacity-75">{i.detail}</span>
                </li>
              ))}
            </ul>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={handleRestart}
                className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-400 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors"
                data-testid="preview-restart-button"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Restart preview
              </button>
              <button
                onClick={() => setIssues([])}
                className="inline-flex items-center rounded-md border border-amber-300 dark:border-amber-700 px-3 py-1.5 text-xs font-medium text-amber-900 dark:text-amber-100 hover:bg-amber-100 dark:hover:bg-amber-900 transition-colors"
              >
                Effacer les signaux
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
