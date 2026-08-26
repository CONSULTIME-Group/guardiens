/**
 * Déduction de la date d'une photo de galerie, sans jamais deviner.
 *
 * Deux sources, dans l'ordre : la donnée EXIF DateTimeOriginal, puis une date
 * lisible dans le nom du fichier. Sans rien, on renvoie null : la date du jour
 * n'est jamais un repli.
 */

/** Vérifie la plausibilité (année 1990 à 2100, mois et jour valides). */
function isPlausible(y: number, m: number, d: number): boolean {
  if (y < 1990 || y > 2100) return false;
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Extrait une date au format YYYY-MM-DD depuis un nom de fichier.
 * Motifs couverts : « WhatsApp Image 2023-11-26 at 12.51.08.jpeg »,
 * « IMG_20231126 », « PXL_20231126 », « Screenshot 2023-11-26 ».
 * Renvoie null si aucune date plausible n'est trouvée.
 */
export function photoDateFromFilename(filename: string | null | undefined): string | null {
  const name = typeof filename === "string" ? filename : "";
  if (!name) return null;

  // Forme séparée : 2023-11-26, 2023_11_26, 2023.11.26
  const sep = name.match(/(?:^|[^\d])(\d{4})[-_.](\d{2})[-_.](\d{2})(?!\d)/);
  if (sep) {
    const [y, m, d] = [Number(sep[1]), Number(sep[2]), Number(sep[3])];
    if (isPlausible(y, m, d)) return `${y}-${pad(m)}-${pad(d)}`;
  }

  // Forme compacte : 20231126 (IMG_, PXL_, VID_, capture brute)
  const compact = name.match(/(?:^|[^\d])(\d{4})(\d{2})(\d{2})(?!\d)/);
  if (compact) {
    const [y, m, d] = [Number(compact[1]), Number(compact[2]), Number(compact[3])];
    if (isPlausible(y, m, d)) return `${y}-${pad(m)}-${pad(d)}`;
  }

  return null;
}

/**
 * Lit DateTimeOriginal (ou DateTime) dans l'en-tête EXIF d'un JPEG.
 * Renvoie YYYY-MM-DD, ou null si absent, illisible ou implausible.
 */
export async function photoDateFromExif(file: Blob): Promise<string | null> {
  try {
    // L'en-tête EXIF tient dans les premiers kilo-octets : on ne lit pas tout.
    const head = file.slice(0, 256 * 1024);
    const buf = await head.arrayBuffer();
    const view = new DataView(buf);
    if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return null;

    let offset = 2;
    while (offset + 4 <= view.byteLength) {
      if (view.getUint8(offset) !== 0xff) break;
      const marker = view.getUint8(offset + 1);
      const size = view.getUint16(offset + 2);
      if (marker === 0xe1) {
        const app1 = offset + 4;
        // « Exif\0\0 »
        if (app1 + 6 > view.byteLength) return null;
        const tiff = app1 + 6;
        if (tiff + 8 > view.byteLength) return null;
        const little = view.getUint16(tiff) === 0x4949;
        const ifd0 = tiff + view.getUint32(tiff + 4, little);
        const readIfd = (start: number): string | null => {
          if (start + 2 > view.byteLength) return null;
          const count = view.getUint16(start, little);
          let exifIfd = 0;
          let found: string | null = null;
          for (let i = 0; i < count; i++) {
            const entry = start + 2 + i * 12;
            if (entry + 12 > view.byteLength) break;
            const tag = view.getUint16(entry, little);
            if (tag === 0x8769) exifIfd = tiff + view.getUint32(entry + 8, little);
            if (tag === 0x9003 || tag === 0x0132) {
              const len = view.getUint32(entry + 4, little);
              const valOff = len > 4 ? tiff + view.getUint32(entry + 8, little) : entry + 8;
              let s = "";
              for (let k = 0; k < len && valOff + k < view.byteLength; k++) {
                const c = view.getUint8(valOff + k);
                if (c === 0) break;
                s += String.fromCharCode(c);
              }
              const m = s.match(/^(\d{4}):(\d{2}):(\d{2})/);
              if (m) {
                const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
                if (isPlausible(y, mo, d)) {
                  if (tag === 0x9003) return `${y}-${pad(mo)}-${pad(d)}`;
                  found = `${y}-${pad(mo)}-${pad(d)}`;
                }
              }
            }
          }
          if (exifIfd) {
            const nested = readIfd(exifIfd);
            if (nested) return nested;
          }
          return found;
        };
        return readIfd(ifd0);
      }
      if (marker === 0xd8 || marker === 0x01) {
        offset += 2;
      } else {
        offset += 2 + size;
      }
    }
    return null;
  } catch {
    return null;
  }
}

/** EXIF d'abord, nom de fichier ensuite, sinon null. */
export async function inferPhotoDate(file: File): Promise<string | null> {
  const exif = await photoDateFromExif(file);
  if (exif) return exif;
  return photoDateFromFilename(file.name);
}
