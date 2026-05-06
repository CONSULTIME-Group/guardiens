/**
 * Mesure les dimensions (largeur/hauteur en pixels) d'un fichier image dans le navigateur.
 * Utilisé à l'upload pour stocker la qualité réelle de la photo (filtrage SEO indexation).
 *
 * Renvoie `{ width: 0, height: 0 }` en cas d'échec — le caller décide de la tolérance.
 */
export async function getImageDimensions(file: Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const w = img.naturalWidth || img.width || 0;
        const h = img.naturalHeight || img.height || 0;
        URL.revokeObjectURL(url);
        resolve({ width: w, height: h });
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve({ width: 0, height: 0 });
      };
      img.src = url;
    } catch {
      resolve({ width: 0, height: 0 });
    }
  });
}
