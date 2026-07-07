/**
 * Validation client d'un fichier avatar avant upload vers le bucket `avatars`.
 * Aligné avec les MIME acceptés côté bucket (jpeg/png/webp/heic) et la limite 5 Mo.
 * HEIC est toléré ici car `compressImageFile` sait le convertir en JPG.
 */
const ACCEPTED_MIMES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];
const MAX_BYTES = 5 * 1024 * 1024;

export type AvatarValidation =
  | { ok: true }
  | { ok: false; reason: string };

export function validateAvatarFile(file: File): AvatarValidation {
  if (!file) return { ok: false, reason: "Aucun fichier sélectionné." };

  const nameLower = file.name.toLowerCase();
  const isHeicByName = nameLower.endsWith(".heic") || nameLower.endsWith(".heif");
  const typeOk =
    ACCEPTED_MIMES.includes(file.type.toLowerCase()) ||
    (file.type === "" && isHeicByName);

  if (!typeOk) {
    return {
      ok: false,
      reason: "Format non supporté. Utilisez JPG, PNG ou WebP (max 5 Mo).",
    };
  }
  if (file.size > MAX_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      ok: false,
      reason: `Fichier trop volumineux (${mb} Mo). Limite : 5 Mo.`,
    };
  }
  return { ok: true };
}
