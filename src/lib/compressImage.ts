import { trackEvent } from "@/lib/analytics";

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
  maxWidthOrHeight = 1200,
  startQuality = 0.8
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

  // Try startQuality first, then reduce if > 300kb
  let quality = startQuality;
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

/**
 * Compression avatar avec repli dégradé : un second essai à 512 px / qualité
 * 0,6 absorbe les échecs canvas (mémoire, toBlob null) sans jamais stocker le
 * fichier brut. Les échecs de décodage (fichier corrompu, mime mensonger)
 * échouent vite et bloquent à juste titre : un fichier indécodable ici est
 * inaffichable par ce navigateur de toute façon. L'échec final est tracé pour
 * quantifier le taux réel (aucune télémétrie avant le 14/08/2026).
 */
export async function compressAvatarFile(file: File): Promise<File> {
  try {
    return await compressImageFile(file, 5, AVATAR_MAX_DIMENSION);
  } catch (firstError) {
    try {
      return await compressImageFile(file, 1, 512, 0.6);
    } catch {
      void trackEvent("avatar_compression_failed", {
        metadata: {
          ext: file.name.split(".").pop()?.toLowerCase() || "unknown",
          size_kb: Math.round(file.size / 1024),
        },
      });
      throw firstError;
    }
  }
}

/**
 * Plafond d'ingestion des galeries (sitter-gallery, animaux). Le plus grand
 * consommateur est la lightbox de la fiche publique (~85vh, soit ~920 px de
 * haut sur un écran 1080p) ; 1600 px côté long couvre les grands écrans 1:1
 * sans stocker des originaux de 2736 px et plus (cas mesuré : 19,2 Mo de
 * galerie pour des vignettes de 193 px).
 */
export const GALLERY_MAX_DIMENSION = 1600;

/**
 * Repli dégradé galerie : 1024 px reste au-dessus du cadre lightbox mesuré
 * (~920 px à 85vh sur 1080p), le repli sert donc encore le plus grand
 * consommateur sans upscale, tout en divisant la mémoire canvas par ~2,4
 * (rapport de surfaces (1024/1600)²). Qualité 0,6 : même delta que le repli
 * avatar (0,8 vers 0,6). 512 px aurait été sous le cadre lightbox.
 */
export const GALLERY_FALLBACK_DIMENSION = 1024;

export async function compressGalleryFile(file: File): Promise<File> {
  try {
    return await compressImageFile(file, 5, GALLERY_MAX_DIMENSION);
  } catch (firstError) {
    try {
      return await compressImageFile(file, 2, GALLERY_FALLBACK_DIMENSION, 0.6);
    } catch {
      throw firstError;
    }
  }
}

/**
 * Photos de messagerie : plafond 1200 px, aligné sur la lightbox
 * conversation servie en 1200x1200 contain. Repli dégradé 768 px / 0,6 :
 * même ratio de surface que le repli galerie (~0,41x), couvre la vignette
 * conversation (480 px) sans upscale.
 */
export const MESSAGE_PHOTO_MAX_DIMENSION = 1200;
export const MESSAGE_PHOTO_FALLBACK_DIMENSION = 768;

export async function compressMessagePhotoFile(file: File): Promise<File> {
  try {
    return await compressImageFile(file, 5, MESSAGE_PHOTO_MAX_DIMENSION);
  } catch (firstError) {
    try {
      return await compressImageFile(file, 1, MESSAGE_PHOTO_FALLBACK_DIMENSION, 0.6);
    } catch {
      throw firstError;
    }
  }
}

/**
 * Couvertures d'articles : plafond 1200 px, aligné sur l'ingestion du
 * bucket property-photos et sur le standard og:image (1200 x 630), la
 * couverture partant dans les métadonnées de partage. Le plus grand rendu
 * en page est le hero d'ArticleDetail, servi à 800 px de large dans une
 * colonne max-w-3xl. Repli dégradé 1024 px / 0,6 : il couvre ce rendu de
 * 800 px sans upscale, là où 768 px passerait sous la demande.
 */
export const ARTICLE_COVER_MAX_DIMENSION = 1200;
export const ARTICLE_COVER_FALLBACK_DIMENSION = 1024;

export async function compressArticleCoverFile(file: File): Promise<File> {
  try {
    return await compressImageFile(file, 5, ARTICLE_COVER_MAX_DIMENSION);
  } catch (firstError) {
    try {
      return await compressImageFile(file, 2, ARTICLE_COVER_FALLBACK_DIMENSION, 0.6);
    } catch {
      throw firstError;
    }
  }
}
