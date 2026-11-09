/**
 * Lot D5 (09/11/2026, audit « Tableaux de bord ordinateur », lot 5) : mesure
 * par bloc de l'accueil, pour les deux espaces, sur ordinateur comme sur
 * téléphone.
 *
 * - dashboard_block_seen : une fois par session et par bloc, quand la moitié du
 *   bloc (ou 160 px s'il est plus haut) est réellement à l'écran. above_fold dit
 *   si le haut du bloc tient dans le premier écran, sans défilement.
 * - dashboard_block_clicked : chaque clic sur un lien ou un bouton du bloc, avec
 *   le chemin de destination sans paramètres. Aucun texte de bouton n'est
 *   enregistré (il peut porter le prénom d'un autre membre).
 *
 * Le conteneur reste un bloc ordinaire pour garder les espacements des
 * colonnes ; vide, il prend l'attribut hidden et n'en ajoute aucun.
 */
import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { trackEvent } from "@/lib/analytics";
import { getSafeSessionStorage } from "@/lib/storageFallback";

export type DashboardSpace = "owner" | "sitter";
export type DashboardLayout = "desktop" | "phone";

/** Blocs mesurés. Liste fermée : la requête de contrôle du lot s'y réfère. */
export const DASHBOARD_BLOCKS = [
  "alma_first_meeting",
  "role_activation",
  "missing_city",
  "inbox_nudge",
  "departure",
  "cockpit",
  "story",
  "star",
  "opening",
  "alert_zone",
  "match",
  "missing",
  "cap",
  "nearby_sitters",
  "annonce",
  "family",
  "entraide",
  "pulse",
  "history",
  "next_step",
  "alma",
  "reassurance",
  "readings",
  "priority",
  "access_gate",
  "emergency",
] as const;
export type DashboardBlockId = (typeof DASHBOARD_BLOCKS)[number];

export const blockSeenKey = (space: DashboardSpace, layout: DashboardLayout, block: DashboardBlockId) =>
  `guardiens_block_seen:${space}:${layout}:${block}`;

/** Seuil de vue : la moitié du bloc, plafonnée à 160 px pour les blocs hauts. */
export const isBlockSeen = (blockHeight: number, visibleHeight: number) =>
  blockHeight > 0 && visibleHeight >= Math.min(blockHeight * 0.5, 160);

/**
 * Cible d'un clic dans le bloc : lien, bouton ou résumé dépliable le plus
 * proche. Renvoie le genre et, pour un lien interne, son chemin sans
 * paramètres ni ancre ; pour un lien externe, son seul nom d'hôte.
 */
export function blockClickTarget(
  target: EventTarget | null,
  root: HTMLElement,
): { kind: "link" | "button"; href: string | null } | null {
  if (!target || !(target as Element).closest) return null;
  const el = (target as Element).closest("a[href], button, summary, [role='button']");
  if (!el || !root.contains(el)) return null;
  if (el.tagName === "A") {
    const raw = el.getAttribute("href") ?? "";
    try {
      const base = typeof window !== "undefined" ? window.location.origin : "https://guardiens.fr";
      const url = new URL(raw, base);
      return { kind: "link", href: url.origin === base ? url.pathname : url.hostname };
    } catch {
      return { kind: "link", href: null };
    }
  }
  return { kind: "button", href: null };
}

interface DashboardBlockProps {
  block: DashboardBlockId;
  space: DashboardSpace;
  layout: DashboardLayout;
  className?: string;
  children: ReactNode;
}

export default function DashboardBlock({ block, space, layout, className, children }: DashboardBlockProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Vide (composant enfant rendu à null) : hidden, pour ne pas ajouter d'écart.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const sync = () => {
      el.hidden = el.childElementCount === 0 && !(el.textContent ?? "").trim();
    };
    sync();
    if (typeof MutationObserver === "undefined") return;
    const mo = new MutationObserver(sync);
    mo.observe(el, { childList: true });
    return () => mo.disconnect();
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof window === "undefined" || typeof IntersectionObserver === "undefined") return;
    const store = getSafeSessionStorage();
    const key = blockSeenKey(space, layout, block);
    try {
      if (store?.getItem(key)) return;
    } catch { /* stockage indisponible : on mesure quand même */ }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          if (!isBlockSeen(entry.boundingClientRect.height, entry.intersectionRect.height)) continue;
          const top = entry.boundingClientRect.top + (window.scrollY || 0);
          try { store?.setItem(key, "1"); } catch { /* sans effet */ }
          try {
            void trackEvent("dashboard_block_seen", {
              source: "/dashboard",
              metadata: { block, space, layout, above_fold: top < window.innerHeight, viewport_h: window.innerHeight },
            });
          } catch { /* mesure facultative */ }
          io.disconnect();
          return;
        }
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [block, space, layout]);

  return (
    <div
      ref={ref}
      className={className}
      data-dashboard-block={block}
      onClickCapture={(e) => {
        const root = ref.current;
        if (!root) return;
        const hit = blockClickTarget(e.target, root);
        if (!hit) return;
        try {
          void trackEvent("dashboard_block_clicked", {
            source: "/dashboard",
            metadata: { block, space, layout, kind: hit.kind, href: hit.href },
          });
        } catch { /* mesure facultative */ }
      }}
    >
      {children}
    </div>
  );
}
