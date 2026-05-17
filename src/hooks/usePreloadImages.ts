import { useEffect } from "react";

/**
 * Précharge une liste d'images via <link rel="preload" as="image"> injectés
 * dans <head>. Évite le pop-in des illustrations critiques en empêchant
 * que le navigateur attende la découverte par le DOM.
 *
 * - Idempotent : ne crée pas de doublons (clé = href).
 * - Nettoie les <link> à l'unmount pour libérer le cache hint.
 * - À appeler le plus tôt possible (mount du conteneur parent).
 */
export function usePreloadImages(srcs: readonly string[]) {
  useEffect(() => {
    const created: HTMLLinkElement[] = [];
    for (const href of srcs) {
      if (!href) continue;
      const exists = document.head.querySelector(
        `link[rel="preload"][as="image"][href="${href}"]`
      );
      if (exists) continue;
      const link = document.createElement("link");
      link.rel = "preload";
      link.as = "image";
      link.href = href;
      // type hint => le navigateur skip si format non supporté
      if (href.endsWith(".webp")) link.type = "image/webp";
      document.head.appendChild(link);
      created.push(link);
    }
    return () => {
      for (const link of created) link.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [srcs.join("|")]);
}
