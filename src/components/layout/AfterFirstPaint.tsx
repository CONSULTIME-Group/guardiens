import { useEffect, useState, type ReactNode } from "react";
import { runAfterFirstPaint } from "@/lib/bootSchedule";

/**
 * Monte ses enfants quand le navigateur a du temps libre après le premier
 * affichage (lot P2). Rien n'est supprimé, seulement reporté de quelques
 * centaines de millisecondes au plus (2 s maximum).
 */
export function AfterFirstPaint({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    runAfterFirstPaint(() => { if (alive) setReady(true); });
    return () => { alive = false; };
  }, []);
  return ready ? <>{children}</> : null;
}
