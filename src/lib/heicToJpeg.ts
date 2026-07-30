/**
 * Conversion HEIC/HEIF vers JPEG, côté navigateur.
 *
 * Le bucket identity-documents n'accepte que jpeg, png, webp et pdf : un HEIC
 * brut d'iPhone doit donc être converti avant l'upload. Contrairement au repli
 * tolérant de `compressImage.ts`, cette fonction échoue franchement plutôt que
 * de renommer un fichier non converti, pour ne jamais pousser d'octets illisibles.
 */

export function isHeicFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return (
    /heic|heif/i.test(file.type) ||
    name.endsWith(".heic") ||
    name.endsWith(".heif")
  );
}

/** Convertit en JPEG si nécessaire. Lève une erreur si la conversion échoue. */
export async function convertHeicToJpeg(file: File, quality = 0.92): Promise<File> {
  if (!isHeicFile(file)) return file;

  // Chargement paresseux : la bibliothèque ne pèse sur le bundle que si un
  // fichier HEIC est réellement choisi.
  const { default: heic2any } = await import("heic2any");
  const converted = await heic2any({ blob: file, toType: "image/jpeg", quality });
  const blob = Array.isArray(converted) ? converted[0] : converted;
  if (!blob || !(blob as Blob).size) {
    throw new Error("HEIC conversion produced an empty file");
  }
  const newName = file.name.replace(/\.(heic|heif)$/i, "") + ".jpg";
  return new File([blob as Blob], newName, { type: "image/jpeg" });
}
