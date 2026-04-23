/**
 * Fallback overlay that guarantees a visible error screen in the preview iframe
 * when something goes wrong before/while React boots, instead of a blank page.
 *
 * This is intentionally vanilla JS (no React) so it can render even if the
 * React tree fails to mount or a chunk fails to load.
 */

const OVERLAY_ID = "__fatal_error_overlay__";

type FatalErrorPayload = {
  title: string;
  message: string;
  stack?: string;
  source?: string;
};

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderOverlay(payload: FatalErrorPayload) {
  if (typeof document === "undefined") return;

  // Avoid stacking multiple overlays
  const existing = document.getElementById(OVERLAY_ID);
  if (existing) existing.remove();

  const root = document.createElement("div");
  root.id = OVERLAY_ID;
  root.setAttribute("role", "alert");
  root.setAttribute("aria-live", "assertive");
  root.style.cssText = [
    "position:fixed",
    "inset:0",
    "z-index:2147483647",
    "background:#0b0f17",
    "color:#f8fafc",
    "font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace",
    "padding:24px",
    "overflow:auto",
    "box-sizing:border-box",
  ].join(";");

  const stackHtml = payload.stack
    ? `<pre style="margin:0;padding:16px;background:#020617;border:1px solid #1e293b;border-radius:8px;color:#e2e8f0;font-size:12px;line-height:1.5;white-space:pre-wrap;word-break:break-word;max-height:50vh;overflow:auto;">${escapeHtml(payload.stack)}</pre>`
    : "";

  const sourceHtml = payload.source
    ? `<div style="margin-top:8px;font-size:12px;color:#64748b;">Source : ${escapeHtml(payload.source)}</div>`
    : "";

  root.innerHTML = `
    <div style="max-width:960px;margin:0 auto;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
        <div style="width:40px;height:40px;border-radius:50%;background:#7f1d1d;display:flex;align-items:center;justify-content:center;font-size:20px;">⚠️</div>
        <div>
          <h1 style="margin:0;font-size:18px;font-weight:700;color:#fecaca;font-family:system-ui,-apple-system,sans-serif;">
            ${escapeHtml(payload.title)}
          </h1>
          <div style="margin-top:2px;font-size:12px;color:#94a3b8;">Fallback overlay — l'application n'a pas pu démarrer correctement</div>
        </div>
      </div>

      <div style="padding:16px;background:#1e293b;border-left:4px solid #ef4444;border-radius:6px;margin-bottom:16px;">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#94a3b8;margin-bottom:6px;">Message</div>
        <div style="font-size:14px;color:#fef2f2;word-break:break-word;font-family:system-ui,-apple-system,sans-serif;">
          ${escapeHtml(payload.message)}
        </div>
        ${sourceHtml}
      </div>

      ${stackHtml ? `<div style="font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#94a3b8;margin-bottom:6px;">Stack trace</div>${stackHtml}` : ""}

      <div style="margin-top:20px;display:flex;gap:8px;flex-wrap:wrap;">
        <button id="__fatal_reload__" style="padding:8px 16px;background:#3b82f6;color:white;border:none;border-radius:6px;cursor:pointer;font-size:13px;font-family:system-ui,-apple-system,sans-serif;">
          Recharger la page
        </button>
        <button id="__fatal_dismiss__" style="padding:8px 16px;background:transparent;color:#94a3b8;border:1px solid #334155;border-radius:6px;cursor:pointer;font-size:13px;font-family:system-ui,-apple-system,sans-serif;">
          Masquer l'overlay
        </button>
      </div>
    </div>
  `;

  const mount = () => {
    document.body.appendChild(root);
    document.getElementById("__fatal_reload__")?.addEventListener("click", () => {
      window.location.reload();
    });
    document.getElementById("__fatal_dismiss__")?.addEventListener("click", () => {
      root.remove();
    });
  };

  if (document.body) {
    mount();
  } else {
    document.addEventListener("DOMContentLoaded", mount, { once: true });
  }

  // Also log clearly in console
  // eslint-disable-next-line no-console
  console.error(
    `%c[FatalErrorOverlay] ${payload.title}\n${payload.message}`,
    "color:#ef4444;font-weight:bold;",
    payload.stack ? `\n\n${payload.stack}` : "",
  );
}

function normalizeError(err: unknown): { message: string; stack?: string } {
  if (err instanceof Error) {
    return { message: err.message || err.name || "Erreur inconnue", stack: err.stack };
  }
  if (typeof err === "string") return { message: err };
  try {
    return { message: JSON.stringify(err) };
  } catch {
    return { message: String(err) };
  }
}

export function showFatalError(err: unknown, source = "manual") {
  const { message, stack } = normalizeError(err);
  renderOverlay({
    title: "Erreur fatale détectée",
    message,
    stack,
    source,
  });
}

export function installFatalErrorOverlay() {
  if (typeof window === "undefined") return;

  window.addEventListener("error", (event) => {
    // Ignore ResizeObserver noise
    if (event?.message?.includes("ResizeObserver loop")) return;

    const err = event.error ?? new Error(event.message || "Unknown window error");
    const { message, stack } = normalizeError(err);
    renderOverlay({
      title: "Erreur JavaScript non gérée",
      message,
      stack,
      source: event.filename
        ? `${event.filename}:${event.lineno ?? "?"}:${event.colno ?? "?"}`
        : "window.onerror",
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const { message, stack } = normalizeError(reason);
    renderOverlay({
      title: "Promesse non gérée (unhandledrejection)",
      message,
      stack,
      source: "unhandledrejection",
    });
  });

  // Watchdog : si après 8s rien n'a été monté dans #root, afficher un overlay
  // pour éviter une page blanche silencieuse en preview.
  window.setTimeout(() => {
    const root = document.getElementById("root");
    if (!root || root.childElementCount === 0) {
      renderOverlay({
        title: "Application non montée",
        message:
          "Aucun contenu n'a été rendu dans #root après 8 secondes. Cela indique généralement un échec de chargement de module (Vite 504), une erreur de bootstrap, ou un import manquant. Consultez la console pour plus de détails.",
        source: "watchdog",
      });
    }
  }, 8000);
}
