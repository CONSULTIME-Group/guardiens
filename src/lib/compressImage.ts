/**
 * Compress an image using native Canvas API.
 * - Max width: 1200px (preserves ratio)
 * - Quality: 0.8
 * - Format: webp if supported, else jpeg
 * - Target: < 300kb
 * Non-image files (PDF, etc.) are returned as-is.
 */

function supportsWebp(): boolean {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL("image/webp").startsWith("data:image/webp");
  } catch {
    return false;
  }
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Canvas toBlob failed"))),
      mimeType,
      quality
    );
  });
}

async function convertHeicIfNeeded(file: File): Promise<File> {
  const nameLower = file.name.toLowerCase();
  const isHeic =
    /heic|heif/i.test(file.type) ||
    nameLower.endsWith(".heic") ||
    nameLower.endsWith(".heif");
  if (!isHeic) return file;
  // Lazy import : ~200 ko, chargé uniquement si un HEIC est détecté.
  try {
    const { default: heic2any } = await import("heic2any");
    const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
    const blob = Array.isArray(converted) ? converted[0] : converted;
    const newName = file.name.replace(/\.(heic|heif)$/i, ".jpg") || "photo.jpg";
    return new File([blob], newName, { type: "image/jpeg" });
  } catch {
    // Sur iOS, Safari sait décoder le HEIC nativement : on laisse le pipeline
    // canvas prendre le relais, il produira un JPG ou un WebP.
    return new File([file], file.name.replace(/\.(heic|heif)$/i, ".jpg"), {
      type: "image/jpeg",
    });
  }
}


export async function compressImageFile(
  file: File,
  _maxSizeMB = 5,
  maxWidthOrHeight = 1200
): Promise<File> {
  // Convertit HEIC/HEIF iPhone en JPG avant toute manipulation canvas.
  file = await convertHeicIfNeeded(file);

  // Skip non-image files
  if (!file.type.startsWith("image/")) return file;

  const img = await loadImage(file);

  // Calculate new dimensions (preserve ratio)
  let { width, height } = img;
  if (width > maxWidthOrHeight || height > maxWidthOrHeight) {
    if (width >= height) {
      height = Math.round((height * maxWidthOrHeight) / width);
      width = maxWidthOrHeight;
    } else {
      width = Math.round((width * maxWidthOrHeight) / height);
      height = maxWidthOrHeight;
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, width, height);

  const useWebp = supportsWebp();
  const mimeType = useWebp ? "image/webp" : "image/jpeg";
  const ext = useWebp ? "webp" : "jpg";

  // Try quality 0.8 first, then reduce if > 300kb
  let quality = 0.8;
  let blob = await canvasToBlob(canvas, mimeType, quality);

  // Progressive quality reduction to reach < 300kb
  const TARGET = 300 * 1024;
  while (blob.size > TARGET && quality > 0.3) {
    quality -= 0.1;
    blob = await canvasToBlob(canvas, mimeType, quality);
  }

  const newName = file.name.replace(/\.\w+$/, `.${ext}`);
  return new File([blob], newName, { type: mimeType });
}

/**
 * Plafond d'ingestion des avatars. Le plus grand consommateur est la
 * lightbox de la fiche publique (~1000 px affichés) ; toutes les vignettes
 * rendues font 96 px ou moins. 1024 px côté long en WebP q0,8 produit
 * environ 60 à 150 ko, contre plusieurs Mo pour une photo brute de
 * téléphone (cas mesuré en production : 8,8 Mo pour un rendu de 34 px).
 */
export const AVATAR_MAX_DIMENSION = 1024;

export async function compressAvatarFile(file: File): Promise<File> {
  return compressImageFile(file, 5, AVATAR_MAX_DIMENSION);
}
