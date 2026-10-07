/**
 * Lot P5 : alerte de poids du fichier d'entrée. Le build échoue avec un
 * message explicite au-delà de 300 000 octets, avant le plafond dur de
 * 307 200 octets où la publication échoue sans message.
 */
export const ENTRY_ALERT_BYTES = 300_000;

export function entryBudgetPlugin() {
  return {
    name: "guardiens-entry-budget",
    apply: "build",
    enforce: "post",
    writeBundle(_options, bundle) {
      for (const chunk of Object.values(bundle)) {
        if (chunk.type !== "chunk" || !chunk.isEntry) continue;
        const size = Buffer.byteLength(chunk.code, "utf8");
        if (size > ENTRY_ALERT_BYTES) {
          this.error(
            `Fichier d'entrée trop lourd : ${chunk.fileName} pèse ${size} octets, alerte à ${ENTRY_ALERT_BYTES} (plafond dur 307 200). Sortez du chemin critique ce qui n'est pas utile au premier rendu (lazyWithRetry).`,
          );
        }
      }
    },
  };
}
